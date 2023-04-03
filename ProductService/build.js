import fs from 'node:fs';

import esbuild from 'esbuild';

const outDir = `dist`;

// cleanup dist folder
fs.rmSync(outDir, { recursive: true, force: true });

// build with esbuild
await esbuild.build({
  entryPoints: ['src/getProductById.ts', 'src/getProductList.ts'],
  bundle: true,
  outdir: outDir,
  platform: 'node',
  format: 'esm',
  target: 'esnext',
});

// copy package.json to dist folder to enable ESModules in AWS Lambdas
fs.cpSync('deployArtifacts/package.json', `${outDir}/package.json`);
