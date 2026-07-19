/*
 * Positional Base-N Text Compressor (PBC)
 * =======================================
 * A from-scratch, dependency-free lossless text codec.
 * Runs in the browser (as window.PBC) and in Node (module.exports).
 *
 * The pipeline is exactly the one you described:
 *
 *   1. ENCODE CHARACTERS
 *      Give every DISTINCT character in the message its own small code
 *      number 0, 1, 2, ... (B-1), where B is the size of the alphabet
 *      that this particular message actually uses.
 *
 *   2. THE FORMULA  (all codes -> one big number, "the coefficient")
 *      Read the message as the digits of a single number written in base B:
 *
 *          N = c0*B^0 + c1*B^1 + c2*B^2 + ... + c(L-1)*B^(L-1)
 *
 *      c0 is the first character's code, c1 the second, and so on.
 *      This is one exact integer that represents the ENTIRE message.
 *
 *   3. STORE IT SMALL
 *      Write N in base 256 (raw bytes) plus a tiny header (the alphabet
 *      and the length). When B < 256, each character costs only
 *      log2(B) bits instead of 8 -> fewer bytes than the original. Lossless.
 *
 *   4. DECODE  (get the number, then the characters, back)
 *      Peel the digits back off with repeated divide-and-remainder by B:
 *          c0 = N mod B ;  N = N div B ;  c1 = N mod B ;  ...
 *      Then map each code back to its character.
 *
 * Why it can shrink text: the win comes entirely from B being smaller
 * than 256. It cannot shrink already-random data, and it cannot be
 * applied repeatedly to keep shrinking -- that would violate the
 * pigeonhole principle (no lossless scheme shrinks every input).
 */
