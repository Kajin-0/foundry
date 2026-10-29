# Room silhouette proxies

The Room view uses static **outer-silhouette representations** of the three
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
