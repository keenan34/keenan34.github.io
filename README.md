# keenan34.github.io

Keenan Jajeh's portfolio: an isometric 3D Chicago block (React Three Fiber) with
three clickable landmarks, plus an AI twin that can run a real language model in
the visitor's browser (WebLLM + WebGPU).

- **PROJECTS marquee** opens the project list.
- **The Bean** opens About: bio, experience, skills, résumé.
- **Rooftop booth** opens the chat. It starts as a scripted twin and offers a
  "Boot AI twin" button (Llama 3.2 1B, ~880 MB, cached after the first visit) on
  browsers with WebGPU.

## Edit your info

Everything — text, links, projects, the AI's system prompt and the scripted
answers — lives in `src/data/portfolioData.js`. No 3D code needed.

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
