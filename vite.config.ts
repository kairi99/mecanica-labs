/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: './', // relative asset paths: works on GitHub Pages under any repo name (no router)
  test: { include: ['tests/**/*.test.ts'] },
  build: {
    // three.js is lazy-loaded by the future 3D bench; raise the warning threshold instead of splitting it.
    chunkSizeWarningLimit: 850,
  },
})
