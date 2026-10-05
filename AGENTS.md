# Content placement

- The homepage `So?` / Featured block is coffee-only: render `space: coffee` posts and preserve the coffee editorial order.
- OpenCV and other technical posts use `space: article` and appear in `/article/` and their article detail pages.

## Publishing

- When asked to deploy the Astro site, publish to the existing Aliyun Simple Application Server. GitHub is only the source remote; GitHub Pages is retired, and GitHub Actions must not publish the site or support services.
- A post must have `draft: false` to publish. OpenCV and other technical tutorials use `space: article`; keep the homepage `So?` / Featured block coffee-only.
- Store standalone tutorial figures under `public/articles/<article-slug>/`; the image optimization step clears `public/images/` while rebuilding responsive media.
- Build releases from a clean, curated workspace. Include only the intended site changes, required content and media, and the OpenCV runner assets needed by the current production site. Exclude unrelated prototypes and local work.
- Use Node.js 24. Install dependencies with `npm ci`, prepare media with `npm run prepare:deploy`, run `npm run validate:opencv-asset`, then build with `npm run build:site`. Supply production `PUBLIC_*` values through the local release environment; never commit credentials or copy API tokens into release files.
- Package only `dist/` and `opencv-runner/`. Upload the archive to the Aliyun host configured in the local-only `ALIYUN_DEPLOY_TARGET` setting, then run `sudo -n /srv/aliouswe/install-release.sh <archive-path> <unique-release-id>` there. Keep server addresses, SSH account and port, private-key locations, cloud API credentials, and local secret-file paths out of GitHub. The installer builds the runner image, activates the site atomically, checks runner health, and rolls back the site symlink if activation fails.
- Verify the homepage, `/article/`, the newly published article detail page, and `https://aliouswe.com/healthz/opencv`. Remove the uploaded archive and any temporary firewall rule opened for SSH. Keep DNS pointed at the existing Aliyun server unless the user requests a DNS change.
- Synchronize source changes to GitHub with normal Git operations after deployment. Git synchronization does not publish the site.
