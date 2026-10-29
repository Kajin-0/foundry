# Room silhouette proxies

The Room view uses static **outer-silhouette representations** of the four
existing detailed tools. Each occupies the same world location as its detailed
counterpart, uses the same major dimensions and support logic, and switches
off when the user selects its detailed station. This is intentionally not a
second interactive model or a separate renderer.

## Dimensional anchors

| Equipment | Detailed-model reference | Proxy fidelity |
|---|---|---|
| LPE | `src/scene/lpe.js`, `config/geometry.js` | Four heater shells at x=−3.525, −1.175, +1.175, +3.525; shell radius 1.65 and center y=2.65; quartz tube length 12.60; two rails and four posts at x=±4.55, z=±0.70; end fittings |
| Ion mill | `src/scene/ion-mill.js` | Chamber radius 1.8, vertical y=1.7–5.1; four legs at x,z=±2.2 meeting the lower flange; skids, collar, source connection, supported load lock and turbo pedestal |
| MBE | `src/mbe/scene.js` | Chamber radius 1.5, y=2.0–5.3, tapered top and manipulator; four legs at ±2.0/±1.9 supporting the lower flange; external service ports |
| CMP | `src/cmp/scene.js` | Grounded 6.5-wide bench at y=1.10; platen radius 2.02; wafer carrier offset by 1.0; attached overhead carrier gantry at y≈4.9; slurry and conditioner arms |

## Deliberately omitted

Interior quartz/graphite components, RHEED optics, heater coils, bolts,
viewports' internal glazing, cables, plumbing, active etching, and film
growth are omitted in the *Room* proxies. These are shown when a tool is
selected. Colors indicate main structural materials without replicating
fine surface finishes.

## Performance

Proxies are never animated. `mergeStaticDrawCalls` batches meshes with
compatible materials and vertex layouts, retaining their source geometry and
normal data. Node tests compare full triangle counts and THREE.Box3 envelopes
before/after batching. All existing numerical process models remain unchanged.

## Shared ground and expansion envelope (October 2026)

The previous floor was a radius-80 circle and the grid was a finite
120-unit square centered on the original LPE position. The CMP bay at
x=46 extended toward the grid's x=60 border, visibly truncating the lab.
Those meshes are now **owned by `buildRoom()`**, never by LPE.

`src/scene/room-layout.js` calculates the occupied horizontal interval
from `BAYS` and station widths, then derives the rear-wall span, wall
supports, ground plane and grid dimensions. The floor is an opaque
**two-triangle plane**, not a tessellated circular floor; the grid retains
the original **2-unit line pitch** and is one native GridHelper line draw
call. Its remote edges sit beyond the fog horizon, including mobile
overview distance, so the grid no longer abruptly ends within the lab.

To add an equipment station, allocate a new entry in `BAYS` with a
non-overlapping x position and optionally `width`. The ground, grid and
rear wall expand automatically. Adding a *usable interactive* station
still requires its own lightweight proxy, detail factory, tab and
controller in `src/main.js`. Room geometry does not magically implement
a new machine.

The Room overview camera now computes its x target and required distance
from the same layout; mobile portrait view uses a wider field of view.
When a machine is selected its original 40° lens and 110-unit fog horizon
are restored. The per-device DPR/shadow budget updates on resize and
orientation changes. Labels outside the camera's projection are hidden.
The large rear wall uses a similar opaque dark finish instead of
screen-sized alpha blending.

These are render-work reductions, not demonstrated FPS gains on physical
hardware. Use desktop/mobile browser diagnostics and GPU profiling to
validate subjective responsiveness.
