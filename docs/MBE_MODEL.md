# MBE — science and educational model

## Scope

A schematic, 3D solid-source GaAs/AlGaAs molecular-beam epitaxy demonstration. It illustrates the UHV chamber, effusion cells, group-III beam-flux checks, downward-facing rotating substrate, arsenic-assisted oxide desorption, shutter sequencing, RHEED oscillations and growth of a classic double-heterostructure. **Not a process simulator, metrology tool, or qualified fabrication recipe.** Original source and author's notes are archived in `archive/mbe_v1.html` and `archive/mbe_scientific_notes_v1.txt`.

## Physical quantities and units

- GaAs lattice parameter: 0.565325 nm, (001) bilayer/ML: `a/2 = 0.2826625 nm`.
- Ga flux: 1.000 Ga-site monolayers/s, Al flux during AlGaAs: 3/7 = 0.428571 ML/s.
- `x_Al = F_Al/(F_Al+F_Ga) = 0.30`, assuming approximately unity group-III incorporation.
- GaAs rate: 1.018 µm/hr; AlGaAs: 1.454 µm/hr. Group-III fluxes add.
- Layers: GaAs 1.00 µm / Al0.3Ga0.7As 0.50 µm / GaAs 0.10 µm / Al0.3Ga0.7As 0.50 µm, total 2.10 µm.
- Growth duration for each layer is `thickness_nm / [rate_ML_per_s × ML_nm × 60]` minutes, including the time used in layer-transition demonstrations.
- The physical deposition progress is the **sole** source of data for the SVG cross-section, 3D film geometry and monolayer counter. The 3D layers are deliberately exaggerated.
- Base pressure: 5×10⁻¹¹ Torr; beam-exposed chamber-gauge pressure illustratively ~2×10⁻⁸ Torr. The As beam-equivalent pressure at the wafer can be ~7×10⁻⁶ Torr and is **not** the same as the chamber-gauge pressure. These are representative values, not calibrated to one chamber.
- Example GaAs substrate oxide-desorption temperature: ~610 °C with As shutter open; grow at 580 °C. RHEED intensity trace is purely illustrative and time-compressed. No electron diffraction is solved.
- Flux monitoring takes place before transfer, with the wafer not present at the growth position; BFM is retracted during actual deposition.
- During early cooling, keep As flux until substrate temperature decreases.

## Known intentional approximations

Temperatures and vacuum are prescribed trajectories. Source temperatures do not feed a vapor-pressure solver; Ga and Al fluxes are idealized calibrated constants. Pressure is illustrative. Shutter motion is slowed for visibility; interface steps in the demo do **not** introduce artificial deposition stops. Film dimensions are exaggerated in 3D. RHEED is synthetic; no surface-reconstruction, diffraction, island kinetics, segregation, doping or defect transport models are solved. Actual laser devices require intentional n/p doping and contact layers, not represented here.

This design intentionally favors physically meaningful trends over detailed simulation. Do not add multiphysics solvers unless required by a learning objective.

## Primary and technical source examples

- [k-Space Associates: GaAs (100) oxide desorption under arsenic overpressure](https://k-space.com/document/application-notes-ksa-bandit-temperature-calibration/)
- [GaAs homoepitaxial growth parameters including arsenic BEP (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10500691/)
- [GaAs/AlGaAs typical MBE source conditions and arsenic flux (2016)](https://www.sciencedirect.com/science/article/am/pii/S0022024816300367)
- [GaAs/AlAs lattice parameters, Adachi (1985)](https://ursemiconductors.web.illinois.edu/ECE536/Adachi1985.pdf)
- [University of Texas: Introduction to MBE Growth](https://lase.ece.utexas.edu/introduction-mbe-growth)

The legacy documentation's claims of exact BFM uncertainty, 0.15% lattice mismatch for x=0.3, quantitative RHEED performance and exact emission wavelength should not be treated as verified specifications.
