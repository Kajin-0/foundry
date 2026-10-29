# Foundry — Interactive Semiconductor Process Lab

A **single shared 3D semiconductor fabrication laboratory** containing LPE, Ar⁺ ion milling, MBE, and CMP equipment. All stations share one Three.js scene, camera, WebGL renderer and navigation controls. The physics are illustrative, with tested layer/rate calculations where applicable.

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

GitHub Pages deployment is automatic from `main` via
`.github/workflows/deploy-pages.yml`. Source setting: **GitHub Actions**.

- **Entire laboratory:** https://kajin-0.github.io/foundry/
- **Direct MBE station link:** https://kajin-0.github.io/foundry/?tool=mbe
- **Direct CMP station link:** https://kajin-0.github.io/foundry/?tool=cmp
- Older `/mbe.html` links redirect to that station in the same room.

The shared lab initially displays four equipment stations in overview.
Selecting **LPE**, **Ion Mill**, **MBE** or **CMP** focuses the camera and opens the
chosen machine's full detailed geometry and controls.

## Performance architecture

- Exactly **one** WebGL renderer, camera and shared light/environment.
- High-detail equipment only for the selected bay; other tools remain present
  as lightweight 3D room representations (LOD).
- MBE and CMP geometry/modules load on first selection, not at initial visit.
- Pixel ratio capped at 1.25 desktop / 1 on low-power or mobile screens.
- Shadows disabled on low-power devices; selected equipment shadows use a
  reduced atlas refreshed at most a few times per second.
- Process animations and readouts update independently of rendering; hidden
  machine state advances at reduced CPU frequency, and SVG updates are throttled.
- Read-only browser performance snapshot: `window.__foundryDiagnostics()`
  reports active room/station, one renderer, detail visibility, draw calls,
  triangles and DPR. Actual FPS varies by device; no universal FPS guarantee.
- Future GPU profiling should compare desktop and mobile p50/p95 frame time.

## Project structure

- `src/main.js`: shared room and station navigation, LPE/ion state, shared render loop
- `src/scene/room.js`: common laboratory with four stations and lightweight LOD stand-ins
- `src/mbe/scene.js`, `src/mbe/controller.js`, `src/mbe/ui.js`: lazily loaded MBE process
- `src/cmp/`: lazily loaded CMP equipment, deterministic STI recipe, controller and display
- `src/config/geometry.js`: common geometry/epitaxial stack inputs
- `src/scene/context.js`: WebGL, shared materials, camera, lighting
- `src/scene/helpers.js`: reusable geometry and GPU-instanced bolt rings
- `src/scene/lpe.js`: LPE furnace, boat, graphite slider, growing layers
- `src/scene/ion-mill.js`: ion mill, stage, chamber, ridge geometry
- `src/process/lpe-cycle.js`: illustrative temperature and deposition timeline
- `src/process/ion-etch.js`: analytical sputter-yield rate and mill timeline
- `src/ui/`: thermal profile and wafer cross-section SVGs
- `public/styles.css`: styles
- `archive/lpe_ibe_v11_6.html`: preserved LPE/ion baseline
- `archive/cmp_standalone_v1.html`: preserved user-supplied CMP source

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

## Chemical mechanical planarization (CMP)

The fourth station demonstrates a **separate silicon shallow-trench-isolation
(STI) oxide polish**, not a step applied to the GaAs/AlGaAs epitaxial wafer.
The illustrative recipe uses 3 psi down-force, 80/75 rpm platen/carrier,
alkaline colloidal-silica slurry, 500 nm oxide removal at a nominal 100 nm/min
and a SiN stop at 5 nm/min. A compressed 30-second represented overpolish
produces an illustrative 2.5 nm of SiN loss.

The equipment has a floor-supported bench, rotating platen, conditioned pad,
slurry arm and physically anchored, telescoping overhead carrier gantry.
The pad-contact geometry is checked in unit tests. The selected model is
loaded on demand; repeated rigid parts are batched and slurry droplets use
one instanced pool. Controls stay minimal: **Run/Stop** plus read-only
process conditions and live readouts. Existing focus/minimize tools work.
See `docs/CMP_MODEL.md` for exact assumptions and limitations.
