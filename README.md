# snowpack-plugin-wasm-pack

Snowpack plugin for rust using [`wasm-pack`](https://rustwasm.github.io/wasm-pack/book/) 🦀

## Installation

```bash
yarn add --dev snowpack-plugin-wasm-pack
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
wasm-pack new <name>
```

Add the plugin to your Snowpack config:

**snowpack.config.js**

```js
module.exports = {
  plugins: [
    [
      'snowpack-plugin-wasm-pack',
      {
        projectPath: './path/to/project',
      },
    ],
  ],
};
```

## Options

| Name           | Description                                                          |               Type                | Required |  Default  |
| :------------- | :------------------------------------------------------------------- | :-------------------------------: | :------: | :-------: |
| `projectPath`  | Relative path from the root to your wasm-pack project.               |             `string`              |   yes    |     -     |
| `outDir`       | Directory for the compiled assets.                                   |             `string`              |          |  `"pkg"`  |
| `outName`      | Sets the prefix for output file names.                               |             `string`              |          | `"index"` |
| `logLevel`     | Sets the log level of `wasm-pack`.                                   | `"info"` or `"warn"` or `"error"` |          | `"warn"`  |
| `scope`        | Scope of your package name, eg: `@test/my-great-wasm`.               |             `string`              |          |     -     |
| `extraArgs`    | Any extra args you want to pass to wasm-pack. eg: `--no-typescript`. |          `Array<string>`          |          |     -     |
| `wasmPackPath` | Path to a custom install of `wasm-pack`.                             |             `string`              |          |     -     |

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
import init, { add } from 'project-name';

const maths = async () => {
  await init();

  console.log('Addition in rust:', add(1, 2));
};
```

## Usage with typescript

You need to manually add the alias to your tsconfig under `compilerOptions` -> `paths`.

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "project-name": ["./path/to/project/pkg"]
    }
  }
}
```

## Multiple RustWasm projects

Add the plugin multiple times for multiple projects:

**snowpack.config.js**

```js
module.exports = {
  plugins: [
    [
      'snowpack-plugin-wasm-pack',
      {
        projectPath: './path/to/project',
      },
    ],
    [
      'snowpack-plugin-wasm-pack',
      {
        projectPath: './path/to/another/project',
      },
    ],
  ],
};
```

## Useful links:

[`wasm-pack`](https://rustwasm.github.io/wasm-pack/book/introduction.html)
[`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen)
[`snowpack`](https://www.snowpack.dev/)
