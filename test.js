// Round-trip + compression sanity tests. Run: node test.js
const PBC = require('./codec.js');

const cases = {
  'English paragraph':
    'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. ' +
    'How razorback-jumping frogs can level six piqued gymnasts! The five boxing wizards jump quickly.',
  'Repetitive': 'ababababababababababababababababababababababababababab',
  'Single char x200': 'x'.repeat(200),
  'DNA (4 symbols)': (function () {
    // deterministic pseudo-DNA, no randomness needed
    const b = 'ACGT'; let s = '';
    for (let i = 0; i < 400; i++) s += b[(i * 7 + (i >> 2)) % 4];
    return s;
  })(),
  'Emoji + text': 'Hello 👋 world 🌍! Compression 🚀 is fun 😄 fun 😄 fun 😄.',
  'Numbers': '3141592653589793238462643383279502884197169399375105820974944592',
  'Empty': '',
  'Unicode mix': 'café — naïve — Zürich — Москва — 東京 — αβγ αβγ αβγ'
};

let allOk = true;
console.log('case                        | orig |  comp | save%  | image  | via-image');
console.log('----------------------------|------|-------|--------|--------|----------');
for (const [name, text] of Object.entries(cases)) {
  const e = PBC.encode(text);
  const d = PBC.decodeBase64(e.base64);

  // paint payload -> image -> read it back -> payload -> text
  const img = PBC.payloadToImage(e.payload);
  const back = PBC.imageToPayload(img.rgba, img.width, img.height);
  const viaImage = PBC.decodePayload(back).text;

  const ok = d.text === text && viaImage === text && back.length === e.payload.length;
  allOk = allOk && ok;
  console.log(
    name.padEnd(28) + '|' +
    String(e.sizes.originalBytes).padStart(5) + ' |' +
    String(e.sizes.compressedBytes).padStart(6) + ' |' +
    (e.savingsPercent.toFixed(1) + '%').padStart(7) + ' |' +
    (img.width + '×' + img.height).padStart(7) + ' |' +
    (viaImage === text ? '   ok ✓' : '  FAIL ✗') +
    (ok ? '' : '   <-- ROUND TRIP FAILED')
  );
}
console.log('\n' + (allOk ? 'ALL ROUND TRIPS LOSSLESS (text + image) ✓' : 'SOME ROUND TRIPS FAILED ✗'));
process.exit(allOk ? 0 : 1);
