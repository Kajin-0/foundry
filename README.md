# Foundry — Interactive Photodetector Process Lab

A modular browser-based 3D teaching and process-visualization application for GaAs/AlGaAs liquid-phase epitaxy and Ar⁺ ion-beam milling, migrated from v11.6 without changing the underlying timeline/physics constants.

## Run locally

```sh
npm install
npm run dev
npm run check
npm test
npm run build
```

Deploy `dist/` to a static host or embed its production assets in a website.

## Hosted GitHub Pages site

GitHub Pages uses **Settings → Pages → Source: GitHub Actions**. The workflow at
`.github/workflows/deploy-pages.yml` builds the Vite multi-page application,
checks syntax and process-model tests, uploads only the generated `dist/`
directory and publishes automatically after each push to `main`.
It can also be launched manually from **Actions → Deploy Foundry to GitHub Pages → Run workflow**.

- LPE / ion-mill: https://kajin-0.github.io/foundry/
- MBE: https://kajin-0.github.io/foundry/mbe.html

`vite.config.js` specifies relative asset paths (`base: './'`) so both pages
work under the repository's `/foundry/` URL prefix. There is no server
component. The deploy job requests the minimum GitHub Pages publishing token
permissions (`contents: read`, `pages: write`, `id-token: write`).

## Labs

- [LPE + ion mill](./index.html) — furnace growth and Ar⁺ etch.
- [MBE](./mbe.html) — GaAs/AlGaAs UHV molecular-beam epitaxy, flux calibration, oxide desorption, RHEED and layer growth. See [MBE model notes](docs/MBE_MODEL.md).

## Project structure

- `src/main.js`: state machines, controls, orchestration, render loop
- `src/config/geometry.js`: common geometry/epitaxial stack inputs
- `src/scene/context.js`: WebGL, shared materials, camera, lighting
- `src/scene/helpers.js`: reusable geometry and GPU-instanced bolt rings
- `src/scene/lpe.js`: LPE furnace, boat, graphite slider, growing layers
- `src/scene/ion-mill.js`: ion mill, stage, chamber, ridge geometry
- `src/process/lpe-cycle.js`: illustrative temperature and deposition timeline
- `src/process/ion-etch.js`: analytical sputter-yield rate and mill timeline
- `src/ui/`: thermal profile and wafer cross-section SVGs
- `public/styles.css`: styles
- `archive/lpe_ibe_v11_6.html`: preserved monolithic source for comparison

## Product philosophy

Foundry is an **interactive conceptual semiconductor-fabrication laboratory**. The objective is to help learners visualize equipment internals, process sequences and cause-and-effect relationships. Keep it responsive, easy to understand and fun to experiment with. Use physically plausible values and simple, transparent equations without escalating to costly numerical solvers or exhaustive empirical calibration. Scientific accuracy matters when it changes the concept being taught; pedagogical clarity outweighs marginal numerical precision.

**Feature acceptance:** explain what the user learns, provide realistic parameter ranges and units, maintain a consistent causal response to interactive controls, avoid physically misleading visual effects, and verify browser performance. Avoid adding controls that merely make the UI busy.

## Scientific integrity

**Educational demonstration, not a predictive or calibrated digital twin.** Furnace temperatures/gradients, growth durations, thicknesses, pump-down, stage heating, etch kinetics and plasma dynamics are illustrative assumptions. The displayed values should communicate qualitative and approximate quantitative relationships, never approval of actual fabrication recipes.

The ion-mill estimate uses `rate = Y(theta) * J / (e * n)`: `J` in A/cm², `n` atomic number density in atoms/cm³, `Y` sputtered atoms per ion; `cm/s × 1e7 × 60` yields nm/min. It neglects redeposition, material-dependent yields, angular scattering, charging, ion damage, detailed topography and calibrated tool conditions. Internal algebraic consistency is tested, not experimental agreement.

LPE layer thicknesses and temperature histories are scripted, not outcomes of a thermochemical/transport/thermal solver. 3D geometry exaggerates epi layers; the ion-mill SVG uses a micrometre-proportional vertical scale. Never infer physical thickness directly from the 3D render.

## Browser performance

- Three.js bundled and version-pinned to 0.160.0; static production deployment
- GPU instancing for repeated bolts; only the selected machine is drawn
- 60 Hz target while active or orbiting; 24 Hz while idle; hidden-tab frame skipping
- DPR capped at 1.5; smaller shadow atlas on narrow screens

**Release gate:** compare visually against the archived HTML; test both cycles including abort/restart and cutaways. Benchmark transfer size, median/p95 frame time, FPS, WebGL draw calls, and browser console errors on target devices. See `docs/VALIDATION.md`.
