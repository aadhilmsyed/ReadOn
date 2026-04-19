import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['microservices/phonics-service/tests/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@phonics': path.resolve(__dirname, 'microservices/phonics-service'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
});
