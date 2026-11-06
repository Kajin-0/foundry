# Foundry — Interactive Semiconductor Process Lab

A **single shared 3D semiconductor fabrication laboratory** containing seven stations: LPE, Ar⁺ ion milling, MBE, CMP, 193 nm immersion lithography, spin coating and ion implantation. All stations share one Three.js scene, camera, WebGL renderer and navigation controls. The physics are illustrative, with tested layer/rate calculations where applicable.

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
- **Direct spin coater:** https://kajin-0.github.io/foundry/?tool=spin
- **Direct ion implanter:** https://kajin-0.github.io/foundry/?tool=implant
- Older `/mbe.html` links redirect to that station in the same room.

The shared lab initially displays seven equipment stations in overview.
Selecting **LPE**, **Ion Mill**, **MBE**, **CMP**, **LITHO**, **Spin Coat**, or **Implant** focuses the camera and opens the
chosen machine's full detailed geometry and controls.

## Performance architecture

- Exactly **one** WebGL renderer, camera, shared ground/grid and shared light/environment.
- Ground/grid and rear-wall extents are generated from the equipment footprints;
  future bays do not require manually lengthening the scene or hiding visible grid cutoffs.
- High-detail equipment only for the selected bay; other tools remain present
  as lightweight 3D room representations (LOD).
- MBE and CMP geometry/modules load on first selection, not at initial visit.
- Pixel ratio capped at 1.25 desktop / 1 on low-power or mobile screens,
  including after a resize or device-orientation change.
- Shadows disabled on low-power devices; selected equipment shadows use a
  reduced atlas refreshed at most a few times per second.
- Room overview framing derives from bay extents and adapts the lens on portrait displays.
  Detailed-station camera optics remain unchanged.
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

## ArF lithography (fifth station)

Open `?tool=litho` to explore a separate illustrative 300 mm silicon wafer exposure using 193 nm ArF immersion, 1.35 NA, 4x reduction, 26 x 33 mm field and 30 mJ/cm2 dose. The 6 x 6 field map and resist cross section are schematic, not calibrated lithography predictions. One instanced field mesh replaces 36 shader draws; shared renderer, room, lights, controls and presets are reused.

## Photoresist spin coating and ion implantation (sixth and seventh stations)

The user-provided standalone sources are archived verbatim in
`archive/spincoat_original.html` and `archive/ion_implanter_original.html`.
Their detailed equipment geometry has been adapted to bay-local Three.js groups
(`src/spin/scene.js`, `src/implant/scene.js`) using the **existing**
room, camera, lighting, OrbitControls, WebGL renderer, shared ground and
requestAnimationFrame loop. No iframe or new canvas is created.

Both geometry modules load on first station selection; the overview shows
lightweight silhouettes. GPU work for offscreen stations is disabled; a
background process continues numerically and redraws when revisited. Mobile
screens share the existing DPR/shadow budget. The implanter's 40 particles
are rendered as **one instanced mesh** rather than 40 separate draw submissions.
Rigid same-material top-level objects use the existing lossless merge helper.

Spin coating retains the supplied Emslie centrifugal-flow approximation,
Meyerhofer-style constant evaporation, 100 mm silicon substrate, 5 cP CAR
resist, 500/3000 rpm stages and approximately 1 µm target film. The 40-second
illustrative sequence runs at a 3× display speed. Film thickness / final
floor are model assumptions, not calibrated wafer values.

Ion implantation now uses **one fixed As⁺ silicon source/drain teaching recipe**:
100 keV, 5×10¹⁵ cm⁻², nominal 100 µA, 7° tilt and 22° twist. This is
consistent with the other Foundry demos: Run/Stop and a machine cutaway,
without a species or tilt selector. The demonstration still computes dose,
effective beam current, projected range (58 nm), straggle (19 nm), approximate
channeling/damage and dose-based real duration. The 35-second animation is
time-compressed; it is not a measured implanter, SRIM or TCAD model.

The overview implanter proxy now distinguishes the connected source, curved
mass-selection magnet and copper windings, acceleration/scan line, bellows,
end-station, load lock, vacuum pump and grounded structural supports. The
lightweight shell is not a second detailed equipment model. Repeated rigid
pieces are eligible for the original same-material batcher.

The shared lighting retains its existing two directional lights and one
WebGL renderer but uses a stronger neutral ambient/hemisphere contribution,
a moderately warmer key, a cool fill whose target follows the selected bay,
and slightly higher exposure. The room ground/wall also have better separation
from the machines. No new shadow-casting lights or rendering passes were added.

Both tools are **educational demonstrations**, not calibrated fabrication
recipes. The supplied originals remain archived, including the unused
implant presets for historical reference.

## Overview and navigation (November 2026 polish)

The seven-bay overview presents a lightweight title and compact station
selection overlay without adding any 3D assets. Click or tap the existing
static instrument silhouette (or its bay), select a station label with mouse
or keyboard (Enter/Space), or use the permanent station tabs. Navigation
uses one 680–1150 ms smoothstep camera journey on desktop; it interpolates
position, orbit target, field of view and fog while retaining the single
renderer. User pointer/wheel actions cancel the journey. Reduced-motion
preference disables these camera animations, and direct-link startup is
immediate. Mobile uses larger station buttons in a 3-column equipment grid,
with no tiny overlapping labels. All science models, recipe readouts,
cutaway controls and independent process timelines are unchanged.
