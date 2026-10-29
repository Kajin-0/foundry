# Foundry agent handoff

Read README.md and docs/VALIDATION.md first. `archive/lpe_ibe_v11_6.html` is an immutable source baseline. Product goal: a compelling, interactive, scientifically credible **conceptual learning tool**, not an enterprise digital twin. Priorities: conceptual clarity and user understanding, plausible/correct physics and process order, fast browser rendering, intuitive interactions, maintainable code. Avoid unnecessary complexity; use light analytic or scripted approximations when adequate. Preserve the original functionality and UI; do not modify other repositories.

Architecture: Three.js scene factories in src/scene, shared inputs in src/config, math/timelines in src/process, SVG in src/ui, application composition and coupled state loops in src/main.js.

Never silently promote illustrative kinetics/temperatures/pressure readouts into measured or calibrated physics. Preserve units and assumptions. For model changes, check dimensional consistency, monotonicity, limiting behavior and physically meaningful ranges; empirical calibration is optional and must not block an educational release. Never introduce expensive multiphysics solvers merely for scientific prestige. Visual and performance changes should be compared against baseline behavior where practical. Favor labels or brief inline explanations for critical simplifying assumptions.

Run `npm install`, `npm run dev`, `npm run check`, `npm test`, and `npm run build`. Verify both independent cycles, restart/abort, tab switching, camera and cutaways.

MBE is a standalone route (`mbe.html`). Its scene/UI/process are in `src/mbe/`; see `docs/MBE_MODEL.md`. Do not duplicate physical thickness logic: `layerThicknessUmAt()` governs the SVG, 3D layers and ML readout. Do not treat source BEP as chamber pressure. Run MBE numerical and Chromium tests before merging.

## Shared-room invariant (late October 2026)
All instruments **must live in the same Three.js scene**, reached by station tabs and shared camera: LPE x=0, Ion Mill x=16, MBE x=30. Never add a second WebGLRenderer, stand-alone MBE canvas or separate simulation page. `mbe.html` is a redirect-only compatibility path. The overview displays low-polygon representations; selected station shows full equipment; hidden machine processes can continue but GPU and DOM work should be throttled. MBE loads lazily. Profile performance with `window.__foundryDiagnostics()`; keep visual quality competitive on modest GPUs. Test overview, both legacy stations, MBE lazy selection, route compatibility and mobile, and verify one canvas across navigation.
