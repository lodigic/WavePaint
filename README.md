# WavePaint

WavePaint is a browser application for drawing digital timing diagrams and waveforms. This repository contains the application source code, examples and tests under the MIT license.

## Run locally

From the repository root, start a local server with Python 3:

```sh
python3 -m http.server 3000 --bind 127.0.0.1 --directory app
```

Open http://localhost:3000 for the waveform editor.

The application is served directly from `app/`; no npm dependencies or build step are required.

## Features

- **Waveforms:** digital signals, buses, clocks, groups, arrows, markers, annotations, undo/redo and built-in protocol examples.
- **Import and export:** WavePaint documents, WaveDrom JSON, VCD, TXT/CSV and PNG, JPG or SVG images. Share links encode the diagram in the URL.

The editor runs in your browser. Opening and saving diagrams uses local files. WaveDrom live preview loads version 3.1.0 from cdnjs, so that preview needs a network connection. Other editing features work without that CDN.

The **Donate** button links to [WavePaint on Ko-fi](https://ko-fi.com/wavepaint) for optional contributions.

## Tests

With Node.js 22 or newer, run the suite from the repository root:

```sh
node app/test/test.cjs
```

Use `--core`, `--io` or `--ui` to run one group, and `--help` for all options. The suite uses the `.cjs` files in `app/test/` and requires no installed packages.

## Source map

| Path | Contents |
| --- | --- |
| `app/core/` | Waveform document model and editing operations |
| `app/io/` | File formats, share links and image export |
| `app/js/`, `app/ui/`, `app/css/` | Waveform editor interface |
| `app/examples/` | Example protocol diagrams |
| `app/test/` | Waveform model, import/export and UI unit tests |
| `app/test/io/wavedrom_samples/` | WaveDrom JSON examples used by round-trip tests; also available for manual import |
| `examples/wavepaint/` | WavePaint documents for manual opening and import checks |

## Contributing

Include a small example diagram or reproduction steps when reporting an issue. Run the relevant tests and update the affected guide when changing commands, file formats or editor behavior.

## License

WavePaint application code is licensed under [MIT](LICENSE). Third-party software retains its own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
