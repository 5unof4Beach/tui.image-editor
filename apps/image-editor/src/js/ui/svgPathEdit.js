import { fabric } from 'fabric';
import { getSmallestPoint } from '../helper/svgPathEditorHelper';
import PathPoint from '../component/pathPoint';
import editIconPath from '../../svg/icon-a/ic-edit.svg';

class SVGState {
  constructor() {
    this.currentPath = null;
    this.allPaths = [];
    this.currentMode = 'edit';
    this.controlPoints = [];
    this.anchorPoints = [];
    this.isEditing = false;
    this.selectionState = 'none'; // none, selected, editing
  }

  clearControlPoints() {
    this.controlPoints = [];
    this.anchorPoints = [];
  }

  setMode(mode) {
    this.currentMode = mode;
  }

  clearState() {
    this.currentPath = null;
    this.allPaths = [];
    this.controlPoints = [];
    this.anchorPoints = [];
    this.isEditing = false;
    this.selectionState = 'none';
  }

  setSelectionState(state) {
    this.selectionState = state;
  }

  getSelectionState() {
    return this.selectionState;
  }
}

export class SVGEditor {
  constructor(imageEditor) {
    this.imageEditor = imageEditor;
    this.canvas = imageEditor._graphics.getCanvas();
    this.state = new SVGState();
    this.editImg = document.createElement('img');
    this.editImg.src = editIconPath;

    this.canvas.on('mouse:down', (e) => {
      if (!e.target && this.state.currentPath) {
        this._exitEditMode();
      }
    });
  }

