<!-- Notes from an afternoon's reading on 26 November 2026, by an Opus agent to a written brief, for the rework of how the sea's surface shows what is under it to a wading or swimming eye. Kept as written. What it could not confirm is marked so. -->

# Seeing through water from a low eye: research notes

26 Nov 2026. Web research and arithmetic. "Confirmed" means read in the source at the URL given. "Computed"
means I worked it out from a confirmed formula (Python, n = 1.333); the derivation is given. "Recalled" means
from memory; treat it as unconfirmed.

Notation: e = how far below the horizontal the eye looks. i = 90° − e, the angle from the vertical in air. t =
the angle from the vertical in water, sin t = sin i / n. d = depth of water. s = slope of the surface.

## What this says for our water

1. Flat water reflects 2 % straight down, 6 % at 30° below the horizon, 35 % at 10°, 58 % at 5°, 80 % at 2°.
2. Schlick (F0 0.0204, power 5) is up to 0.06 high at 3–15° below the horizon (+14 % at 10°);
   `F0 + (1 − F0)(1 − c)·exp(−5.2c)` is within 0.005 everywhere.
3. Ripples cap the mirror: at 2° below the horizon 0.80 flat, 0.52 at 2 m/s wind, 0.42 at 5 m/s; above 20° no
   change. A smoothed far-off normal brings back the flat, too-strong mirror.
4. A ripple of slope s moves the floor's image 0.25·s·d looking straight down, 1.8·s·d along the line of sight
   at 10° below the horizon (2.2 at the horizon; 0.8–1.0 across it): seven to nine times as much.
5. A 2 m/s breeze smears a floor 1 m down over ±0.14 m along the line of sight at 10° below the horizon (±0.02 m
   straight down); 5 m/s over 2 m: ±0.42 m. Ripples make it shimmer at 1–14 Hz.
6. Anglers spot fish over sand to 9–15 m (6–14° below the horizon), guides on platforms to 30–60 m (3–7°).
   Polarised glasses remove 90 % of the mirror at 30–45° below the horizon, a third at 10°.
7. A camera, and each eye alone, records direction only: our flat rule, done exactly, draws a photograph. Two
   eyes put the floor deeper (d cos i / n cos t) than a picture's texture does (d cos³i / n cos³t).
8. Eye 0.5 m over 1 m of water: the floor 3 m off is seen 12° nearer the horizon than the straight line to it,
   0.27 m deep to two eyes, 0.04 m by its texture. Eye 1.5 m, floor 5 m off: 6°, 0.37 m, 0.09 m.
9. As that 0.5 m eye rises 1 cm, the floor 2 m off turns 20 arcmin, twice the drained floor's 11; beyond about
   five eye heights the floor moves as if painted on the surface.
10. Only ray tracers of a pool or height field and one browser game that moves vertices as we do show the floor
    where it seems; the norm is a small ripple offset, faded out in the shallows, floor left in place.
11. Visual oscillation sickens most at 0.2–0.4 Hz (waves of 2.5–5 s); added camera bob at 1.8–7.4 Hz doubled
    sickness scores. Flow goes as speed over eye height: walking pace at a 0.5 m eye is 3.4 times walking's.
12. Pace: walking 1.3–1.5 m/s; chest-deep wading about 0.6 m/s, eyes 0.35–0.4 m up; head-up swimming, eyes
    0.1–0.3 m up (estimate); fins under water 0.6 m/s.

---

## 1. The mirror against the angle

Computed, exact Fresnel for unpolarised light, n = 1.333 (formulas as on the Ocean Optics Web Book's
level-surface page, https://www.oceanopticsbook.info/view/surfaces/level-2/wave-slope-statistics, which gives
0.021 at normal incidence and Brewster's angle 53.3° for n = 1.34). Rs and Rp are the two polarisations (s:
horizontal electric field, the glare). "Fit" is my own: `F0 + (1 − F0)(1 − c)·exp(−5.22c)`, c = cos i = sin e,
F0 = 0.0204.

