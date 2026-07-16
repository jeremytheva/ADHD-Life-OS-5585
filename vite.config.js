import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const ncbApiPlugin = () => ({
  name: 'ncb-api-contracts',
  configureServer(server) {
    for (const scope of ['auth', 'data']) {
      server.middlewares.use(`/api/ncb/${scope}`, async (req, res) => {
        const { createNcbHandler } = await new Function('modulePath', 'return import(modulePath)')('./api/ncb/proxy.js')
        const handler = createNcbHandler(scope)
        const url = new URL(req.url, 'http://vite.local')
        req.query = Object.fromEntries(url.searchParams)
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
    build: { outDir: 'dist', sourcemap: true }
  }
})
