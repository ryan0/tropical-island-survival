/* What a castaway has made, and nothing else: a lean-to of driftwood poles roofed with palm fronds, a bed of dry
   fronds under it, a fishing spear, a few coconuts, firewood by the fire, and driftwood logs along the beach (two of
   them pulled up to the fire to sit on). Everything is one model with colours painted on its corners.
   Built once by buildProps(); see 54_modules.js. (The campfire itself is 48_fire.js; its ring of stones 39_rocks.js.) */

function buildProps(THREE, scene, api) {
  var rnd = api.rnd, hut = api.hut, fire = api.fire, P = [], C = [];
  function H(x, z) { var h = api.hgt(x, z); return isFinite(h) ? h : 0; }
  function tri(a, b, c, col) { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (var i = 0; i < 3; i++) C.push(col[0], col[1], col[2]); }
  function shade(col, k) { return [col[0] * k, col[1] * k, col[2] * k]; }
  /* a pole from A to B (radius r0 at A, r1 at B), a little crooked, five-sided; col = its colour */
  function pole(A, B, r0, r1, col, crook) {
    var n = 4, d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(d[0], d[1], d[2]);
    var u = Math.abs(d[1]) / L > 0.9 ? [1, 0, 0] : [0, 1, 0], s = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]], sl = Math.hypot(s[0], s[1], s[2]);
    s = [s[0] / sl, s[1] / sl, s[2] / sl];
    var t = [(d[1] * s[2] - d[2] * s[1]) / L, (d[2] * s[0] - d[0] * s[2]) / L, (d[0] * s[1] - d[1] * s[0]) / L], rings = [], i, k;
    for (i = 0; i <= n; i++) {
      var f = i / n, w = Math.sin(f * Math.PI) * (crook || 0) * L, ox = (rnd() - 0.5) * w, oy = (rnd() - 0.5) * w, r = r0 + (r1 - r0) * f, ring = [];
      for (k = 0; k < 5; k++) {
        var a = k * 1.2566 + i * 0.5, ca = Math.cos(a) * r + ox, sa = Math.sin(a) * r + oy;
        ring.push([A[0] + d[0] * f + s[0] * ca + t[0] * sa, A[1] + d[1] * f + s[1] * ca + t[1] * sa, A[2] + d[2] * f + s[2] * ca + t[2] * sa]);
      }
      rings.push(ring);
    }
    for (i = 0; i < n; i++) for (k = 0; k < 5; k++) {
      var c2 = shade(col, 0.85 + 0.3 * rnd()), k1 = (k + 1) % 5;
      tri(rings[i][k], rings[i + 1][k], rings[i + 1][k1], c2);
      tri(rings[i][k], rings[i + 1][k1], rings[i][k1], c2);
    }
    for (k = 1; k < 4; k++) { tri(rings[0][0], rings[0][k + 1], rings[0][k], shade(col, 1.15)); tri(rings[n][0], rings[n][k], rings[n][k + 1], shade(col, 1.15)); }
  }
  /* a palm frond lying from A to B: a rib with a row of leaflets down each side, sagging a little between its ends */
  function frond(A, B, wide, col) {
    var d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(d[0], d[1], d[2]), s = [d[2] / Math.hypot(d[0], d[2]), 0, -d[0] / Math.hypot(d[0], d[2])], n = 11, i;
    function at(f, side, drop) { var w = wide * Math.sin(Math.min(1, f * 1.15 + 0.12) * 2.7) * side; return [A[0] + d[0] * f + s[0] * w, A[1] + d[1] * f - Math.sin(f * 3.14) * 0.06 * L - drop, A[2] + d[2] * f + s[2] * w]; }
    for (i = 0; i < n; i++) {
      var f0 = i / n, f1 = (i + 1.25) / n, c2 = shade(col, 0.7 + 0.5 * rnd());   /* (broad leaflets that overlap the next: a roof, not a net) */
      for (var side = -1; side <= 1; side += 2) {
        var lean = 0.10 + 0.08 * rnd();   /* (leaflets sweep back towards the tip and droop at their ends) */
        tri(at(f0, 0, 0), at(Math.min(1, f1), 0, 0), at(Math.min(1, f1 + lean), side, wide * 0.3), c2);
      }
    }
  }
  var WOOD = [0.70, 0.66, 0.59], BARK = [0.42, 0.33, 0.24], DRY = [0.66, 0.55, 0.33], GREEN = [0.40, 0.47, 0.20];

  /* ---- the lean-to: two forked posts, a ridge pole, rafters down to the ground behind, fronds laid over them ---- */
  var hx = hut.x, hz = hut.z, y0 = H(hx, hz), i;
  var ridgeA = [hx - 1.7, H(hx - 1.7, hz + 0.7) + 1.45, hz + 0.7], ridgeB = [hx + 1.7, H(hx + 1.7, hz + 0.7) + 1.55, hz + 0.7];
  pole([hx - 1.55, H(hx - 1.55, hz + 0.9) - 0.3, hz + 0.9], [ridgeA[0] + 0.1, ridgeA[1] + 0.25, ridgeA[2] - 0.05], 0.065, 0.045, BARK, 0.03);
  pole([hx + 1.55, H(hx + 1.55, hz + 0.9) - 0.3, hz + 0.9], [ridgeB[0] - 0.1, ridgeB[1] + 0.25, ridgeB[2] - 0.05], 0.07, 0.045, BARK, 0.03);
  pole([ridgeA[0] - 0.25, ridgeA[1], ridgeA[2]], [ridgeB[0] + 0.3, ridgeB[1], ridgeB[2]], 0.05, 0.04, WOOD, 0.012);
  for (i = 0; i < 7; i++) {
    var fx = i / 6, rx = hx - 1.6 + 3.2 * fx + (rnd() - 0.5) * 0.12, ry = ridgeA[1] + (ridgeB[1] - ridgeA[1]) * fx, gz = hz - 1.75 - rnd() * 0.25;
    pole([rx, ry + 0.06, hz + 0.78], [rx + (rnd() - 0.5) * 0.2, H(rx, gz) - 0.05, gz], 0.032, 0.024, i % 2 ? WOOD : BARK, 0.02);
  }
  for (var layer = 0; layer < 3; layer++) for (i = 0; i < 24; i++) {
    var qx = hx - 1.8 + 3.6 * (i + rnd() * 0.6) / 24, qy = ridgeA[1] + (ridgeB[1] - ridgeA[1]) * (qx - hx + 1.7) / 3.4, lift = 0.07 + layer * 0.05;
    var top = layer * 0.3, tz = hz + 0.85 - top * 2.6, ty = qy + lift + 0.08 - top * qy, ez = hz - 2.05 - rnd() * 0.3;
    frond([qx, ty, tz], [qx + (rnd() - 0.5) * 0.5, H(qx, ez) + lift * 0.6, ez], 0.34 + rnd() * 0.12, rnd() < 0.3 ? shade(GREEN, 0.8 + 0.3 * rnd()) : shade(DRY, 0.75 + 0.4 * rnd()));
  }
  /* a bed of dry fronds on the ground under it */
  for (i = 0; i < 6; i++) {
    var bx = hx - 0.9 + i * 0.36, bz = hz + 0.3;
    frond([bx, H(bx, bz) + 0.10, bz], [bx + (rnd() - 0.5) * 0.3, H(bx, bz - 1.9) + 0.08, bz - 1.9], 0.3, shade(DRY, 0.9));
  }
  /* a fishing spear propped against the ridge, and a few coconuts */
  pole([hx + 2.15, H(hx + 2.15, hz + 1.5) - 0.05, hz + 1.5], [ridgeB[0] + 0.2, ridgeB[1] + 0.5, ridgeB[2] + 0.05], 0.016, 0.006, shade(BARK, 1.25), 0.004);
  for (i = 0; i < 5; i++) {
    var cx = hx - 2.2 + (i % 3) * 0.24 + rnd() * 0.05, cz = hz + 1.1 + Math.floor(i / 3) * 0.22, cy = H(cx, cz) + 0.1 + (i > 2 ? 0.02 : 0), g = new THREE.IcosahedronGeometry(0.115, 1).toNonIndexed().attributes.position.array, cc = shade([0.36, 0.27, 0.16], 0.8 + 0.4 * rnd());
    for (var v = 0; v < g.length; v += 9) tri([cx + g[v], cy + g[v + 1] * 1.15, cz + g[v + 2]], [cx + g[v + 3], cy + g[v + 4] * 1.15, cz + g[v + 5]], [cx + g[v + 6], cy + g[v + 7] * 1.15, cz + g[v + 8]], shade(cc, 0.85 + 0.3 * rnd()));
  }

  /* ---- driftwood: two logs to sit on by the fire, a stack of firewood, and logs left along the beach by the sea ---- */
  function log(x, z, len, r, yawA, col, sink) {
    var dx = Math.cos(yawA) * len / 2, dz = Math.sin(yawA) * len / 2;
    pole([x - dx, H(x - dx, z - dz) + r * (1 - sink), z - dz], [x + dx, H(x + dx, z + dz) + r * 0.8 * (1 - sink), z + dz], r, r * 0.75, col, 0.02);
  }
  log(fire.x - 1.5, fire.z - 0.5, 1.9, 0.14, 1.3, WOOD, 0.25);
  log(fire.x + 0.9, fire.z + 1.4, 1.6, 0.12, 0.2, shade(WOOD, 0.9), 0.25);
  for (i = 0; i < 7; i++) log(fire.x + 2.0 + (i % 4) * 0.12 + rnd() * 0.05, fire.z - 0.9 + rnd() * 0.1, 0.7 + rnd() * 0.2, 0.035 + rnd() * 0.015, 1.5 + (rnd() - 0.5) * 0.3 + (i > 3 ? 0.4 : 0), i % 2 ? BARK : WOOD, i > 3 ? -1.6 : 0.1);
  for (i = 0; i < 9; i++) {
    var lx = (rnd() * 2 - 1) * 60, lz = api.shoreZ(lx, 0.75 + rnd() * 0.5);
    if (!isFinite(lz)) continue;
    log(lx, lz, 1.2 + rnd() * 2.6, 0.07 + rnd() * 0.10, rnd() * 3.14, shade(WOOD, 0.9 + rnd() * 0.2), 0.3 + rnd() * 0.25);
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.computeVertexNormals();
  var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
