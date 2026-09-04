#!/usr/bin/env python3
"""
Crop each scenario's DEPLOYMENT MAP out of the page it is printed on.

    python3 scripts/crop-scenario-maps.py [--check]

`public/maps/<slug>.png` — what the app served — was the map's BACKGROUND ART:
the terrain drawing, with none of the deployment map on it. No deployment
zones, no objective markers, no dimensions, no midpoint: everything a player
opens the map to read. It is what the PDF stores as an embedded image, because
the map is that art with the zones and callouts drawn OVER it in vector, so
pulling the embedded image gets the layer underneath the map rather than the
map. The art is kept, under the name the extraction gave it
(`<slug>_img_1.png`), rather than under the name the map should have.

The composed map only exists as a rendered page, so that is what is cropped.
The box is FOUND, never measured off a screenshot, and the two books state it
in two different ways:

  * The rulebook draws a red rule around every deployment map. Its vertical
    sides give the crop its extent. (Read off the longest red ROWS instead and
    the bottom edge lands a third of a page low: the rules beneath FORCES and
    THE BATTLEFIELD are the same red and run the width of the same text
    column.) Cropped from the committed `<slug>_page.png` renders, so this half
    needs no PDF.

  * The Carcass Front book draws no rule. Its map is a single large grey-filled
    rectangle in the page's vector drawings, and that rectangle IS the box —
    read from the PDF rather than from pixels, so there is nothing to detect.
    Needs `data-sources/carcass-front/carcass-front-book.pdf`, which is
    gitignored and fetched with `npm run rules:pdfs`; absent, that half is
    skipped and the committed crops stand.

A page whose map cannot be located this way is REPORTED AND SKIPPED rather than
cropped to a guess: a map cropped to the wrong rectangle is worse than no map,
because it looks authoritative.

Written out as WebP, not PNG: the rulebook crop is a 1.4 MB PNG and a 125 KB
WebP that is indistinguishable from it, and this app is used at a table on a
phone.

Needs Pillow, and PyMuPDF for the Carcass Front half. Neither is a repository
dependency — this is a one-off asset step whose OUTPUT is committed, like the
extracted rulebook text. Re-run it when a book is re-rendered.
"""
import io
import re
import sys
import pathlib

try:
    from PIL import Image
except ImportError:                                   # pragma: no cover
    sys.exit('error: needs Pillow — pip install Pillow')

MAPS = pathlib.Path('public/maps')
CF_BOOK = pathlib.Path('data-sources/carcass-front/carcass-front-book.pdf')

# The rulebook's pre-rendered pages give a map ~1030px across, so the Carcass
# Front's is rendered to the same width rather than at a fixed DPI: its map is
# a smaller square on the page and 200 DPI would have made it a third smaller
# than the twelve it sits beside in the Codex.
TARGET_PX = 1030


def slugify(name):
    """`Claim No Man's Land` -> `claim-no-mans-land`, as `parse-scenarios.mjs`."""
    import unicodedata
    s = unicodedata.normalize('NFD', name)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r"['’]", '', s).lower()
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', s))


def save(im, slug, check):
    print(f'  {slug}: {im.width}x{im.height}')
    if not check:
        im.save(MAPS / f'{slug}.webp', quality=82, method=6)


# ------------------------------------------------------- the rulebook's twelve

def is_rule(c):
    """The red rule the rulebook draws around a deployment map."""
    r, g, b = c[:3]
    return r > 90 and r - g > 45 and r - b > 45


