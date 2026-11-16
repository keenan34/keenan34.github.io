# keenan34.github.io

Keenan Jajeh's portfolio: an isometric 3D Chicago block (React Three Fiber) with
the Sears Tower, the Hancock, the 'L', the Bean and a dyed-green river.

- **The 'L' train** opens the project list.
- **The Bean** opens About: bio, experience, skills, résumé.

## Edit your info

Everything — text, links, projects, experience, skills — lives in
`src/data/portfolioData.js`. No 3D code needed.

## Run locally

```
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serve the built dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and
publishes `dist/` to GitHub Pages. In the repo's **Settings → Pages**, the source
must be set to **GitHub Actions**.

Static files (résumé, photo, favicon) are in `public/`.
