# Optimising the PDFs for the web

`scripts/optimise-pdfs.py` writes the web copy of Hope & Fear to `../pdfs/optimised/` (nothing is uploaded).

```bash
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pikepdf Pillow
/tmp/venv/bin/python scripts/optimise-pdfs.py            # --width 1300 --quality 66 by default
```

## What it does, and what was measured
| file | action | result | bytes read before page 1 paints (pdf.js, range requests) |
| --- | --- | --- | --- |
| `Daggerheart-optimized.pdf` (core) | none: the original is already range-friendly | 98.5 MB | ~2.5 MB, ~1.5 s locally |
| `Daggerheart-Hope-and-Fear.pdf` | page JPEGs 2164 px → 1300 px wide, q66; plain xref, no object streams | 230 MB → 57.8 MB | ~0.4 MB, ~0.7 s locally |

- **Do not linearise.** Linearised ("fast web view") copies were tested and were worse in pdf.js: it walked the whole file backwards (~50–60 MB read before page 1) for both books. A plain single xref at the end opens from the last ~256 KB plus the first page's objects.
- Text stays readable at 1300 px (checked on a stat-block page); art pages show mild JPEG softening. Raise `--width`/`--quality` if Kaden wants more (1600/80 gives 102 MB).
- Upload `Daggerheart-Hope-and-Fear.pdf` from `../pdfs/optimised/` to R2 under the **same name**. Keep range support and CORS exposing `Content-Length, Content-Range, Accept-Ranges` (the R2 bucket already does).
- The viewer opens PDFs with `disableStream: true` (range chunks of 256 KB). With `disableStream: false`, pdf.js streamed 45–125 MB before first paint.
- After replacing Hope & Fear, the search index does not change (it comes from the OCR file, page order is unchanged).
