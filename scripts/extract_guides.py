#!/usr/bin/env python3
"""Render hero + step images for the 13 Park in a Truck assembly guides.

These are Ikea-style landscape PDFs (source/pdfs/*, source/linked/*). Each page
mixes a left instructions column (paragraph text + a black "STEP n" badge) with
an isometric line-art diagram on the right. We want just the diagram, tightly
cropped, as a webp.

Approach: render the page, then find the bounding box of all ink that is NOT
covered by a get_text() text block (the paragraph, dimension labels still show
because they're outside the masked rectangles) and not the black "STEP n" badge
(a filled vector rect pinned to the top-left corner, found via get_drawings()).
Crop the ORIGINAL (unmasked) page to that box + a little padding.

A couple of covers have a decorative background illustration that extends behind
the title text; auto-crop can't cleanly exclude it, so those use an explicit
--box override (see HERO_OVERRIDES below).

Usage:
    source/.venv/bin/python scripts/extract_guides.py [slug]

Run with no argument to regenerate every guide; pass a slug (e.g. "stool") to
redo just one. Writes to public/img/guides/<slug>/{hero,thumb,step-NN}.webp.
"""
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
# Shared, git-ignored source checkout: a sibling of the park-in-a-truck-wt/<agent>
# worktrees, e.g. ~/Desktop/park-in-a-truck/source. Override with PIAT_SOURCE if
# your checkout lives elsewhere.
SRC = os.environ.get(
    "PIAT_SOURCE",
    os.path.normpath(os.path.join(HERE, "..", "..", "..", "park-in-a-truck", "source")),
)
OUT_ROOT = os.path.join(HERE, "..", "public", "img", "guides")

