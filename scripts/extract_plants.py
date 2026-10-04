#!/usr/bin/env python3
"""Extract plants.json + plant photos from the four PiaT Dream-workbook plant-list
spreadsheets ("BACK-END" sheet = master list, "INSERT HERE" sheet = the worked
calculator example, whose IMAGE column holds photos for the plants in that example).

Run with the project's python venv (has openpyxl + Pillow):
  ~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/extract_plants.py

Reads (absolute, git-ignored source — shared, read-only):
  ~/Desktop/park-in-a-truck/source/linked/04_Dream_WORKBOOK_p20_<THEME>_PLANT_LIST__*.xlsx

Writes:
  src/data/plants.json
  public/img/plants/<id>.webp
"""
from __future__ import annotations

import io
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import openpyxl
from PIL import Image

SOURCE = Path.home() / "Desktop/park-in-a-truck/source"
REPO = Path(__file__).resolve().parents[1]
OUT_JSON = REPO / "src/data/plants.json"
OUT_IMG = REPO / "public/img/plants"

THEME_FILES = {
    "edible": SOURCE / "linked/04_Dream_WORKBOOK_p20_EDIBLE_PLANT_LIST__1QsoQ6KYBT5tVrlAtTxoD5q0yP2YS5Wyt.xlsx",
    "sanctuary": SOURCE / "linked/04_Dream_WORKBOOK_p20_SANCTUARY_PLANT_LIST__1RhCdaiCLbEJD8KXiX7uJMD7xJFRNCERy.xlsx",
    "nature": SOURCE / "linked/04_Dream_WORKBOOK_p20_NATURE_PLANT_LIST__1eEVK3dpBy1-xBFDaACIOTMB2Dd9COGvz.xlsx",
    "event": SOURCE / "linked/04_Dream_WORKBOOK_p20_EVENT_PLANT_LIST__1oy_aLqP7RoBcHngZ_uFMl_YBvzJ271MR.xlsx",
}

