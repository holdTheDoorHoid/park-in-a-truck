#!/usr/bin/env python3
"""Extraction tooling for the content-a workstream (start/acquire/organize/assess
chapters, brand art, downloads). Run with ~/Desktop/park-in-a-truck/source/.venv/bin/python
from anywhere; paths below are absolute so cwd doesn't matter.

This script re-derives everything under public/img/{brand,acquire,assess,toolkit,organize}/
from the raw PDFs in source/. It's a record of how those images were produced, and lets a
later pass re-run extraction if the source PDFs change. It does not touch public/downloads/
(see the ghostscript commands in the content-a final report / git history for those).

Usage: .venv/bin/python scripts/extract_content_a.py [--out DIR]
"""
import io
import os
import sys

SOURCE = os.path.expanduser("~/Desktop/park-in-a-truck/source")
TOOLKIT_PDF = f"{SOURCE}/pdfs/Download_the_Toolkit__1PRN8y4_mh7b3HHJw5Mk1e3lZfdbkSY10.pdf"
ACQUIRE_PDF = f"{SOURCE}/pdfs/01_Acquire_WORKBOOK__1KeAOoGGP6K0Xu_LM8apfaz0PbWvykN8i.pdf"
ASSESS_PDF = f"{SOURCE}/pdfs/03_Assess_WORKBOOK__1rlBpPS4cZGSMBGtljQxVNO4xt5dKaIkG.pdf"


