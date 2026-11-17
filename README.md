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

## Custom domain

The primary URL is `https://www.keenanjajeh.com/`. Vite copies `public/CNAME`
into the deployment output.

In GitHub **Settings → Pages → Custom domain**, set `www.keenanjajeh.com`.
The GitHub Actions deployment requires this setting; the CNAME file alone does
not configure the domain. At the domain's DNS provider, add a `CNAME` record
with host `www` and target `keenan34.github.io`. Enable **Enforce HTTPS** in
GitHub Pages once the certificate is ready.
