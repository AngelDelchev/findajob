import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Matches the `https` profile in backend/Properties/launchSettings.json. Override
  // with VITE_API_TARGET if the API is running somewhere else.
  const apiTarget = env.VITE_API_TARGET || 'https://localhost:7001'

  const proxy = {
    target: apiTarget,
    changeOrigin: true,
    // The development certificate is self-signed, so certificate validation is
    // skipped for the local proxy only.
    secure: false,
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': proxy,
        // Profile images are served by the API from outside wwwroot.
        '/uploads': proxy,
      },
    },
    build: {
      // MUI dominates the bundle, so it gets its own chunk: an application change
      // then does not invalidate the vendor cache in the browser.
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return null
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
            if (id.includes('react-router')) return 'router'
            return 'vendor'
          },
        },
      },
    },
  }
})
