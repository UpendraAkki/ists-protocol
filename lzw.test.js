// LZW: fuzz losslessness + ratio comparison vs base-N. Run: node lzw.test.js
const LZW = require('./lzw.js');
const PBC = require('./codec.js');

// ---- 1) FUZZ: prove lossless on thousands of random inputs ----
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const rand = rng(20260719);

let fuzzOk = true, worst = null;
for (let t = 0; t < 4000; t++) {
  const len = Math.floor(rand() * 600);
  const alpha = 1 + Math.floor(rand() * 40);        // small alphabets -> lots of repetition
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = Math.floor(rand() * alpha);
  const back = LZW.decompressBytes(LZW.compressBytes(bytes));
  let same = back.length === len;
  if (same) for (let i = 0; i < len; i++) if (back[i] !== bytes[i]) { same = false; break; }
  if (!same) { fuzzOk = false; worst = { t, len, alpha }; break; }
}
console.log('Fuzz (4000 random inputs): ' + (fuzzOk ? 'ALL LOSSLESS ✓' : 'FAILED ✗ ' + JSON.stringify(worst)));

// ---- 2) also fuzz with full-byte random (incompressible) ----
let rawOk = true;
for (let t = 0; t < 500; t++) {
  const len = Math.floor(rand() * 800);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = Math.floor(rand() * 256);
  const back = LZW.decompressBytes(LZW.compressBytes(bytes));
  let same = back.length === len;
  if (same) for (let i = 0; i < len; i++) if (back[i] !== bytes[i]) { same = false; break; }
  rawOk = rawOk && same;
}
console.log('Fuzz (500 full-byte random): ' + (rawOk ? 'ALL LOSSLESS ✓' : 'FAILED ✗'));

// ---- 3) RATIO: LZW vs base-N on realistic inputs ----
const para = 'The ISTS protocol turns text into numbers, but real compression comes from redundancy. ' +
  'Real compression comes from redundancy, and redundancy is everywhere in natural language. ';
const inputs = {
  'English x1  (0.2 KB)': para,
  'English x20 (3.5 KB)': para.repeat(20),
  'English x200 (35 KB)': para.repeat(200),
  'DNA (15 KB)': (function(){ const b='ACGT'; let s=''; for(let i=0;i<15000;i++) s+=b[(i*7+(i>>2))%4]; return s; })(),
};

console.log('\ninput                    |  orig  | base-N | base-N% |  LZW   |  LZW%  | LZW vs base-N');
console.log('-------------------------|--------|--------|---------|--------|--------|--------------');
for (const [name, text] of Object.entries(inputs)) {
  const orig = Buffer.byteLength(text, 'utf8');

  // base-N only on the smaller ones (its BigInt Horner is O(n^2) -> slow on big text)
  let baseStr = '  n/a  ', basePct = '   -   ', factor = '';
  if (orig <= 5000) {
    const e = PBC.encode(text);
    baseStr = String(e.sizes.compressedBytes).padStart(6);
    basePct = (e.savingsPercent.toFixed(1) + '%').padStart(7);
  }

  const l = LZW.compressText(text);
  const back = LZW.decompressText(l.packed);
  const ok = back === text;
  if (orig <= 5000) {
    const e = PBC.encode(text);
    factor = (e.sizes.compressedBytes / l.compressedBytes).toFixed(1) + '× smaller';
  } else {
    factor = (orig / l.compressedBytes).toFixed(1) + '× vs orig';
  }

  console.log(
    name.padEnd(25) + '|' +
    String(orig).padStart(7) + ' |' + baseStr + ' |' + basePct + ' |' +
    String(l.compressedBytes).padStart(7) + ' |' +
    (l.savingsPercent.toFixed(1) + '%').padStart(7) + ' |  ' +
    factor + (ok ? '' : '  <-- LOSSY!')
  );
}
console.log('\n' + ((fuzzOk && rawOk) ? 'LZW verified lossless on 4500 fuzz cases ✓' : 'FUZZ FAILED ✗'));
process.exit((fuzzOk && rawOk) ? 0 : 1);
