/*
 * Sample generator for the README.
 * ================================
 * Runs the smart packer on several inputs, encodes the packed bytes as a
 * lossless PNG via the file<->pixel format used by the app, and writes the
 * PNGs plus a small stats JSON into docs/samples/.
 *
 * Uses only Node built-ins (zlib) — no new dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const Pack = require('../pack.js');
const FileVault = require('../filecodec.js');

// ---- minimal PNG encoder (grayscale/RGB, no compression tricks) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32be(n) { return Buffer.from([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255]); }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
/** rgba: Uint8Array of length w*h*4  -> PNG buffer (color type 6 = RGBA) */
function encodePNG(rgba, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.concat([
    u32be(width), u32be(height),
    Buffer.from([8, 6, 0, 0, 0]), // 8-bit, RGBA, deflate, filter, no interlace
  ]);
  // scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride)
      .copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- inputs to demo ----
const enc = new TextEncoder();

const lorem = (
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio ' +
  'vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Sed vitae libero ' +
  'nec justo consectetur luctus. '
).repeat(60);

const jsonSample = JSON.stringify({
  users: Array.from({ length: 120 }, (_, i) => ({
    id: i, name: 'user_' + i, role: 'member', active: true,
    tags: ['alpha', 'beta', 'gamma'], score: (i * 7) % 100,
  }))
});

const dna = (() => {
  const alphabet = 'ACGT';
  let s = '';
  // pseudo-random but reproducible
  let seed = 42;
  for (let i = 0; i < 20000; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    s += alphabet[seed % 4];
  }
  return s;
})();

const englishBook = (
  'It was the best of times, it was the worst of times, it was the age of wisdom, ' +
  'it was the age of foolishness, it was the epoch of belief, it was the epoch of ' +
  'incredulity, it was the season of Light, it was the season of Darkness. '
).repeat(80);

const inputs = [
  { key: 'text-lorem',   name: 'lorem.txt', mime: 'text/plain', bytes: enc.encode(lorem) },
  { key: 'text-book',    name: 'tale.txt',  mime: 'text/plain', bytes: enc.encode(englishBook) },
  { key: 'json-users',   name: 'users.json',mime: 'application/json', bytes: enc.encode(jsonSample) },
  { key: 'dna-sequence', name: 'dna.txt',   mime: 'text/plain', bytes: enc.encode(dna) },
];

const outDir = path.join(__dirname, '..', 'docs', 'samples');
fs.mkdirSync(outDir, { recursive: true });

const stats = [];
for (const inp of inputs) {
  const packed = Pack.compressBytes(inp.bytes);
  const img = FileVault.fileToImage(packed.packed, inp.name, inp.mime);
  const png = encodePNG(img.rgba, img.width, img.height);
  const pngPath = path.join(outDir, inp.key + '.png');
  fs.writeFileSync(pngPath, png);

  // round-trip check
  const decoded = FileVault.imageToFile(img.rgba, img.width, img.height);
  const roundtrip = Pack.decompressBytes(decoded.bytes);
  const ok = roundtrip.length === inp.bytes.length &&
    Buffer.from(roundtrip).equals(Buffer.from(inp.bytes));

  const row = {
    key: inp.key,
    file: inp.name,
    original: inp.bytes.length,
    packed: packed.packed.length,
    method: packed.method,
    ratio: (packed.packed.length / inp.bytes.length),
    savings: Math.round((1 - packed.packed.length / inp.bytes.length) * 100),
    pngBytes: png.length,
    pngWidth: img.width,
    pngHeight: img.height,
    losslessRoundTrip: ok,
  };
  stats.push(row);
  console.log(
    inp.key.padEnd(14),
    'orig=' + String(row.original).padStart(6),
    'packed=' + String(row.packed).padStart(6),
    'method=' + row.method.padEnd(6),
    'savings=' + String(row.savings).padStart(3) + '%',
    'png=' + row.pngWidth + 'x' + row.pngHeight,
    ok ? 'OK' : 'FAIL'
  );
}

fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2));

// ---- upscaled display versions (nearest-neighbor) so tiny PNGs are visible ----
function upscale(rgba, w, h, scale) {
  const W = w * scale, H = h * scale;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale);
      const s = (sy * w + sx) * 4, d = (y * W + x) * 4;
      out[d] = rgba[s]; out[d+1] = rgba[s+1]; out[d+2] = rgba[s+2]; out[d+3] = rgba[s+3];
    }
  }
  return { rgba: out, width: W, height: H };
}
for (const inp of inputs) {
  const packed = Pack.compressBytes(inp.bytes);
  const img = FileVault.fileToImage(packed.packed, inp.name, inp.mime);
  const target = 320; // px on the longer side
  const scale = Math.max(1, Math.floor(target / Math.max(img.width, img.height)));
  const up = upscale(img.rgba, img.width, img.height, scale);
  fs.writeFileSync(
    path.join(outDir, inp.key + '.display.png'),
    encodePNG(up.rgba, up.width, up.height)
  );
}

// ---- size-comparison bar chart PNG (pure pixel drawing) ----
function drawBarChart(rows, opts) {
  const W = opts.width, H = opts.height, pad = opts.pad;
  const rgba = new Uint8Array(W * H * 4).fill(255);
  // background
  for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
  const setPx = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4;
    rgba[o] = r; rgba[o+1] = g; rgba[o+2] = b; rgba[o+3] = 255;
  };
  const fillRect = (x, y, w, h, r, g, b) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) setPx(xx, yy, r, g, b);
  };
  // fill background off-white
  fillRect(0, 0, W, H, 250, 250, 252);
  const rowH = Math.floor((H - pad * 2) / rows.length);
  const barH = Math.floor(rowH * 0.42);
  const maxVal = Math.max(...rows.map(r => Math.max(r.original, r.packed)));
  const scaleX = (W - pad * 2 - 60) / maxVal;
  for (let i = 0; i < rows.length; i++) {
    const y = pad + i * rowH;
    // original bar (light gray)
    fillRect(pad + 60, y + 4, Math.max(1, Math.round(rows[i].original * scaleX)), barH, 200, 205, 215);
    // packed bar (accent blue)
    fillRect(pad + 60, y + 6 + barH, Math.max(1, Math.round(rows[i].packed * scaleX)), barH, 70, 130, 220);
  }
  return { rgba, width: W, height: H };
}
const chart = drawBarChart(stats, { width: 640, height: 220, pad: 20 });
fs.writeFileSync(path.join(outDir, 'compare.png'), encodePNG(chart.rgba, chart.width, chart.height));

console.log('\nWrote', stats.length, 'PNG samples + display + compare.png + stats.json to', outDir);
