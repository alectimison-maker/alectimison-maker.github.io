# Article statistics

The article statistics endpoint lives beside the Waline endpoint and uses the
same Neon PostgreSQL database. The public site remains a static Astro site.

## One-time setup

1. Add `STATS_HASH_SECRET` to the Vercel project environment. Generate a long,
   random value and keep it private. The service refuses to start without it.
2. Run the schema migration from this directory with the same database
   environment variables used by Waline:

   ```sh
   npm run stats:migrate
   ```

3. Redeploy the Vercel project. The static site already uses
   `PUBLIC_WALINE_SERVER_URL` for the statistics endpoint as well as comments.

`STATS_ALLOWED_ORIGINS` is optional. `SITE_URL`, the local development origins,
and any comma-separated origins in that variable are allowed by default. Do
not use `*`: the endpoint accepts credentials and must keep an explicit origin
allowlist.

The endpoint stores only HMAC-SHA256 digests of the browser's random visitor
identifier. It does not store raw IP addresses or the browser identifier.