| below horizon | from vertical | R exact | Rs | Rp | Schlick 5 | Schlick − R | fit |
|---|---|---|---|---|---|---|---|
| 90° | 0° | 0.0204 | 0.0204 | 0.0204 | 0.0204 | 0 | 0.0204 |
| 60° | 30° | 0.0214 | 0.0309 | 0.0119 | 0.0204 | −0.001 | 0.0218 |
| 45° | 45° | 0.0279 | 0.0530 | 0.0028 | 0.0225 | −0.005 (−19 %) | 0.0275 |
| 30° | 60° | 0.0597 | 0.1151 | 0.0043 | 0.0510 | −0.009 (−15 %) | 0.0564 |
| 20° | 70° | 0.1335 | 0.2197 | 0.0473 | 0.1412 | +0.008 | 0.1285 |
| 15° | 75° | 0.2124 | 0.3140 | 0.1107 | 0.2395 | +0.027 (+13 %) | 0.2084 |
| 10° | 80° | 0.3479 | 0.4570 | 0.2388 | 0.3978 | +0.050 (+14 %) | 0.3474 |
| 7° | 83° | 0.4733 | 0.5762 | 0.3703 | 0.5319 | +0.059 (+12 %) | 0.4757 |
| 5° | 85° | 0.5835 | 0.6738 | 0.4933 | 0.6413 | +0.058 (+10 %) | 0.5878 |
| 3° | 87° | 0.7219 | 0.7887 | 0.6552 | 0.7691 | +0.047 | 0.7268 |
| 2° | 88° | 0.8040 | 0.8536 | 0.7545 | 0.8406 | +0.037 | 0.8084 |
| 1° | 89° | 0.8963 | 0.9239 | 0.8687 | 0.9174 | +0.021 | 0.8991 |

- Schlick understates between 30° and 60° below the horizon (tiny in absolute terms) and **overstates from 20°
  down to the horizon, most at 5–10°**, which is where a wading eye looks at most of the water it sees.
- A pure power law fits best with power 5.65 (max error 0.023). The form above, with one exp, keeps within 0.005
  and 5.5 % everywhere. Both fits are mine.
- In use (confirmed from code): Crest, `R_0 + (1 − R_0)·pow(1 − cosθ, _FresnelPower)`, power 5 by default, range
  1–20 (`OceanReflection.hlsl`, `Ocean.shader`). OpenMW, the exact dielectric formula (`fresnel_dielectric`).
  GPU Gems 2 ch. 19 (Far Cry lineage), bias 0.2 and power 5, i.e. 20 % straight down: not physical. Earlier
  notes found WebGL Water's `mix(0.25, 1, pow(1 − c, 3))` and Source's `pow(1 − N·V, 5)` with no F0
  (water-hiding-its-floor.md).
  - https://raw.githubusercontent.com/wave-harmonic/crest/master/crest/Assets/Crest/Crest/Shaders/OceanReflection.hlsl
  - https://sources.debian.org/src/openmw/0.47.0-3/files/shaders/water_fragment.glsl
  - https://developer.nvidia.com/gpugems/gpugems2/part-ii-shading-lighting-and-shadows/chapter-19-generic-refraction-simulation

---

## 2. A rippled surface

**Slopes (Cox and Munk 1954)** (confirmed, Ocean Optics Web Book, Eqs. 2–4; wind U in m/s at 12.5 m):
`σ²_up = 3.16e-3·U ± 0.004`, `σ²_cross = 0.003 + 1.92e-3·U ± 0.002`, `σ² = 0.003 + 5.12e-3·U ± 0.004`.
https://oceanopticsbook.info/view/surfaces/cox-munk-sea-surface-slope-statistics

| wind | mean square slope | rms slope | as an angle | upwind / crosswind mss |
|---|---|---|---|---|
| 0 m/s | 0.0030 | 0.055 | 3.1° | 0.000 / 0.003 |
| 2 m/s | 0.0132 | 0.115 | 6.6° | 0.006 / 0.007 |
| 5 m/s | 0.0286 | 0.169 | 9.6° | 0.016 / 0.013 |
| 8 m/s | 0.0440 | 0.210 | 11.8° | 0.025 / 0.018 |

- These include capillary and gravity waves; "capillary waves are responsible for much of the slope variance"
  (same page). Mobley's Hydrolight note checks Cox–Munk against a full spectrum: mss 0.034 against 0.036 in a
  6 m/s wind.
  https://misclab.umeoce.maine.edu/ftp/classes/OO2013/Dropbox_backup_Aug13/Documents/HTN1_SurfaceWaves.pdf
- The 0.003 at no wind is an intercept of open-sea data. A sheltered lagoon at dawn can be glassier (not
  measured here). Cox and Munk measured 1–14 m/s.

