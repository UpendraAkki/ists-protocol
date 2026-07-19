# Positional Base-N Compressor

A from-scratch, dependency-free **lossless text compressor** — no zlib, no gzip, no
LZ library. It compresses by turning your message into a single big number and
storing that number in as few bytes as possible.

> **Try it:** run a static server in this folder and open `index.html`
> (see [Run it](#run-it)). Every step is shown visually.

## The idea

This is the exact pipeline the project set out to build:

1. **Give each character a code.** Scan the message and collect only the
   *distinct* characters it uses. That set is the alphabet; its size is the
   **base `B`**. Each character gets a code `0 … B−1`.
2. **Fold every code into one number (the formula).** Read the message as the
   digits of a single number written in base `B`:

   ```
   N = c₀·B⁰ + c₁·B¹ + c₂·B² + … + c_(L−1)·B^(L−1)
   ```

   `c₀` is the first character's code, `c₁` the second, and so on. `N` is one
   exact integer (computed with `BigInt`) that represents the whole message.
3. **Store `N` as bytes.** Written in base 256, `N` needs about `log₂(B)` bits
   per character instead of the usual 8. When `B < 256`, that's fewer bytes than
   the original. A tiny header (the alphabet + the length) makes the output
   self-contained.
4. **Decode.** Peel the digits back off with repeated divide-and-remainder by
   `B` (`c = N mod B`, then `N = N ÷ B`), and map each code back to its
   character. The result is byte-for-byte identical to the input.
5. **Store it as an image.** The compressed bytes are painted into pixels —
   three bytes per pixel across the R, G, B channels (alpha stays 255 so the
   canvas never premultiplies and loses data). A 6-byte lead-in (magic tag +
   length) lets the engine find the payload again. Save the PNG and the message
   is a picture; load the PNG back and the pixels rebuild the number and the
   text — losslessly. To anything but this engine it looks like colored noise.

   > The PNG *container* has ~100 bytes of fixed overhead, so a tiny message
   > makes a file bigger than the text. The image wins on longer input, where
   > PNG's own lossless (DEFLATE) pass compounds the base-N compression.

## How well it compresses

Real numbers from `test.js` (savings vs. UTF-8):

| Input                    | Original | Compressed | Saved |
|--------------------------|---------:|-----------:|------:|
| Single repeated char ×200|    200 B |        6 B | 97.0% |
| Repetitive `abab…`       |     54 B |       13 B | 75.9% |
| Pseudo-DNA (4 symbols)   |    400 B |      109 B | 72.8% |
| Digits only              |     64 B |       41 B | 35.9% |
| English paragraph        |    182 B |      153 B | 15.9% |
| Emoji + text             |     70 B |       67 B |  4.3% |

The win comes entirely from the alphabet being smaller than 256. Small-alphabet
text (DNA, repeated strings) shrinks a lot; text that already uses many
byte-values (random data, dense emoji) barely shrinks.

## Honest limits

- **It can't shrink everything.** No lossless method can — distinct messages need
  distinct outputs, and there aren't enough shorter ones to go around (the
  *pigeonhole principle*).
- **You can't run it on its own output to keep shrinking.** Once the redundancy is
  gone, a second pass only adds header overhead and grows the data.
- The `Limit` readout in the UI is the order-0 **Shannon entropy** — the
  theoretical floor for this kind of model.

## Run it

```bash
# from the project folder
python -m http.server 8000
# then open http://localhost:8000/index.html
```

Run the correctness tests with Node (no dependencies):

```bash
node test.js
```

## Files

| File         | What it is |
|--------------|------------|
| `codec.js`   | The algorithm — `encode`, `decodePayload`, `decodeBase64` (browser + Node) |
| `index.html` | Claude-themed step-by-step visualizer |
| `test.js`    | Round-trip + compression tests |

## API

```js
const PBC = require('./codec.js'); // or window.PBC in the browser

const e = PBC.encode('hello hello hello');
e.base64;                 // the compressed message (self-contained)
e.savingsPercent;         // how much smaller
e.N;                      // the big-number coefficient (BigInt)

const back = PBC.decodeBase64(e.base64);
back.text === 'hello hello hello'; // true

// store as an image, then read it back
const img = PBC.payloadToImage(e.payload);      // { width, height, rgba, ... }
const payload = PBC.imageToPayload(img.rgba, img.width, img.height);
PBC.decodePayload(payload).text === 'hello hello hello'; // true
```

In the browser the visualizer paints `img.rgba` onto a `<canvas>`, exports a
real PNG you can download, and reads a PNG back with `PBC.decodeImage(rgba, w, h)`.

## License

MIT — see [LICENSE](LICENSE).
