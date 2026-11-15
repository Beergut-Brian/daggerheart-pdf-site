#!/usr/bin/env python3
"""Prepare the PDFs for fast web view (does NOT upload anything).

  pip install pikepdf Pillow
  python3 scripts/optimise-pdfs.py [--src ../pdfs] [--out ../pdfs/optimised]

* Hope & Fear (image-only pages): each page JPEG is re-encoded to ~1300 px wide at quality 66 (230 MB -> ~58 MB) and the file
  is rewritten with a plain, single cross-reference table at the end and no object streams.
* The Core Rulebook is NOT rewritten: the original already opens from ~2.5 MB of range requests.
* Not linearised on purpose: measured with pdf.js range requests, linearised copies were WORSE (pdf.js walked the whole file:
  ~56 MB before page 1 vs ~2.5 MB for the plain-xref file).
See scripts/optimise-pdfs.md.
"""
import argparse, io, os, sys
import pikepdf
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("--src", default=os.path.join(os.path.dirname(__file__), "..", "..", "pdfs"))
ap.add_argument("--out", default=None)
ap.add_argument("--width", type=int, default=1300)
ap.add_argument("--quality", type=int, default=66)
a = ap.parse_args()
src = os.path.abspath(a.src); out = os.path.abspath(a.out or os.path.join(src, "optimised")); os.makedirs(out, exist_ok=True)

JOBS = [("Daggerheart-Hope-and-Fear.pdf", True)]

def recompress(pdf):
    n = 0
    for page in pdf.pages:
        for _, im in page.images.items():
            if im.get("/Filter") != pikepdf.Name.DCTDecode or int(im.Width) <= a.width:
                continue
            raw = Image.open(io.BytesIO(im.read_raw_bytes())).convert("RGB")
            h = round(raw.height * a.width / raw.width)
            small = raw.resize((a.width, h), Image.LANCZOS)
            buf = io.BytesIO(); small.save(buf, "JPEG", quality=a.quality, optimize=True, progressive=False)
            im.write(buf.getvalue(), filter=pikepdf.Name.DCTDecode)
            im.Width, im.Height = a.width, h
            im.ColorSpace = pikepdf.Name.DeviceRGB; im.BitsPerComponent = 8
            for k in ("/DecodeParms", "/SMask"):
                if k in im and k == "/DecodeParms": del im[k]
            n += 1
    return n

for name, shrink in JOBS:
    p = os.path.join(src, name)
    if not os.path.exists(p): print("skip (missing)", name); continue
    with pikepdf.open(p) as pdf:
        n = recompress(pdf) if shrink else 0
        dst = os.path.join(out, name)
        pdf.save(dst, linearize=False, compress_streams=True, object_stream_mode=pikepdf.ObjectStreamMode.disable)
    print(f"{name}: {os.path.getsize(p)/1e6:.1f} MB -> {os.path.getsize(dst)/1e6:.1f} MB, plain xref, {n} images re-encoded")