**The mirror of a rippled surface** (computed). Exact Fresnel averaged over isotropic Gaussian slopes, each
facet weighted by the area the eye sees of it; no shadowing or masking by other waves, which Mobley says matters
only "if the sun or viewing direction is near the horizon" (Hydrolight note above).

| below horizon | flat | 0 m/s | 2 m/s | 5 m/s | 8 m/s |
|---|---|---|---|---|---|
| 30° | 0.060 | 0.060 | 0.062 | 0.064 | 0.067 |
| 20° | 0.133 | 0.134 | 0.135 | 0.134 | 0.132 |
| 15° | 0.212 | 0.211 | 0.206 | 0.195 | 0.183 |
| 10° | 0.348 | 0.340 | 0.310 | 0.273 | 0.245 |
| 5° | 0.584 | 0.540 | 0.439 | 0.361 | 0.315 |
| 3° | 0.722 | 0.631 | 0.491 | 0.398 | 0.344 |
| 2° | 0.804 | 0.674 | 0.517 | 0.416 | 0.358 |
| 1° | 0.896 | 0.714 | 0.541 | 0.433 | 0.373 |

- 3–5 % of the reflected rays at 5–15° below the horizon point below the horizon: they see the next wave, not
  sky.
- These agree with the earlier notes' Monte Carlo (0.43–0.50 at 1° below the horizon for 3–5 m/s,
  water-hiding-its-floor.md).