def ruled_box(path):
    """The map's rectangle on a rendered rulebook page, or why there is none."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()

    cols = [0] * w
    rows = [0] * h
    for y in range(h):
        for x in range(w):
            if is_rule(px[x, y]):
                cols[x] += 1
                rows[y] += 1

    # A side of the rule runs nearly the whole length of that side, so it
    # stands far above anything else red on the page. Taken as a fraction of
    # the longest run found rather than as a pixel count, so the threshold does
    # not depend on the resolution the page was rendered at.
    peak = max(cols)
    if not peak:
        return 'no red rule found'
    verticals = [x for x, n in enumerate(cols) if n >= peak * 0.6]
    left, right = verticals[0], verticals[-1]

    # Top and bottom are read off the vertical rule itself — the first and last
    # row it occupies — and NOT from the longest red rows on the page.
    down = [y for y in range(h) if is_rule(px[left, y])]
    if not down:
        return 'the vertical rule has no extent'
    top, bottom = down[0], down[-1]

    if right - left < w * 0.2 or bottom - top < h * 0.2:
        return f'rule encloses too little of the page ({right - left}x{bottom - top})'

    # The rule must be closed: a red row as wide as the box at both the top and
    # the bottom of the vertical sides. Otherwise the two verticals found are
    # not two sides of one rectangle and the box is a coincidence.
    width = right - left
    if not (0.85 <= rows[top] / width <= 1.15 and 0.85 <= rows[bottom] / width <= 1.15):
        return 'the rule is not a closed rectangle'

    return (left, top, right + 1, bottom + 1)


def rulebook(check):
    pages = sorted(MAPS.glob('*_page.png'))
    if not pages:
        return [f'no rendered pages under {MAPS}/']
    failures = []
    for page in pages:
        slug = page.name[: -len('_page.png')]
        box = ruled_box(page)
        if isinstance(box, str):
            failures.append(f'{slug}: {box}')
            continue
        save(Image.open(page).convert('RGB').crop(box), slug, check)
    return failures


# ------------------------------------------------- the Carcass Front's five

# The grey the Carcass Front book fills a deployment map with. Matched with a
# tolerance rather than exactly, because the fill is stored as floats.
MAP_GREY = (0.616, 0.615, 0.613)

# `Ⅰ º The Ruins of Nineveh Novus` — the heading each scenario opens on. The
# numeral is a Unicode Roman numeral, and `º` is the book's own separator.
HEADING = re.compile(r'^[Ⅰ-Ⅿ]+\s*[º°]\s*(.+)$', re.M)


def carcass_front(check):
    if not CF_BOOK.exists():
        print(f'  (skipped: {CF_BOOK} is not here — npm run rules:pdfs)')
        return []
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf
        except ImportError:
            return ['needs PyMuPDF for the Carcass Front book — pip install PyMuPDF']

    doc = pymupdf.open(CF_BOOK)
    failures = []
    found = 0
    for page in doc:
        text = page.get_text()
        heading = HEADING.search(text)
        if not heading or 'DEPLOYMENT' not in text:
            continue
        name = heading.group(1).strip()

        # One large rectangle, filled with the map's grey. More than one and
        # the page is not what this expects, so nothing is cropped from it.
        w, h = page.rect.width, page.rect.height
        boxes = [
            d['rect'] for d in page.get_drawings()
            if d.get('fill')
            and all(abs(a - b) < 0.02 for a, b in zip(d['fill'], MAP_GREY))
            and d['rect'].width > w * 0.25 and d['rect'].height > h * 0.15
        ]
        if len(boxes) != 1:
            failures.append(f'{name}: {len(boxes)} map-sized grey rectangles, expected 1')
            continue

        pix = page.get_pixmap(dpi=round(72 * TARGET_PX / boxes[0].width), clip=boxes[0])
        save(Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB'),
             f'carcass-front-{slugify(name)}', check)
        found += 1

    if not found and not failures:
        failures.append('no Carcass Front scenario page carried a deployment map')
    return failures


def main():
    check = '--check' in sys.argv
    print('rulebook:')
    failures = rulebook(check)
    print('carcass front:')
    failures += carcass_front(check)

    if failures:
        print('\nNOT CROPPED — left as they were:', file=sys.stderr)
        for f in failures:
            print(f'  {f}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
