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

## Scientific integrity

**Educational demonstration, not a predictive or calibrated digital twin.** Furnace temperatures/gradients, growth durations, thicknesses, pump-down, stage heating, etch kinetics and plasma dynamics are illustrative assumptions. Do not use outputs to approve actual fabrication recipes.

The ion-mill estimate uses `rate = Y(theta) * J / (e * n)`: `J` in A/cm², `n` atomic number density in atoms/cm³, `Y` sputtered atoms per ion; `cm/s × 1e7 × 60` yields nm/min. It neglects redeposition, material-dependent yields, angular scattering, charging, ion damage, detailed topography and calibrated tool conditions. Internal algebraic consistency is tested, not experimental agreement.

LPE layer thicknesses and temperature histories are scripted, not outcomes of a thermochemical/transport/thermal solver. 3D geometry exaggerates epi layers; the ion-mill SVG uses a micrometre-proportional vertical scale. Never infer physical thickness directly from the 3D render.

## Browser performance

- Three.js bundled and version-pinned to 0.160.0; static production deployment
- GPU instancing for repeated bolts; only the selected machine is drawn
- 60 Hz target while active or orbiting; 24 Hz while idle; hidden-tab frame skipping
- DPR capped at 1.5; smaller shadow atlas on narrow screens

**Release gate:** compare visually against the archived HTML; test both cycles including abort/restart and cutaways. Benchmark transfer size, median/p95 frame time, FPS, WebGL draw calls, and browser console errors on target devices. See `docs/VALIDATION.md`.
