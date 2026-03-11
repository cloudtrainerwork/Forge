# FORGE Method Documentation

**Functional Orchestration for Release-Grade Execution**

The execution architecture methodology that replaces Agile's backlog-sprint-velocity model with graph-based delivery.

## Live Site

[https://yourusername.github.io/forge-method](https://yourusername.github.io/forge-method)

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`

## Deploy

Push to `main` — GitHub Actions builds and deploys automatically.

## Setup (One-Time)

1. Create a new repo called `forge-method` on GitHub
2. Push this code to it
3. Go to **Settings → Pages → Source** → select **GitHub Actions**
4. Push any commit to `main` — the action deploys automatically

The site will be live at `https://yourusername.github.io/forge-method/`

## Customize the Base Path

If your repo name isn't `forge-method`, update two files:

- `vite.config.js` → change `base: '/your-repo-name/'`
- `package.json` → change `homepage` to match

## Structure

```
forge-docs/
├── .github/workflows/deploy.yml   # Auto-deploy on push to main
├── index.html                     # Entry HTML with meta tags + favicon
├── package.json
├── vite.config.js                 # Vite config with GitHub Pages base path
├── README.md
└── src/
    ├── main.jsx                   # React entry point
    └── forge-method-docs.jsx      # Full documentation site (16 pages)
```
