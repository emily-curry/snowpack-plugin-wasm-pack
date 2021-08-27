# snowpack-plugin-wasm-pack

> Snowpack plugin for rust using [`wasm-pack`](https://rustwasm.github.io/wasm-pack/book/) 🦀

A forked version of [snowpack-plugin-wasm-pack](https://git.sr.ht/~george_/snowpack-plugin-wasm-pack). See [Changes](#Changes) below.

## Installation

```bash
yarn add --dev @emily-curry/snowpack-plugin-wasm-pack
```

The plugin also depends on [`wasm-pack`](https://github.com/rustwasm/wasm-pack) and [`cargo-watch`](https://github.com/passcod/cargo-watch)

These can be installed with:

```bash
cargo install wasm-pack
```

(or following [these instructions](https://rustwasm.github.io/wasm-pack/installer/))

```bash
cargo install cargo-watch
```

## Usage

Create a new RustWasm project within your project:

```bash
wasm-pack new <my-wasm-project-name>
```

Add the plugin to your Snowpack config:

**snowpack.config.js**

```js
module.exports = {
  mount: {
    src: '/',
  },
  plugins: [
    [
      '@emily-curry/snowpack-plugin-wasm-pack',
      {
        projectPath: './my-wasm-project-name',
      },
    ],
  ],
};
```

## Options

| Name           | Description                                                          |                  Type                   | Required |      Default      |
| :------------- | :------------------------------------------------------------------- | :-------------------------------------: | :------: | :---------------: |
| `projectPath`  | Relative path from the root to your wasm-pack project.               |                `string`                 |   yes    |         -         |
| `outDir`       | Directory for the compiled assets.                                   |                `string`                 |          |      `"pkg"`      |
| `outName`      | Sets the prefix for output file names.                               |                `string`                 |          |     `"index"`     |
| `logLevel`     | Sets the log level of `wasm-pack`.                                   |    `"info"` or `"warn"` or `"error"`    |          |     `"warn"`      |
| `target`       | Sets the target of `wasm-pack`.                                      |                `string`                 |          |      `"web"`      |
| `scope`        | Scope of your package name, eg: `@test/my-great-wasm`.               |                `string`                 |          |         -         |
| `extraArgs`    | Any extra args you want to pass to wasm-pack. eg: `--no-typescript`. |             `Array<string>`             |          |         -         |
| `wasmPackPath` | Path to a custom install of `wasm-pack`.                             |                `string`                 |          |         -         |
| `watch`        | The snowpack modes that will run wasm-pack in watch mode.            | `boolean` or `SnowpackConfig['mode'][]` |          | `['development']` |

## In your code:

`wasm-pack` exports an `init` funtion as the default export. This **must** be called (once) before any other functions can be used.
`snowpack-plugin-wasm-pack` will automatically configure path aliases to your project under the name of your package:

**project/lib.rs**

```rs
// --- code omitted

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

**src/index.ts**

```ts
import init, { add } from 'my-wasm-project-name';

const maths = async () => {
  await init();

  console.log('Addition in rust:', add(1, 2));
};

maths(); // should log 3 to console
```

**src/index.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <h1>🦀</h1>
    <script type="module" src="index.js"></script>
  </body>
</html>
```

## Usage with typescript

You need to manually add the alias to your tsconfig under `compilerOptions` -> `paths`.

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "my-wasm-project-name": ["./my-wasm-project-name/pkg"]
    }
  }
}
```

## Multiple RustWasm projects

Add the plugin multiple times for multiple projects:

**snowpack.config.js**

```js
module.exports = {
  // ... rest omitted
  plugins: [
    [
      '@emily-curry/snowpack-plugin-wasm-pack',
      {
        projectPath: './my-wasm-project-name',
      },
    ],
    [
      '@emily-curry/snowpack-plugin-wasm-pack',
      {
        projectPath: './path/to/another/project',
      },
    ],
  ],
};
```

## Changes

### 1.0.0

- Added `watch` option. In modes matching the watch option, the wasm-pack build process runs alongside the snowpack build process. In non-watch modes, the wasm-pack build process executes syncronously before the main snowpack build process, ensuring the files are built in time for subsequent steps.

### 1.1.0

- Added `target` option, allowing the `wasm-pack --target` arg to be set.

### 1.1.2

- README improvements.

### 1.1.3

- `snowpack build` now outputs same compilation logs as `snowpack dev`.

## Useful links

[`wasm-pack`](https://rustwasm.github.io/wasm-pack/book/introduction.html)
[`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen)
[`snowpack`](https://www.snowpack.dev/)
