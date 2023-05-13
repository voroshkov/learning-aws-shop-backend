import fs from 'node:fs';
import esbuild from 'esbuild';

const srcRootDir = `src`;
const outRootDir = `dist`;

// cleanup dist folder
fs.rmSync(outRootDir, { recursive: true, force: true });

const buildService = async (serviceName) => {
  const sourceDir = `${srcRootDir}/${serviceName}`;
  const outDir = `${outRootDir}/${serviceName}`;

  const entryPoint = `${sourceDir}/index.ts`;

  const packageJsonPath = `./${sourceDir}/package.json`;

  // get names of to exclude from bundling from service's package.json
  const packageJSON = await import(packageJsonPath, {
    assert: { type: 'json' },
  });
  const externalDependencies = [
    ...Object.keys(packageJSON.default.dependencies || {}).filter((key) =>
      key.startsWith('@aws-sdk')
    ),
  ];
  console.log(`Won't bundle modules:`, externalDependencies);

  // build with esbuild
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    outdir: outDir,
    platform: 'node',
    format: 'esm',
    target: 'esnext',
    external: externalDependencies,
    banner: {
      js: `
        import { createRequire as topLevelCreateRequire } from 'module';
        const require = topLevelCreateRequire(import.meta.url);
        `,
    },
  });

  // copy package.json to dist folder to enable ESModules in AWS Lambdas and provide dependencies
  fs.cpSync(`${sourceDir}/package.json`, `${outDir}/package.json`);
};

const serviceNames = ['BasicAuthorizer'];

for (const serviceName of serviceNames) {
  await buildService(serviceName);
}
