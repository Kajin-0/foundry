# MBE visual revision v2 — integration record

The original user-supplied standalone HTML and reference notes are preserved
as `archive/mbe_visual_v2.html` and `archive/mbe_notes_v2.txt`. These files
are **reference materials, not authoritative application code**.

## Adopted into the shared Foundry laboratory

- Support frame legs extended from 1.50 to 1.92 scene units.
- Transverse ties, a support collar around the bottom flange, and radial
  brackets: chamber visibly supported rather than floating.
- K-cell rotary feedthrough, vertical shutter actuation shaft, bracket and
  circular shutter blade, while retaining the existing animation.
- RGA cylindrical probe corrected to align with the rear vacuum port.
- Wafer film stacks contact the **lower face** of the two-inch circular wafer.
- MBE camera focuses slightly below the growth face; OrbitControls still allow
  inspecting the rest of the chamber.
- Compact Vacuum / Growth / Diagnostics categories in the controls.
- Subtle emissive highlight on the active growing layer (no bloom/post-FX).

## Deliberately retained from current Foundry instead of the uploaded v2

- Circular substrate/epi-layer meshes. The uploaded v2 still uses square
  meshes despite labeling the substrate a two-inch wafer.
- Correct composition-consistent Ga/Al group-III flux accounting, total
  layer thickness (2.10 µm), and rate-to-monolayer conversion.
- Explicit arsenic-assisted oxide desorption and pre-growth BFM measurement;
  the uploaded v2 deploys the BFM during growth and omits the improved steps.
- Chamber-gauge pressure separated from arsenic BEP and from load-lock
  pressure. The uploaded v2 uses a different gauge assumption; do not
  silently overwrite the documented model.
- RHEED drawn as a representative oscillation rather than a computed
  diffraction signal or a literal real-time oscillation counter.
- One shared room, Three.js renderer/camera, lazy MBE loading, and 10 Hz
  readouts. Do not reinstate the separate standalone renderer.

## Zero-detail-loss rendering optimization

The static geometry batcher groups rigid meshes only when **material and
vertex-attribute signatures match**. Original vertex positions (after baking
the rigid local transform), normals, UVs and triangle topology remain in
the merged buffer, and the original material and cutaway clipping remain
unchanged. Substrate/epilayer transforms, rotating parts, movable shutters,
beam visualization, emissive heating and transparent parts are excluded.

Batching cuts actual WebGL draw calls; it does not reduce source polygon
detail. Measured draw calls on the same headless Chromium environment are
checked with a disabled-batching control path. These tests do **not** establish
a desktop-GPU FPS gain. Device-level profiling is still needed.
