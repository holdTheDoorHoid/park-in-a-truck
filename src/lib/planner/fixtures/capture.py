"""Capture planner demo fixtures from the City of Philadelphia's open data.

Run from the repo root with the project venv (no keys needed; all endpoints are public, CORS *):

    ~/Desktop/park-in-a-truck/source/.venv/bin/python src/lib/planner/fixtures/capture.py

Writes one JSON per site next to this file. Each file is a `SiteFixture` (see ../site.ts):
the LotRecord for the parcel plus its surroundings (buildings with City heights, neighbouring
parcels, street trees, street centrelines). Owner names of private parcels are NOT stored.
Be polite: this is meant to be run by hand, rarely.
"""

import json
import math
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CARTO = "https://phl.carto.com/api/v2/sql"
ARC = "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services"
AIS = "https://api.phila.gov/ais/v1/search/"

SITES = [
    {"slug": "dover", "address": "1322 N DOVER ST", "lotType": "mid-block", "keep_owner": True},
    {"slug": "greenway", "address": "2061 S 60TH ST", "lotType": "corner", "keep_owner": False},
]
BUILDING_RADIUS_FT = 260
TREE_RADIUS_FT = 180
STREET_RADIUS_FT = 200
PARCEL_RADIUS_FT = 120


def get(url, params):
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(f"{url}?{q}" if params else url, headers={"User-Agent": "piat-planner-fixture/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def r7(v):
    return round(v, 7)


def ring(coords):
    return [[r7(x), r7(y)] for x, y in coords]


def envelope(lng, lat, radius_ft):
    dlat = radius_ft / 364000.0
    dlng = radius_ft / (364000.0 * math.cos(math.radians(lat)))
    return f"{lng - dlng},{lat - dlat},{lng + dlng},{lat + dlat}"


def arc_query(layer, env, fields):
    return get(
        f"{ARC}/{layer}/FeatureServer/0/query",
        {
            "geometry": env,
            "geometryType": "esriGeometryEnvelope",
            "inSR": 4326,
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": fields,
            "outSR": 4326,
            "f": "geojson",
            "resultRecordCount": 2000,
        },
    )["features"]


def capture(site):
    ais = get(AIS + urllib.parse.quote(site["address"]), {})["features"][0]
    p = ais["properties"]
    lng, lat = ais["geometry"]["coordinates"]
    pid = p["pwd_parcel_id"]
    row = get(
        CARTO,
        {"q": f"SELECT parcelid, address, owner1, owner2, gross_area, ST_AsGeoJSON(the_geom) AS geom FROM pwd_parcels WHERE parcelid={int(pid)}"},
    )["rows"][0]
    geom = json.loads(row["geom"])
    poly = geom["coordinates"][0][0] if geom["type"] == "MultiPolygon" else geom["coordinates"][0]
    # centre of the parcel, for the surroundings queries
    clng = sum(c[0] for c in poly[:-1]) / (len(poly) - 1)
    clat = sum(c[1] for c in poly[:-1]) / (len(poly) - 1)

    owners = [o for o in (row.get("owner1"), row.get("owner2")) if o] if site["keep_owner"] else []
    lot = {
        "query": site["address"],
        "address": p["street_address"],
        "opa": p.get("opa_account_num"),
        "pwdParcelId": int(pid),
        "dorParcelId": p.get("dor_parcel_id"),
        "lat": r7(lat),
        "lng": r7(lng),
        "owners": owners,
        "ownerType": "city" if site["keep_owner"] and "CITY" in (row.get("owner1") or "") else "unknown",
        "category": "VACANT LAND",
        "areaSqFt": row.get("gross_area"),
        "polygon": ring(poly),
        "lotType": site["lotType"],
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": [
            {"label": "Address (AIS)", "url": AIS + urllib.parse.quote(site["address"])},
            {"label": "Parcel outline (PWD parcels)", "url": "https://phl.carto.com/api/v2/sql"},
        ],
    }

    bfeats = arc_query("LI_BUILDING_FOOTPRINTS", envelope(clng, clat, BUILDING_RADIUS_FT), "approx_hgt,max_hgt,base_elevation")
    buildings = []
    for f in bfeats:
        g = f["geometry"]
        if not g:
            continue
        rings = g["coordinates"] if g["type"] == "Polygon" else [r for poly_ in g["coordinates"] for r in poly_[:1]]
        pr = f["properties"]
        h = pr.get("approx_hgt") or pr.get("max_hgt") or 25
        for rr in rings[:1] if g["type"] == "Polygon" else rings:
            buildings.append(
                {
                    "polygon": ring(rr),
                    "heightFt": round(float(h), 1),
                    "maxHeightFt": round(float(pr["max_hgt"]), 1) if pr.get("max_hgt") else None,
                    "baseElevationFt": pr.get("base_elevation"),
                }
            )

    tfeats = arc_query("ppr_tree_inventory_2025", envelope(clng, clat, TREE_RADIUS_FT), "tree_name,tree_dbh")
    trees = []
    for f in tfeats:
        g = f["geometry"]
        if not g:
            continue
        name = (f["properties"].get("tree_name") or "").split(" - ")
        trees.append(
            {
                "lngLat": [r7(g["coordinates"][0]), r7(g["coordinates"][1])],
                "species": (name[1] if len(name) > 1 else name[0]).title() or None,
                "dbhIn": f["properties"].get("tree_dbh"),
            }
        )

    sfeats = arc_query("Street_Centerline", envelope(clng, clat, STREET_RADIUS_FT), "stname,st_name,st_type,class")
    streets = []
    for f in sfeats:
        g = f["geometry"]
        if not g:
            continue
        lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
        for ln in lines:
            streets.append({"name": f["properties"].get("stname"), "line": ring(ln), "class": f["properties"].get("class")})

    env = envelope(clng, clat, PARCEL_RADIUS_FT).split(",")
    prow = get(
        CARTO,
        {
            "q": "SELECT parcelid, address, ST_AsGeoJSON(the_geom) AS geom FROM pwd_parcels WHERE the_geom && "
            f"ST_MakeEnvelope({env[0]},{env[1]},{env[2]},{env[3]},4326) AND parcelid <> {int(pid)}"
        },
    )["rows"]
    parcels = []
    for r in prow:
        g = json.loads(r["geom"])
        pp = g["coordinates"][0][0] if g["type"] == "MultiPolygon" else g["coordinates"][0]
        parcels.append({"address": r["address"], "polygon": ring(pp)})

    out = {
        "slug": site["slug"],
        "capturedAt": lot["fetchedAt"],
        "lot": lot,
        "surroundings": {"buildings": buildings, "trees": trees, "streets": streets, "parcels": parcels},
    }
    path = os.path.join(HERE, f"{site['slug']}.json")
    with open(path, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(path, len(buildings), "buildings", len(trees), "trees", len(streets), "streets", len(parcels), "parcels")


if __name__ == "__main__":
    for s in SITES:
        capture(s)
