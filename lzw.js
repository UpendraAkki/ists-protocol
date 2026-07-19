/*
 * Dictionary compressor (LZW), from scratch.
 * ==========================================
 * This is the "out of the box" answer for LONG text. Instead of giving each
 * character a code (base-N), it learns REPEATED SEQUENCES and gives each of
 * them a code. The dictionary starts with the 256 single bytes and grows every
 * time it meets a new sequence, so common words and phrases collapse to one
 * number each. The longer and more repetitive the text, the bigger the win.
 *
 * Lossless and self-synchronising: the decoder rebuilds the exact same
 * dictionary as it reads, so it never has to be stored. Codes are 16 bits; the
 * dictionary freezes at 65536 entries. If the output would not be smaller than
 * the input (e.g. random data), we store the input raw with a flag -- so the
 * result is never larger than input + 1 byte.
 *
 * Honest limit: no lossless method shrinks random/high-entropy data. The win is
 * exactly the redundancy present in the data, nothing more (Shannon).
 */
(function (root) {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const MAX = 65536;

  /** Compress a Uint8Array -> Uint8Array (byte 0 is a flag: 0 raw, 1 lzw). */
  function compressBytes(bytes) {
    const dict = new Map();
    for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
    let next = 256;

    const codes = [];
    let w = '';
    for (let i = 0; i < bytes.length; i++) {
      const c = String.fromCharCode(bytes[i]);
      const wc = w + c;
      if (dict.has(wc)) {
        w = wc;
      } else {
        codes.push(dict.get(w));
        if (next < MAX) dict.set(wc, next++);
        w = c;
      }
    }
    if (w !== '') codes.push(dict.get(w));

    const lzw = new Uint8Array(1 + codes.length * 2);
    lzw[0] = 1;
    for (let i = 0; i < codes.length; i++) {
      lzw[1 + i * 2] = (codes[i] >> 8) & 0xff;
      lzw[2 + i * 2] = codes[i] & 0xff;
    }
    if (lzw.length < bytes.length + 1) return lzw;

    const raw = new Uint8Array(1 + bytes.length);
    raw[0] = 0; raw.set(bytes, 1);
    return raw;
  }

  /** Decompress bytes produced by compressBytes -> Uint8Array. */
  function decompressBytes(data) {
    if (data.length === 0) return new Uint8Array(0);
    if (data[0] === 0) return data.slice(1);

    const codes = [];
    for (let i = 1; i + 1 < data.length; i += 2) codes.push((data[i] << 8) | data[i + 1]);
    if (codes.length === 0) return new Uint8Array(0);

    const dict = new Array(256);
    for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);
    let next = 256;

    const out = [];
    const push = s => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };

    let prev = dict[codes[0]];
    push(prev);
    for (let i = 1; i < codes.length; i++) {
      const code = codes[i];
      let entry;
      if (code < dict.length) entry = dict[code];
      else if (code === dict.length) entry = prev + prev[0]; // the classic KwKwK case
      else throw new Error('corrupt LZW stream (code ' + code + ')');
      push(entry);
      if (next < MAX) { dict.push(prev + entry[0]); next++; }
      prev = entry;
    }
    return Uint8Array.from(out);
  }

  // text convenience
  function compressText(text) {
    const bytes = enc.encode(text);
    const packed = compressBytes(bytes);
    return {
      packed,
      originalBytes: bytes.length,
      compressedBytes: packed.length,
      method: packed[0] === 1 ? 'lzw' : 'raw',
      savingsPercent: bytes.length ? (1 - packed.length / bytes.length) * 100 : 0
    };
  }
  function decompressText(packed) { return dec.decode(decompressBytes(packed)); }

  const LZW = { compressBytes, decompressBytes, compressText, decompressText };
  if (typeof module !== 'undefined' && module.exports) module.exports = LZW;
  root.LZW = LZW;
})(typeof window !== 'undefined' ? window : globalThis);