NS = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def norm(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


# ---------------------------------------------------------------------------
# BACK-END parsing: the master plant list, grouped by type and by sun/shade
# ---------------------------------------------------------------------------

TYPE_KEYWORDS = [
    (re.compile(r"large\s*tree", re.I), "large-tree"),
    (re.compile(r"small\s*tree", re.I), "small-tree"),
    (re.compile(r"shrub", re.I), "shrub"),
    (re.compile(r"perennial", re.I), "perennial"),
]

HEADER_LABELS = {
    "BOTANICAL NAME": "botanical",
    "COMMON NAME": "common",
    "MATURE SIZE": "matureSize",
    "SIZE": "containerSize",
    "CULTIVAR": "cultivar",
    "COST": "cost",
}


def find_columns(ws):
    """Scan the first several rows for header labels; labels may be split
    across two header rows (seen in the Nature/Event sheets)."""
    colmap: dict[str, int] = {}
    attr_label = None
    attr_col = None
    for row in ws.iter_rows(min_row=1, max_row=6):
        for cell in row:
            if cell.value is None:
                continue
            label = norm(cell.value).upper()
            if label in HEADER_LABELS:
                colmap[HEADER_LABELS[label]] = cell.column
            elif label.startswith("AVAIL"):
                colmap["cultivar"] = cell.column
            elif label in ("EDIBLE PARTS", "SENSORY ATTRIBUTES"):
                attr_label = norm(cell.value).title()
                attr_col = cell.column
    return colmap, attr_label, attr_col


def parse_back_end(theme: str, path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["BACK-END"]
    colmap, attr_label, attr_col = find_columns(ws)
    botanical_col = colmap["botanical"]
    common_col = colmap["common"]

    entries = []
    current_type = None
    light = "sun"
    seen_ids: dict[str, int] = {}

    for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
        a_val = norm(row[0].value) if len(row) > 0 else ""  # column A
        bot_cell = row[botanical_col - 1] if len(row) >= botanical_col else None
        common_cell = row[common_col - 1] if len(row) >= common_col else None
        bot_val = norm(bot_cell.value) if bot_cell is not None else ""
        common_val = norm(common_cell.value) if common_cell is not None else ""

        if "plant choices" in a_val.lower() and "shade" in a_val.lower():
            light = "shade"
            continue
        if "plant choices" in a_val.lower() and "sun" in a_val.lower():
            light = "sun"
            continue

        if bot_val and not common_val:
            # Section / type header row (e.g. "Small Trees", "Shade Shrubs"), or a
            # stray note ("*Consider leaving patches..."). Only type headers change state.
            matched = False
            for pattern, type_id in TYPE_KEYWORDS:
                if pattern.search(bot_val):
                    current_type = type_id
                    matched = True
                    break
            # A bare "Shrubs"/"Perennials" header inside the shade block doesn't
            # change `light` (already set by the "Plant Choices for Shade" marker).
            continue

        if not bot_val or not common_val or current_type is None:
            continue  # blank row, or data before the first type header

        mature = norm(row[colmap["matureSize"] - 1].value) if "matureSize" in colmap and len(row) >= colmap["matureSize"] else ""
        container = norm(row[colmap["containerSize"] - 1].value) if "containerSize" in colmap and len(row) >= colmap["containerSize"] else ""
        cultivar = norm(row[colmap["cultivar"] - 1].value) if "cultivar" in colmap and len(row) >= colmap["cultivar"] else ""
        cost_cell = row[colmap["cost"] - 1].value if "cost" in colmap and len(row) >= colmap["cost"] else None
        try:
            unit_cost = round(float(cost_cell), 2) if cost_cell is not None else None
        except (TypeError, ValueError):
            unit_cost = None
        attr_val = norm(row[attr_col - 1].value) if attr_col and len(row) >= attr_col else ""

        # Source quirk: a few rows (the Edible sheet's "annual choices" and shade
        # sub-tables) are missing a trailing column, so the cost value ends up
        # typed into the attribute column instead of the cost column. If that's
        # a bare number, it's the cost, not an attribute.
        if unit_cost is None and attr_val:
            try:
                unit_cost = round(float(attr_val), 2)
                attr_val = ""
            except ValueError:
                pass

        # Same column-shift quirk: a bare word with no digit in the mature-size
        # cell (e.g. "'Larinem Park'") is a stray cultivar name, not a size.
        if mature and not re.search(r"[0-9]", mature):
            if not cultivar:
                cultivar = mature
            mature = ""

        notes = []
        if attr_val:
            notes.append(f"{attr_label}: {attr_val}" if attr_label else attr_val)
        if cultivar and cultivar.lower() not in ("avail cult.", ""):
            notes.append(f"Cultivar: {cultivar.strip(chr(39))}")

        base_id = f"{theme}-{current_type}-{light}-{slugify(common_val)}"
        n = seen_ids.get(base_id, 0)
        seen_ids[base_id] = n + 1
        plant_id = base_id if n == 0 else f"{base_id}-{n + 1}"

        entries.append(
            {
                "id": plant_id,
                "theme": theme,
                "botanical": bot_val,
                "common": common_val,
                "type": current_type,
                "light": light,
                "matureSize": mature or None,
                "containerSize": container or None,
                "unitCost": unit_cost,
                "notes": "; ".join(notes) or None,
                "_row": row[0].row,
            }
        )
    return entries


# ---------------------------------------------------------------------------
# INSERT HERE sheet: resolve each example plant row's photo (if any)
# ---------------------------------------------------------------------------


def sheet_target_for(zf: zipfile.ZipFile, sheet_name: str) -> str:
    wb_xml = ET.fromstring(zf.read("xl/workbook.xml"))
    rels_xml = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target = {
        el.get("Id"): el.get("Target") for el in rels_xml.findall("rel:Relationship", NS)
    }
    for sheet_el in wb_xml.findall("main:sheets/main:sheet", NS):
        if sheet_el.get("name") == sheet_name:
            rid = sheet_el.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            return "xl/" + rid_to_target[rid]
    raise KeyError(sheet_name)


def drawing_for_sheet(zf: zipfile.ZipFile, sheet_path: str) -> str | None:
    rels_path = sheet_path.rsplit("/", 1)[0] + "/_rels/" + sheet_path.rsplit("/", 1)[1] + ".rels"
    try:
        rels_xml = ET.fromstring(zf.read(rels_path))
    except KeyError:
        return None
    for el in rels_xml.findall("rel:Relationship", NS):
        if el.get("Type", "").endswith("/drawing"):
            return "xl/" + el.get("Target").replace("../", "")
    return None


def image_anchors(zf: zipfile.ZipFile, drawing_path: str) -> list[tuple[int, str]]:
    """Return [(excel_row_1indexed, media_path), ...] for every picture anchor."""
    drawing_xml = ET.fromstring(zf.read(drawing_path))
    rels_path = drawing_path.rsplit("/", 1)[0] + "/_rels/" + drawing_path.rsplit("/", 1)[1] + ".rels"
    try:
        rels_xml = ET.fromstring(zf.read(rels_path))
        rid_to_target = {el.get("Id"): el.get("Target") for el in rels_xml.findall("rel:Relationship", NS)}
    except KeyError:
        rid_to_target = {}

    out = []
    for anchor in list(drawing_xml.findall("xdr:oneCellAnchor", NS)) + list(drawing_xml.findall("xdr:twoCellAnchor", NS)):
        from_el = anchor.find("xdr:from", NS)
        row0 = int(from_el.find("xdr:row", NS).text)
        blip = anchor.find(".//a:blip", NS)
        if blip is None:
            continue
        rid = blip.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
        target = rid_to_target.get(rid)
        if not target:
            continue
        media_path = "xl/drawings/" + target if not target.startswith("../") else "xl/" + target.replace("../", "")
        out.append((row0 + 1, media_path))
    return out


def extract_photos(theme: str, path: Path, entries: list[dict]) -> dict[str, bytes]:
    """row-in-INSERT-HERE -> plant name (via the 'PLANT' column's cached
    value, which is a formula reading from BACK-END) -> matching entry id."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["INSERT HERE"]
    # Map every BACK-END source row number to the entry built from it, and also
    # index entries by (type, light, common-name-lowercase) as a fallback.
    by_row = {e["_row"]: e for e in entries}
    by_name = {}
    for e in entries:
        by_name.setdefault(e["common"].lower(), e)

    # Find the PLANT column on this sheet (header cell literally "PLANT").
    plant_col = None
    for row in ws.iter_rows(min_row=1, max_row=15):
        for cell in row:
            if norm(cell.value).upper() == "PLANT":
                plant_col = cell.column
                break
        if plant_col:
            break
    if plant_col is None:
        plant_col = 2  # column B, true for every sheet observed

    photos: dict[str, bytes] = {}
    with zipfile.ZipFile(path) as zf:
        sheet_path = sheet_target_for(zf, "INSERT HERE")
        drawing_path = drawing_for_sheet(zf, sheet_path)
        if drawing_path is None:
            print(f"  [{theme}] no drawing on INSERT HERE — skipping photos")
            return photos
        anchors = image_anchors(zf, drawing_path)
        for excel_row, media_path in anchors:
            name_cell = ws.cell(row=excel_row, column=plant_col)
            name = norm(name_cell.value).lower()
            entry = by_name.get(name)
            if entry is None:
                continue
            try:
                photos[entry["id"]] = zf.read(media_path)
            except KeyError:
                print(f"  [{theme}] missing media {media_path} for row {excel_row}")
    return photos


def save_webp(data: bytes, out_path: Path, max_width: int = 400, quality: int = 75):
    img = Image.open(io.BytesIO(data))
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, max(1, round(img.height * ratio))), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "WEBP", quality=quality)


def main():
    all_entries = []
    photo_count = 0
    for theme, path in THEME_FILES.items():
        if not path.exists():
            print(f"!! missing source file for {theme}: {path}")
            continue
        entries = parse_back_end(theme, path)
        print(f"{theme}: {len(entries)} plant entries from BACK-END")

        # Large/small trees are never actually asked about by sun vs shade on the
        # "Count your plants" page (the orange cell is one number, no split) --
        # only treat a type as split-by-light within a theme if that theme's own
        # BACK-END list really does have a *shade* sub-section for it (so far,
        # only Sanctuary's small trees do). Otherwise mark it 'both' rather than
        # the misleading literal 'sun' default from the section it was read from.
        # Done before photo-matching/id-use below so the id stays consistent.
        for type_id in ("large-tree", "small-tree"):
            of_type = [e for e in entries if e["type"] == type_id]
            if of_type and not any(e["light"] == "shade" for e in of_type):
                for e in of_type:
                    e["id"] = e["id"].replace(f"-{type_id}-sun-", f"-{type_id}-both-", 1)
                    e["light"] = "both"

        photos = extract_photos(theme, path, entries)
        print(f"{theme}: {len(photos)} photos matched")
        for e in entries:
            if e["id"] in photos:
                e["photo"] = f"/img/plants/{e['id']}.webp"
                save_webp(photos[e["id"]], OUT_IMG / f"{e['id']}.webp")
                photo_count += 1
            else:
                e["photo"] = None
            del e["_row"]

        all_entries.extend(entries)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(all_entries, indent=2, ensure_ascii=False) + "\n")
    print(f"\nWrote {len(all_entries)} entries to {OUT_JSON}")
    print(f"Wrote {photo_count} photos to {OUT_IMG}")


if __name__ == "__main__":
    main()
