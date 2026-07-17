import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { createNcbHandler } from './api/ncb/handler.js'

const ncbApiPlugin = () => ({
  name: 'ncb-api-contracts',
  configureServer(server) {
    for (const scope of ['auth', 'data']) {
      const handler = createNcbHandler(scope)
      server.middlewares.use(`/api/ncb/${scope}`, async (req, res) => {
        const url = new URL(req.url, 'http://vite.local')
        req.query = {}
        url.searchParams.forEach((value, key) => {
          req.query[key] = req.query[key] === undefined ? value : [].concat(req.query[key], value)
        })
        req.query.path = url.pathname.split('/').filter(Boolean)
        return handler(req, res)
      })
    }
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // The development middleware invokes the production handlers directly, so
  // credentials remain server-only and route validation is identical.
  if (env.NCB_API_BASE_URL) process.env.NCB_API_BASE_URL = env.NCB_API_BASE_URL
  if (env.NCB_SECRET_KEY) process.env.NCB_SECRET_KEY = env.NCB_SECRET_KEY

  return {
    plugins: [react(), ncbApiPlugin()],
    base: './',
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { historyApiFallback: true },
    // Source maps can expose readable application source. Keep them off for
    // browser production builds unless a server-controlled build environment
    // explicitly opts in (never expose this toggle through VITE_ variables).
    build: { outDir: 'dist', sourcemap: env.ENABLE_PRODUCTION_SOURCEMAPS === 'true' }
  }
})
