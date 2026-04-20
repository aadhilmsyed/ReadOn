import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'microservices/phonics-service/tests/unit/**/*.test.ts',
      'microservices/phonics-service/tests/integration/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@phonics': path.resolve(__dirname, 'microservices/phonics-service'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@orchestrators': path.resolve(__dirname, 'orchestrators'),
      '@views': path.resolve(__dirname, 'views'),
    },
  },
});
