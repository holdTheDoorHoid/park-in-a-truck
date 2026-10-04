"""Capture ground heights (USGS 3DEP lidar) for the planner's demo lots, so they work offline.

Run from the repo root (no keys; public, CORS *):

    ~/Desktop/park-in-a-truck/source/.venv/bin/python src/lib/planner/fixtures/capture_elevation.py

Reads the lot outline from <slug>.json and writes <slug>.elevation.json next to it: the same
raster the planner asks 3DEP for (src/lib/planner/terrain/fetch.ts: a square of +-310 ft
around the lot's vertex average, 1 m cells, bilinear), stored as little-endian Int16
centimetres above a base (src/lib/planner/terrain/grid.ts EncodedGrid), plus the City's
Steep Slope Protection Area check. The 3DEP service can take 5-15 s and sometimes answers
502; this retries a few times. Run by hand, rarely.
"""

import base64
import json
import math
import os
import struct
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SERVICE = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
STEEP = "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Zoning_SteepSlopeProtectArea_r/FeatureServer/0/query"
HALF_FT = 310
CELL_M = 1
SLUGS = ["dover", "greenway"]


def fetch(url, raw=False, tries=5):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "piat-planner-fixture/1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                b = r.read()
                return b if raw else json.loads(b)
        except Exception as e:  # noqa: BLE001 - the service is flaky; retry anything
            print("  retry:", e, file=sys.stderr)
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"gave up on {url}")


def r6(v):
    return round(v * 1e6) / 1e6


def metres_per_degree(lat):
    p = math.radians(lat)
    return (
        111132.954 - 559.822 * math.cos(2 * p) + 1.175 * math.cos(4 * p),
        111412.84 * math.cos(p) - 93.5 * math.cos(3 * p) + 0.118 * math.cos(5 * p),
    )


def capture(slug):
    lot = json.load(open(os.path.join(HERE, f"{slug}.json")))["lot"]
    poly = lot["polygon"]
    if poly[0] == poly[-1]:
        poly = poly[:-1]
    c = (r6(sum(p[0] for p in poly) / len(poly)), r6(sum(p[1] for p in poly) / len(poly)))
    m_lat, m_lng = metres_per_degree(c[1])
    half_m = HALF_FT * 0.3048
    west, east = r6(c[0] - half_m / m_lng), r6(c[0] + half_m / m_lng)
    south, north = r6(c[1] - half_m / m_lat), r6(c[1] + half_m / m_lat)
    n = max(2, round(2 * half_m / CELL_M))
    q = urllib.parse.urlencode(
        {
            "bbox": f"{west},{south},{east},{north}",
            "bboxSR": 4326,
            "imageSR": 4326,
            "size": f"{n},{n}",
            "adjustAspectRatio": "false",
            "format": "bip",
            "pixelType": "F32",
            "noData": -9999,
            "interpolation": "RSP_BilinearInterpolation",
            "f": "image",
        }
    )
    raw = fetch(f"{SERVICE}?{q}", raw=True)
    z = struct.unpack(f"<{n * n}f", raw[: n * n * 4])
    good = [v for v in z if -50 < v < 1000]
    base = math.floor(min(good))
    cm = b"".join(struct.pack("<h", max(-32767, min(32767, round((v - base) * 100))) if -50 < v < 1000 else -32768) for v in z)

    ring = [[r6(x), r6(y)] for x, y in poly] + [[r6(poly[0][0]), r6(poly[0][1])]]
    sq = urllib.parse.urlencode(
        {
            "where": "1=1",
            "geometry": json.dumps({"rings": [ring], "spatialReference": {"wkid": 4326}}, separators=(",", ":")),
            "geometryType": "esriGeometryPolygon",
            "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "returnCountOnly": "true",
            "f": "json",
        }
    )
    steep = fetch(f"{STEEP}?{sq}").get("count", 0) > 0

    out = {
        "slug": slug,
        "capturedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "grid": {
            "bbox": [west, south, east, north],
            "nx": n,
            "ny": n,
            "baseM": base,
            "cm": base64.b64encode(cm).decode("ascii"),
            "source": {"name": "USGS 3DEP lidar", "year": 2015, "cellM": CELL_M},
        },
        "steepSlope": steep,
    }
    path = os.path.join(HERE, f"{slug}.elevation.json")
    with open(path, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(path, f"{n}x{n}", f"{min(good):.2f}-{max(good):.2f} m", "steep slope area" if steep else "not in steep slope area")


if __name__ == "__main__":
    for s in sys.argv[1:] or SLUGS:
        capture(s)
