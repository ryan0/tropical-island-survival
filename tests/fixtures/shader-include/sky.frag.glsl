#include "noise"

void main() {
  gl_FragColor = vec4(vec3(noise(gl_FragCoord.xy)), 1.0);
}
