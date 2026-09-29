import canvasPkg from 'canvas';
const { createCanvas, Image, ImageData } = canvasPkg;

globalThis.Image = Image;
globalThis.ImageData = ImageData;

export { createCanvas, Image, ImageData };
