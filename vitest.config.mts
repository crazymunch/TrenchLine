import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  /*
    JSX, so a test can import a component at all.

    `tsconfig.json` sets `jsx: "preserve"` because Next compiles it. Vitest has
    no Next in front of it and inherits that setting, so any test importing a
    `.tsx` file failed to parse — which is why, until the print sheet, none
    ever had. `automatic` matches the runtime Next uses, so a component under
    test behaves as it does in the app.

    Under Vite 8 this is `oxc`, not `esbuild`.
  */
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
