import { readFileSync } from 'fs';
import { join, resolve } from 'path';

import * as execa from 'execa';
import { env } from 'npm-run-path';
import { parse } from 'toml';

import type { SnowpackPluginFactory } from 'snowpack';

export interface SnowPackPluginWASMPackOptions {
  projectPath: string;
  outDir?: string;
  outName?: string;
  logLevel?: 'info' | 'warn' | 'error';
  scope?: string;
  target?: string;
  extraArgs?: string[];
  wasmPackPath?: string;
}

const snowpackPluginWASMPack: SnowpackPluginFactory<SnowPackPluginWASMPackOptions> = function (
  snowpackConfig: any,
  {
    projectPath,
    outDir = 'pkg',
    outName = 'index',
    logLevel = 'warn',
    target = 'web',
    extraArgs = [],
    scope,
    wasmPackPath = 'wasm-pack',
  },
) {
  const absoluteProjectPath = resolve(
    snowpackConfig.root || process.cwd(),
    projectPath,
  );
  const absolutePackagePath = join(absoluteProjectPath, outDir);
  let packageName: string;

  try {
    const cargoToml = parse(
      readFileSync(join(absoluteProjectPath, 'Cargo.toml')).toString('utf-8'),
    );
    packageName = cargoToml.package.name;
  } catch (error) {
    throw `\
Unable to find RustWasm project at ${absoluteProjectPath}
Please ensure there is a valid Cargo.toml in this directory
See https://rustwasm.github.io/wasm-pack/book/commands/new.html for creating a new project`;
  }

  const scopedPackageName = `${scope ? `@${scope}/` : ''}${packageName}`;

  return {
    name: `wasm-pack-snowpack-plugin [${scopedPackageName}]`,
    async run({ isDev, log }: any) {
      const wasmPackArgs = [
        '--log-level',
        logLevel,
        'build',
        '--target',
        target,
        '--out-dir',
        outDir,
        '--out-name',
        outName,
        ...(scope ? ['--scope', scope] : []),
        ...(isDev ? ['--dev'] : []),
        ...extraArgs,
      ];

      const workerPromise = execa(
        isDev ? 'cargo' : wasmPackPath,
        isDev
          ? [
              'watch',
              '-i',
              '.gitignore',
              '-i',
              'pkg/*',
              '-s',
              `${wasmPackPath} ${wasmPackArgs.join(' ')}`,
            ]
          : wasmPackArgs,
        {
          env: env(),
          extendEnv: true,
          windowsHide: false,
          cwd: join(snowpackConfig.root || process.cwd(), projectPath),
        },
      );
      const { stdout, stderr } = workerPromise;
      function dataListener(chunk: any) {
        let stdOutput: string = chunk.toString();

        if (stdOutput.startsWith('[Running')) {
          log('WORKER_RESET', {});
          return;
        }

        if (stdOutput.startsWith('[Finished')) {
          return;
        }

        log('WORKER_MSG', {
          level: 'log',
          msg: stdOutput,
        });
      }
      stdout && stdout.on('data', dataListener);
      stderr && stderr.on('data', dataListener);
      return workerPromise;
    },
    config(config) {
      config.exclude.push(join('**', projectPath, '/target/**/*'));

      config.alias[scopedPackageName] =
        config.alias[scopedPackageName] ?? absolutePackagePath;

      config.mount[absolutePackagePath] = config.mount[absolutePackagePath] ?? {
        url: `/dist/${scopedPackageName}`,
        static: true,
        resolve: true,
      };
    },
  };
};

module.exports = snowpackPluginWASMPack;
