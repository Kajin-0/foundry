# Foundry agent handoff

Read README.md and docs/VALIDATION.md first. `archive/lpe_ibe_v11_6.html` is an immutable source baseline. Product goal: a compelling, interactive, scientifically credible **conceptual learning tool**, not an enterprise digital twin. Priorities: conceptual clarity and user understanding, plausible/correct physics and process order, fast browser rendering, intuitive interactions, maintainable code. Avoid unnecessary complexity; use light analytic or scripted approximations when adequate. Preserve the original functionality and UI; do not modify other repositories.

Architecture: Three.js scene factories in src/scene, shared inputs in src/config, math/timelines in src/process, SVG in src/ui, application composition and coupled state loops in src/main.js.

Never silently promote illustrative kinetics/temperatures/pressure readouts into measured or calibrated physics. Preserve units and assumptions. For model changes, check dimensional consistency, monotonicity, limiting behavior and physically meaningful ranges; empirical calibration is optional and must not block an educational release. Never introduce expensive multiphysics solvers merely for scientific prestige. Visual and performance changes should be compared against baseline behavior where practical. Favor labels or brief inline explanations for critical simplifying assumptions.

Run `npm install`, `npm run dev`, `npm run check`, `npm test`, and `npm run build`. Verify both independent cycles, restart/abort, tab switching, camera and cutaways.

MBE lives inside the shared room, lazily mounted at x=30. Its scene, controller and UI are in `src/mbe/`; `mbe.html` is now a compatibility redirect only. See `docs/MBE_MODEL.md`. Do not duplicate physical thickness logic: `layerThicknessUmAt()` governs the SVG, 3D layers and ML readout. Do not treat source BEP as chamber pressure. Run numerical and Chromium room-navigation tests before merging.

## Shared-room invariant (late October 2026)
All instruments **must live in the same Three.js scene**, reached by station tabs and shared camera: LPE x=0, Ion Mill x=16, MBE x=30, CMP x=46. Never add a second WebGLRenderer, stand-alone MBE canvas or separate simulation page. `mbe.html` is a redirect-only compatibility path. The overview displays low-polygon representations; selected station shows full equipment; hidden machine processes can continue but GPU and DOM work should be throttled. MBE loads lazily. Profile performance with `window.__foundryDiagnostics()`; keep visual quality competitive on modest GPUs. Test overview, both legacy stations, MBE/CMP lazy selection, route compatibility and mobile, and verify one canvas across navigation.

## Ion-mill educational UX and physical assembly
Ion milling is a **preset illustrative recipe**, like LPE and MBE. No user-adjustable stage tilt or etch depth: defaults live in `src/process/ion-etch.js` (500 eV, 0.5 mA/cm², 30° tilt, 0.40 µm target). The sole slider is chamber cutaway. The wafer is already mounted on the stage in the chamber at idle and throughout every phase. The earlier scene's airborne "load" animation was removed intentionally; actual load-lock transfer occurs offscreen prior to the demonstration. The chamber rests on grounded posts/collar, the lower turbo stack on a pedestal, and the side load lock on a support bracket. Preserve these constraints when extending the simulation; test no motion relative to the stage and the simplified controls in Chromium.

