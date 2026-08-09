---
name: deploy-site-incrementally
description: Deploy and verify this Astro site through its GitHub Pages workflow while preserving incremental media builds. Use when asked to deploy, publish, push the current site live, reduce deployment time, change the Pages workflow, or investigate slow image builds.
---

# Deploy Site Incrementally

Publish the current site through `main` without rebuilding unchanged responsive media. Treat a successful Git push as the start of deployment, not completion.

## Preserve the incremental media contract

- Keep generated files in `public/media`, `public/image-manifest.json`, `public/images`, `public/anime`, and `public/coffee` out of Git.
- Restore the newest `responsive-media-${runner.os}-` cache when the exact source hash key misses.
- Set `SKIP_IMAGE_OPTIMIZATION=true` only for an exact cache hit. A prefix restore must run `scripts/optimize-images.mjs` so it can merge changes into the restored output.
- Preserve `sourceHash` values in `public/image-manifest.json`. Reuse an entry only when its source fingerprint matches and every expected output exists.
- On a push with a restored legacy manifest, pass the NUL-delimited `git diff` of `src/assets/media` through `IMAGE_CHANGED_PATHS_FILE`. Use it only to bootstrap missing fingerprints; source hashes remain authoritative afterward.
- Rebuild only new, changed, or incomplete media entries. Remove variants and legacy copies for deleted sources.
- Allow a full media build only when no usable prior cache or manifest exists. Report that fallback explicitly.

## Publish

1. Read `.github/workflows/deploy.yml`, `scripts/optimize-images.mjs`, and the worktree status.
2. If Coffee editorial work is included, confirm `design-coffee-editorial-covers` has completed visual verification and the user has explicitly approved publication.
3. Fetch `origin/main` and confirm the local branch is not behind. Do not overwrite remote work.
4. Run `npm test` and `npm run build`. For incremental-pipeline changes, also prove that a second unchanged run reports zero rebuilt sources.
5. Stage only deployable site source, tests, workflow files, and project skills. Exclude root drafts, archives, ZIP files, and unrelated agent notes unless explicitly requested.
6. Commit and push `main`. The push triggers `Deploy Astro site to Pages`.
7. Monitor the exact workflow run through both `build` and `deploy`. Do not report success while it is queued or in progress.
8. Verify the live custom domain serves the new content after the workflow succeeds. Report the commit, workflow URL, and live URLs.

Do not manually cancel a healthy build merely because a cold media cache is slow. If a new incremental-pipeline commit supersedes it through the workflow concurrency group, monitor the replacement run instead.
