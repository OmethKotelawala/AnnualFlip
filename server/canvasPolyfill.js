// Canvas native addon stubbed for web environment
const createCanvas = (w, h) => ({
  width: w,
  height: h,
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
    drawImage: () => {},
  }),
  toBuffer: () => Buffer.from([]),
  toDataURL: () => ''
});

class ImageStub {}
class ImageDataStub {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
}

export { createCanvas, ImageStub as Image, ImageDataStub as ImageData };

