---
name: deploy-site-incrementally
description: Deploy this Astro site to its existing Aliyun Simple Application Server, preserve incremental media builds, and synchronize the published source to GitHub. Use for site publication, deployment failures, or slow media preparation.
---

# Deploy Site Incrementally

Publish to the existing Aliyun server. GitHub stores synchronized source; GitHub Pages is retired. Keep Pages and Actions publishing disabled for both the site and support services.

## Prepare the release

1. Read the repository `AGENTS.md` Publishing section for the authoritative build, installation, and verification procedure. Before Aliyun access, read the ignored `agent.md` for machine-local credential locations. Keep credentials and connection details outside tracked files and release archives.
2. Inspect the working-tree diff and identify the changes authorized for this release. If the user requests only selected changes, create a clean temporary source snapshot from the tracked baseline and apply only those files or hunks. Preserve all excluded local files and changes, including excluded hunks in otherwise published files.
3. Fetch `origin/main` and account for remote commits before building. Keep the source remote current without overwriting remote work.
4. Use Node.js 24. Run `npm ci`, `npm run prepare:deploy`, `npm run validate:opencv-asset`, and `npm run build:site` in the curated source snapshot. Supply production `PUBLIC_*` values through a local release environment. Run additional checks appropriate to the actual changes.

## Preserve incremental media

- Seed the release workspace with the existing ignored `public/media/` output and `public/image-manifest.json` when available, then run media preparation. Keep generated variants and the manifest out of Git.
- Preserve manifest `sourceHash` values. Reuse only entries whose fingerprints match and whose expected outputs exist; rebuild new, changed, or incomplete sources and remove outputs for deleted sources.
- Runtime pages use `/media` responsive variants. The image pipeline clears legacy `public/images/`, `public/anime/`, and `public/coffee/` copies. Standalone tutorial figures belong under `public/articles/<article-slug>/`.
- Report a cold media rebuild if no usable cache exists. For changes to the media pipeline itself, confirm a second unchanged run rebuilds zero sources.

## Install and verify

1. Check the Aliyun instance state and deployment access using the local settings. Read production public build values from the existing release configuration or live site when needed; preserve the current comments and OpenCV integration.
2. Package only `dist/` and `opencv-runner/`. Upload to the host in local-only `ALIYUN_DEPLOY_TARGET`, then invoke the installer specified in `AGENTS.md` with the archive path and a unique release ID. The installer activates atomically and checks runner health. Inspect its actual completion result before reporting success.
3. Verify the live routes and OpenCV health endpoint required by `AGENTS.md`, plus every page changed by this release. Confirm the requested content and styles are present; for removed routes, confirm they no longer serve the removed page.
4. Remove the uploaded archive and any temporary firewall rule created for this release. Preserve the existing DNS target.
5. Commit and synchronize only the published source changes and explicitly requested deployment documentation to GitHub through normal Git operations. When a file also contains excluded local changes, stage its curated release content while leaving those local changes in the working tree.

Completion means the Aliyun release is active, live verification passed, temporary access artifacts are cleaned up, and GitHub source synchronization is accounted for. Report the release ID, source commit, verified URLs, and any unresolved blocker accurately.
