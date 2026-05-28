export interface RevealImageCanvasLayout {
  offsetX: number;
  offsetY: number;
  drawWidth: number;
  drawHeight: number;
  tileWidth: number;
  tileHeight: number;
}

export function getRevealImageCanvasLayout(
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  gridSize: number,
): RevealImageCanvasLayout {
  const imageAspect = imageWidth / imageHeight;
  const canvasAspect = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > canvasAspect) {
    drawHeight = width / imageAspect;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawWidth = height * imageAspect;
    offsetX = (width - drawWidth) / 2;
  }

  return {
    offsetX,
    offsetY,
    drawWidth,
    drawHeight,
    tileWidth: drawWidth / gridSize,
    tileHeight: drawHeight / gridSize,
  };
}

export function tileIndexFromCanvasPoint(
  x: number,
  y: number,
  layout: RevealImageCanvasLayout,
  gridSize: number,
): number | null {
  const localX = x - layout.offsetX;
  const localY = y - layout.offsetY;
  if (localX < 0 || localY < 0 || localX >= layout.drawWidth || localY >= layout.drawHeight) {
    return null;
  }
  const col = Math.floor(localX / layout.tileWidth);
  const row = Math.floor(localY / layout.tileHeight);
  if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) {
    return null;
  }
  return row * gridSize + col;
}
