# Foundry agent handoff

Read README.md and docs/VALIDATION.md first. `archive/lpe_ibe_v11_6.html` is an immutable source baseline. Priority order: browser speed, scientific integrity, understandability. Preserve the original functionality and UI; do not modify other repositories.

Architecture: Three.js scene factories in src/scene, shared inputs in src/config, math/timelines in src/process, SVG in src/ui, application composition and coupled state loops in src/main.js.

Never silently promote illustrative kinetics/temperatures/pressure readouts into measured or calibrated physics. Preserve units and assumptions. Changes to models demand algebraic and empirical validation; visual updates demand original/current screenshots and performance comparison.

Run `npm install`, `npm run dev`, `npm run check`, `npm test`, and `npm run build`. Verify both independent cycles, restart/abort, tab switching, camera and cutaways.