(function (root) {
  'use strict';

  // ---- small byte helpers -------------------------------------------------

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function utf8(str) { return enc.encode(str); }          // string -> Uint8Array
  function utf8len(str) { return enc.encode(str).length; } // byte length of a string

  function toBase64(bytes) {
    if (typeof btoa === 'function') {
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return Buffer.from(bytes).toString('base64');
  }

  function fromBase64(str) {
    if (typeof atob === 'function') {
      const bin = atob(str);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return new Uint8Array(Buffer.from(str, 'base64'));
  }

  function toHex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s;
  }

  // LEB128-style varints for the header (base, length, sub-lengths)
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

  // BigInt <-> little-endian bytes
  function bigToBytes(n) {
    const out = [];
    let v = n;
    while (v > 0n) { out.push(Number(v & 0xffn)); v >>= 8n; }
    return out; // [] means zero
  }
  function bytesToBig(bytes) {
    let n = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i]);
    return n;
  }

  // ---- the algorithm ------------------------------------------------------

  /**
   * Analyse a message: split into characters (by Unicode code point so emojis
   * survive), build the smallest alphabet, and assign each character a code.
   */
  function analyze(text) {
    const chars = Array.from(text);            // split by code point
    const indexOf = new Map();
    const symbols = [];
    for (const ch of chars) {
      if (!indexOf.has(ch)) { indexOf.set(ch, symbols.length); symbols.push(ch); }
    }
    const base = symbols.length;               // B
    const codes = chars.map(ch => indexOf.get(ch));
    return { chars, symbols, base, codes, length: chars.length };
  }

  /** Order-0 Shannon entropy of the message, in bits per character. */
  function entropyBitsPerChar(codes, base) {
    const L = codes.length;
    if (L === 0) return 0;
    const counts = new Array(base).fill(0);
    for (const c of codes) counts[c]++;
    let H = 0;
    for (const n of counts) {
      if (n === 0) continue;
      const p = n / L;
      H -= p * Math.log2(p);
    }
    return H;
  }

  /**
   * Full encode. Returns every intermediate value so the UI can show the
   * steps, plus a self-contained base64 "compressed text".
   */
  function encode(text) {
    const a = analyze(text);
    const { symbols, base, codes, length: L } = a;
    const Bb = BigInt(Math.max(base, 1));

    // Step 2: Horner's method folds all codes into one big number N.
    // N = ((...(c[L-1])*B + c[L-2])*B + ...)*B + c[0]
    let N = 0n;
    for (let i = L - 1; i >= 0; i--) N = N * Bb + BigInt(codes[i]);

    const Nbytes = bigToBytes(N);

    // Step 3: pack a self-contained payload:
    //   [varint base][varint L][varint symBytesLen][symBytes][varint NBytesLen][Nbytes]
    const symBytes = utf8(symbols.join(''));
    const out = [];
    writeVarint(out, base);
    writeVarint(out, L);
    writeVarint(out, symBytes.length);
    for (let i = 0; i < symBytes.length; i++) out.push(symBytes[i]);
    writeVarint(out, Nbytes.length);
    for (let i = 0; i < Nbytes.length; i++) out.push(Nbytes[i]);
    const payload = Uint8Array.from(out);

    // Stats
    const originalBytes = utf8len(text);
    const compressedBytes = payload.length;
    const headerBytes = compressedBytes - Nbytes.length;
    const bitsPerChar = L ? (compressedBytes * 8) / L : 0;
    const rawBitsPerChar = base > 1 ? Math.log2(base) : (base === 1 ? 0 : 0);
    const H = entropyBitsPerChar(codes, base);
    const entropyBytes = Math.ceil((H * L) / 8);
    const savingsPercent = originalBytes ? (1 - compressedBytes / originalBytes) * 100 : 0;

    return {
      input: text,
      symbols, base, codes, length: L,
      N, digits: N.toString(),
      Nbytes: Uint8Array.from(Nbytes),
      payload,
      base64: toBase64(payload),
      hex: toHex(payload),
      sizes: { originalBytes, compressedBytes, headerBytes, Nbytes: Nbytes.length },
      bitsPerChar,
      rawBitsPerChar,
      entropyBitsPerChar: H,
      entropyBytes,
      savingsPercent
    };
  }

  /** Decode a payload (Uint8Array) back to the exact original string. */
  function decodePayload(payload) {
    const pos = { i: 0 };
    const base = readVarint(payload, pos);
    const L = readVarint(payload, pos);
    const symLen = readVarint(payload, pos);
    const symBytes = payload.subarray(pos.i, pos.i + symLen); pos.i += symLen;
    const symbols = Array.from(dec.decode(symBytes));
    const NLen = readVarint(payload, pos);
    const Nbytes = payload.subarray(pos.i, pos.i + NLen); pos.i += NLen;

    let N = bytesToBig(Nbytes);
    const Bb = BigInt(Math.max(base, 1));

    const codes = new Array(L);
    for (let k = 0; k < L; k++) {
      if (base <= 1) { codes[k] = 0; }
      else { codes[k] = Number(N % Bb); N = N / Bb; }
    }
    let text = '';
    for (let k = 0; k < L; k++) text += symbols[codes[k]];
    return { text, base, length: L, symbols, codes };
  }

  function decodeBase64(str) { return decodePayload(fromBase64(str)); }

  // ---- image storage -----------------------------------------------------
  //
  // The compressed payload is painted into an image. Each pixel carries three
  // payload bytes across its R, G, B channels; alpha is always 255 so the
  // canvas never premultiplies and destroys data. A 6-byte lead-in (a 2-byte
  // magic tag + a 4-byte length) lets the engine find and size the payload
  // again. To anything else the picture is just noise.
  const IMG_MAGIC = [0x50, 0x42]; // "PB"

  function payloadToImage(payload) {
    const stream = new Uint8Array(6 + payload.length);
    stream[0] = IMG_MAGIC[0];
    stream[1] = IMG_MAGIC[1];
    const len = payload.length;
    stream[2] = (len >>> 24) & 255;
    stream[3] = (len >>> 16) & 255;
    stream[4] = (len >>> 8) & 255;
    stream[5] = len & 255;
    stream.set(payload, 6);

    const pixels = Math.max(1, Math.ceil(stream.length / 3));
    const width = Math.max(1, Math.ceil(Math.sqrt(pixels)));
    const height = Math.max(1, Math.ceil(pixels / width));

    const rgba = new Uint8Array(width * height * 4);
    let s = 0;
    for (let p = 0; p < width * height; p++) {
      const o = p * 4;
      rgba[o]     = s < stream.length ? stream[s++] : 0;
      rgba[o + 1] = s < stream.length ? stream[s++] : 0;
      rgba[o + 2] = s < stream.length ? stream[s++] : 0;
      rgba[o + 3] = 255;
    }
    return { width, height, rgba, streamLength: stream.length, pixels: width * height };
  }

  function imageToPayload(rgba, width, height) {
    const total = width * height;
    const readByte = k => {
      const pixel = Math.floor(k / 3), chan = k % 3;
      if (pixel >= total) throw new RangeError('image ended before payload did');
      return rgba[pixel * 4 + chan];
    };
    if (readByte(0) !== IMG_MAGIC[0] || readByte(1) !== IMG_MAGIC[1]) {
      throw new Error('This image was not made by this engine.');
    }
    const len = readByte(2) * 16777216 + (readByte(3) << 16) + (readByte(4) << 8) + readByte(5);
    const payload = new Uint8Array(len);
    for (let i = 0; i < len; i++) payload[i] = readByte(6 + i);
    return payload;
  }

  function encodeToImage(text) {
    const e = encode(text);
    return Object.assign({}, e, { image: payloadToImage(e.payload) });
  }

  function decodeImage(rgba, width, height) {
    return decodePayload(imageToPayload(rgba, width, height));
  }

  const PBC = {
    analyze, encode, decodePayload, decodeBase64,
    payloadToImage, imageToPayload, encodeToImage, decodeImage,
    entropyBitsPerChar,
    _internal: { toBase64, fromBase64, toHex, bigToBytes, bytesToBig }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PBC;
  root.PBC = PBC;
})(typeof window !== 'undefined' ? window : globalThis);
