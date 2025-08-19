import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // --- START TOEGEVOEGDE PROXY CONFIGURATIE ---
  server: {
    proxy: {
      // Stuur alle verzoeken die beginnen met /api door naar de PHP server
      '/api': {
        target: 'http://localhost', // De PHP server die je net gestart hebt
        changeOrigin: true, // Nodig voor virtuele hosts, vaak goed om aan te hebben
        secure: false,      // Als je PHP server geen https gebruikt (wat lokaal meestal zo is)
        // We hebben geen rewrite nodig, want je PHP server draait vanuit de root
        // en verwacht waarschijnlijk het /api/... pad ook.
      }
    }
  }
  // --- EINDE TOEGEVOEGDE PROXY CONFIGURATIE ---
})