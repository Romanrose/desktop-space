import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/remove-white-background.mjs input.png output.png");
}

const source = readFileSync(inputPath);
const signature = source.subarray(0, 8);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (!signature.equals(pngSignature)) {
  throw new Error("Input is not a PNG file.");
}

let offset = 8;
let width = 0;
let height = 0;
let bitDepth = 0;
let colorType = 0;
const idatChunks = [];

while (offset < source.length) {
  const length = source.readUInt32BE(offset);
  const type = source.subarray(offset + 4, offset + 8).toString("ascii");
  const data = source.subarray(offset + 8, offset + 8 + length);
  offset += 12 + length;

  if (type === "IHDR") {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  }

  if (type === "IDAT") {
    idatChunks.push(data);
  }

  if (type === "IEND") {
    break;
  }
}

if (bitDepth !== 8 || colorType !== 2) {
  throw new Error(`Expected 8-bit RGB PNG, got bitDepth=${bitDepth}, colorType=${colorType}.`);
}

const inflated = inflateSync(Buffer.concat(idatChunks));
const inputBpp = 3;
const inputStride = width * inputBpp;
const rgbaStride = width * 4;
const rgba = Buffer.alloc(height * rgbaStride);
let readOffset = 0;
let writeOffset = 0;
let previous = Buffer.alloc(inputStride);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

for (let y = 0; y < height; y += 1) {
  const filter = inflated[readOffset];
  readOffset += 1;
  const current = Buffer.from(inflated.subarray(readOffset, readOffset + inputStride));
  readOffset += inputStride;

  for (let x = 0; x < inputStride; x += 1) {
    const left = x >= inputBpp ? current[x - inputBpp] : 0;
    const up = previous[x] ?? 0;
    const upLeft = x >= inputBpp ? previous[x - inputBpp] : 0;
    if (filter === 1) current[x] = (current[x] + left) & 255;
    if (filter === 2) current[x] = (current[x] + up) & 255;
    if (filter === 3) current[x] = (current[x] + Math.floor((left + up) / 2)) & 255;
    if (filter === 4) current[x] = (current[x] + paeth(left, up, upLeft)) & 255;
  }

  for (let x = 0; x < width; x += 1) {
    const r = current[x * 3];
    const g = current[x * 3 + 1];
    const b = current[x * 3 + 2];
    const whiteness = Math.min(r, g, b);
    const saturation = Math.max(r, g, b) - whiteness;
    const alpha = whiteness > 242 && saturation < 18 ? Math.max(0, 255 - (whiteness - 242) * 20) : 255;
    rgba[writeOffset] = r;
    rgba[writeOffset + 1] = g;
    rgba[writeOffset + 2] = b;
    rgba[writeOffset + 3] = alpha;
    writeOffset += 4;
  }

  previous = current;
}

const rawOutput = Buffer.alloc(height * (rgbaStride + 1));
for (let y = 0; y < height; y += 1) {
  rawOutput[y * (rgbaStride + 1)] = 0;
  rgba.copy(rawOutput, y * (rgbaStride + 1) + 1, y * rgbaStride, (y + 1) * rgbaStride);
}

const chunks = [];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  chunks.push(length, typeBuffer, data, crc);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

chunk("IHDR", ihdr);
chunk("IDAT", deflateSync(rawOutput, { level: 9 }));
chunk("IEND", Buffer.alloc(0));

writeFileSync(outputPath, Buffer.concat([pngSignature, ...chunks]));
