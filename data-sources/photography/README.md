# Photography

The author's own photographs of their own painted miniatures. Not the
publisher's artwork, and not stock — the app shipped borrowed art once and
does not again (see `public/brand/art.txt`).

| File | Subject | Used by |
| --- | --- | --- |
| `duellists.jpg` | Two duellists across a ruined nave, 4080×3072 | The landing page hero |

These are **sources**, not assets. `scripts/build-hero-image.mjs` grades and
crops `duellists.jpg` into the files the site actually serves; nothing here is
referenced by the app directly, and the 2.1 MB original never reaches a
visitor.

Re-run the bake with:

```bash
node scripts/build-hero-image.mjs
```