def main(out_dir: str) -> None:
    import fitz  # pymupdf
    import numpy as np
    from PIL import Image

    brand = os.path.join(out_dir, "img", "brand")
    acquire = os.path.join(out_dir, "img", "acquire")
    assess = os.path.join(out_dir, "img", "assess")
    toolkit = os.path.join(out_dir, "img", "toolkit")
    organize = os.path.join(out_dir, "img", "organize")
    for d in (brand, acquire, assess, toolkit, organize):
        os.makedirs(d, exist_ok=True)

    def whiten_transparent(img: "Image.Image", threshold=10, gain=1.5) -> "Image.Image":
        """RGB(A) raster on white -> RGBA with white made transparent."""
        arr = np.array(img.convert("RGBA"))
        rgb = arr[:, :, :3].astype(int)
        dist = 255 - rgb.min(axis=2)
        dist[dist < threshold] = 0
        arr[:, :, 3] = np.clip(dist * gain, 0, 255).astype("uint8")
        out = Image.fromarray(arr, "RGBA")
        bbox = out.getbbox()
        return out.crop(bbox) if bbox else out

    def save_webp(img: "Image.Image", path: str, max_w: int, quality: int) -> None:
        if img.width > max_w:
            nh = round(img.height * max_w / img.width)
            img = img.resize((max_w, nh), Image.LANCZOS)
        img.save(path, "WEBP", quality=quality)
        print(path, img.size)

    # ---- 1. Cover silhouette (toolkit page 1, embedded raster Im0) ----------
    d = fitz.open(TOOLKIT_PDF)
    xref = d[0].get_images(full=True)[0][0]
    info = d.extract_image(xref)
    cover = Image.open(io.BytesIO(info["image"]))
    cover = whiten_transparent(cover, threshold=0, gain=1.0)
    save_webp(cover, os.path.join(brand, "cover-silhouette.webp"), 1600, 90)

    # ---- 2. Six step icons + a "start" vignette (acquire workbook p2, the --
    # ---- contents page with the six numbered isometric cards) --------------
    da = fitz.open(ACQUIRE_PDF)
    page = da[1]  # physical page 2 (0-based index 1): spread with the 6 cards
    dpi = 400
    zoom = dpi / 72
    full = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    full_img = Image.frombytes("RGB", (full.width, full.height), full.samples)

    cards = [
        ("acquire", 23.9, 109.9),
        ("organize", 119.0, 205.0),
        ("assess", 213.1, 299.1),
        ("dream", 306.7, 392.7),
        ("create", 403.5, 489.5),
        ("sustain", 500.3, 586.3),
    ]
    y0, y1 = 337.0, 435.0  # inset inside the card's rounded border, below the number badge
    for name, x0, x1 in cards:
        box = (int((x0 + 5) * zoom), int(y0 * zoom), int((x1 - 5) * zoom), int(y1 * zoom))
        crop = whiten_transparent(full_img.crop(box))
        save_webp(crop, os.path.join(brand, f"step-{name}.webp"), 600, 92)

    # No dedicated "00 intro" icon exists in the PDFs; reuse the truck + speech-bubble
    # vignette from the cover silhouette for step-start.
    start_crop = cover.crop((0, 0, 820, cover.height))
    bbox = start_crop.getbbox()
    if bbox:
        start_crop = start_crop.crop(bbox)
    save_webp(start_crop, os.path.join(brand, "step-start.webp"), 600, 92)

    # ---- 3. Which-lot isometrics (acquire workbook p3: mid-block/corner/alley) --
    page3 = da[2]
    lot_names = {}
    for xref, _, w, h, *_rest in page3.get_images(full=True):
        rect = page3.get_image_rects(xref)[0]
        if rect.x0 < 700:
            lot_names[xref] = "lot-midblock"
        elif rect.x0 < 1000:
            lot_names[xref] = "lot-corner"
        else:
            lot_names[xref] = "lot-alley"
    for xref, name in lot_names.items():
        info = da.extract_image(xref)
        img = Image.open(io.BytesIO(info["image"])).convert("RGB")
        save_webp(img, os.path.join(acquire, f"{name}.webp"), 1200, 80)

    # ---- 3b. Toolkit photo: West Kensington PiaT park site, Acquire chapter opener
    # ---- (p12), a vacant lot staked out with survey flags. No credit in the PDF. ----
    page12 = d[11]
    xref12 = page12.get_images(full=True)[0][0]
    info12 = d.extract_image(xref12)
    img12 = Image.open(io.BytesIO(info12["image"])).convert("RGB")
    save_webp(img12, os.path.join(acquire, "west-kensington-site.webp"), 1200, 58)

    # ---- 4. Assess "site characteristics" diagram (workbook p3, full spread crop,
    # ---- includes the numbered pin callouts baked into the vector overlay) ------
    de = fitz.open(ASSESS_PDF)
    pageE = de[2]
    dpi2 = 300
    zoom2 = dpi2 / 72
    clip = fitz.Rect(645, 133, 1191, 525)
    pix = pageE.get_pixmap(matrix=fitz.Matrix(zoom2, zoom2), clip=clip)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    save_webp(img, os.path.join(assess, "site-characteristics.webp"), 1600, 85)

    # ---- 5. Toolkit photo: Melon Street park, "Why a Park?" page (p7, credit: Matthew Tucker)
    page7 = d[6]
    xref7 = page7.get_images(full=True)[0][0]
    info7 = d.extract_image(xref7)
    img7 = Image.open(io.BytesIO(info7["image"])).convert("RGB")
    save_webp(img7, os.path.join(toolkit, "melon-park.webp"), 1400, 68)

    # ---- 5b. Toolkit photo: Melon Street Park visioning workshop, "The Park in a Truck
    # ---- Story" page (p5; cyan duotone is a vector overlay in the PDF, not baked into
    # ---- the raster — Figure's `duo` prop reproduces it with CSS). No credit in the PDF.
    page5 = d[4]
    xref5 = page5.get_images(full=True)[0][0]
    info5 = d.extract_image(xref5)
    img5 = Image.open(io.BytesIO(info5["image"])).convert("RGB")
    save_webp(img5, os.path.join(toolkit, "community-model-making.webp"), 1400, 68)

    # ---- 6. Toolkit photo: West Kensington PiaT meeting (page 15, Organize opener,
    # ---- no photographer credited in the PDF) -----------------------------------
    page15 = d[14]
    xref15 = page15.get_images(full=True)[0][0]
    info15 = d.extract_image(xref15)
    img15 = Image.open(io.BytesIO(info15["image"])).convert("RGB")
    save_webp(img15, os.path.join(organize, "community-meeting.webp"), 1400, 68)

    print("Done.")


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public"
    )
    main(out)
