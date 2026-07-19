/*
 * Adaptive arithmetic coder (order-1), from scratch.
 * ==================================================
 * This is the entropy stage. Where LZW captures repeated SEQUENCES, this
 * captures the SKEW in the data: symbols that occur often are given shorter
 * codes. It's "order-1" -- the probability of each byte is learned per previous
 * byte (context), so it models pairs like "q"->"u". The model is adaptive: the
 * decoder learns the exact same statistics as it reads, so no table is stored.
 *
 * Under the hood it's a Subbotin carryless range coder driving a Fenwick-tree
 * frequency model per context. Everything is exact 32-bit integer math.
 *
 * Honest limit: this approaches the order-1 entropy of the data and no further.
 * Random bytes have maximal entropy, so they do not shrink.
 */
(function (root) {
  'use strict';

  const TOP = 0x01000000;   // 2^24
  const BOT = 0x00010000;   // 2^16
  const SYMS = 256;
  const MAXTOTAL = 0x0000FFFF; // keep total frequency < BOT
  const INC = 24;              // how fast the model adapts

  // Fenwick tree over 256 symbols (1-indexed); symbol s -> index s+1.
  function Fenwick() {
    const t = new Uint32Array(SYMS + 1);
    const freq = new Uint16Array(SYMS);
    for (let s = 0; s < SYMS; s++) freq[s] = 1;
    // build all-ones tree
    for (let i = 1; i <= SYMS; i++) { t[i] += 1; const j = i + (i & -i); if (j <= SYMS) t[j] += t[i]; }
    let total = SYMS;

    function prefix(i) { let s = 0; for (; i > 0; i -= i & -i) s += t[i]; return s; }
    function add(sym, v) { for (let i = sym + 1; i <= SYMS; i += i & -i) t[i] += v; }
    function rebuild() {
      t.fill(0);
      for (let i = 1; i <= SYMS; i++) { t[i] += freq[i - 1]; const j = i + (i & -i); if (j <= SYMS) t[j] += t[i]; }
    }
    function bump(sym) {
      freq[sym] += INC; add(sym, INC); total += INC;
      if (total > MAXTOTAL) {
        total = 0;
        for (let s = 0; s < SYMS; s++) { freq[s] = (freq[s] >> 1) || 1; total += freq[s]; }
        rebuild();
      }
    }
    // smallest index (1..SYMS) whose prefix > target
    function findGreater(target) {
      let pos = 0, cum = 0;
      for (let k = 8; k >= 0; k--) {
        const next = pos + (1 << k);
        if (next <= SYMS && cum + t[next] <= target) { pos = next; cum += t[next]; }
      }
      return { sym: pos, cum }; // sym is 0..255, cum = cumBefore(sym)
    }
    return {
      cumBefore: sym => prefix(sym),           // sum of freqs for symbols < sym
      freqOf: sym => prefix(sym + 1) - prefix(sym),
      getTotal: () => total,
      bump, findGreater
    };
  }

  function newModel() { const m = new Array(SYMS); for (let i = 0; i < SYMS; i++) m[i] = Fenwick(); return m; }

  // ---- encode ----
  function encodeBytes(bytes) {
    const out = [];
    let low = 0, range = 0xFFFFFFFF;
    const model = newModel();
    let ctx = 0;

    const renorm = () => {
      while ((((low ^ (low + range)) >>> 0) < TOP) ||
             (range < BOT && ((range = ((-low >>> 0) & (BOT - 1)) >>> 0), true))) {
        out.push((low >>> 24) & 0xff);
        low = (low << 8) >>> 0;
        range = (range << 8) >>> 0;
      }
    };

    for (let i = 0; i < bytes.length; i++) {
      const sym = bytes[i];
      const fen = model[ctx];
      const total = fen.getTotal();
      const cum = fen.cumBefore(sym);
      const freq = fen.freqOf(sym);

      range = Math.floor(range / total);
      low = (low + cum * range) >>> 0;
      range = (range * freq) >>> 0;
      renorm();

      fen.bump(sym);
      ctx = sym;
    }
    // flush
    for (let k = 0; k < 4; k++) { out.push((low >>> 24) & 0xff); low = (low << 8) >>> 0; }
    return Uint8Array.from(out);
  }

  // ---- decode ----
  function decodeBytes(data, outLen) {
    const out = new Uint8Array(outLen);
    let low = 0, range = 0xFFFFFFFF, code = 0, p = 0;
    for (let k = 0; k < 4; k++) code = ((code << 8) >>> 0 | (data[p++] || 0)) >>> 0;
    const model = newModel();
    let ctx = 0;

    const renorm = () => {
      while ((((low ^ (low + range)) >>> 0) < TOP) ||
             (range < BOT && ((range = ((-low >>> 0) & (BOT - 1)) >>> 0), true))) {
        code = ((code << 8) >>> 0 | (data[p++] || 0)) >>> 0;
        low = (low << 8) >>> 0;
        range = (range << 8) >>> 0;
      }
    };

    for (let i = 0; i < outLen; i++) {
      const fen = model[ctx];
      const total = fen.getTotal();
      range = Math.floor(range / total);
      let value = Math.floor(((code - low) >>> 0) / range);
      if (value >= total) value = total - 1;

      const { sym, cum } = fen.findGreater(value);
      const freq = fen.freqOf(sym);

      low = (low + cum * range) >>> 0;
      range = (range * freq) >>> 0;
      renorm();

      out[i] = sym;
      fen.bump(sym);
      ctx = sym;
    }
    return out;
  }

  const Range = { encodeBytes, decodeBytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = Range;
  root.Range = Range;
})(typeof window !== 'undefined' ? window : globalThis);