  _renderIcon(ctx, left, top, _styleOverride, fabricObject) {
    const size = 50;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(this.editImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  importSVG(svgString) {
    fabric.loadSVGFromString(svgString, (objects) => {
      this.canvas.clear();
      this.setCanvasSize(svgString);
      objects.forEach((obj) => {
        if (obj instanceof fabric.Path) {
          obj.set({
            lockRotation: true,
            controls: fabric.util.object.clone(fabric.Object.prototype.controls),
          });
          this.canvas.add(obj);
          this.state.allPaths.push(obj);
          this._setupPathControls(obj);
        } else if (obj instanceof fabric.Rect) {
          this.canvas.backgroundColor = obj.fill ?? '';
          this.imageEditor.setCanvasBackgroundColorPicker(obj.fill ?? '');
        } else {
          this.canvas.add(obj);
        }
      });

      this.canvas.renderAll();
    });
  }

  setCanvasSize(svgString) {
    const viewBoxMatch = svgString.match(/viewBox=["']([^"']*)["']/i);

    if (viewBoxMatch && viewBoxMatch[1]) {
      const [width, height] = viewBoxMatch[1].split(/\s+/).map(Number).slice(2);

      if (!isNaN(width) && !isNaN(height)) {
        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
      }
    }
  }

  _setupPathControls(pathObject) {
    pathObject.controls = fabric.Object.prototype.controls;
    pathObject.controls.editControl = new fabric.Control({
      x: 0,
      y: 0,
      offsetY: 0,
      offsetX: 0,
      cursorStyle: 'pointer',
      mouseUpHandler: this._editObject.bind(this),
      render: this._renderIcon.bind(this),
      cornerSize: 24,
    });
  }

  _editObject(_eventData, transform) {
    const targetPath = transform.target;
    const { currentPath } = this.state;

    if (!(targetPath instanceof fabric.Path)) {
      return;
    }

    if (currentPath && currentPath !== targetPath) {
      this._exitEditMode();
    }
    this.state.currentPath = targetPath;
    this.state.setSelectionState('editing');

    this.state.allPaths.forEach((path) => {
      if (path !== currentPath) {
        path.set({
          selectable: false,
          hasControls: false,
          hasBorders: false,
          evented: false,
        });
      }
    });

    this._showControlPoints();
  }

  _exitEditMode() {
    const { currentPath } = this.state;

    this._hideControlPoints();
    this.state.setSelectionState('none');
    if (currentPath) {
      currentPath.set({
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
      });
      this.state.currentPath = null;
    }

    this.state.allPaths.forEach((path) => {
      path.set({
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
      });
    });
    this.canvas.requestRenderAll();
  }

  _hideControlPoints() {
    const { controlPoints, anchorPoints } = this.state;
    const { canvas } = this;

    controlPoints.forEach((point) => canvas.remove(point.fabricPoint));
    anchorPoints.forEach((point) => {
      canvas.remove(point.fabricPoint);
      if (point.controlPoint1) {
        canvas.remove(point.controlPoint1.fabricPoint);
        canvas.remove(point.controlPoint2.fabricPoint);
      }
    });
    this.state.clearControlPoints();
  }

  _showControlPoints() {
    const [zoom] = this.canvas.viewportTransform;
    const { currentPath, anchorPoints, controlPoints } = this.state;
    const commands = currentPath.path;
    const pathLeft = currentPath.left || 0;
    const pathTop = currentPath.top || 0;
    const scaleX = zoom * (currentPath.scaleX || 1);
    const scaleY = zoom * (currentPath.scaleY || 1);
    const { x, y } = getSmallestPoint(currentPath);
    const minX = x * scaleX;
    const minY = y * scaleY;
    // const angle = currentPath.angle || 0;

    // const rotatePoint = (valX, valY) => {
    //   const point = new fabric.Point(valX, valY);
    //   const center = new fabric.Point(pathLeft, pathTop);
    //   return fabric.util.rotatePoint(point, center, fabric.util.degreesToRadians(angle));
    // };

    currentPath.set({
      selectable: false,
      hasControls: false,
      hasBorders: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
    });

    commands.forEach((cmd) => {
      switch (cmd[0]) {
        case 'M':
        case 'L': {
          const left = cmd[1] * scaleX - (minX - pathLeft);
          const top = cmd[2] * scaleY - (minY - pathTop);
          // const rotated = rotatePoint(left, top);
          // const point = new PathPoint(this, rotated.x, rotated.y);
          const point = new PathPoint(this, left, top);
          anchorPoints.push(point);
          point.fabricPoint.bringToFront();
          this.canvas.add(point.fabricPoint);
          break;
        }
        case 'C': {
          const lastPoint = anchorPoints[anchorPoints.length - 1];
          if (lastPoint) {
            // const cp1 = rotatePoint(
            //   cmd[1] * scaleX - (minX - pathLeft),
            //   cmd[2] * scaleY - (minY - pathTop)
            // );
            // const cp2 = rotatePoint(
            //   cmd[3] * scaleX - (minX - pathLeft),
            //   cmd[4] * scaleY - (minY - pathTop)
            // );
            const cp1 = {
              x: cmd[1] * scaleX - (minX - pathLeft),
              y: cmd[2] * scaleY - (minY - pathTop),
            };
            const cp2 = {
              x: cmd[3] * scaleX - (minX - pathLeft),
              y: cmd[4] * scaleY - (minY - pathTop),
            };
            lastPoint.setControlPoints(cp1.x, cp1.y, cp2.x, cp2.y);
            this.canvas.add(lastPoint.controlPoint1.fabricPoint);
            this.canvas.add(lastPoint.controlPoint2.fabricPoint);
            lastPoint.controlPoint1.fabricPoint.bringToFront();
            lastPoint.controlPoint2.fabricPoint.bringToFront();
            controlPoints.push(lastPoint.controlPoint1);
            controlPoints.push(lastPoint.controlPoint2);
          }

          // const endRotated = rotatePoint(
          //   cmd[5] * scaleX - (minX - pathLeft),
          //   cmd[6] * scaleY - (minY - pathTop)
          // );
          const endRotated = {
            x: cmd[5] * scaleX - (minX - pathLeft),
            y: cmd[6] * scaleY - (minY - pathTop),
          };
          const endPoint = new PathPoint(this, endRotated.x, endRotated.y);
          anchorPoints.push(endPoint);
          this.canvas.add(endPoint.fabricPoint);
          endPoint.fabricPoint.bringToFront();
          break;
        }
        default:
          break;
      }
    });
  }

  setFillColor(color) {
    const { currentPath } = this.state;

    if (currentPath) {
      currentPath.set({ fill: color });
      this.canvas.requestRenderAll();
    }
  }
}

export default SVGEditor;
