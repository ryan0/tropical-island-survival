export interface Canvas {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

/** A blank canvas to draw a picture on. `picture` says what it is for, should there be none. */
export function createCanvas(width: number, height: number, picture: string): Canvas {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error(`the browser gave no canvas to draw ${picture} on`);
  return { canvas, context };
}
