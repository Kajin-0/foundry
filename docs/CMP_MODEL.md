# CMP model: integration and assumptions

## Provenance
The original user-supplied standalone Three.js CMP demo is preserved
unaltered in `archive/cmp_standalone_v1.html`. The integrated station
reuses its **silicon shallow-trench isolation (STI) SiO₂/SiN** teaching
scenario, phase order and basic mechanical arrangement. It is not a CMP
step for the GaAs/AlGaAs laser wafer shown at other Foundry stations.

## Preset educational recipe
- Platen 80 rpm; carrier 75 rpm; wafer offset half the platen radius
- Nominal contact pressure 3 psi
- Colloidal silica slurry, alkaline pH 10.5, ~120 nm particles, 200 mL/min
- Oxide nominal removal 100 nm/min, 500 nm thickness
- SiN nominal removal 5 nm/min; implied selectivity 20:1
- Nominal oxide-polish interval 5 min, nominal overpolish 30 s
- Illustrative nitride loss: 5 nm/min × 0.5 min = **2.5 nm**
- Total animation 19.5 s covering ~8.5 min represented process

The source's qualitative chemistry and simple rate calculation are retained,
but no real Preston coefficient is measured or fitted. The process neglects
temperature, polishing-pad wear, particle contact mechanics, slurry transport,
pattern-density/dishing variations, actual endpoint sensor signals and
across-wafer nonuniformity. 3D and SVG layer thicknesses are schematic.

## Mechanical fixes
The standalone head appeared suspended over the table. The Foundry CMP
station adds a bench-supported overhead gantry with two rear columns,
crossbeam, cantilever and telescoping spindle. The rotating wafer is secured
to the carrier and sits directly on the pad at contact; conditioner/slurry
assemblies are also anchored. The wafer begins above the pad and removal
begins only after contact. This is plausible illustrative mechanical geometry,
not manufacturer-specific fabrication CAD.

## Integration and speed
- Single shared WebGL renderer, scene, camera, floor, lighting and clock
- CMP at world x=46 with matching low-poly Room overview silhouette
- Detailed CMP module loaded only upon selection
- Static external structures merged losslessly by material/vertex signature
- A single instanced slurry pool replaces individually drawn droplets
- DOM and SVG updates ~10 Hz; no user-adjustable recipe knobs
- Existing minimize panels and Focus view work with CMP

## Verification
Run `npm run check`, `npm test`, `npm run build`,
`npm run test:browser`. Tests cover the rate/time and contact relationship,
monotonic oxide removal, endpoint and 2.5 nm SiN erosion, four Room bays,
CMP lazy load, one canvas, switch while running, and mobile Focus mode.
A headless browser pass does not establish actual desktop GPU FPS.
