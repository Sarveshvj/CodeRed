import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Allow the same images to load on localhost and on GitHub Pages.
  base: mode === 'production' ? '/CodeRed-/' : '/',
}));
