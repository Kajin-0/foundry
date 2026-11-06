# Educational plausibility and performance validation

| Model | Current teaching approximation | Beyond scope (predictive-grade upgrade) |
| --- | --- | --- |
| LPE layers | Scripted thickness | Ga–Al–As liquidus, mass transport, supersaturation, kinetics and experimental thickness validation |
| Furnace | Equal zone readouts, illustrative axial curve | Calibrated thermocouple/controller dynamics and transient heat-transfer solution |
| Ion milling | Analytic flux × assumed angular yield | Measured yield vs composition, energy, angle, temperature, selectivity, damage and redeposition |
| Vacuum | Prescribed pump-down curve | Conductance, throughput/pump characteristics, gas transport, calibrated gauges |
| Spin coat | Emslie flow + simplified Meyerhofer evaporation; constant viscosity and film floor | Calibrated resist rheology, solvent transport, edge bead, substrate wetting, measured thickness uniformity |
| Ion implantation | Preset projected ranges, asymmetric Gaussian, channeling and damage | SRIM/TCAD calibration, crystal orientation, diffusion and activation anneal, actual dosimetry |
| Optoelectronic device | Not modeled | Optical/electrical carrier transport and validated device measurements |

These high-fidelity upgrades are **not planned release requirements**. The educational acceptance standard is dimensional consistency, physically plausible magnitudes, coherent trends/limiting behavior and clear conceptual cause-and-effect. Distinguish assumed input, analytical estimate and validated measurement. The visual animation is not metrology.

## Before a production release
1. Compare baseline and modular implementation at startup, every phase, all sliders, pause/abort/restart.
2. Test Chrome/Firefox/Safari and WebGL failure behavior, across narrow/mobile and desktop viewports.
3. Profile desktop and mid-tier mobile with production build: median and p95 frame time, first paint, JS transfer, GPU draw calls.
4. Suggested engineering targets (not results): p95 ≤16.7 ms desktop during interaction and ≤33 ms mid-tier mobile; zero console errors/NaNs/negative thickness.
5. Check representative settings against credible physical ranges and dimensional consistency. Calibration is only necessary if explicitly claiming predictive accuracy; do not gate illustrative releases on experimental datasets.

Seven-bay regression checks: all seven stations are navigable with one
WebGL canvas; no second floor, light rig or animation loop is created by
the added process modules. On selecting Spin/Implant, run the cycle,
switch tabs while it runs, revisit the tool and verify the numeric state
has advanced without redundant 3D redraws. Verify the two added cutaway
sliders, fixed As⁺ 100 keV / 7° recipe (no selectable modes), deep links and mobile
focus/minimize behavior. The supplied unmodified sources are archived.

The implant overview LOD must preserve distinct physical source, analyzer
curved yokes, connected acceleration/scan line, vacuum chamber, load lock,
pumping and structural support. Lighting verification checks that the cool
fill moves with active tool selection while maintaining two directional
lights, the one WebGL renderer and the existing low-power shadow settings.
