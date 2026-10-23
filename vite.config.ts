/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { readyExperiments } from './src/experiments/registry.ts'

// One page for the landing, and for every ready experiment its app page and its two help pages.
const input: Record<string, string> = { landing: 'index.html' }
for (const x of readyExperiments()) {
  input[x.id] = x.page
  input[`${x.id}Help`] = x.help.es
  input[`${x.id}HelpEn`] = x.help.en
}

export default defineConfig({
  base: './', // relative asset paths: works on GitHub Pages under any repo name (no router)
  test: { include: ['tests/**/*.test.ts'] },
  build: {
    // three.js is lazy-loaded by the 3D stage; raise the warning threshold instead of splitting it.
    chunkSizeWarningLimit: 850,
    rollupOptions: { input },
  },
})
