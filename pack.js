/*
 * Pack: the smart compressor.
 * ===========================
 * Runs several from-scratch methods and keeps whichever is smallest for THIS
 * input, tagging the winner in one header byte. Always lossless; never larger
 * than the input + a couple of bytes (because "store raw" is always a candidate).
 *
 *   0  raw          store the bytes unchanged            (random / tiny data)
 *   1  lzw          dictionary of repeated sequences     (repetitive data)
 *   2  o1           order-1 adaptive arithmetic coder    (natural language)
 *   3  lzw + o1     dictionary, then entropy-code it      (long repetitive text)
 *
 * The point: different data wants different tools, so we try them and let the
 * smallest win instead of guessing.
 */
(function (root) {
  'use strict';

  const isNode = (typeof module !== 'undefined' && module.exports);
  const LZW = isNode ? require('./lzw.js') : root.LZW;
  const Range = isNode ? require('./range.js') : root.Range;

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function writeVarint(arr, value) {
    let v = value;
    while (v >= 0x80) { arr.push((v & 0x7f) | 0x80); v = Math.floor(v / 128); }
    arr.push(v);
  }
  function readVarint(bytes, pos) {
    let shift = 0, result = 0, b;
    do { b = bytes[pos.i++]; result += (b & 0x7f) * Math.pow(2, shift); shift += 7; } while (b & 0x80);
    return result;
  }
  function withHeader(tag, extra, payload) {
    const head = [tag];
    for (const n of extra) writeVarint(head, n);
    const out = new Uint8Array(head.length + payload.length);
    out.set(head, 0); out.set(payload, head.length);
    return out;
  }

  /** Compress bytes. Returns { packed, method, tag, candidates }. */
  function compressBytes(bytes) {
    const candidates = [];

    // 0: raw
    candidates.push({ tag: 0, name: 'raw', packed: withHeader(0, [], bytes) });

    // 1: lzw
    const lzw = LZW.compressBytes(bytes);
    candidates.push({ tag: 1, name: 'lzw', packed: withHeader(1, [], lzw) });

    // 2: order-1 arithmetic
    const o1 = Range.encodeBytes(bytes);
    candidates.push({ tag: 2, name: 'o1', packed: withHeader(2, [bytes.length], o1) });

    // 3: lzw then order-1 arithmetic
    const lzwO1 = Range.encodeBytes(lzw);
    candidates.push({ tag: 3, name: 'lzw+o1', packed: withHeader(3, [lzw.length], lzwO1) });

    let best = candidates[0];
    for (const c of candidates) if (c.packed.length < best.packed.length) best = c;
    return {
      packed: best.packed, method: best.name, tag: best.tag,
      candidates: candidates.map(c => ({ name: c.name, bytes: c.packed.length }))
    };
  }

  function decompressBytes(packed) {
    const pos = { i: 0 };
    const tag = packed[pos.i++];
    if (tag === 0) return packed.subarray(1);
    if (tag === 1) return LZW.decompressBytes(packed.subarray(1));
    if (tag === 2) { const len = readVarint(packed, pos); return Range.decodeBytes(packed.subarray(pos.i), len); }
    if (tag === 3) {
      const lzwLen = readVarint(packed, pos);
      const lzw = Range.decodeBytes(packed.subarray(pos.i), lzwLen);
      return LZW.decompressBytes(lzw);
    }
    throw new Error('unknown method tag ' + tag);
  }

  function compressText(text) {
    const bytes = enc.encode(text);
    const r = compressBytes(bytes);
    return Object.assign(r, {
      originalBytes: bytes.length,
      compressedBytes: r.packed.length,
      savingsPercent: bytes.length ? (1 - r.packed.length / bytes.length) * 100 : 0
    });
  }
  function decompressText(packed) { return dec.decode(decompressBytes(packed)); }

  const Pack = { compressBytes, decompressBytes, compressText, decompressText };
  if (isNode) module.exports = Pack;
  root.Pack = Pack;
})(typeof window !== 'undefined' ? window : globalThis);
