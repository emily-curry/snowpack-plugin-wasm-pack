import * as execa from 'execa';
import { CommonOptions } from 'execa';
import { readFileSync } from 'fs';
import { env } from 'npm-run-path';
import { join, resolve } from 'path';
import type {
  SnowpackPlugin,
  SnowpackPluginFactory,
  SnowpackConfig,
} from 'snowpack';
import { logger } from 'snowpack';
import { parse } from 'toml';

export interface SnowPackPluginWASMPackOptions {
  projectPath: string;
  outDir?: string;
  outName?: string;
  logLevel?: 'info' | 'warn' | 'error';
  scope?: string;
  target?: 'bundler' | 'nodejs' | 'web' | 'no-modules';
  watch?: boolean | Array<SnowpackConfig['mode']>;
  extraArgs?: string[];
  wasmPackPath?: string;
}

const getPackageName = (absoluteProjectPath: string) => {
  try {
    const cargoToml = parse(
      readFileSync(join(absoluteProjectPath, 'Cargo.toml')).toString('utf-8'),
    );
    return cargoToml.package.name;
  } catch (error) {
    throw `\
Unable to find RustWasm project at ${absoluteProjectPath}
Please ensure there is a valid Cargo.toml in this directory
See https://rustwasm.github.io/wasm-pack/book/commands/new.html for creating a new project`;
  }
};

const snowpackPluginWASMPack: SnowpackPluginFactory<SnowPackPluginWASMPackOptions> = (
  snowpackConfig,
  {
    projectPath,
    outDir = 'pkg',
    outName = 'index',
    logLevel = 'warn',
    target = 'web',
    extraArgs = [],
    scope,
    wasmPackPath = 'wasm-pack',
    watch = ['development'],
  },
) => {
  const shouldWatch = Array.isArray(watch)
    ? watch.some((i) => i === snowpackConfig.mode)
    : !!watch;
  const absoluteProjectPath = resolve(
    snowpackConfig.root || process.cwd(),
    projectPath,
  );
  const absolutePackagePath = join(absoluteProjectPath, outDir);

  const packageName = getPackageName(absoluteProjectPath);
  const scopedPackageName = `${scope ? `@${scope}/` : ''}${packageName}`;
  const pluginName = `wasm-pack-snowpack-plugin [${scopedPackageName}]`;

  //
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
    ...(shouldWatch ? ['--dev'] : []),
    ...extraArgs,
  ];
  const wasmPackCommandOptions: CommonOptions<any> = {
    env: env(),
    extendEnv: true,
    windowsHide: false,
    cwd: join(snowpackConfig.root || process.cwd(), projectPath),
  };

  // Syncronously execute the build process in non-watch modes, so that the JS is available before the main build pipeline kicks off.
  let exitCode: number | undefined;
  if (!shouldWatch) {
    try {
      logger.info(`Executing build...`, { name: pluginName });
      const wasmPackResult = execa.sync(
        wasmPackPath,
        wasmPackArgs,
        wasmPackCommandOptions,
      );
      exitCode = wasmPackResult.exitCode;
    } catch (e) {
      exitCode = e.exitCode;
    }
  }

  //
  const config: SnowpackPlugin['config'] = (config) => {
    config.exclude.push(join('**', projectPath, '/target/**/*'));

    config.alias[scopedPackageName] =
      config.alias[scopedPackageName] ?? absolutePackagePath;

    config.mount[absolutePackagePath] = config.mount[absolutePackagePath] ?? {
      url: `/dist/${scopedPackageName}`,
      static: true,
      resolve: true,
    };
  };

  //
  const run: SnowpackPlugin['run'] = async ({ log }: any) => {
    if (!shouldWatch) {
      if (exitCode !== 0)
        throw new Error('wasm-pack failed to compile project');
      else return;
    }

    const p = wasmPackPath.replace(/\ /g, '\\ ');
    const a = wasmPackArgs.join(' ').replace(/\ /g, '\\ ');
    const cmd = `cargo watch -i .gitignore -i pkg/* -s ${p}\\ ${a}`;
    const wasmPackProcess = execa.command(cmd, wasmPackCommandOptions);

    const stdHandler = (e: any) => {
      let msg = (e.toString() as string)
        .replace(/\r\n\r\n/g, '\r\n')
        .replace(/\n\n/g, '\n');
      if (!msg?.trim()) return;

      if (msg.startsWith('[Running')) {
        log('WORKER_RESET', {});
      }

      log('WORKER_MSG', { msg, level: 'info' });

      if (msg.startsWith('[Finished')) {
        const match = msg.match(/:\s(\d+)\]/);
        const parsed = parseInt(match[1]);
        if (parsed !== NaN && parsed > 0) {
          log('WORKER_MSG', {
            msg: 'wasm-pack failed to compile project',
            level: 'error',
          });
        }
      }
    };

    const { stderr, stdout } = wasmPackProcess;
    stderr.on('data', stdHandler);
    stdout.on('data', stdHandler);
    return await wasmPackProcess;
  };

  return {
    name: pluginName,
    run,
    config,
  };
};

module.exports = snowpackPluginWASMPack;
