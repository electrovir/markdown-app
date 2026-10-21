# markdown-app

A markdown editor that runs entirely in the browser: https://electrovir.github.io/markdown-app

-   Markdown syntax stays visible while it's formatted in place (like Discord), with syntax highlighting inside fenced code blocks.
-   Docs are saved in the browser's IndexedDB. Nothing is sent to a server, so docs don't sync between browsers or devices.
-   Export the current doc as a `.md` file or a PDF.
-   Light and dark themes.

## Development

```sh
npm ci
npm start
```

Then open the logged localhost URL.
