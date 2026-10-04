"""Stage 2 of the park-piece extraction: label every pixel of a stitched piece
with a palette class. The PiaT pieces are flat-colour raster art, so each
symbol is drawn in one of a small set of fills; nearest-colour matching
against the palette sampled from the pieces recovers them.

Imported by extract_pieces.py.
"""
from __future__ import annotations

import numpy as np

# label ids
L = {}
NAMES = []


def _lab(name):
    L[name] = len(NAMES)
    NAMES.append(name)
    return L[name]


for _n in ['white', 'ground', 'plant', 'canopy', 'canopy_g', 'canopy_np', 'shrub', 'gabion', 'np', 'wood_dk', 'wood_md',
           'wood_lt', 'red', 'salmon', 'perg_y', 'navy', 'blue', 'green_sq', 'purple', 'lilac', 'pink', 'table_s',
           'teal', 'brown', 'mauve', 'cyan', 'tick', 'canopy_w', 'canopy_k', 'unk']:
    _lab(_n)

# Theme-independent fills (furniture, wood, gabion stone …), sampled from the pieces.
COMMON = [
    ('white', (255, 255, 255)),
    ('shrub', (228, 212, 91)), ('shrub', (232, 216, 96)),
    ('gabion', (164, 157, 151)), ('gabion', (135, 145, 147)), ('gabion', (180, 171, 164)), ('gabion', (150, 150, 150)),
    ('wood_dk', (222, 121, 53)), ('wood_dk', (221, 120, 52)),
    ('wood_md', (235, 151, 78)),
    ('wood_lt', (245, 169, 107)), ('wood_lt', (246, 174, 115)),
    ('red', (241, 87, 37)), ('red', (240, 89, 60)),
    ('salmon', (245, 137, 101)),
    ('perg_y', (255, 175, 0)), ('perg_y', (255, 206, 101)),
    ('navy', (7, 77, 111)),
    ('blue', (73, 151, 189)),
    ('green_sq', (8, 178, 89)),
    ('purple', (146, 39, 111)),
    ('lilac', (201, 143, 181)),
    ('pink', (255, 135, 111)),
    ('table_s', (232, 176, 136)),
    ('cyan', (0, 174, 239)),
    ('tick', (110, 110, 110)),
    ('np', (241, 170, 126)),
    ('perg_y', (255, 192, 48)),
    ('teal', (81, 186, 155)),
    ('shrub', (191, 227, 93)),
    ('brown', (166, 75, 75)), ('brown', (160, 64, 64)),
    ('mauve', (208, 192, 200)),
    ('cyan', (176, 240, 240)), ('cyan', (112, 224, 240)), ('cyan', (96, 224, 240)),
    ('tick', (112, 241, 0)), ('tick', (112, 225, 0)),
    # a tree canopy drawn over a wooden bench
    ('canopy_w', (128, 96, 32)), ('canopy_w', (144, 128, 64)), ('canopy_w', (136, 112, 48)),
    # a tree canopy drawn over the grey gabion wall
    ('canopy_k', (124, 142, 127)), ('canopy_k', (96, 136, 112)), ('canopy_k', (80, 128, 112)), ('canopy_k', (80, 120, 112)),
]

# Theme-specific grounds, planting greens and tree canopies.
THEME = {
    'edible': [('ground', (255, 241, 230)), ('plant', (131, 205, 98)), ('plant', (120, 196, 72)), ('plant', (148, 212, 131)),
               ('plant', (160, 208, 128)), ('canopy', (79, 151, 52)), ('canopy', (72, 168, 56)), ('canopy', (98, 171, 74)),
               # the size-D corner sets print Edible planting in a bluer green
               ('plant', (91, 199, 119)), ('plant', (72, 192, 104)), ('plant', (104, 200, 128)),
               ('canopy', (51, 162, 79)), ('canopy', (41, 162, 77))],
    'sanctuary': [('ground', (224, 235, 239)), ('plant', (76, 189, 145)), ('plant', (102, 199, 161)), ('plant', (112, 205, 155)),
                  ('canopy', (53, 146, 96)), ('canopy', (44, 161, 109)), ('canopy', (40, 160, 112)), ('canopy_g', (128, 200, 184))],
    'nature': [('ground', (240, 249, 246)), ('plant', (132, 203, 168)), ('plant', (110, 194, 144)), ('plant', (148, 208, 178)),
               ('canopy', (78, 169, 125)), ('canopy', (69, 168, 114)), ('canopy', (64, 168, 104)), ('canopy_g', (141, 211, 183)),
               ('canopy_np', (165, 140, 93)), ('canopy_np', (144, 144, 96))],
    'event': [('ground', (242, 231, 239)), ('plant', (103, 197, 123)), ('plant', (81, 187, 104)), ('plant', (130, 207, 146)),
              ('canopy', (65, 169, 95)), ('canopy', (49, 159, 80))],
}


def palette(theme: str):
    names, cols = [], []
    for n, c in COMMON + THEME[theme]:
        names.append(L[n])
        cols.append(c)
    return np.array(names, np.uint8), np.array(cols, np.float32)


def classify(img: np.ndarray, theme: str, max_dist: float = 40.0) -> np.ndarray:
    """Nearest-palette label per pixel (uint8 label ids)."""
    names, cols = palette(theme)
    a = img.reshape(-1, 3).astype(np.float32)
    out = np.empty(len(a), np.uint8)
    step = 1 << 18
    for s in range(0, len(a), step):
        blk = a[s:s + step]
        d = ((blk[:, None, :] - cols[None, :, :]) ** 2).sum(-1)
        i = d.argmin(1)
        lab = names[i]
        lab[np.sqrt(d[np.arange(len(blk)), i]) > max_dist] = L['unk']
        out[s:s + step] = lab
    return out.reshape(img.shape[:2])


VIS = {
    'white': (255, 255, 255), 'ground': (235, 225, 210), 'plant': (120, 200, 90), 'canopy': (20, 110, 40),
    'canopy_g': (150, 220, 190), 'canopy_np': (120, 100, 40), 'shrub': (240, 220, 0), 'gabion': (120, 120, 120),
    'np': (250, 160, 110), 'wood_dk': (200, 90, 20), 'wood_md': (240, 150, 60), 'wood_lt': (255, 200, 140),
    'red': (230, 30, 30), 'salmon': (250, 120, 90), 'perg_y': (255, 190, 0), 'navy': (0, 50, 100), 'blue': (60, 140, 220),
    'green_sq': (0, 200, 80), 'purple': (140, 20, 110), 'lilac': (210, 140, 200), 'pink': (255, 100, 120),
    'table_s': (220, 170, 120), 'teal': (0, 160, 160), 'brown': (130, 50, 40), 'mauve': (200, 180, 200),
    'cyan': (0, 200, 255), 'tick': (60, 60, 60), 'canopy_w': (90, 70, 20), 'canopy_k': (70, 90, 70), 'unk': (255, 0, 255),
}


def visualise(lab: np.ndarray) -> np.ndarray:
    lut = np.array([VIS[n] for n in NAMES], np.uint8)
    return lut[lab]
