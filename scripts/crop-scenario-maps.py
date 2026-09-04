#!/usr/bin/env python3
"""
Crop each scenario's DEPLOYMENT MAP out of its rendered rulebook page.

    python3 scripts/crop-scenario-maps.py [--check]

`public/maps/<slug>.png` — what the app served — was the map's BACKGROUND ART:
the terrain drawing
with none of the deployment map on it. No deployment zones, no objective
markers, no dimensions, no midpoint: everything a player opens the map to read.
It is what the PDF stores as an embedded image, because the map is that art
with the zones and callouts drawn OVER it in vector: pulling the embedded image
gets the layer underneath the map rather than the map. It is kept, under the
name the extraction gave it (`<slug>_img_1.png`), rather than under the name
the map should have.

The composed map only exists as rendered page, which is what `<slug>_page.png`
holds. So the map is cropped out of the page, and the crop is found rather than
measured by hand: the rulebook draws a red rule around every deployment map,
and the four sides of that rule are the four longest runs of red on the page.

Nothing here is a coordinate typed from looking at a page. A page whose four
sides are not found, or which yields a box that does not agree with the rule
lines that produced it, is REPORTED AND SKIPPED rather than cropped to a guess:
a map cropped to the wrong rectangle is worse than the art alone, because it
looks authoritative.

Written out as WebP, not PNG: the crop is a 1.4 MB PNG and a 125 KB WebP that
is indistinguishable from it, and this app is used at a table on a phone.

Needs Pillow (`pip install Pillow`), which is not a repository dependency —
this is a one-off asset step whose OUTPUT is committed, like the extracted
rulebook text. Re-run it when the rulebook PDF is re-rendered.
"""
import sys
import pathlib

try:
    from PIL import Image
except ImportError:                                   # pragma: no cover
    sys.exit('error: needs Pillow — pip install Pillow')

MAPS = pathlib.Path('public/maps')

# The rule the rulebook draws around a deployment map: red, and clearly not
# the sepia of the terrain art or the black of the labels over it.
def is_rule(c):
    r, g, b = c[:3]
    return r > 90 and r - g > 45 and r - b > 45


def box_of(path):
    """The deployment map's rectangle, or a string saying why there is none."""
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
    # the longest run found rather than as a pixel count, so the threshold
    # does not depend on the resolution the page was rendered at.
    peak = max(cols)
    if not peak:
        return 'no red rule found'
    verticals = [x for x, n in enumerate(cols) if n >= peak * 0.6]
    left, right = verticals[0], verticals[-1]

    # The top and bottom are read off the vertical rule itself — the first and
    # last row it occupies — and NOT from the longest red rows on the page.
    # The red underlines beneath FORCES and THE BATTLEFIELD run the width of
    # the same text column, so "the lowest long red row" is one of those and
    # the crop ran a third of a page past the map.
    down = [y for y in range(h) if is_rule(px[left, y])]
    if not down:
        return 'the vertical rule has no extent'
    top, bottom = down[0], down[-1]

    if right - left < w * 0.2 or bottom - top < h * 0.2:
        return f'rule encloses too little of the page ({right - left}x{bottom - top})'

    # The rule must be closed: a red row as wide as the box at both the top
    # and the bottom of the vertical sides. Otherwise the two verticals found
    # are not two sides of one rectangle, and the box is a coincidence.
    width = right - left
    if not (0.85 <= rows[top] / width <= 1.15 and 0.85 <= rows[bottom] / width <= 1.15):
        return 'the rule is not a closed rectangle'

    return (left, top, right + 1, bottom + 1)


def main():
    check = '--check' in sys.argv
    pages = sorted(MAPS.glob('*_page.png'))
    if not pages:
        sys.exit(f'error: no rendered pages under {MAPS}/')

    failures = []
    for page in pages:
        slug = page.name[: -len('_page.png')]
        out = MAPS / f'{slug}.webp'
        box = box_of(page)
        if isinstance(box, str):
            failures.append(f'{slug}: {box}')
            continue
        w, h = box[2] - box[0], box[3] - box[1]
        print(f'  {slug}: {w}x{h} at {box[0]},{box[1]}')
        if not check:
            Image.open(page).convert('RGB').crop(box).save(out, quality=82, method=6)

    if failures:
        print('\nNOT CROPPED — left as they were:', file=sys.stderr)
        for f in failures:
            print(f'  {f}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
