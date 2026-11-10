/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const PDF_URLS = ['/Naif-Alassaf-Resume.pdf', '/resume%20-%20Naif%20Alassaf.pdf']

/**
 * In `vite dev` the resume PDF doesn't exist yet (the build makes it), so without this the
 * Download button got the HTML fallback page. Here the dev server prints /resume on request.
 */
function resumePdfInDev(): Plugin {
  return {
    name: 'resume-pdf-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !PDF_URLS.includes(req.url.split('?')[0])) return next()
        try {
          const { printPdf } = await import('./scripts/resume/print.mjs')
          const origin = (server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port ?? 5173}/`).replace(/\/$/, '')
          const pdf = await printPdf(`${origin}/resume.html`)
          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', 'inline; filename="Naif-Alassaf-Resume.pdf"')
          res.end(Buffer.from(pdf))
        } catch (err) {
          res.statusCode = 500
          res.end(`Could not print the resume PDF: ${(err as Error).message}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), resumePdfInDev()],
  base: '/',
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eidiyah: resolve(__dirname, 'eidiyah.html'),
        trails: resolve(__dirname, 'trails.html'),
        darb: resolve(__dirname, 'darb.html'),
        resume: resolve(__dirname, 'resume.html'),
      },
    },
  },
})
