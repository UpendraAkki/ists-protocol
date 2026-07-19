// Pack: fuzz losslessness + method-selection ratio table. Run: node pack.test.js
const Pack = require('./pack.js');

function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const rand = rng(777);

// ---- fuzz: every method path, many alphabets/lengths ----
let ok = true, fail = null;
for (let t = 0; t < 4000; t++) {
  const len = Math.floor(rand() * 700);
  const alpha = 1 + Math.floor(rand() * 256);
  const b = new Uint8Array(len);
  for (let i = 0; i < len; i++) b[i] = Math.floor(rand() * alpha);
  const back = Pack.decompressBytes(Pack.compressBytes(b).packed);
  let same = back.length === len;
  if (same) for (let i = 0; i < len; i++) if (back[i] !== b[i]) { same = false; break; }
  if (!same) { ok = false; fail = { t, len, alpha }; break; }
}
console.log('Pack fuzz (4000 mixed inputs): ' + (ok ? 'ALL LOSSLESS ✓' : 'FAILED ✗ ' + JSON.stringify(fail)));

// ---- ratio + which method wins ----
const para = 'The quick brown fox jumps over the lazy dog. Compression comes from redundancy, not magic. ';
const inputs = {
  'Random 2 KB': (function () { const b = new Uint8Array(2048); for (let i = 0; i < 2048; i++) b[i] = Math.floor(rand() * 256); return b; })(),
  'Short English': para,
  'English x20': para.repeat(20),
  'English x200': para.repeat(200),
  'DNA 20 KB': (function () { const s = 'ACGT'; let o = ''; for (let i = 0; i < 20000; i++) o += s[(i * 7 + (i >> 2)) % 4]; return o; })(),
  'JSON-ish x100': JSON.stringify({ id: 1, name: 'widget', tags: ['a', 'b', 'c'], active: true }).repeat(100)
};

console.log('\ninput            |   orig  |  packed | save%  | method  | candidates (raw/lzw/o1/lzw+o1)');
console.log('-----------------|---------|---------|--------|---------|-------------------------------');
for (const [name, data] of Object.entries(inputs)) {
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
  const r = Pack.compressBytes(new Uint8Array(bytes));
  const back = Pack.decompressBytes(r.packed);
  let same = back.length === bytes.length;
  if (same) for (let i = 0; i < bytes.length; i++) if (back[i] !== bytes[i]) { same = false; break; }
  const cand = r.candidates.map(c => c.bytes).join(' / ');
  console.log(
    name.padEnd(17) + '|' +
    String(bytes.length).padStart(8) + ' |' +
    String(r.packed.length).padStart(8) + ' |' +
    ((bytes.length ? (1 - r.packed.length / bytes.length) * 100 : 0).toFixed(1) + '%').padStart(7) + ' |' +
    (' ' + r.method).padEnd(8) + ' | ' + cand + (same ? '' : '  <-- LOSSY!')
  );
}
console.log('\n' + (ok ? 'Pack verified lossless ✓' : 'FUZZ FAILED ✗'));
process.exit(ok ? 0 : 1);
