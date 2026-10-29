# Foundry agent handoff

Read README.md and docs/VALIDATION.md first. `archive/lpe_ibe_v11_6.html` is an immutable source baseline. Product goal: a compelling, interactive, scientifically credible **conceptual learning tool**, not an enterprise digital twin. Priorities: conceptual clarity and user understanding, plausible/correct physics and process order, fast browser rendering, intuitive interactions, maintainable code. Avoid unnecessary complexity; use light analytic or scripted approximations when adequate. Preserve the original functionality and UI; do not modify other repositories.

Architecture: Three.js scene factories in src/scene, shared inputs in src/config, math/timelines in src/process, SVG in src/ui, application composition and coupled state loops in src/main.js.

Never silently promote illustrative kinetics/temperatures/pressure readouts into measured or calibrated physics. Preserve units and assumptions. For model changes, check dimensional consistency, monotonicity, limiting behavior and physically meaningful ranges; empirical calibration is optional and must not block an educational release. Never introduce expensive multiphysics solvers merely for scientific prestige. Visual and performance changes should be compared against baseline behavior where practical. Favor labels or brief inline explanations for critical simplifying assumptions.

Run `npm install`, `npm run dev`, `npm run check`, `npm test`, and `npm run build`. Verify both independent cycles, restart/abort, tab switching, camera and cutaways.

MBE is a standalone route (`mbe.html`). Its scene/UI/process are in `src/mbe/`; see `docs/MBE_MODEL.md`. Do not duplicate physical thickness logic: `layerThicknessUmAt()` governs the SVG, 3D layers and ML readout. Do not treat source BEP as chamber pressure. Run MBE numerical and Chromium tests before merging.
