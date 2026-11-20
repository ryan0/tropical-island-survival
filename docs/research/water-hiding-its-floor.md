<!-- Notes from an hour's reading on 20 November 2026, by an Opus agent to a written brief, for the rework of how the sea hides what is under it (docs/ROADMAP.md, "his second notes"). Kept as written. What it could not confirm is marked so. -->

# How much clear shallow water hides what is under it: research notes

20 Nov 2026. Web research only. "Confirmed" means read in the primary source at the URL given. "Computed" means
I worked it out from a confirmed formula (Python, n = 1.334). "Recalled" means from memory because the page could
not be fetched; treat it as unconfirmed.

Notation: sigma = extinction or attenuation per metre, T = exp(-sigma * L) = transmittance over path L.
"Straight path" = the eye ray, unbent. "Refracted path" = depth / cos(theta_t), sin(theta_t) = sin(theta_i) / 1.334.

---

## 1. The standard model

All the engines below follow the same pattern: colour behind the water, multiplied by a per-channel exponential
transmittance, plus a "water colour" that grows as (1 - T), with Fresnel reflection blended on top. None of them
bends the path through the water. Most get the path from the depth buffer as a distance along the view ray or as
an eye-space z difference. Several also use **vertical** depth from a baked map for other things: shallow tint,
foam, wave damping, caustics.

**Unity HDRP water system** (confirmed, source code)
- `WaterUtilities.hlsl`, `ComputeWaterRefractionParams`: `underWaterDistance = length(directWaterPosRWS - waterPosRWS)`.
  This is the **straight distance along the view ray** from the surface point to the scene point found in the
  depth buffer. Sky pixels use a fixed 1000 m (`WATER_BACKGROUND_ABSORPTION_DISTANCE`). A refracted sample is
  taken at a screen offset and falls back to the direct distance if the sample lands in front of the water.
- `absorptionTint = exp(-refractedWaterDistance * extinctionCoeff)` per channel.
- Refraction colour: `absorptionTint * caustics * absorptionTint`. The tint is applied **twice**, once for light
  going down to the object and once for the view path back up, so the down path is taken to equal the view path.
- Scattering colour: `_WaterAlbedo * saturate(ambient + height + displacement scattering terms) * (1 - absorptionTint)`.
- Extinction from the artist's inputs, in `WaterSurface.cs`:
  `extinction = (-ln(0.02) / absorptionDistance) * max(1 - refractionColor, 0.01)` per channel.
  So "Absorption Distance" is the distance at which a channel with refraction colour 0 keeps 2 % (-ln 0.02 = 3.91).
- The manual calls Absorption Distance an "approximative distance in meters that the camera can perceive through a
  water surface".
- URLs:
  - https://raw.githubusercontent.com/Unity-Technologies/Graphics/master/Packages/com.unity.render-pipelines.high-definition/Runtime/Water/Shaders/WaterUtilities.hlsl
  - https://raw.githubusercontent.com/Unity-Technologies/Graphics/master/Packages/com.unity.render-pipelines.high-definition/Runtime/Water/WaterSurface/WaterSurface.cs
  - https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/settings-and-properties-related-to-the-water-system.html

**Unreal Engine Single Layer Water** (docs confirmed; shader source not reachable)
- The docs describe a homogeneous participating medium with per-channel Absorption and Scattering coefficients, a
  Schlick phase function with anisotropy `PhaseG`, and an `Opacity` that splits energy between the volume's BSDF and
  the surface's BRDF (at 1 the water goes dark).
- "Color Scale Behind Water" multiplies the luminance of what lies below. It is an artist control for darkening the
  floor (stand-in caustics or shadows), not physics.
- The pass runs after the lit opaque scene and reads its colour and depth. "Scene Depth Without Water" exists from
  UE5. Mobile and low-end fall back to plain translucency with no volume integration.
