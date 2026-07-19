// Round-trip tests for the file<->image vault. Run: node filecodec.test.js
const FV = require('./filecodec.js');

function makeBytes(n, seed) {
  // deterministic pseudo-random bytes (no Math.random -> reproducible)
  const b = new Uint8Array(n);
  let x = seed >>> 0;
  for (let i = 0; i < n; i++) { x = (x * 1664525 + 1013904223) >>> 0; b[i] = x & 255; }
  return b;
}

const cases = [
  { name: 'clip.mp4', mime: 'video/mp4', bytes: makeBytes(50000, 7) },
  { name: 'tiny.webm', mime: 'video/webm', bytes: makeBytes(3, 1) },
  { name: 'empty.mp4', mime: 'video/mp4', bytes: makeBytes(0, 0) },
  { name: 'unicode 名前.mov', mime: 'video/quicktime', bytes: makeBytes(12345, 99) },
  { name: 'big.bin', mime: 'application/octet-stream', bytes: makeBytes(250000, 42) }
];

let allOk = true;
console.log('file                    |   bytes | image     | pixels  | ok');
console.log('------------------------|---------|-----------|---------|----');
for (const c of cases) {
  const img = FV.fileToImage(c.bytes, c.name, c.mime);
  const out = FV.imageToFile(img.rgba, img.width, img.height);

  let same = out.bytes.length === c.bytes.length && out.name === c.name && out.mime === c.mime;
  if (same) for (let i = 0; i < c.bytes.length; i++) if (out.bytes[i] !== c.bytes[i]) { same = false; break; }
  allOk = allOk && same;

  console.log(
    c.name.padEnd(24) + '|' +
    String(c.bytes.length).padStart(8) + ' |' +
    (img.width + '×' + img.height).padStart(10) + ' |' +
    String(img.pixels).padStart(8) + ' |' +
    (same ? '  ✓' : '  ✗ FAILED')
  );
}
console.log('\n' + (allOk ? 'ALL FILE<->IMAGE ROUND TRIPS LOSSLESS ✓' : 'SOME FAILED ✗'));
process.exit(allOk ? 0 : 1);