## Overlay visibility / inspection mode
Process (#leftPanel) and Equipment (#rightPanel) are independently minimizable,
with fixed edge restore tabs and an unobtrusive `Focus view` button in the HUD.
Press H to toggle both; Escape restores both. When both are minimized, hide
nonessential HUD title, 3D floating labels and navigation hint; do not pause
or reset the current scientific process. Visibility must persist when changing
stations, including lazy MBE loading. Logic is in `src/ui/panel-visibility.js`;
tests cover desktop/mobile, keyboard and simulation continuity.

## CMP integration (October 2026)
Original source: `archive/cmp_standalone_v1.html`. Working fourth station:
`src/cmp/`; lazy-mounted by `src/main.js` at **world x=46** in the
existing Three.js scene. Room uses a static, grounded CMP silhouette.
Do not create another renderer, camera, light rig, floor or RAF loop.
The wafer is a separate **silicon STI reference**, not the GaAs laser wafer.
`cmpAtTime` is the deterministic authority for oxide/SiN removals, endpoint,
cross-section and readouts; it is not a measured Preston-law model.
At 3 psi the wafer must touch the pad; the gantry must support the head.
Keep the instanced droplets, rigid-mesh batching, lazy load, 10 Hz SVG UI,
and Run/Stop-only preset controls. Browser tests cover the fourth station,
one renderer, minimization and mobile controls.

## Shared room sizing and performance audit (October 2026)
The ground/grid moved out of LPE to `buildRoom()` (do not recreate a
station-specific floor). `src/scene/room-layout.js` derives the room's
ground size, 2-unit-pitch grid, rear wall and responsive overview from
`BAYS` and station footprint widths. When adding equipment, extend
`BAYS` and the proxy/controller/UI; never hardcode new wall/grid limits.
Keep a shared opaque ground with only 2 triangles and a single GridHelper
line draw. The wall is opaque to avoid large-area blending.
Portrait overview uses a wider FOV so the end bays remain framed; tool
views always restore the original 40° lens and normal fog range.
The mobile pixel ratio and shadows must be recomputed on resize.
Room labels should not render beyond the camera clip volume.
Tests cover a hypothetical fifth station, ground mesh count and original
four-bay envelope without modifying any process physics. This project
does not claim measured real-device FPS from headless Chromium.

## LITHO fifth bay

`src/litho` owns a lazy-loaded, illustrative 193 nm step-and-scan lithography station at world x=62. It is a separate silicon 300 mm wafer reference, not the GaAs laser wafer. The grounded room proxy lives in `src/scene/room.js`. One instanced mesh displays 36 exposure fields; do not batch the dynamic stage/reticle/beam. No extra scene, renderer, frame loop or adjustable recipe knobs. Keep existing process calculations unchanged. Tests in `tests/litho-process.test.js` and `tests/browser.spec.js` verify navigation and process state.

## Sixth and seventh stations — spin coater and implanter (Nov 2026)

Spin coating is lazy-mounted at world x=78; ion implantation at world x=94.
They must remain part of the SAME shared room: one renderer, one camera,
one active RAF loop, and no duplicated station-specific ground or lights.
`src/spin/` and `src/implant/` preserve the user-supplied process
approximations and detailed equipment appearance. Untouched originals live
under `archive/`. Each station has an inexpensive static room silhouette;
`BAYS` drives the room envelope. Offscreen stations are never rendered in
detail; ongoing timelines advance without per-frame DOM updates. The
implanter uses GPU instancing for forty moving beam particles.

Both include independent preset processes, process-status and SVG panels,
cutaway controls, focus/minimize compatibility, mobile navigation and
`?tool=spin` / `?tool=implant` direct links. Keep implant beam/species
physics explicitly illustrative and separate from real wafer qualification.
New tests must verify lazy loading, no additional canvas, process controls,
mobile behavior and continuity across tabs.

## Shared lighting, simplified implant controls and proxy geometry (Nov 2026)

The implanter is now a fixed As⁺ 100 keV / 5×10¹⁵ cm⁻² / 7° tilt recipe;
there are no species/tilt selection buttons. The process values remain visible
as *read-only* parameters. Retain the cutaway slider, Run/Stop cycle and
existing dose-conserving illustrative physics. The spin and implant Run buttons
share the LPE/Ion-Mill visual states (idle/running/complete) and are kept at
the top of their equipment cards on phones. Do not restore unrequested modes.

The overview implanter LOD has a connected beamline, two curved yoke plates,
copper coils, high-voltage source support, chamber/load lock and pump. Preserve
the recognizable source → analyzer → end-station layout and grounded mounts.
Use simple static geometry eligible for same-material batching; do not import
full chamber detail into the overview. Tests in `tests/room-proxies.test.js`
verify the silhouette topology independently of the detailed scene.

Shared scene lighting in `src/scene/context.js` uses the existing ambient,
hemisphere and two directional lights, with no new shadow-casting emitters.
The fill light and its target must follow `BAYS[tab].x` in `src/main.js` just
like the key light so rightmost tools do not lose their secondary illumination.
Do not reintroduce a fixed fill light aimed at world x=0. Keep mobile shadow
and DPR budgets intact. Browser diagnostics expose lighting values and tests
check the fill target at the overview, implant and LPE stations.

## Seven-bay navigation and overview polish (Nov 2026)

The overview remains one shared Three.js room; it now has a small HTML title,
seven keyboard-accessible DOM room labels and on-demand raycasts for clicking
static room proxies/bay slabs. Picking occurs on pointer actions only, throttled
on hover (~12 Hz), never in the render loop. Do not add shadow passes, meshes,
textured decals, a second canvas, or per-frame raycasts for navigation.
`src/ui/camera-journey.js` owns the smoothstep camera easing and distance-bounded
transition timing. `src/main.js` interpolates position, OrbitControls target,
field of view and fog in the *existing* RAF. A pointer/wheel interaction cancels
the transition, direct links/reduced-motion initialize immediately, and resize
reframes the overview. Keep the snapshot coordinates in `camPos` unchanged.

The left overview panel is intentionally short to avoid concealing the first
bays; full station navigation remains in `#rightPanel`. Desktop room labels
alternate height to avoid collisions; mobile labels are suppressed in favor
of the readable 3-column Equipment grid and room guidance. Existing focus/
minimize and all seven tool execution controls must remain functional.
Tests in `tests/camera-journey.test.js` and `tests/browser.spec.js` cover easing,
keyboard access, label collision, cancellations, mobile, one WebGL canvas and
the original tool physics. Browser testing should be serial on low-resource
software WebGL environments (avoid two Chromium runs at once).
