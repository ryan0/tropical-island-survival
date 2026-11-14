// What the sea does to the colour of anything under it, as terrain-colour.glsl does to the sand: paler and greyer,
// red lost with depth, the water's own blue-green glow, and the net of light the ripples throw (mostly on faces that
// look up). Used by the rocks and the coral.
// Needs the uniforms uLevel, uDay, uTime, uWind and uDet (the detail texture), declared by the file that includes it.

// The tint begins this far below the still sea surface.
const float SEA_TINT_START_DEPTH = 0.2;
// How much of each colour the water takes away for each metre of depth: red goes first.
const vec3 SEA_ABSORPTION = vec3(0.36, 0.085, 0.045);
// The water's own glow, in front of anything deep enough.
const vec3 SEA_GLOW = vec3(0.0, 0.075, 0.13);

// colour: the colour out of the water. worldPosition: where it is. facingUp: 0..1, how much the face looks up.
// tintStrength: how much of the water's greying and loss of red to apply (1 for rock; less for living coral, whose
// colour is the point of it).
vec3 seaTint(vec3 colour, vec3 worldPosition, float facingUp, float tintStrength) {
  float depthUnderWater = max(uLevel - worldPosition.y - SEA_TINT_START_DEPTH, 0.0);
  float isUnderWater = step(0.0001, depthUnderWater);

  // Paler and greyer
  vec3 paleGrey = vec3(dot(colour, vec3(0.3, 0.5, 0.2))) * vec3(1.04, 1.04, 1.02);
  float greying = 0.4 * tintStrength * smoothstep(0.0, 0.5, depthUnderWater);
  vec3 tinted = mix(colour, paleGrey, greying);

  // Darker, and red lost with depth
  float darkening = mix(1.0, 0.87, smoothstep(0.0, 0.7, depthUnderWater));
  vec3 colourLeft = exp(-depthUnderWater * tintStrength * SEA_ABSORPTION);
  tinted *= darkening * colourLeft;

  // The water's own glow, which needs daylight
  tinted += SEA_GLOW * (1.0 - exp(-depthUnderWater * 0.9)) * uDay * (0.4 + 0.6 * tintStrength);

  // The net of light: two copies of the detail texture's net of lines (alpha), drifting slowly, warped by its slopes
  // (red, green), the second turned and smaller so that the two never line up
  vec2 netUv = worldPosition.xz * 0.34 + vec2(uTime * 0.010, uTime * 0.006);
  vec2 warp = (texture2D(uDet, netUv * 0.31 + vec2(uTime * 0.017, -uTime * 0.013)).rg - 0.5) * 0.16;
  float firstNet = texture2D(uDet, netUv + warp).a;
  vec2 turnedUv = vec2(netUv.x * 0.6 + netUv.y * 0.8, -netUv.x * 0.8 + netUv.y * 0.6);
  float secondNet = texture2D(uDet, turnedUv * 1.63 - warp * 1.4).a;

  // high powers leave only the brightest lines; the lines brighten and the gaps between them darken a little
  float firstSquared = firstNet * firstNet;
  float firstLines = firstSquared * (firstSquared * firstNet);
  float secondSquared = secondNet * secondNet;
  float secondLines = secondSquared * secondSquared;
  float lightNet = firstLines * 1.7 + secondLines * 1.3 - 0.22;

  float netComesIn = smoothstep(0.1, 0.8, depthUnderWater);
  // (+ 0.2: it fades with the depth below the still surface, not below where the tint begins)
  float netFadesWithDepth = exp(-(depthUnderWater + 0.2) * 0.28);
  float netOnFace = 0.35 + 0.65 * facingUp;
  // (no ripples, no net of light)
  float ripples = smoothstep(0.0, 0.45, uWind);
  tinted *= 1.0 + lightNet * netComesIn * netFadesWithDepth * uDay * netOnFace * ripples;

  // Out of the water, the colour is left exactly as it was
  return mix(colour, tinted, isUnderWater);
}
