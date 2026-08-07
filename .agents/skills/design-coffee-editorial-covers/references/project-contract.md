# Coffee editorial cover project contract

## Implementation map

- `src/data/coffee-editorial.ts`: approved card registry, stable chronological sequence, image side, artwork key, and cover alt text.
- `src/components/CoffeeEditorialCard.astro`: common 62/38 desktop card and title-first mobile flow.
- `src/components/CoffeeTitleArtwork.astro`: individually curated title artwork.
- `src/pages/coffee/index.astro`: every Coffee post uses the editorial card.
- `src/pages/index.astro`: strict latest-three `So?` selection and `Recent` de-duplication.

Do not place per-post title coordinates in `PostCard.astro`. That component is the generic fallback for non-Coffee posts.

## Approved baseline sequence

| Sequence | Post | Desktop arrangement | Artwork direction |
| --- | --- | --- | --- |
| 1 | `hows-the-coffee` | legacy 67.5% title left, 32.5% image right | preserve the deployed lockup: blue vertical `How's`, red `the`, green `Coffee`, using the original capped `clamp()` sizes |
| 2 | `round-to-coffee` | image left, title right | dense, freely rotated title-case glyphs using the Free Jazz `Kranky` face, all pure black; keep the enlarged `T`, enlarge and clockwise-rotate the `e` immediately left of `?`, and keep the enlarged lower `f` lying horizontally and shifted right into the gap |
| 3 | `four-seasons` | title left, image right | only two diagonal Chinese characters in Zhi Mang Xing, both in the same ink black |

New posts continue sequence 4, 5, and so on. Explicitly store the selected side so publishing a later post never shifts an older card.

## Proposal format

Use this compact structure before editing:

```text
Title panel: left/right, about 62%
Image panel: opposite side, about 38%
Groups: [field or letters] -> [position / direction / relative size]
Palette: [group] -> [color and cover relationship]

┌──────────────────────────┐
│ simple composition map   │
│ showing every title group│
└──────────────────────────┘
```

Propose one opinionated arrangement based on previous accepted work. Let the user modify that single proposal instead of making them choose among several vague options.

## Visual acceptance

At desktop width, inspect the complete card and the transition into the next row. At a phone width near 390 px, inspect the title-first stack. Reject a result when:

- glyph bounding areas intersect;
- a word changes color between its letters;
- a title panel contains a large untreated void;
- important letterforms are clipped;
- an image becomes the first mobile element;
- the three homepage cards shrink into columns or a carousel.
