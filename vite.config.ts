import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Mesma origem no celular/PC — evita IP fixo quebrando o checkout.
      '/api': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:3333',
        ws: true,
      },
    },
  },
})
