// Shafts of sunlight hanging in the water: each a bundle of finer rays, soft at its edges, brightest just under the
// surface and dying away downwards, near and far; far brighter looking back along the light, towards the sun, than
// across it, and brighter the more nearly the eye looks along the shaft, through more of it. Drawn added to what
// is behind.
// Needs COMES_IN_OVER, FADES_A_METRE, NEAR, FAR, TINT, ACROSS_THE_LIGHT and MOST_THROUGH, which light-shafts.ts
// writes, and the varyings from light-shafts.vert.glsl.

uniform vec3 uCameraPosition;
uniform vec3 uSunColour;
uniform float uSurfaceHeight;   // the height of the water's surface over the camera
uniform float uShaftBrightness;   // the most a shaft adds now, with the day's light and the clouds

varying vec3 vWorldPosition;
varying float vAcross;
varying float vAlong;
varying float vStrength;
varying vec3 vAxis;
varying float vOwn;

void main() {
  // Across: soft to nothing at the edges, with a few brighter threads in it, each shaft's its own.
  float fromMiddle = 1.0 - vAcross * vAcross;
  float body = fromMiddle * fromMiddle;
  float threads = 0.86 + 0.14 * sin(vAcross * (3.0 + 5.0 * vOwn) + 40.0 * vOwn);

  float depth = max(uSurfaceHeight - vWorldPosition.y, 0.0);
  float comingIn = smoothstep(0.0, COMES_IN_OVER, depth);
  float fadingDown = exp(-depth * FADES_A_METRE) * (1.0 - smoothstep(0.7, 1.0, vAlong));

  vec3 fromEye = vWorldPosition - uCameraPosition;
  float eyeDistance = length(fromEye);
  float nearAndFar = smoothstep(NEAR.x, NEAR.y, eyeDistance) * (1.0 - smoothstep(FAR.x, FAR.y, eyeDistance));

  // The light is scattered mostly onwards, so it is brightest looking back along it, towards the sun.
  vec3 viewDirection = fromEye / max(eyeDistance, 0.001);
  float alongLight = dot(viewDirection, vAxis);
  float towardsSun = max(-alongLight, 0.0);
  float lookingAtSun = ACROSS_THE_LIGHT + (1.0 - ACROSS_THE_LIGHT) * towardsSun * towardsSun * towardsSun;
  // And the eye looks through more of a shaft the more nearly it looks along it.
  float acrossIt = sqrt(max(1.0 - alongLight * alongLight, 0.0));
  float throughIt = min(1.0 / max(acrossIt, 0.05), MOST_THROUGH);

  float shown = vStrength * body * threads * comingIn * fadingDown * nearAndFar * lookingAtSun * throughIt
    * uShaftBrightness;
  gl_FragColor = vec4(uSunColour * TINT, shown);
}