- The docs say coefficients are "reciprocal meters", with an example absorption of R 0.0033, G 0.0016, B 0.0011.
  Those numbers look like per-centimetre values (UE units are cm; 0.33 /m is pure water's red). Treat the units as
  **not confirmed**.
- Recalled, not confirmed (the source is behind Epic's GitHub login): transmittance `exp(-sigma_t * d)` with d the
  distance behind the water, and in-scatter integrated analytically as
  `sigma_s * (L_sun * phase + L_ambient) * (1 - T) / sigma_t`.
- URL: https://dev.epicgames.com/documentation/en-us/unreal-engine/single-layer-water-shading-model-in-unreal-engine

**Crest Ocean (Unity, built-in pipeline)** (confirmed, `OceanEmission.hlsl`)
- Depth fog: `alpha = 1 - exp(-_DepthFogDensity.xyz * depthFogDistance)`, per channel, with
  `depthFogDistance = max(sceneZ - pixelZ, 0)`. This is an **eye-space z difference**, not the ray length, so it
  shortens the path by the cosine of the angle from the camera's axis. Then `col = lerp(sceneColour, col, alpha)`.
- Water colour: `lerp(_DiffuseGrazing, _Diffuse, abs(view.y))`.
- Shallow tint uses **vertical** depth from Crest's sea-floor depth data:
  `shallowness = pow(1 - saturate(surfaceOceanDepth / _SubSurfaceDepthMax), _SubSurfaceDepthPower)`, lerped to
  `_SubSurfaceShallowCol`.
- Subsurface: `(base + sun * pow(max(0, dot(L, -V)), falloff)) * colour * (1 - v^2)`, a fake for light through
  wave crests.
- Under water is handled by a separate post effect (`CrestApplyUnderwaterFog`).
- URL: https://raw.githubusercontent.com/wave-harmonic/crest/master/crest/Assets/Crest/Crest/Shaders/OceanEmission.hlsl

**Unity URP "Boat Attack" water** (confirmed, `WaterCommon.hlsl`)
- Path along the ray: `depth.x = LinearEyeDepth(scene) * length(viewPos / viewPos.z) - length(cam - surfacePos)`.
  This is the true **straight-ray length** from surface to floor (eye z converted to ray length).
- That length, divided by `_MaxDepth`, indexes a ramp texture. One row is absorption, which multiplies the refracted
  scene; another is scattering, which multiplies the subsurface term.
- A baked **top-down depth map** (`_WaterDepthMap`, sampled at `posWS.xz * 0.002 + 0.5`, rendered by a top-down
  depth camera) gives **vertical** water depth. It is used for wave amplitude near shore, a shallows mask, and
  shore foam.
- Composition: `lerp(lerp(refraction, reflection, fresnel) + sss + spec, foam, foamMask)`, then the scene's fog.
- URL: https://raw.githubusercontent.com/Verasl/BoatAttack/master/Packages/com.verasl.water-system/Shaders/WaterCommon.hlsl

**Catlike Coding, "Looking Through Water"** (confirmed)
- `depthDifference = LinearEyeDepth(background) - surfaceEyeDepth` (eye-space z difference).
- `fogFactor = exp2(-_WaterFogDensity * depthDifference)`, then `lerp(_WaterFogColor, background, fogFactor)`.
  Density defaults to 0.1 (the tutorial uses 0.15); fog colour #4E83A9.
- The result is added as emission times (1 - alpha).
- Fake refraction offsets the UV by the tangent normal × 0.25, scaled by `saturate(depthDifference)`. A negative
  depth difference (sampling something in front of the water) falls back to the unoffset UV.
- URL: https://catlikecoding.com/unity/tutorials/flow/looking-through-water/

**Sea of Thieves, SIGGRAPH 2018 talk** (confirmed, 2-page abstract)
- "The water colour is based on scattering approximations. We blend between a deep water colour and a sub-surface
  water colour based on a combination of view angle, sun direction and a wave peak mask". Choppier crests get more
  subsurface colour because of the "shorter distance traveled by light through the water".
- No depth-based absorption is described. Foam around intersecting objects comes from depth-buffer comparisons.
  From below, a Snell's window effect.
- URL: https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf

**Uncharted (GDC 2012, "Water Technology of Uncharted")** (confirmed, slide text)
- "Refraction: depth based jitter and coloring"; refraction "colored by the distance between the water surface and
  the background"; "linear or exponential function".
- Fresnel blends reflection and refraction, with "All fresnel coefficients, start-end ... artist controlled".
- URL: https://www.slideshare.net/slideshow/water-technologyofunchartedgdc2012/12977478
- **Uncharted 4** ("Rendering Rapids", SIGGRAPH 2016 Advances): slides not read, **not confirmed**.
  Course page: https://advances.realtimerendering.com/s2016/index.html

**Not confirmed**
- **Assassin's Creed IV Black Flag.** No public talk with water optics found. The GDC 2014 "Road to Next-Gen
  Graphics" talk is about GI and volumetric fog.
- **Premoze and Ashikhmin 2001**, "Rendering Natural Waters" (CGF 20(4)): the full text was not retrieved, so their
  formulas are not reproduced here. https://diglib.eg.org/handle/10.2312/8659

**Common physical model** (the ocean-optics form the engines approximate)
- Seen from above: `L_eye = F * L_sky_reflected + (1 - F) / n^2 * [ L_obj * exp(-c_eff * l) + L_inf * (1 - exp(-k_B * l)) ]`.
  - `n^2 ≈ 1.78`: the radiance lost crossing from water to air.
  - `L_inf`: the radiance of an infinitely deep column, which is "water colour".
- Akkaynak and Treibitz (CVPR 2018, "A Revised Underwater Image Formation Model") show that the coefficient for the
  direct signal and the coefficient for backscatter differ, and that both depend on range and on the reflectance of
  the object. Recalled; the CVF site refused the fetch. https://openaccess.thecvf.com/content_cvpr_2018/papers/Akkaynak_A_Revised_Underwater_CVPR_2018_paper.pdf

---

## 2. Without a depth buffer

**Source engine (Half-Life 2 and later): fog computed in every under-water material's own shader** (confirmed, code)
- `common_ps_fxc.h`, `CalcWaterFogAlpha(waterZ, eyeZ, worldZ, projZ, 1/range)`. Source is z-up.
  ```
  flDepthFromWater = flWaterZ - flWorldPosZ;
  // ratio: how much of the distance from the viewer to the vert is actually underwater
  f = saturate(flDepthFromWater / (flEyePosZ - flWorldPosZ));
  return saturate(f * flProjPosZ * flFogOORange);   // linear fog over the in-water part
  ```
  - This is the **fraction of the straight eye-to-point segment that lies under the water plane**, times view-space
    z (not the ray length), as a **linear** fog.
  - It is chosen per pixel by `PIXEL_FOG_TYPE_HEIGHT` and blended with `lerp(colour, fogColour, factor)`.
- The fog factor can also be written to destination alpha (`WRITEWATERFOGTODESTALPHA`). The water shader then reads
  it back from its refraction texture: `waterFogDepthValue = tex2D(RefractSampler, uv).a`. That is the
  render-to-texture path you cannot use.
- **The fogging of geometry inside its own shader is the part that carries over** to your renderer.
- Under water, Source uses linear fog over `projZ` with start and end distances.
- Water Fresnel is `pow(1 - N·V, 5)` with no F0, so it is 0 looking straight down. Not physical.
- The Valve developer wiki refused automated fetches, so "cheap water" ($cheapwaterstartdistance and related
  settings) is **not confirmed**.
- URLs:
  - https://raw.githubusercontent.com/ValveSoftware/source-sdk-2013/master/src/materialsystem/stdshaders/common_ps_fxc.h
  - https://raw.githubusercontent.com/ValveSoftware/source-sdk-2013/master/src/materialsystem/stdshaders/water_ps2x_helper.h

**Closed form for fog below the plane y = 0 (constant density)**. This is my geometry, the same idea as Source
written in ray length. Eye E, point P, d = |P - E|.
- Eye above, point below (E.y > 0 > P.y): `L_straight = d * (-P.y) / (E.y - P.y)`.
- Eye below, point below: `L = d`.
- Eye below, point above (seen through the surface from beneath): `L = d * (-E.y) / (P.y - E.y)`.
- Eye above, refracted-length estimate (see section 4):
  `cos_i = (E.y - P.y) / d`; `sin_t = sqrt(1 - cos_i^2) / 1.334`; `L_refr = (-P.y) / sqrt(1 - sin_t^2)`.
  - L_refr is between 1.0 and 1.51 times the depth of P.
  - It costs one sqrt more and has no branch.
  - Then `colour = colour * exp(-sigma * L) + L_inf * (1 - exp(-sigma * L))`.
- Per pixel, not per vertex. The exponential is not linear across a triangle, and large floor triangles would
  show their edges.
- Waves: the plane y = 0 misplaces the surface by up to the wave height. On a 0.5 m reef flat with 0.3 m waves the
  error in L is up to about 60 %. Evaluating the wave height over P (already shared GLSL) would fix this.

**Inigo Quilez, fog articles** (recalled; https://iquilezles.org/articles/fog/ returned 404 to the fetch tool)
- Per-channel extinction and in-scatter: `rgb * exp(-t * be) + fogColor * (1 - exp(-t * bi))`.
- Fog density `a * exp(-b * y)` integrated in closed form along a ray:
  `(a / b) * exp(-ro.y * b) * (1 - exp(-t * rd.y * b)) / rd.y`.
- Water needs only the constant-density, plane-bounded case above.

**Evan Wallace, "WebGL Water" (2011)** (confirmed, `renderer.js`)
- The water surface shader traces the refracted ray itself: `refract(I, N, 1/1.333)`, then `intersectCube` against
  the analytic pool, then shades the wall or floor in place (`getWallColor`, with caustics and simple AO).
- No distance absorption at all: a constant tint `color *= waterColor` (vec3(0.4, 0.9, 1.0) under water,
  (0.25, 1.0, 1.25) above) when the ray points down.
- Fresnel is `mix(0.25, 1.0, pow(1 - cos, 3))`, a 25 % floor that is not physical (real ≈ 2 %).
- Works only because the pool is a box. A height-field floor would need a ray march in the water shader.
- URL: https://raw.githubusercontent.com/evanw/webgl-water/master/renderer.js

**"Clip-space planar refraction" (Bowfishing Blitz, HTML5/WebGPU, 2024 devlog)** (confirmed)
- Every under-water vertex is moved in its own vertex shader to its **apparent** (refracted) position, then
  projected with the normal camera matrix. No scene texture is needed for flat water.
- Snell's law gives a quartic, `(worldDepth / virtDepth)^2 = (n^2 - 1) * (horizDist / (camHeight + virtDepth))^2 + n^2`,
  solved by a fitted guess plus about 4 fixed-point iterations: `ratio = sqrt(0.77 * oblique^2 + 1.77)`.
- The above-water part of triangles that cross the surface is discarded in the fragment shader.
- Large flat triangles may need tessellation, because the transform is non-linear.
- Waves are handled by a screen-space parallax step that needs a buffer (not usable here).
- Fog and absorption are not discussed.
- URL: https://itch.io/devlog/702862/introducing-clip-space-planar-refraction.amp

**OpenMW (open Morrowind engine), merge request !2922 (2023)** (confirmed)
- Before: refraction fog by the object's distance from the camera, so "water turns completely opaque if the player
  moves too far away from it", worst when falling or jumping.
- The draft switches to "water depth between the object and camera" with a curve instead of a linear fade, and
  blends distorted and true depth "to prevent splotchy coloring at shores".
- URL: https://gitlab.com/OpenMW/openmw/-/merge_requests/2922

**Not confirmed** (no primary source found in the time available): Far Cry 1, original Morrowind/Oblivion water,
Wind Waker.

**Artefacts reported across these techniques, and how they were hidden**
- Refraction offset sampling foreground objects: depth test, then fall back to the unoffset sample (Catlike, HDRP).
- Shore splotches and misalignment where the depth changes sharply: interpolate distorted and true depth (OpenMW).
- Whole water body going opaque with distance: OpenMW's bug, as above.
- MSAA making the depth difference negative: clamp to 0 (Crest's comment).
- Hard water edge: shore foam from vertical depth (Boat Attack, Sea of Thieves).

---

## 3. Real numbers

**Pure water absorption, Pope and Fry 1997** (confirmed; per metre, converted from the 1/cm table)

| nm | a (per m) | nm | a (per m) | nm | a (per m) |
|---|---|---|---|---|---|
| 400 | 0.0066 | 500 | 0.0204 | 600 | 0.222 |
| 420 | 0.0045 (minimum) | 520 | 0.0409 | 620 | 0.276 |
| 440 | 0.0064 | 550 | 0.0565 | 650 | 0.340 |
| 450 | 0.0092 | 560 | 0.0619 | 680 | 0.465 |
| 480 | 0.0127 | 580 | 0.0896 | 700 | 0.624 |

URL: https://omlc.org/spectra/water/data/pope97.txt

**Clearest ocean water, Smith and Baker 1981, Table I** (confirmed, from the PDF's text)
- Kw (diffuse attenuation) / aw (absorption) / bsw (molecular scattering of seawater), per metre:

| nm | Kw | aw | bsw |
|---|---|---|---|
| 400 | 0.0209 | 0.0171 | 0.0076 |
| 450 | 0.0168 | 0.0145 | 0.0045 |
| 500 | 0.0271 | 0.0257 | 0.0029 |
| 550 | 0.0648 | 0.0638 | not legible |
| 600 | 0.245 | 0.244 | 0.0014 |
| 650 | 0.350 | 0.349 | 0.0010 |
| 700 | 0.650 | 0.650 | — |

- This is the floor for Jerlov type I.
- Molecular scattering is tiny. Real scattering, b, is set by particles: about 0.02–0.1 per m offshore, more over
  carbonate sand (not confirmed).
- URL: https://frouingroup.ucsd.edu/Aw_Chl/REFRENCES/Smith-Baker-1981.pdf

**Coral reef waters, Hochberg et al. 2020** (Coral Reefs 39:1377, 199 profiles in Bermuda and Hawaii) (abstract
level, confirmed)
- 1 % light depth ≈ **30 m lagoon, 45 m reef flat, 75 m fore reef, 105 m offshore**.
- That implies K ≈ 4.6 / z1% ≈ 0.15, 0.10, 0.06 and 0.044 per m. Which band (PAR or the minimum K) is not confirmed.
- Lagoons pass green deepest; fore reefs pass blue deepest. The causes given are suspended carbonate and dissolved
  organic matter in lagoons.
- URLs:
  - https://link.springer.com/article/10.1007/s00338-020-01971-1 (article; redirected to a login when fetched, so
    only the abstract was read)
  - https://oceanographicmagazine.com/news/reef-ecology-light-study/

**Jerlov types**
- The per-wavelength Kd table for types I–III and 1C is **not confirmed**: Optica, Wiley, DTIC and ResearchGate all
  refused or required login.
- Leads:
  - Solonenko and Mobley 2015, Appl. Opt. 54:5392, which tabulates a, b and Kd for every type.
  - Williamson and Hollins 2022/2023.
  - One snippet gives Jerlov IB Kd(450) ≈ 0.034 per m.
- From the abstracts: Kd(475) ≈ 0.24 (3C) and 0.40 (5C). Kd(490) ranges: about 0.03–0.05 (IA) and 0.12–0.14 (III).
  https://www.ias.ac.in/article/fulltext/jess/111/03/0237-0245

**Visibility**
- Horizontal visibility (black target) = **4.8 / c**, with c the photopic beam attenuation (a + b). Zaneveld and
  Pegau 2003 (confirmed via abstract):
  https://misclab.umeoce.maine.edu/ftp/classes/OO2017/readings/Zaneveld_visibility_OX2003.pdf
  - c = 0.1 per m gives 48 m; 0.25 gives 19 m.
- Secchi depth: Lee et al. 2015 (NOAA repository 59493) ties it to Kd at the wavelength of greatest transparency
  only. https://repository.library.noaa.gov/view/noaa/59493
  - Recalled: `Zsd = ln(|0.14 - Rrs| / 0.013) / (2.5 * Kd_min)`.
  - Kd_min = 0.04 gives about 21 m; 0.025 gives about 34 m.
- Typical Secchi depths and diver visibility in atoll lagoons specifically: **not confirmed**. No measured atoll
  values found; dive-guide figures of 15–30 m in lagoons and 30+ m on outer reefs were not checked.

**How much of the light coming back over sand is the sand's**
- Semi-analytic shallow-water model, Lee et al. 1998, Appl. Opt. 37:6329, Eq. 21 (confirmed). With u = bb/(a+bb),
  k = a + bb, and theta_w the sun's zenith in water:
  ```
  rrs = (0.070 + 0.155 u^0.752) u [1 - 1.03 exp(-(1/cos theta_w + 1.2 (1+2.0u)^0.5) k H)]
      + 0.31 rho exp(-(1/cos theta_w + 1.1 (1+4.9u)^0.5) k H)
  Rrs = 0.518 rrs / (1 - 1.562 rrs)        // crossing to air: about half
  ```
  The bottom's upward path factor (1.1–2.2, mean about 1.5) is longer than vertical because upwelling light is
  diffuse. URL: https://misclab.umeoce.maine.edu/ftp/classes/OO2015/Readings/Lee_HS_shallow_waters1_AO1998.pdf
- The earlier, simpler form (Maritorena, Morel and Gentili 1994, L&O 39:1689):
  `R(H) = R_inf (1 - e^{-2KH}) + A e^{-2KH}`. Seen as quoted by Albert; the paper itself refused the fetch.
- Computed with the Lee model. Assumptions:
  - Clear-lagoon water: a = (R 0.36, G 0.075, B 0.03), bb = (0.0025, 0.003, 0.004).
  - Carbonate sand albedo rho = (0.50, 0.45, 0.35). Assumed; not confirmed.
  - Sun 30° from the zenith; nadir view.

  Share of the water-leaving light that comes from the sand:

  | depth | R | G | B |
  |---|---|---|---|
  | 1 m | 99.6 % | 99.6 % | 99.4 % |
  | 3 m | 97 % | 98 % | 97 % |
  | 5 m | 85 % | 97 % | 95 % |
  | 10 m | 10 % | 90 % | 88 % |
  | 20 m | 0 % | 56 % | 68 % |
  | 40 m | 0 % | 3 % | 25 % |

  - Red is gone from the sand by 5–10 m. Green and blue are still mostly sand at 10–20 m.
  - **A sand floor stays the dominant signal in green and blue to about 20 m and fades out around 30–40 m.** This
    agrees with satellite bathymetry, which works to about 20–30 m in clear water.
  - Brightness (above-water Rrs, per sr): at 1 m (0.041, 0.074, 0.062); at 5 m (0.002, 0.034, 0.044); at 10 m
    (0.0003, 0.014, 0.030). For comparison, dry white paper is 1/π = 0.32 per sr and the sand dry is (0.16, 0.14,
    0.11).
  - So sand under 0.5 m of water reads at about **half** its dry brightness: the n² and surface losses (the 0.518
    factor), before any darkening of the wet grains.

**Deep clear water by itself**
- Computed (Lee model, the same water): below-surface rrs_deep ≈ (R 0.0005, G 0.003, B 0.012) per sr. Above the
  surface that is Rrs ≈ (0.0003, 0.0017, 0.0063). As irradiance reflectance (Q ≈ 3.5–4) that is ≈ 0.2 % red,
  1 % green, 4–5 % blue.
- Rule of thumb (Morel and Prieur 1977, recalled): R ≈ 0.33 bb / a.
- Including surface reflection, the ocean's albedo is commonly given as about 6 % (not confirmed here).
- **For a renderer: optically deep water is about 4 % as bright as white paper in blue, 1 % in green, under 0.5 % in
  red, plus 2 % of the sky reflected looking straight down.**

**Fresnel reflectance of flat water** (computed, n = 1.334, unpolarised; angle from the normal)

| angle | 0° | 30° | 45° | 53° | 60° | 70° | 75° | 80° | 85° | 87° | 88° | 89° |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R | 0.0205 | 0.0215 | 0.028 | 0.039 | 0.060 | 0.134 | 0.213 | 0.348 | 0.584 | 0.722 | 0.804 | 0.896 |

- Schlick's approximation with F0 = 0.0204 is within 0.01 up to 70°, then runs high: 0.40 at 80°, 0.64 at 85°.
- The refracted angle in water and the path factor 1/cos(theta_t):

  | in air | 30° | 45° | 60° | 75° | 80° | 85° | 89° |
  |---|---|---|---|---|---|---|---|
  | in water | 22.0° | 32.0° | 40.5° | 46.4° | 47.6° | 48.3° | 48.55° |
  | 1/cos(theta_t) | 1.08 | 1.18 | 1.32 | 1.45 | 1.48 | 1.50 | 1.51 |

  The limit is 48.56°.

**What waves do at grazing angles** (computed)
- Cox–Munk slopes: mean square slope = 0.003 + 0.00512 × wind speed (m/s), Cox and Munk 1954, recalled.
  Monte Carlo over facets weighted by visible area, ignoring shadowing and masking.
- Effective R:

  | wind | 75° | 80° | 85° | 89° |
  |---|---|---|---|---|
  | 3 m/s | 0.20 | 0.30 | 0.41 | 0.50 |
  | 5 m/s | 0.195 | 0.27 | 0.36 | 0.43 |
  | 10 m/s | 0.18 | 0.23 | 0.29 | 0.34 |

- Waves **cap grazing reflectance at about 0.3–0.5** instead of rising to 1. Below 60° they change almost nothing.
- 3–5 % of the reflected rays at 75–85° point below the horizon, so they hit the next wave and would show water
  instead of sky.
- Bruneton, Neyret and Holzschuch 2010 ("Real-time Realistic Ocean Lighting...") is the graphics source for
  filtering Fresnel over the slope distribution. Not fetched.

---

## 4. Refraction's effect on the path

**What engines do**
- All the engines read in section 1 use the **straight** geometry:
  - ray length: HDRP, Boat Attack;
  - eye-space z difference: Crest, Catlike, Source;
  - Unreal: unknown.
- Their "refraction" is only a screen-space UV offset, and the path length is measured to whatever pixel the offset
  lands on.
- Only Evan Wallace (ray-traced pool) and Bowfishing Blitz (vertices moved to their apparent place) follow the bent
  ray.
- I found no engine document that discusses straight versus refracted path length. Not confirmed that anyone does.
- HDRP's double application of the tint (down and up taken equal) is the nearest thing to an argument about path.

**Size of the difference, for a person on the beach** (computed)
- Eye 1.7 m above the water, flat floor, sigma = (R 0.40, G 0.085, B 0.045). Transmittance is given as R/G/B.

  | depth | distance | view from vertical | Fresnel | straight: length | straight: T | refracted: length | refracted: T |
  |---|---|---|---|---|---|---|---|
  | 1 m | 10 m | 75° | 0.21 | 3.8 m | 0.22/0.72/0.84 | 1.45 m | 0.56/0.88/0.94 |
  | 1 m | 30 m | 85° | 0.58 | 11 m | 0.01/0.39/0.61 | 1.50 m | 0.55/0.88/0.93 |
  | 2 m | 30 m | 83° | 0.47 | 16 m | 0.00/0.25/0.48 | 3.0 m | 0.30/0.78/0.87 |
  | 2 m | 100 m | 88° | 0.79 | 54 m | 0.00/0.01/0.09 | 3.0 m | 0.30/0.77/0.87 |
  | 5 m | 30 m | 77° | 0.27 | 23 m | 0.00/0.14/0.36 | 7.3 m | 0.05/0.54/0.72 |
  | 5 m | 100 m | 86° | 0.66 | 75 m | 0.00/0.00/0.03 | 7.5 m | 0.05/0.53/0.71 |

- With the straight path, shallow water 30 m away is already as opaque as deep water. With the refracted path, its
  colour depends only on depth, out to the horizon.

**What makes distant shallow water look opaque in reality**
- Mainly **Fresnel reflection**: 0.47–0.8 beyond 83° flat, about 0.3–0.45 with small waves.
- Also loss of detail, not of colour:
  - wave refraction scrambles the floor image;
  - the floor is foreshortened enormously;
  - the beam attenuation c (scattering) blurs small contrasts.
- The **path cannot exceed 1.51 × depth**, so absorption does not make a 2 m flat look like deep water at any
  distance.
- This is what photographs of lagoons show: the colour bands follow the bathymetry right out to the horizon, and the
  far water goes pale with reflected sky rather than dark like the open ocean.
- The physics is confirmed; that this is the visual cause is my inference.

**Apparent depth**
- Things under water also look shallower and nearer: about depth/1.33 straight down, and much less at a slant
  (Bowfishing Blitz's quartic).
- Without moving the vertices, the floor is drawn at its true place. Per pixel, the refracted-length estimate is
  then exact for a flat floor (same depth at the true and the apparent point) and approximate on slopes.

---

## 5. Shadows under water at low sun

Computed: Fresnel n = 1.334; clear-sky DNI from the Meinel model and global from the Haurwitz model (both crude
below 5°); Kasten–Young air mass.

| sun altitude | T into water | direction in water (from vertical) | direct on horizontal in air (W/m²) | diffuse on horizontal in air (W/m²) | direct share at the 5 m floor (G) |
|---|---|---|---|---|---|
| 60° | 0.98 | 22° | ≈ 790 | ≈ 100 | 0.90 |
| 30° | 0.94 | 40.5° | ≈ 380 | ≈ 105 | 0.77 |
| 15° | 0.79 | 46.4° | ≈ 145 | ≈ 85 | 0.57 |
| 10° | 0.65 | 47.6° | ≈ 75 | ≈ 60 | 0.43 |
| 5° | 0.42 | 48.3° | ≈ 21 | ≈ 29 | 0.22 |
| 2° | 0.20 | 48.5° | ≈ 3 | ≈ 4 | 0.13 |

- Irradiance on a horizontal plane just below the surface = T × the horizontal irradiance above (flux is
  conserved).
- For a flat floor, use the refracted direction, but the magnitude `T * E_normal * sin(altitude)`.
- Down a slant of depth / cos(theta_t) ≈ 1.5 × depth the direct beam fades as `exp(-K * 1.5 depth)`. Diffuse sky
  light fades as about `exp(-K * 1.2 depth)` and is transmitted at about 93 %.
- In clear water, direct light gives way to diffuse within a few tens of metres in blue-green and within a few
  metres in red. Not confirmed with a measured source.

**The palm**
- Light under water always travels within 48.6° of vertical. The floor shadow of anything on the beach therefore
  falls at most 1.13 × depth beyond the point where its shadow line crosses the surface. At 5 m that is 5.6 m.
- An unrefracted shadow map at 5° altitude would push it 5 / tan 5° = 57 m instead. That is badly wrong.
- For a floor point 5 m down and 60 m from the palm, the ray enters the water about 54 m from the palm. The crown
  must be at least 54 × tan(altitude) high:

  | sun altitude | crown height needed |
  |---|---|
  | 5° | 4.7 m |
  | 10° | 9.5 m |
  | 15° | 14.5 m |

  So a 10–15 m palm reaches that spot only with the sun below about 10–14°.
- At those altitudes the direct share on the floor is about 0.2–0.45, so the shadow is a soft, low-contrast
  darkening: 20–45 % less light.
- The penumbra from the sun's 0.53° disc over about 60 m is about 0.6 m, and small waves add about 0.3–0.6 m of blur
  over 7 m of water.
- At 2° the share is about 0.1 and the shadow is barely visible.
- **At twilight (sun below the horizon) there is no direct light, so no shadow.**
