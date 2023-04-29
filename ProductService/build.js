import fs from 'node:fs';

import esbuild from 'esbuild';

const outDir = `dist`;

import pkg from '../package.json' assert { type: 'json' };

// cleanup dist folder
fs.rmSync(outDir, { recursive: true, force: true });

const external = [
  ...Object.keys(pkg.dependencies || {}).filter((key) =>
    key.startsWith('@aws-sdk')
  ),
];

console.log(`Won't bundle modules:`, external);

// build with esbuild
await esbuild.build({
  entryPoints: [
    'src/getProductById.ts',
    'src/getProductList.ts',
    'src/createProduct.ts',
    'src/catalogBatchProcess.ts',
  ],
  bundle: true,
  outdir: outDir,
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  external,
  banner: {
    js: `
        import { createRequire as topLevelCreateRequire } from 'module';
        const require = topLevelCreateRequire(import.meta.url);
        `,
  },
});

// copy package.json to dist folder to enable ESModules in AWS Lambdas and provide dependencies
fs.cpSync('deployArtifacts/package.json', `${outDir}/package.json`);
