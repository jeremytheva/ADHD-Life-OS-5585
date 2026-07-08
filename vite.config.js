import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const authProxyTarget = env.NCB_API_BASE_URL;

  return {
    plugins: [react()],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      historyApiFallback: true,
      proxy: authProxyTarget ? {
        '/api/auth': {
          target: authProxyTarget,
          changeOrigin: true,
          rewrite: (proxyPath) => proxyPath.replace(/^\/api\/auth/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.NCB_SECRET_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${env.NCB_SECRET_KEY}`);
              }
            });
          }
        }
      } : undefined
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});