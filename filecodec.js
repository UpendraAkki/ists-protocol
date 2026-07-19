/*
 * File <-> Image vault  (FV1)
 * ===========================
 * Store ANY file's bytes inside a single lossless PNG, then rebuild the exact
 * file from that PNG. Used here for video, but it works for any binary file.
 *
 * Why this is NOT the base-N coefficient method:
 *   Video/audio files are already compressed -- their bytes use all 256 values
 *   with almost no redundancy. Base-N packing would give zero gain AND the
 *   BigInt math is O(n^2), hopeless for megabytes. So we pack bytes straight
 *   into pixels: 3 bytes per pixel across R,G,B, alpha pinned at 255 so the
 *   canvas never premultiplies and loses data. This is linear and fast.
 *
 * Layout of the byte stream painted into the image:
 *   [ "FV1" magic (3) ]
 *   [ varint nameLen ][ name (utf8) ]
 *   [ varint mimeLen ][ mime (utf8) ]
 *   [ dataLen (4 bytes, big-endian) ]
 *   [ data ... ]
 * Pixels past the end of the stream are padding (zeros).
 *
 * Honest note: the PNG is not smaller than an already-compressed video. It is
 * a lossless container, not a lossy codec.
 */
(function (root) {
  'use strict';

  const MAGIC = [0x46, 0x56, 0x31]; // "FV1"
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

  /**
   * Build the pixel buffer for a file.
   * @param {Uint8Array} bytes  file contents
   * @param {string} name       original file name
   * @param {string} mime       original mime type (e.g. "video/mp4")
   * @returns {{width, height, rgba: Uint8Array, streamLength, pixels}}
   */
  function fileToImage(bytes, name, mime) {
    const nameBytes = enc.encode(name || '');
    const mimeBytes = enc.encode(mime || 'application/octet-stream');

    const head = [];
    head.push(MAGIC[0], MAGIC[1], MAGIC[2]);
    writeVarint(head, nameBytes.length);
    for (let i = 0; i < nameBytes.length; i++) head.push(nameBytes[i]);
    writeVarint(head, mimeBytes.length);
    for (let i = 0; i < mimeBytes.length; i++) head.push(mimeBytes[i]);
    const len = bytes.length >>> 0;
    head.push((len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255);

    const streamLength = head.length + bytes.length;
    const pixels = Math.max(1, Math.ceil(streamLength / 3));
    // near-square, but keep within canvas limits by preferring a bounded width
    const width = Math.max(1, Math.ceil(Math.sqrt(pixels)));
    const height = Math.max(1, Math.ceil(pixels / width));

    const rgba = new Uint8Array(width * height * 4);
    let h = 0, d = 0; // head index, data index
    for (let p = 0; p < width * height; p++) {
      const o = p * 4;
      for (let c = 0; c < 3; c++) {
        let val = 0;
        if (h < head.length) val = head[h++];
        else if (d < bytes.length) val = bytes[d++];
        rgba[o + c] = val;
      }
      rgba[o + 3] = 255;
    }
    return { width, height, rgba, streamLength, pixels: width * height };
  }

  /**
   * Recover the original file from an image's pixel buffer.
   * @returns {{name, mime, bytes: Uint8Array}}
   */
  function imageToFile(rgba, width, height) {
    const total = width * height;
    // flatten RGB channels (skip alpha) into a byte view on demand
    const readByte = k => {
      const pixel = Math.floor(k / 3), chan = k % 3;
      if (pixel >= total) throw new RangeError('image ended before the data did');
      return rgba[pixel * 4 + chan];
    };

    if (readByte(0) !== MAGIC[0] || readByte(1) !== MAGIC[1] || readByte(2) !== MAGIC[2]) {
      throw new Error('This image was not made by the video vault.');
    }
    // rebuild a small linear buffer to reuse the varint reader
    const linear = [];
    for (let k = 0; k < Math.min(total * 3, 64); k++) linear.push(readByte(k));
    const pos = { i: 3 };
    const nameLen = readVarint(linear, pos);
    let k = pos.i;
    const nameBytes = new Uint8Array(nameLen);
    for (let i = 0; i < nameLen; i++) nameBytes[i] = readByte(k++);
    // mime varint may extend past our 64-byte peek; read directly
    const mimePos = { i: 0 };
    const mimeHead = [];
    for (let j = 0; j < 5; j++) mimeHead.push(readByte(k + j));
    const mimeLen = readVarint(mimeHead, mimePos);
    k += mimePos.i;
    const mimeBytes = new Uint8Array(mimeLen);
    for (let i = 0; i < mimeLen; i++) mimeBytes[i] = readByte(k++);

    const len = readByte(k) * 16777216 + (readByte(k + 1) << 16) + (readByte(k + 2) << 8) + readByte(k + 3);
    k += 4;

    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = readByte(k + i);

    return { name: dec.decode(nameBytes), mime: dec.decode(mimeBytes), bytes };
  }

  const FileVault = { fileToImage, imageToFile, MAGIC };
  if (typeof module !== 'undefined' && module.exports) module.exports = FileVault;
  root.FileVault = FileVault;
})(typeof window !== 'undefined' ? window : globalThis);
