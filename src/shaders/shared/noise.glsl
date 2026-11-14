// Hash, gradient noise and fractal noise (fbm): the random patterns most fragment shaders build on.
// Needs nothing from outside. The terrain's, the sky's and the water's shaders call every function here by name:
// keep the names and the parameters.

// A random number 0..1 for each point: Dave Hoskins' "hash without sine", which needs no sin() of a large number
// (its precision differs between GPUs). Its numbers belong to the method; they are not tuned by eye.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Two random numbers -1..1 for each point, by the same method: the slope of the noise at a corner of its grid.
vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

// Gradient noise, 0..1, with one cell of its grid for each unit of p.
float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  // the quintic fade: the slope as well as the value runs on smoothly across the edges of the cells
  vec2 fade = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float corner00 = dot(hash2(cell), f);
  float corner10 = dot(hash2(cell + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float corner01 = dot(hash2(cell + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float corner11 = dot(hash2(cell + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  float nearEdge = mix(corner00, corner10, fade.x);
  float farEdge = mix(corner01, corner11, fade.x);
  float value = mix(nearEdge, farEdge, fade.y);
  // centred on 0.5; the clamp catches the rare values that would fall outside 0..1
  return clamp(value * 0.75 + 0.5, 0.0, 1.0);
}

// Fractal noise, 0..1: three octaves of the noise, each at twice the frequency and half the strength of the last.
float fbm(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  // twice the frequency, turned by about 37 degrees so that the octaves' grids never line up
  mat2 nextOctave = mat2(1.6, 1.2, -1.2, 1.6);
  for (int octave = 0; octave < 3; octave++) {
    sum += amplitude * noise(p);
    // (and shifted, so that the octaves do not all share a corner at the origin)
    p = nextOctave * p + vec2(3.1, 1.7);
    amplitude *= 0.5;
  }
  // the three amplitudes add up to 0.875: back to 0..1
  return sum / 0.875;
}

// The same with five octaves, for patterns that need the finer detail.
float fbm5(vec2 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  mat2 nextOctave = mat2(1.6, 1.2, -1.2, 1.6);
  for (int octave = 0; octave < 5; octave++) {
    sum += amplitude * noise(p);
    p = nextOctave * p + vec2(3.1, 1.7);
    amplitude *= 0.5;
  }
  // the five amplitudes add up to 0.96875
  return sum / 0.96875;
}
