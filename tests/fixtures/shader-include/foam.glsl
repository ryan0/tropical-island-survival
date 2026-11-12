#include "noise"

float foam(vec2 p) {
  return step(0.5, noise(p));
}
