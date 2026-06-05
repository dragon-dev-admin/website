# Dragon 2.0 Website

The official website for Alpha Dragon, deployed at [alpha-dragon.ai](https://alpha-dragon.ai).

## Structure

- **Root**: Built static files served by GitHub Pages
- **`src/`**: Next.js source code

## Development

```bash
cd src
npm install
npm run dev
```

## Build & Deploy

The site is built using Next.js static export and deployed via GitHub Pages.

```bash
cd src
npm run build
# Copy contents of src/out/ to repo root
```

Pushing to `main` auto-deploys via GitHub Pages.
