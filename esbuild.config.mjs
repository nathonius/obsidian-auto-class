import esbuild from 'esbuild';
import process from 'process';
import { sassPlugin } from 'esbuild-sass-plugin';

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source visit the plugins github repository
*/
`;

const prod = process.argv[2] === 'production';

esbuild
  .build({
    banner: {
      js: banner
    },
    entryPoints: ['src/main.ts', 'src/styles.scss'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    outdir: '.',
    outbase: 'src',
    watch: !prod,
    target: 'es2016',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    minify: prod,
    treeShaking: true,
    plugins: [sassPlugin({ cache: !prod })]
  })
  .catch(() => process.exit(1));