- Bruneton, Neyret and Holzschuch 2010 (confirmed from a course's slides on the paper) treat the unresolved
  ripples as a microfacet BRDF: an "average Fresnel reflectance" over the Gaussian slopes with a fitted
  function, the sky map filtered by an ellipse from the slope variances, and the light from below weighted by
  "Transmittance = 1 − Reflectance".
  https://cgg.mff.cuni.cz/%7Ejaroslav/teaching/2012-npgr031/prezentace/Realtime%20Realistic%20Ocean%20Lighting.pdf
- Mobley 2015 (Appl. Opt. 54:4828) gives irradiance reflectances against the sun's height, not this per-view
  figure, and notes that "wave elevation can lead to wave shadowing for incident angles near the horizon", which
  the table leaves out.
  https://misclab.umeoce.maine.edu/ftp/classes/OO2015/Readings/Mobley_PolarizedRefl_AO2015_corrected.pdf

**What ripples do to what is seen through the surface**

- Tian and Narasimhan (ICCV 2009), for an orthographic camera looking straight down: "under first-order
  approximation, we can relate the distortion function (warping) w(x, t) to the height h(x, t) of water
  surface", `w(x, t) = α ∇h(x, t)`, α "a constant related to water height h0 when the water surface is still and
  relative refraction index" (confirmed). https://www.cs.cmu.edu/~ILIM/projects/IM/water/water.pdf
- Computed, at any angle. A facet tilted by δ in the plane of sight changes the angle of incidence on it by δ;
  differentiating Snell's law in the facet's frame turns the ray in the water by `(1 − cos i / (n cos t))·δ`.
  The ray meets the floor at x = d tan t, so dx/dt = d / cos²t. The floor point seen moves by `G·s·d`, with
  `G = (1 − cos i / (n cos t)) / cos²t`. Straight down, G = 1 − 1/n = 0.25: Tian's α = 0.25·h0. Across the plane
  of sight, the gain was found numerically (vector refraction).

| below horizon | 90° | 60° | 45° | 30° | 20° | 15° | 10° | 7° | 5° | 3° | 2° | 1° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G along the line of sight | 0.25 | 0.35 | 0.52 | 0.88 | 1.27 | 1.51 | 1.78 | 1.94 | 2.04 | 2.14 | 2.19 | 2.24 |
| G across it | 0.25 | 0.30 | 0.37 | 0.51 | 0.64 | 0.72 | 0.81 | 0.86 | 0.90 | 0.94 | 0.96 | 0.98 |

- **Blur.** Where ripples are too small for the eye to resolve, the floor is blurred over `G·σ·d` (1 sigma, σ
  the slope of one component, √(mss/2)). Computed, along the line of sight, in metres on the floor:

| below horizon | 1 m deep, 2 m/s | 1 m deep, 5 m/s | 2 m deep, 2 m/s | 2 m deep, 5 m/s |
|---|---|---|---|---|
| 90° | 0.02 | 0.03 | 0.04 | 0.06 |
| 45° | 0.04 | 0.06 | 0.08 | 0.12 |
| 30° | 0.07 | 0.10 | 0.14 | 0.21 |
| 20° | 0.10 | 0.15 | 0.21 | 0.30 |
| 10° | 0.14 | 0.21 | 0.29 | 0.42 |
| 5° | 0.17 | 0.24 | 0.33 | 0.49 |

  Across the line of sight the smear is about half that at low angles. So the far floor is streaked along the
  line of sight: pebbles and small coral go first, sand bands and large heads stay.
- **Break-up.** Where the ripples are resolved, the image folds (pieces doubled or missing, like a pool's tiles)
  once the change of displacement over one ripple exceeds the ripple's own footprint: d·G·κ > 1, κ the
  curvature. For a ripple of wavelength λ carrying slope σ, κ ≈ 2πσ/λ, so it breaks at `d > λ / (2π·G·σ)`.
  Example, 20 cm ripples in a 2 m/s breeze: 1.6 m deep straight down, 0.3 m at 20° below the horizon, 0.2 m at
  10°. Order of magnitude only: one wavelength carries only part of the slope (computed).
- **Time.** Ripple frequency from the dispersion of capillary-gravity waves (computed): 1.7 cm, 14 Hz; 5 cm,
  6 Hz; 20 cm, 2.8 Hz; 1 m, 1.2 Hz. The floor's image shimmers fast. Swell of 8–15 s has slopes near 0.01–0.02
  and moves the image by only a few centimetres.

**Where the bottom stops being readable**

- Bonefish anglers: "For most people, this [spotting distance] winds up being between 30 and 50 feet", and "If
  you can do this up to a distance of 50 feet, don't waste your time scanning 100 feet out" (confirmed).
  https://eastendlodge.com/tips-help-spot-bonefish-pt-2/ Whether wading or in a boat is not said.
- A lodge's guides scan within 100 ft, 100–200 ft and beyond from the poling platform; "we may only be able to
  see within 100 feet (or less)" in poor conditions (confirmed).
  https://www.soulflylodge.com/soul-fly-journal/effectively-spotting-bonefish-permit-on-bahamas-flats
- Computed angles: 9–15 m is 6–10° below the horizon for an eye 1.5 m up and 8–14° for 2.2 m (standing in a
  skiff). 30–60 m from an eye about 3.5 m up (platform height assumed, not sourced) is 3–7°. **The limits sit at
  3–14° below the horizon, mostly near 5–10°**, where flat water reflects 35–58 % and the blur above is at its
  largest.
- Sun behind or at the rear quarter, glare zone scanned briefly, calm early and late light best (confirmed, the
  pages above and https://www.floridasportsman.com/editorial/sight-fishing-shallow-water/398735). Fish are also
  found by shadows, wakes and tails, so these distances overstate how far the bottom itself can be read.
- Polarised glasses (computed from Rp/R): they remove 44 % of the mirror at 60° below the horizon, 90 % or more
  at 30–45° (Brewster's angle is 37° below the horizon), 65 % at 20°, 31 % at 10°, 15 % at 5°, 6 % at 2°. So
  they open the water within a few eye heights and do little for the far water.

---

## 3. Where the bottom seems to be

**Formulas for a flat surface** (confirmed in Tatum's Geometric Optics, LibreTexts 1.4). Real over apparent
depth, `h/h' = tanθ'/tanθ = n cosθ / √(1 − n² sin²θ)` (θ in water), which is the image on the vertical through
the object. The caustic, the envelope of the rays, is `n·y·sec³θ' + h·sec³θ = 0`, giving the image along the
ray.
https://phys.libretexts.org/TextMaps/Optics_TextMaps/Map%3A_Geometric_Optics_(Tatum)/1%3A_Reflection_and_Refraction/1.4%3A_Real_and_Apparent_Depth
In this notation:

- Sagittal image (rays fanned sideways; **two eyes side by side**, head upright, facing the point):
  `d_s = d·cos i / (n cos t)`, on the vertical through the point. Our `raisedThroughSurface` raises to this.
- Tangential image (rays fanned in the plane of sight; **an eye moving towards the point or up and down**):
  `d_t = d·cos³i / (n cos³t)`, along the ray, nearer the eye.
- Both are d/n straight down. Tatum notes that a point seen at a slant through the surface has no single image
  (astigmatism). Horváth and Buchta (JOSA A 20(6), June 2003) find the binocular image "more complex than has
  been thought previously" once the head tilts (search summary of the abstract; the full text would not load).

**A picture's texture says tangential** (computed). Through flat water the floor at distance X is seen at e with
`|dX/de| = h / sin²e + d·sin e / (n cos³t)`. A plane at depth D seen without water has `(h + D)/sin²e`. So the
rate at which the floor's texture closes up on the screen is that of a plane at `D = d·sin³e / (n cos³t)`, the
tangential depth. Sideways, the floor keeps its true scale: refraction keeps the azimuth, so a stone's width
subtends width / X as on land. **On a screen the far floor is spread at its true width but squashed in depth as
if lying almost on the surface.**

**The bowl, in numbers** (computed). X = horizontal distance to the floor point. "Nearer the horizon" = how much
higher on the screen the floor is seen than along the straight line to it. Depths in metres.

Eye 0.5 m above the water:

| X | 1 m deep: seen at | nearer horizon | two eyes | texture | 2 m deep: seen at | nearer horizon | two eyes | texture |
|---|---|---|---|---|---|---|---|---|
| 1 m | 49.0° | 7.3° | 0.65 | 0.49 | 62.5° | 5.7° | 1.42 | 1.27 |
| 2 m | 25.0° | 11.9° | 0.43 | 0.14 | 40.0° | 11.3° | 1.18 | 0.73 |
| 3 m | 14.4° | 12.1° | 0.27 | 0.04 | 24.1° | 15.7° | 0.84 | 0.26 |
| 5 m | 7.3° | 9.4° | 0.14 | 0.005 | 10.1° | 16.5° | 0.39 | 0.03 |
| 8 m | 4.2° | 6.5° | 0.08 | 0.001 | 5.0° | 12.4° | 0.20 | 0.003 |
| 12 m | 2.6° | 4.5° | 0.05 | 0.000 | 2.9° | 8.8° | 0.12 | 0.001 |

Eye 1.5 m above the water:

| X | 1 m deep: seen at | nearer horizon | two eyes | texture | 2 m deep: seen at | nearer horizon | two eyes | texture |
|---|---|---|---|---|---|---|---|---|
| 1 m | 65.7° | 2.5° | 0.72 | 0.66 | 71.4° | 2.7° | 1.46 | 1.40 |
| 2 m | 46.9° | 4.4° | 0.64 | 0.46 | 55.1° | 5.2° | 1.36 | 1.12 |
| 3 m | 34.2° | 5.6° | 0.54 | 0.28 | 42.1° | 7.3° | 1.21 | 0.79 |
| 5 m | 20.5° | 6.1° | 0.37 | 0.09 | 25.4° | 9.6° | 0.88 | 0.30 |
| 8 m | 12.2° | 5.1° | 0.23 | 0.02 | 14.3° | 9.3° | 0.54 | 0.07 |
| 12 m | 7.8° | 3.9° | 0.15 | 0.006 | 8.7° | 7.5° | 0.34 | 0.02 |

- The lower eye sees the strongest effect: up to 12–16° of shift, about a quarter of a phone's view, at 2–5 m.
- A school physics page tabulates the tangential case: eye 1.33 m over a 2 m pool, apparent depth 1.50 m at the
  near end, 0.54 m at 2.8 m, 0.21 m at 3.9 m, 0.10 m at 5.0 m, 0.02 m at 8.1 m (confirmed; my tangential images
  agree within the rounding).
  https://schoolphysics.co.uk/age16-19/Optics/Refraction/text/Swimming_pool/index.html

**Camera against eye.** A pinhole camera, and each eye on its own, records only directions, and the direction to
every point is fixed by Snell's law whatever image convention is used. So a correct flat-surface raising, with
small enough triangles, gives exactly what a photograph from that point gives (computed; this confirms the
brief's belief). A lens adds only focus: the sagittal and tangential images differ in distance, which a small
phone aperture hides. What a photograph lacks is the two-eye depth, which puts the floor at the sagittal depth,
several times deeper than its texture says at low angles. That a person standing in the water therefore sees a
less steep bowl than a photograph shows is my inference; no study of it was found.

**How the floor moves as the eye rises 1 cm** (computed, arcmin; "surface spot" is the point of the surface the
floor is seen through, i.e. the same place on the screen; "drained" is the same floor point with no water):

| eye, depth | X = 1 m | 2 m | 3 m | 5 m | 8 m |
|---|---|---|---|---|---|
| 0.5 m, 1 m: floor | 17.1 | 20.3 | 15.4 | 8.6 | 5.0 |
| surface spot | 33.7 | 26.2 | 16.6 | 8.7 | 5.0 |
| drained | 10.5 | 11.0 | 9.2 | 6.3 | 4.2 |
| 1.5 m, 2 m: floor | 3.6 | 6.1 | 7.5 | 7.4 | 5.2 |
| surface spot | 6.9 | 10.7 | 11.4 | 8.9 | 5.5 |
| drained | 2.6 | 4.2 | 4.9 | 4.6 | 3.6 |

- Through water the floor moves with the eye's rise and fall up to twice as much as the drained floor. Near the
  eye it slides against the surface above it (half to three quarters of the surface's motion: the depth cue).
  Beyond about five eye heights it moves with the surface. All of this is physics, and a video from a bobbing
  camera over real flat water would show it. Moving forward, the floor's own motion is 1.1–1.25 times the
  drained floor's within three eye heights and less beyond (computed).

---

## 4. What other real-time water does

| renderer | how it shows what is below, from above | size, scaling | mirror |
|---|---|---|---|
| GPU Gems 2 ch. 19, Far Cry lineage (2005) | Screen copy read at UV + bump·0.075 | No scaling with depth or distance; "not physically based" | Bias 0.2, power 5 |
| Crest (Unity), `OceanEmission.hlsl` | Screen copy at UV + `_RefractionStrength`·n.xz (default 0.5) | ×`min(1, 0.5·thickness)/sceneZ`: none at the shore, full from 2 m of water; cancelled if the sample is in front | Schlick, power 5 |
| Unity HDRP water, `WaterUtilities.hlsl` | Point moved by the normal's horizontal part × `min(path under water, maxRefractionDistance)`, reprojected | Faded at screen edges; cancelled if in front | (other file) |
| Unreal, "Pixel Normal Offset" | Offset from the difference of the pixel and vertex normals | Flat water bends nothing; advised for water because the IOR mode reads off-screen colour | material |
| OpenMW | Screen copy at UV − normal.xy·0.1 | ×`clamp(depth/300, 0, 1)` in its units: none at the shore | Exact Fresnel |
| Catlike Coding tutorial (earlier notes) | UV + normal·0.25 | ×`saturate(depth difference)` | — |
| Hu et al., MSR (2004) | Refraction map of everything below the plane from the same eye, read with a bump offset | — | Fresnel texture |

- Sources: the GPU Gems page above;
  https://raw.githubusercontent.com/wave-harmonic/crest/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl
  and `Ocean.shader` beside it;
  https://raw.githubusercontent.com/Unity-Technologies/Graphics/master/Packages/com.unity.render-pipelines.high-definition/Runtime/Water/Shaders/WaterUtilities.hlsl
  (above water: `refractedView = lerp(waterNormal, upVector, EdgeBlendingFactor(...)) * (1 - upVector)`, then
  `refractionDistance = min(underWaterDistance, maxRefractionDistance)`);
  https://dev.epicgames.com/documentation/en-us/unreal-engine/refraction-using-pixel-normal-offset-in-unreal-engine
  (the IOR mode "can produce unpredictable results and artifacts" on large flat surfaces, as "the scene color is
  being read from off screen"; "if there is no Normal map you will not get any refraction"); the OpenMW file
  above; https://catlikecoding.com/unity/tutorials/flow/looking-through-water/ (from the earlier notes);
  https://www.microsoft.com/en-us/research/wp-content/uploads/2016/12/rtwave.pdf. All confirmed.
- HDRP's offset has the physical form, slope × path, but with gain 1 on the straight path under water, which at
  10° below the horizon is 5.8·d, against the true 1.8·d (computed): three times too much unless capped.

**Those that follow the bent ray**

- Evan Wallace, WebGL Water (2011): `refract()` per pixel, intersected with the analytic pool (earlier notes).
- Schneider and Westermann, VMV 2001, "Towards Real-Time Visual Simulation of Water Surfaces": a refraction
  vector per vertex and "a ray-hemicube intersection test... exploits the geometry of a hemicube corresponding
  to the water container" (confirmed).
  https://www.cs.cit.tum.de/fileadmin/w00cfj/cg/Research/Publications/2001/vmv01.pdf
- Baboud and Décoret, "Realistic Water Volumes in Real-Time", EG Natural Phenomena 2006: water as the space
  between a ground height field and a surface height field, the refracted ray traced into the ground per pixel,
  one level only (abstract and summaries; full text not read).
  https://diglib.eg.org/xmlui/handle/10.2312/NPH.NPH06.025-032
- Bowfishing Blitz, browser game (2024 devlog): every under-water vertex moved to its apparent place by Snell's
  law, a quartic solved by a fitted guess and four fixed-point steps; triangles crossing the surface discarded
  above it; large flat triangles need subdividing. Waves: "the true refracted direction is computed from the
  wave normal", projected into the flat-refracted space and scaled by the under-water distance buffer, a
  parallax-like step. The author: "close enough to look convincing, especially when the waves are animated";
  distant things look flatter (confirmed).
  https://itch.io/devlog/702862/introducing-clip-space-planar-refraction.amp **In substance this is our
  method.**

**The usual compromise** (my reading of the above). The floor is drawn where it is, never raised. A small offset
driven by the ripple normal, often not physical in size, is faded to nothing in the shallows and capped with
distance, and the mirror takes over by Fresnel at low angles. That hides the strong low-angle raising and the
image's motion with the eye entirely, at the cost of the flat, "unreal" look the owner saw with raising off.
Only the ray tracers above, Bowfishing Blitz and ours draw the floor where it seems.

---

## 5. Comfort

- **Frequency.** Diels and Howarth 2013 (Human Factors 55:595, 24 people, random-dot fore-and-aft oscillating
  flow, 0.025–1.6 Hz, 20 min each): "VIMS peaked between 0.2 and 0.4 Hz"; "frequencies around 0.2 to 0.4 Hz
  should be avoided" (confirmed, PubMed 23829033). Physical motion peaks "around 0.2 Hz" (same). ISO 2631-1:1997
  treats 0.1–0.5 Hz as the motion-sickness band for vertical motion; TNO puts the weighting's peak at 0.17 Hz
  (search summary of https://publications.tno.nl/publication/34645611/uTQT32eq/bos-2024-advancing.pdf, not
  read). Computed: 0.2–0.4 Hz is waves of 2.5–5 s period; 0.1–0.5 Hz is 2–10 s. An eye that rides lagoon chop or
  a reef flat's broken swell can sit in it.
- **Bob.** Palmisano et al. 2007 (Aviat. Space Environ. Med. 78:951, 16 people, 10 min): forward flow with
  vertical oscillation at 1.8, 3.7 or 7.4 Hz gave stronger vection (5.51 vs 3.56) and "significantly more severe
  sickness" (SSQ 58.2 vs 29.7) than smooth forward flow (confirmed, PubMed 17955943).
- **Real heads.** Walking at 0.6–2.2 m/s the head bobs at 1.4–2.5 Hz, about 2 Hz from 0.8 to 1.8 m/s, and the
  head pitches to keep the gaze on a fixed point ahead (Hirasaki et al. 1999, PubMed 10442403). Vertical head
  travel is 1–25 cm across walking, running and hopping, with the head kept level (Pozzo et al. 1990, PubMed
  2257917). Both confirmed. In life the eyes cancel bob; a screen cannot.
- **Lower field.** Optic flow in the lower visual field gives stronger vection and larger postural sway than in
  the upper (Fujimoto and Ashida, i-Perception 2019, confirmed:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC6876183/; also Frontiers in VR 2020,
  https://www.frontiersin.org/articles/10.3389/frvir.2020.581920/full). The floor under the water is all lower
  field.
- **Eye height.** Larish and Flach 1990 use global optical flow rate, speed over eye height, as a cue to speed
  (abstract, https://corescholar.libraries.wright.edu/psychology/367). Computed: walking 1.35 m/s at a 1.64 m
  eye is 0.8 eye heights a second and sweeps the ground 45° below the horizon at 24°/s; 1.4 m/s at a 0.5 m eye
  is 2.8 and 80°/s; chest-deep wading at 0.62 m/s, eye 0.37 m, 1.7; head-up swimming at 0.6 m/s, eye 0.15 m, 4.
- **Field of view.** Lin et al., IEEE VR 2002 (driving simulator, 60°, 100°, 140°, 180°): SSQ rose with field of
  view and levelled off beyond 140° (search summary of the abstract; record at
  https://dblp.org/rec/conf/vr/LinDAPF02.html).
- **Guidelines.** Xbox Accessibility Guideline 117: "Avoid the use of camera shake, camera bobbing effects,
  motion blur... or provide an option to turn off these behaviors"; "Avoid any repetitive side-to-side or
  up-and-down on-screen movement, except that which is core to game play"; "Provide adjustable field of view
  settings" (confirmed).
  https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117
- **Guidelines for VR.** Game Accessibility Guidelines: keep a constant horizon, avoid acceleration, give a
  fixed reference frame, keep the frame rate constant with latency under 20 ms (confirmed).
  https://gameaccessibilityguidelines.com/avoid-vr-simulation-sickness-triggers/
- **Parts moving differently.** No study was found of a floor moving differently from the land around it. The
  closest evidence is that added oscillation raises sickness (Palmisano) and that lower-field flow drives
  vection (Fujimoto). Section 3 gives how much the floor moves against the surface and the drained floor.

---

## 6. A person's pace and eye height

| activity | speed | source |
|---|---|---|
| Walking, comfortable | 1.27–1.46 m/s (means by sex and decade, 20–79 y) | Bohannon 1997, PubMed 9143432 |
| Walking, fastest | 1.75–2.53 m/s | same |
| Water 0.35 m deep (about mid-shin to knee) | 39 % (men) and 45 % (women) slower than dry; deeper, smaller further losses | Li et al., Acta Polytechnica CTU Proc., https://ojs.cvut.cz/ojs/index.php/APP/article/view/11596 |
| Water at the xiphoid (chest-deep) | 0.62 ± 0.03 m/s, against 0.88 on land in the same trial | Cadenas-Sanchez et al. 2015, https://pmc.ncbi.nlm.nih.gov/articles/PMC4723164 |
| Water 0.08, 0.43, 0.90 m | speed falls steadily with depth; m/s not read | Dias et al. 2021, IJDRR 102192 (search summary) |
| Fins, under water (women divers) | 0.60 m/s sustained, 0.87 m/s at most | Pendergast et al. 2003, PubMed 12841610 |
| Breaststroke, fastest swimmers | about 1.70 m/s; recreational swimmers "often keep their head above water at all times" | https://en.wikipedia.org/wiki/Breaststroke |
| Head-up breaststroke, ordinary swimmer | not found; 0.5–0.8 m/s is my guess | — |
| Under water without fins | not found | — |

All confirmed from abstracts or the pages given, except where marked.

**Eye height above the water** (computed from the US Army's 2012 survey, ANSUR II, 50th percentile, as tabulated
by NC State's Ergonomics Center,
https://ergocenter.ncsu.edu/wp-content/uploads/sites/358/2026/02/01-Anthropometry-Summary-Tables.pdf). Men:
stature 1.755 m, eye 1.640, shoulder 1.439, elbow 1.083, hip 0.899, sitting knee height 0.553. Women: 1.626,
1.517, 1.332, 1.002, 0.844, 0.510.

| water up to | depth (men / women) | eyes above the water (men / women) |
|---|---|---|
| knee | 0.55 / 0.51 m | 1.09 / 1.01 m |
| waist, taken as elbow height | 1.08 / 1.00 m | 0.56 / 0.52 m |
| chest (nipple), estimated, not in the table | about 1.27 / 1.17 m | about 0.37 / 0.35 m |
| shoulder | 1.44 / 1.33 m | 0.20 / 0.19 m |
| head-up swimming, chin at the water | — | about 0.1 m, up to 0.2–0.3 m at a breaststroke breath (estimate) |

- The brief's swimming eye, 0.5 m above the water, is two to five times a real head-up swimmer's. At 0.1–0.2 m
  the nearest wavelets fill much of the view and the floor is seen through the water only close by (inference).

---

## What the research could not find

- Sea of Thieves, Subnautica and Assassin's Creed IV: no public account of how they draw the bottom through the
  surface. Unreal's Single Layer Water shader code (behind a login).
- A measured reflectance of a rough sea per view angle near the horizon; the table in section 2 is my
  quadrature, without wave shadowing.
- A measured angle or distance at which snorkellers, photographers or anglers lose the bottom itself, as against
  spotting fish; and poling-platform heights.
- The full text of Horváth and Buchta 2003 (the host refused the connection), so no figures from it.
- A study of a floor or reflection moving differently from the land around it, or of refraction's "swim" as a
  cause of sickness; and the amplitude used by Diels and Howarth.
- Wading speeds in m/s at knee and waist depth; head-up breaststroke and fin-less under-water speeds of ordinary
  swimmers; a measured eye height of a swimmer; chest height in the anthropometric table.
