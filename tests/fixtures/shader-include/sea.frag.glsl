#include <common>
#include "noise"
#include "foam"

void main() {
  gl_FragColor = vec4(vec3(foam(gl_FragCoord.xy) * noise(gl_FragCoord.yx)), 1.0);
}
