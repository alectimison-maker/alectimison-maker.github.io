---
name: design-coffee-editorial-covers
description: Design, review, implement, or update the editorial cover cards for Coffee blog posts in this repository. Use when adding a Coffee post, changing its oversized title artwork or cover-image side, updating the homepage So/Featured rows, or preparing a Coffee article for publication. Do not use for article-body typography or non-Coffee category cards unless the user explicitly extends the scope.
---

# Design Coffee Editorial Covers

Treat every Coffee cover as an individually art-directed editorial composition inside a stable card system. Preserve the series grammar without turning new posts into template copies.

## Work in two gates

### 1. Propose before editing

1. Read `references/project-contract.md` and inspect the current Coffee cards and the new post's cover image.
2. Study the previously approved compositions before proposing the next one.
3. Propose one complete recommended direction first. Include:
   - title fields and how they are grouped;
   - each group's approximate position, direction, and scale;
   - a two- or three-color palette related to the cover image;
   - title/image proportions and the image side;
   - a compact text wireframe.
4. Ask the user to approve or modify that proposal. Ask one design question at a time when a branch remains unresolved.
5. Do not edit the implementation until the title composition is explicitly approved.

### 2. Implement after approval

1. Add the post to `src/data/coffee-editorial.ts`. Assign the next chronological `sequence` and the alternating `imageSide` without changing older posts.
2. Add the approved title art to `src/components/CoffeeTitleArtwork.astro` using a dedicated artwork branch.
3. Keep glyphs inside explicit cells or bounding boxes. Do not allow letter overlap or large accidental holes.
4. Preserve the accessible full title on the link while marking decorative glyphs `aria-hidden="true"`.
5. Confirm the Coffee archive and homepage render the same approved card through `CoffeeEditorialCard.astro`.
6. Run tests and the production build.
7. Pass the required screenshot gate before requesting review.
8. Present the screenshots and wait for explicit publication approval. Never deploy, push, or publish as part of the first implementation pass.

### Local preview handshake

For any visual edit, verify the current source rather than assuming an existing local preview refreshed:

1. Run `npm run dev:restart`. This stops the Astro background server and starts a forced rebuild on `127.0.0.1:4321`.
2. Reopen the page with a unique query string, then run the required screenshot gate. Computed-style checks may support the check, but never replace screenshots.
3. Report that preview verification separately from `npm run check` or the production build.

### Screenshot gate (required)

After every Coffee cover visual edit, capture and inspect screenshots of the edited card at both a desktop viewport and a phone viewport near 390 px. Each screenshot must show the complete title panel, not merely the page header or a saved image path.

Verify the approved composition in the screenshots: intended words stay on their designed lines, glyphs do not overlap or clip, desktop title/image proportions remain intact, and mobile keeps title above image. If any check fails, adjust the artwork, restart the local preview, and repeat the screenshot gate. Do not report the visual edit complete until both screenshots pass.

## Preserve the system rules

- Alternate sides by stable chronological sequence: oldest title-left/image-right, next image-left/title-right, then repeat. Never derive the side from a descending list index.
- Use approximately 62% of the desktop width for title art and 38% for the image.
- On narrow screens, always place title art above the image while preserving and tightening the approved composition.
- Use oversized editorial typography, staggered scale, and two or three high-contrast colors selected from or against the cover's mood.
- A user-approved monochrome composition may override the default multi-color direction.
- When letters are individually positioned, keep every letter of the same word the same color. Individual letter sizes may vary.
- Individual letters may mix the repository's highly legible display, serif, sans-serif, and monospaced faces; vary rotation and proportion without sacrificing character recognition.
- Keep the canvas dense but legible: no overlaps, accidental clipping, or conspicuous uncomposed whitespace.
- The homepage `So?` section always shows the latest three site-wide posts by date, one full-size card per row with a clear vertical gap between cards. Exclude those posts from `Recent`.
- Coffee posts require an approved entry in `coffee-editorial.ts`; a missing entry is an intentional publication blocker.

## Verify the result

Check all of the following before requesting publication approval:

- title artwork matches the approved wireframe and palette;
- required desktop and mobile screenshots have been captured and visually inspected after the latest source refresh;
- word colors and letter grouping are consistent;
- image side follows chronological alternation;
- desktop cards remain one article per full-width row;
- mobile order is title then image;
- images load through `ResponsiveImage.astro` with meaningful alt text;
- the latest three posts appear in `So?` and do not repeat in `Recent`;
- `npm test` and `npm run build` pass.
