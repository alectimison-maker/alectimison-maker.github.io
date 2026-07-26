import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import rehypeResponsiveImages from './scripts/rehype-responsive-images.mjs'

export default defineConfig({
  site: 'https://aliouswe.com',
  output: 'static',
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname
        return !pathname.endsWith('/about/')
          && !pathname.startsWith('/archives/')
          && !/^\/20\d{2}\//.test(pathname)
          && pathname !== '/search/'
      },
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex, rehypeResponsiveImages],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: true,
    },
  },
  vite: {
    build: {
      target: 'es2022',
    },
  },
})
