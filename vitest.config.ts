import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['opencv-runner/test/**', 'waline-server/**', 'node_modules/**', 'dist/**'],
  },
})
