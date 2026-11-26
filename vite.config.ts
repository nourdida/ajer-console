import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ajer-console/',
  plugins: [react()],
  resolve: {
    alias: {
      '@instinct/files': new URL('./shim/instinct-files.tsx', import.meta.url).pathname,
    },
  },
});
