import { fabric } from 'fabric';

class PathPoint {
  constructor(svgEditor, x, y, type = 'point') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.controlPoint1 = null;
    this.controlPoint2 = null;
    this.fabricPoint = this.createFabricPoint();
    this.canvas = svgEditor.canvas;
    this.currentPath = svgEditor.state.currentPath;
    this.anchorPoints = svgEditor.state.anchorPoints;
    this.svgEditor = svgEditor;
  }

  createFabricPoint() {
    const point = new fabric.Circle({
      left: this.x,
      top: this.y,
      radius: this.type === 'point' ? 6 : 4,
      fill: this.type === 'point' ? '#ff0000' : '#00ff00',
      stroke: '#333',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
      selectable: true,
      data: { type: this.type },
    });

    point.on('moving', () => {
      this.x = point.left;
      this.y = point.top;
      if (this.type === 'point') {
        this._updateControlPoints();
      }
      this._updatePathFromPoints();
    });

    return point;
  }

  setControlPoints(cp1x, cp1y, cp2x, cp2y) {
    if (!this.controlPoint1) {
      this.controlPoint1 = new PathPoint(this.svgEditor, cp1x, cp1y, 'control');
      this.controlPoint2 = new PathPoint(this.svgEditor, cp2x, cp2y, 'control');
    } else {
      this.controlPoint1.x = cp1x;
      this.controlPoint1.y = cp1y;
      this.controlPoint2.x = cp2x;
      this.controlPoint2.y = cp2y;
      this.controlPoint1.fabricPoint.set({ left: cp1x, top: cp1y });
      this.controlPoint2.fabricPoint.set({ left: cp2x, top: cp2y });
    }
    this.canvas.renderAll();
  }

  _updateControlPoints() {
    if (this.controlPoint1 && this.controlPoint2) {
      const dx = this.fabricPoint.left - this.x;
      const dy = this.fabricPoint.top - this.y;

      this.x = this.fabricPoint.left;
      this.y = this.fabricPoint.top;

      this.controlPoint1.x += dx;
      this.controlPoint1.y += dy;
      this.controlPoint2.x += dx;
      this.controlPoint2.y += dy;

      this.controlPoint1.fabricPoint.set({
        left: this.controlPoint1.x,
        top: this.controlPoint1.y,
      });
      this.controlPoint2.fabricPoint.set({
        left: this.controlPoint2.x,
        top: this.controlPoint2.y,
      });

      // Update path directly without recreation
      if (this.currentPath) {
        this._updatePathFromPoints(true);
      }

      this.canvas.requestRenderAll();
    }
  }

  _updatePathFromPoints(keepPathObject = false) {
    const { currentPath, anchorPoints, canvas } = this;

    if (!currentPath || anchorPoints.length < 2) return;

    let pathData = `M ${anchorPoints[0].x} ${anchorPoints[0].y}`;

    for (let i = 1; i < anchorPoints.length; i += 1) {
      const current = anchorPoints[i];
      const previous = anchorPoints[i - 1];

      if (previous.controlPoint1 && previous.controlPoint2) {
        pathData += ` C ${previous.controlPoint1.x} ${previous.controlPoint1.y}, ${previous.controlPoint2.x} ${previous.controlPoint2.y}, ${current.x} ${current.y}`;
      } else {
        pathData += ` L ${current.x} ${current.y}`;
      }
    }

    if (currentPath.path[currentPath.path.length - 1][0] === 'z') {
      pathData += ' z';
    }

    if (keepPathObject) {
      // Update existing path object
      currentPath.set({
        path: pathData,
      });
    } else {
      // Create new path object
      const initialPath = new fabric.Path(pathData, {
        fill: currentPath.fill || 'white',
        selectable: true,
        evented: false,
      });

      // Remove old path and add new one
      if (currentPath) {
        canvas.remove(this.svgEditor.state.currentPath);
      }
      canvas.add(initialPath);
      this.svgEditor.state.currentPath = initialPath;
      this.svgEditor.state.currentPath.sendToBack();
    }

    canvas.requestRenderAll();
  }
}

export default PathPoint;