# slug -> { pdf, content_pages: [page indices after the cover/legal/materials
# pages -- these become step-01.webp, step-02.webp, ... in order] }
GUIDES = {
    "bench-back": {
        "pdf": f"{SRC}/pdfs/BENCH_BACK__1wL5LkAbjcsQNkjuRFL875xBUHaMMwywq.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9, 10],
    },
    "bench-4": {
        "pdf": f"{SRC}/pdfs/4_BENCH_w_o_BACK__1wKJGESzcMc70o3XbFcOYiRDzM4PqLSqL.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9],
    },
    "stool": {
        "pdf": f"{SRC}/pdfs/STOOL_ASSEMBLY__1wrFWH4chl955Cb6ykrQcppYR2fRvyoZI.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8],
    },
    "table-2": {
        "pdf": f"{SRC}/pdfs/2_TABLE__1Kyw38wMQHKz2H6hEHvfCtLGw3xDgN-tR.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8],
    },
    "table-4": {
        "pdf": f"{SRC}/pdfs/4_Table__1wif_TJX1MZVTN47jDzllfht4_NLv898U.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8],
    },
    "table-6": {
        "pdf": f"{SRC}/pdfs/6_TABLE__1uDF-yv5iN6n7A5lBenVMAqF7RaMIduP2.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8],
    },
    "planter-18": {
        "pdf": f"{SRC}/pdfs/18_Planter_Box__1NvaPiVACpwY6gRncLVIsnbMX9up6UaQH.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9],
    },
    "planter-24": {
        "pdf": f"{SRC}/pdfs/24_Planter_Box__1paOSVbhQMzFIy7VmnM85X1nZXuzH2P6Z.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9],
    },
    "gabion-bench": {
        "pdf": f"{SRC}/pdfs/GABION_BENCH_ASSEMBLY__1vpvureZNifOiGvmEQ0Tdw_woYWJgwliA.pdf",
        "content_pages": [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    },
    "gabion-bench-8": {
        "pdf": f"{SRC}/pdfs/8_GABION_BENCH_ASSEMBLY__19eg-BHADYyu1U9T7uuWNetp4MyKdUaEC.pdf",
        "content_pages": [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    },
    "shade": {
        "pdf": f"{SRC}/pdfs/SHADE_Assembly__19kGLV_c5iZq6uo91-cF5VfVWAvSw9Nt3.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    "stage": {
        "pdf": f"{SRC}/linked/04_Dream_WORKBOOK_p19_STAGE__19dSJ1Pvs1MkdhZKHpZZ7hGyZlSMI34Ak.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9, 10, 11],
    },
    "workbench": {
        "pdf": f"{SRC}/linked/04_Dream_WORKBOOK_p19_WORKBENCH_STANDING_TABLE__1wiFKsj-9fz2dLMWBv45EYQZBP4ePc7eW.pdf",
        "content_pages": [3, 4, 5, 6, 7, 8, 9],
    },
}

# Cover pages whose auto-crop picks up a decorative background that bleeds
# into the title text; crop to an explicit PDF-point box instead.
HERO_OVERRIDES = {
    "workbench": (60, 20, 792, 445),
    "planter-24": (77, 117, 705, 400),
}


def ink_bbox_excluding_text(page, pad_pt=6):
    zoom = 2.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")
    arr = np.array(img)
    mask = arr < 250

    def blank(x0, y0, x1, y1, pad=0):
        px0, py0 = int((x0 - pad) * zoom), int((y0 - pad) * zoom)
        px1, py1 = int((x1 + pad) * zoom), int((y1 + pad) * zoom)
        px0, py0 = max(0, px0), max(0, py0)
        px1, py1 = min(mask.shape[1], px1), min(mask.shape[0], py1)
        mask[py0:py1, px0:px1] = False

    for b in page.get_text("blocks"):
        blank(*b[:4], pad_pt)

    # "STEP n" badge: a filled vector box pinned to the top-left corner.
    for d in page.get_drawings():
        r = d["rect"]
        if r.width * r.height > 400 and r.x0 < 160 and r.y0 < 160:
            blank(r.x0, r.y0, r.x1, r.y1, 4)

    ys, xs = mask.nonzero()
    if len(xs) == 0:
        return None
    return (xs.min() / zoom, ys.min() / zoom, xs.max() / zoom, ys.max() / zoom)


def crop_page(page, out_path, pad=14, maxw=1400, quality=82, zoom=3.0, box=None):
    if box:
        x0, y0, x1, y1 = box
    else:
        bbox = ink_bbox_excluding_text(page)
        if bbox is None:
            print(f"  !! no ink found for {out_path}")
            return
        x0, y0, x1, y1 = bbox
        x0 -= pad
        y0 -= pad
        x1 += pad
        y1 += pad
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(page.rect.width, x1), min(page.rect.height, y1)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=pymupdf.Rect(x0, y0, x1, y1))
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    if img.width > maxw:
        img = img.resize((maxw, int(img.height * maxw / img.width)), Image.LANCZOS)
    img.save(out_path, "WEBP", quality=quality)
    print(f"  {os.path.basename(out_path)}: ({x0:.0f},{y0:.0f},{x1:.0f},{y1:.0f}) -> {img.width}x{img.height}")


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for slug, cfg in GUIDES.items():
        if only and slug != only:
            continue
        print(f"=== {slug} ===")
        doc = pymupdf.open(cfg["pdf"])
        out_dir = os.path.join(OUT_ROOT, slug)
        os.makedirs(out_dir, exist_ok=True)

        hero_path = os.path.join(out_dir, "hero.webp")
        crop_page(doc[0], hero_path, pad=20, maxw=1400, quality=84, box=HERO_OVERRIDES.get(slug))

        for i, pg in enumerate(cfg["content_pages"], start=1):
            crop_page(doc[pg], os.path.join(out_dir, f"step-{i:02d}.webp"), pad=14, maxw=1400, quality=82)

        # thumbnail for the /build/ grid card, from the hero we just made
        im = Image.open(hero_path).convert("RGB")
        w = 640
        im.resize((w, int(im.height * w / im.width)), Image.LANCZOS).save(
            os.path.join(out_dir, "thumb.webp"), "WEBP", quality=80
        )


if __name__ == "__main__":
    main()
