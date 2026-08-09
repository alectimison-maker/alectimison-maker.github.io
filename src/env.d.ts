/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WALINE_SERVER_URL?: string
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string
  readonly PUBLIC_FORMSPREE_FORM_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
