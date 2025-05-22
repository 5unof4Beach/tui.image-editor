import { fabric } from 'fabric';
import { getSmallestPoint } from '../helper/svgPathEditorHelper';
import PathPoint from '../component/pathPoint';

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
    const editIcon =
      "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
    this.editImg = document.createElement('img');
    this.editImg.src = editIcon;
  }

  _renderIcon(ctx, left, top, _styleOverride, fabricObject) {
    const size = 24;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(this.editImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  importSVG(svgString) {
    fabric.loadSVGFromString(svgString, (objects, _options) => {
      this.canvas.clear();
      objects.forEach((obj) => {
        if (obj instanceof fabric.Path) {
          this.canvas.add(obj);
          this.state.allPaths.push(obj);
          this._setupPathControls(obj);
        }
      });
      this.canvas.renderAll();
    });
  }

  _setupPathControls(pathObject) {
    pathObject.controls.editControl = new fabric.Control({
      x: 0.5,
      y: -0.5,
      offsetY: 16,
      cursorStyle: 'pointer',
      mouseUpHandler: this._editObject.bind(this),
      render: this._renderIcon.bind(this),
      cornerSize: 24,
    });
  }

  _editObject(_eventData, transform) {
    const targetPath = transform.target;
    const { currentPath } = this.state;

    if (currentPath && currentPath !== targetPath) {
      this._exitEditMode();
    }
    this.state.currentPath = targetPath;
    this.state.setSelectionState('editing');

    this.state.currentPath.set({
      selectable: false,
      hasControls: false,
      hasBorders: false,
      evented: true,
    });

    this.state.allPaths.forEach((path) => {
      if (path !== currentPath) {
        path.set({
          selectable: true,
          hasControls: true,
          hasBorders: true,
          evented: true,
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
      // Restore current path controls
      currentPath.set({
        selectable: true,
        hasControls: true,
        hasBorders: true,
        evented: true,
      });
      this.state.currentPath = null;
    }
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
    const { currentPath } = this.state;
    const commands = currentPath.path;
    const pathLeft = currentPath.left || 0;
    const pathTop = currentPath.top || 0;
    const scaleX = currentPath.scaleX || 1;
    const scaleY = currentPath.scaleY || 1;
    const { x: minX, y: minY } = getSmallestPoint(currentPath);
    const { anchorPoints, controlPoints } = this.state;

    commands.forEach((cmd) => {
      switch (cmd[0]) {
        case 'M':
        case 'L':
          const left = cmd[1] * scaleX;
          const top = cmd[2] * scaleY;
          const point = new PathPoint(this, left - (minX - pathLeft), top - (minY - pathTop));
          anchorPoints.push(point);
          point.fabricPoint.bringToFront();
          this.canvas.add(point.fabricPoint);
          break;
        case 'C':
          const lastPoint = anchorPoints[anchorPoints.length - 1];
          if (lastPoint) {
            lastPoint.setControlPoints(
              cmd[1] * scaleX - (minX - pathLeft),
              cmd[2] * scaleY - (minY - pathTop),
              cmd[3] * scaleX - (minX - pathLeft),
              cmd[4] * scaleY - (minY - pathTop)
            );
            this.canvas.add(lastPoint.controlPoint1.fabricPoint);
            this.canvas.add(lastPoint.controlPoint2.fabricPoint);
            lastPoint.controlPoint1.fabricPoint.bringToFront();
            lastPoint.controlPoint2.fabricPoint.bringToFront();
            controlPoints.push(lastPoint.controlPoint1);
            controlPoints.push(lastPoint.controlPoint2);
          }

          const endPoint = new PathPoint(
            this,
            cmd[5] * scaleX - (minX - pathLeft),
            cmd[6] * scaleY - (minY - pathTop)
          );
          anchorPoints.push(endPoint);
          this.canvas.add(endPoint.fabricPoint);
          endPoint.fabricPoint.bringToFront();
          break;
        default:
          break;
      }
    });
  }
}

export default SVGEditor;
