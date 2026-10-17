# WavePaint

WavePaint is a browser application for drawing digital timing diagrams and waveforms. This repository contains the application source code, examples and tests under the MIT license.

## Run locally

Install Node.js 22 or newer, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 for the waveform editor.

## Features

- **Waveforms:** digital signals, buses, clocks, groups, arrows, markers, annotations, undo/redo and built-in protocol examples.
- **Import and export:** WavePaint documents, WaveDrom JSON, VCD, TXT/CSV and PNG, JPG or SVG images. Share links encode the diagram in the URL.

The editor runs in your browser. Opening and saving diagrams uses local files. WaveDrom live preview loads version 3.1.0 from cdnjs, so that preview needs a network connection. Other editing features work without that CDN.

The **Donate** button links to [WavePaint on Ko-fi](https://ko-fi.com/wavepaint) for optional contributions.

## Build and test

```sh
npm test
npm run build
npm run preview
```

The build writes a static site to `dist/`. JavaScript remains readable, with no obfuscation, string encoding or name mangling. See [BUILD.md](BUILD.md) for build commands and browser checks.

## Source map

| Path | Contents |
| --- | --- |
| `app/core/` | Waveform document model and editing operations |
| `app/io/` | File formats, share links and image export |
| `app/js/`, `app/ui/`, `app/css/` | Waveform editor interface |
| `app/examples/` | Example protocol diagrams |
| `app/test/` | Waveform model and import/export tests |
| `scripts/` | Local development and static builds |

## Contributing

Report bugs and propose changes through [GitHub issues](https://github.com/lodigic/WavePaint/issues) and pull requests. Include a small example diagram or reproduction steps where useful. Run the relevant tests and update the affected guide when changing commands, file formats or editor behavior.

## License

WavePaint application code is licensed under [MIT](LICENSE). Third-party software retains its own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
