import { Vector3 } from 'three';
import { waterConfig } from './water-config';

// The biggest things standing in the surf, as the water's shader is given them: it draws foam
// round each. They are spread right round the atoll, and the shader would have to ask after all
// of them for every dot of water near the beach; so they are handed over in groups of
// neighbours, each with a circle that holds all its foam, and a dot asks only after the groups
// whose circle it is in (water.frag.glsl, foamRoundObstacles).

export interface SurfObstacle {
  x: number;
  z: number;
  radius: number;
}

const config = waterConfig.surfObstacles;

/** How far from an obstacle's middle its foam reaches. */
function foamReach(radius: number): number {
  return radius + config.foamReach + config.foamReachByRadius * radius;
}

/**
 * Writes the biggest obstacles into the two uniforms: `obstacles` (x, z, radius; an empty place
 * has a negative radius) and `groups` (a circle's x, z and radius; an empty group has a radius
 * of 0). Neighbours round the atoll share a group: the obstacles are taken in order of their
 * direction from the centre, starting after the widest gap between two of them.
 */
export function writeSurfObstacles(
  biggestFirst: readonly SurfObstacle[],
  obstacles: readonly Vector3[],
  groups: readonly Vector3[],
): void {
  const sent = biggestFirst.slice(0, obstacles.length);
  const roundTheAtoll = [...sent].sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  let widestGap = 0;
  let startsAt = 0;
  roundTheAtoll.forEach((obstacle, i) => {
    const before = roundTheAtoll[(i + roundTheAtoll.length - 1) % roundTheAtoll.length];
    const turn = Math.atan2(obstacle.z, obstacle.x) - Math.atan2(before.z, before.x);
    const gap = (turn + 2 * Math.PI) % (2 * Math.PI);
    if (gap > widestGap) {
      widestGap = gap;
      startsAt = i;
    }
  });
  const inOrder = [...roundTheAtoll.slice(startsAt), ...roundTheAtoll.slice(0, startsAt)];

  obstacles.forEach((place, i) => {
    if (i < inOrder.length) place.set(inOrder[i].x, inOrder[i].z, inOrder[i].radius);
    else place.set(0, 0, -1);
  });
  const perGroup = obstacles.length / groups.length;
  groups.forEach((circle, g) => {
    const members = inOrder.slice(g * perGroup, (g + 1) * perGroup);
    if (members.length === 0) {
      circle.set(0, 0, 0);
      return;
    }
    const x = members.reduce((sum, member) => sum + member.x, 0) / members.length;
    const z = members.reduce((sum, member) => sum + member.z, 0) / members.length;
    const reach = Math.max(
      ...members.map((member) => Math.hypot(member.x - x, member.z - z) + foamReach(member.radius)),
    );
    circle.set(x, z, reach);
  });
}
