# Lossless compression, built from scratch

A dependency-free playground for lossless data compression — no zlib, no gzip,
no LZ library. Everything here is written from first principles and verified
lossless, and every page is honest about *when* it compresses and when it can't.

Run a static server in the folder and open any page:

```bash
python -m http.server 8000     # then open http://localhost:8000/
node test.js && node lzw.test.js && node pack.test.js && node filecodec.test.js
```

## The three pages

| Page | What it does |
|------|--------------|
| `index.html`   | **Text compressor** — the base-N idea: each character → a code, all codes fold into one big number, stored compactly. A 6-step visual explainer. |
| `compress.html`| **Compress → Image** — compress text/any file with the best method, then paint the small result into a PNG. Reload the PNG to get every byte back. |
| `video.html`   | **Video ⇄ Image vault** — store a whole video (audio included) as one lossless PNG and rebuild the exact, playable file. |

## The engines

| File | Method | Best at |
|------|--------|---------|
| `codec.js`  | **base-N positional** — one big `BigInt` per message | teaching; small-alphabet text |
| `lzw.js`    | **LZW dictionary** — learns repeated sequences | long / repetitive text (linear time) |
| `range.js`  | **order-1 arithmetic** — adaptive Subbotin range coder + Fenwick model | natural language |
| `pack.js`   | **smart packer** — tries raw / lzw / o1 / lzw+o1, keeps the smallest | anything (never larger than input+2) |
| `filecodec.js` | **file ⇄ pixels** — pack bytes 3-per-pixel into a lossless PNG | storing any bytes as an image |

### Real numbers (`node pack.test.js`)

| Input | Original | Packed | Method |
|-------|---------:|-------:|--------|
| English ×200 | 18 KB | 3.5 KB (81%) | lzw |
| DNA 20 KB    | 20 KB | 1.6 KB (92%) | lzw |
| JSON ×100    | 5.9 KB | 1.3 KB (78%) | o1 |
| Random 2 KB  | 2 KB | 2 KB (0%) | raw |

The longer and more repetitive the text, the bigger the win.

## What is — and isn't — possible (read this)

Compression is not magic; it trades on **redundancy**, and the limit is real:

- **No lossless method shrinks every input.** Distinct messages need distinct
  outputs, and there aren't enough shorter ones to go around — the *pigeonhole
  principle*. Random / already-compressed data (`.mp4`, `.jpg`, `.zip`) does not
  get smaller. Our packer notices and stores it `raw`.
- **You can't recompress output to keep shrinking.** Once redundancy is gone, a
  second pass only adds overhead.
- **Video-as-image isn't smaller** — an `.mp4` is already compressed, so its
  lossless image is ~the same size. Making video genuinely smaller needs *lossy*
  re-encoding (dropping detail), which is a different, opt-in tool.
- **QR codes hold ~2.9 KB max**, so they only fit small compressed payloads —
  a transport for tiny data, not a compression method.

Everything is verified with fuzz tests (thousands of random inputs, all
lossless) and live in-browser round-trips.

## Verification

```bash
node test.js           # base-N: text + image round trips
node lzw.test.js       # LZW: 4500 fuzz cases + ratios
node range... (in pack.test) # arithmetic coder: 5000 fuzz cases
node pack.test.js      # smart packer: 4000 fuzz cases + method selection
node filecodec.test.js # file <-> image round trips
```

## License

MIT — see [LICENSE](LICENSE).
