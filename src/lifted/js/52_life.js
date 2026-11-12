/* Lifted from legacy/src/js/52_life.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './50_props.js';   /* first, so that the files still run in build 78's order */
import {smoothstep} from './05_core.js';
import {reefFishGeo} from './47_reef.js';

/* Wildlife: fish, turtle, crabs, gulls, reef. Built once by buildLife(); see 54_modules.js. */

function buildLife(THREE, scene, api) {
  var PI = Math.PI, sin = Math.sin, cos = Math.cos, atan2 = Math.atan2;
  var M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4();
  var Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  var C = new THREE.Color();
  var rnd = api.rnd, hgt = api.hgt, HX = api.home.x, HZ = api.home.z;   // HX,HZ: middle of the home islet
  function r(a, b) { return a + (b - a) * rnd(); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function find(cond, x0, x1, z0, z1, n) {
    for (var i = 0; i < (n || 6000); i++) {
      var x = r(x0, x1), z = r(z0, z1), h = hgt(x, z);
      if (cond(h, x, z)) return [x, z, h];
    }
    return null;
  }
  // ---- geometry helpers ----
  function xf(g, p, s, rt) {
    E.set(rt[0], rt[1], rt[2]); Q.setFromEuler(E); V.set(p[0], p[1], p[2]);
    var sc = new THREE.Vector3(s[0], s[1], s[2]);
    var m = new THREE.Matrix4().compose(V, Q, sc); g.applyMatrix4(m); return g;
  }
  function merge(gs) {
    var P = [], N = [], I = [], off = 0;
    for (var k = 0; k < gs.length; k++) {
      var g = gs[k]; if (!g.attributes.normal) g.computeVertexNormals();
      var p = g.attributes.position.array, n = g.attributes.normal.array, i;
      for (i = 0; i < p.length; i++) { P.push(p[i]); N.push(n[i]); }
      if (g.index) { for (i = 0; i < g.index.array.length; i++) I.push(g.index.array[i] + off); }else { for (i = 0; i < p.length / 3; i++) I.push(off + i); }
      off += p.length / 3;
    }
    var o = new THREE.BufferGeometry();
    o.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    o.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    o.setIndex(I); return o;
  }
  function mk(P, I) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g;
  }
  // spindle along x, length len, half-width w (z), half-height h (y)
  function spindle(len, w, h, segs, ring) {
    var P = [], I = [], i, j;
    for (i = 0; i <= segs; i++) {
      var u = i / segs, f = Math.pow(Math.max(0, sin(PI * Math.pow(u, 0.75))), 0.7);
      for (j = 0; j < ring; j++) {
        var a = j / ring * 2 * PI; P.push((u - 0.5) * len, cos(a) * h * f, sin(a) * w * f);
      }
    }
    for (i = 0; i < segs; i++) for (j = 0; j < ring; j++) {
      var j2 = (j + 1) % ring, A = i * ring + j, B = i * ring + j2, Cc = (i + 1) * ring + j, D = (i + 1) * ring + j2;
      I.push(A, Cc, B, B, Cc, D);
    }
    return mk(P, I);
  }
  function tri(a, b, c) { return mk([a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]], [0, 1, 2]); }
  function star(outer, inner, h) {
    var P = [0, h, 0], I = [], k;
    for (k = 0; k < 10; k++) { var rr = k % 2 === 0 ? outer : inner, a = k / 10 * 2 * PI; P.push(cos(a) * rr, 0, sin(a) * rr); }
    for (k = 0; k < 10; k++) I.push(0, 1 + (k + 1) % 10, 1 + k);
    return mk(P, I);
  }
  function inst(geo, mat, n, shadow) {
    var m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.castShadow = !!shadow;
    m.instanceMatrix.needsUpdate = true; scene.add(m); return m;
  }
  function lam(side) { return new THREE.MeshLambertMaterial({ color: 0xffffff, side: side || THREE.FrontSide }); }
  var DS = THREE.DoubleSide;
  function setM(mesh, i, x, y, z, qq, sx, sy, sz) { V.set(x, y, z); S.set(sx, sy, sz); M.compose(V, qq, S); mesh.setMatrixAt(i, M); }

  // ---- 1. seagulls ----
  var NG = 7, gulls = [];
  var gBody = merge([spindle(0.55, 0.07, 0.07, 6, 6),
    xf(new THREE.SphereGeometry(0.05, 6, 5), [0.3, 0.03, 0], [1, 1, 1], [0, 0, 0]),
    xf(new THREE.ConeGeometry(0.015, 0.07, 4), [0.38, 0.025, 0], [1, 1, 1], [0, 0, -PI / 2]),
    xf(tri([0, 0, 0.07], [0, 0, -0.07], [-0.2, 0, 0]), [-0.25, 0.01, 0], [1, 1, 1], [0, 0, 0])]);
  function wingGeo(s) {
    var g = mk([0.06, 0, 0, -0.08, 0, 0, 0.0, 0, s * 0.3, -0.12, 0, s * 0.32, -0.02, 0, s * 0.62, -0.1, 0, s * 0.6],
      [0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5]); return g.translate(0, 0.02, 0);
  }
  /* (no shadows for the animals: the shadow map is only redrawn when the player moves on - see 32_lights.js) */
  var gB = inst(gBody, lam(DS), NG, false), gR = inst(wingGeo(1), lam(DS), NG, false), gL = inst(wingGeo(-1), lam(DS), NG, false);
  for (var i = 0; i < NG; i++) {
    gulls.push({ cx: HX + r(-25, 25), cz: HZ + r(-20, 30), rx: r(14, 32), rz: r(14, 28), w: r(0.1, 0.2) * (i % 2 ? 1 : -1), p: r(0, 6.28), h: r(14, 38), fs: r(6, 9), prev: 1e9, bank: 0 });
    var gv = r(0.85, 1); C.setRGB(gv, gv, gv * 0.98); gB.setColorAt(i, C); gR.setColorAt(i, C); gL.setColorAt(i, C);
  }
  gB.instanceColor.needsUpdate = gR.instanceColor.needsUpdate = gL.instanceColor.needsUpdate = true;
  function updGulls(t, dt) {
    for (var i = 0; i < NG; i++) {
      var g = gulls[i], a = g.w * t + g.p;
      var x = g.cx + g.rx * cos(a), z = g.cz + g.rz * 0.6 * sin(2 * a);
      var dx = -g.rx * sin(a) * g.w, dz = g.rz * 1.2 * cos(2 * a) * g.w;
      var y = g.h + 2 * sin(0.3 * t + g.p);
      var yaw = atan2(-dz, dx), dy = g.prev > 1e8 ? 0 : yaw - g.prev;
      if (dy > PI) dy -= 2 * PI; if (dy < -PI) dy += 2 * PI;
      g.prev = yaw;
      g.bank += (clamp(-dy / Math.max(dt, 0.001) * 2, -0.6, 0.6) - g.bank) * Math.min(1, dt * 3);
      E.set(g.bank, yaw, 0, 'YXZ'); Q.setFromEuler(E); V.set(x, y, z); S.set(1, 1, 1); M.compose(V, Q, S);
      gB.setMatrixAt(i, M);
      var amp = 0.1 + 0.45 * clamp(sin(t * 0.25 + g.p * 3) * 2, 0, 1), f = 0.15 + amp * sin(t * g.fs + g.p);
      M3.makeRotationX(-f); M2.multiplyMatrices(M, M3); gR.setMatrixAt(i, M2);
      M3.makeRotationX(f); M2.multiplyMatrices(M, M3); gL.setMatrixAt(i, M2);
    }
    gB.instanceMatrix.needsUpdate = gR.instanceMatrix.needsUpdate = gL.instanceMatrix.needsUpdate = true;
  }

  // ---- 2. fish ----
  // three home schools (30 fish each, milling about one spot: the first by the pier) and ten small parties (8 each)
  // that wander round wide loops through the lagoon, so that there are fish passing almost anywhere
  var NS = 3, PER = 30, NR = 10, PERR = 8, NF = NS * PER + NR * PERR;
  // the same model as the reef fish (47_reef.js; nose towards +x), painted in greys that each fish's own colour tints:
  // a darker back, a pale belly, a dark eye, a pale stripe along the side
  var fishGeo = reefFishGeo(0.5, function (x, y, part) {
    if (part) return 0.9;
    if (Math.hypot(x - 0.36, y - 0.03) < 0.035) return 0.06;
    return 1.3 - 0.75 * smoothstep(-0.12, 0.12, y) + 0.35 * smoothstep(0.035, 0.0, Math.abs(y - 0.01));
  });
  var fishMesh = inst(fishGeo, new THREE.MeshLambertMaterial({ vertexColors: true, side: DS }), NF, false);
  var schools = [], fish = [];
  var pierA = find(function (h) { return h < -1.0 && h > -2.6; }, api.pier.x - 7, api.pier.x + 7, api.pier.z0 + api.pier.len * 0.6, api.pier.z0 + api.pier.len + 8, 3000);
  var hues = [[0.08, 0.55, 0.95, 0.15], [0.5, 0.58, 0.12, 0.85], [0.12, 0.95, 0.75, 0.0]];
  for (var s = 0; s < NS + NR; s++) {
    var roam = s >= NS, an = s === 0 ? pierA : find(function (h) { return h < -1.2 && h > -2.6; }, HX - (roam ? 130 : 70), HX + (roam ? 130 : 70), HZ - (roam ? 130 : 70), HZ + (roam ? 130 : 70), 5000);
    if (!an) an = pierA || [0, 40, -2];
    var sc = { ax: an[0], az: an[1], rx: 2.5, rz: 2.5, wx: 0.15, wz: 0.11, px: s * 2, pz: s };
    if (roam) {
      // a loop as wide as stays in water between 0.9 and 6 m deep all the way round (tried wide first, then narrower)
      for (var R = 42; R > 4; R *= 0.8) {
        sc.rx = R * r(0.7, 1); sc.rz = R * r(0.7, 1); sc.wx = r(0.5, 0.9) / Math.max(sc.rx, sc.rz); sc.wz = sc.wx * r(0.6, 0.9); sc.px = r(0, 6.28); sc.pz = r(0, 6.28);
        var ok = true;
        for (var q = 0; q < 60 && ok; q++) { var hq = hgt(sc.ax + sc.rx * sin(q * 0.31 + sc.px), sc.az + sc.rz * cos(q * 0.23 + sc.pz)); ok = hq < -0.9 && hq > -6; }
        if (ok) break;
      }
    }
    schools.push(sc);
    for (var k = 0; k < (roam ? PERR : PER); k++) {
      var pal = (rnd() < 0.7) ? hues[s % 3] : hues[(s + 1) % 3];
      C.setHSL(pal[0] + r(-0.03, 0.03), 0.9, 0.55); fishMesh.setColorAt(fish.length, C);
      fish.push({ s: s, ph: r(0, 6.28), rho: roam ? r(0.4, 1.6) : r(0.8, 4), om: r(0.25, 0.55) * (rnd() < 0.5 ? 1 : -1), len: r(0.25, 0.4), sw: r(0.7, 1.3) });
    }
  }
  fishMesh.instanceColor.needsUpdate = true;
  var fx = 0, fz = 0;
  function fishPos(f, sc, t) {
    var a = f.om * t * f.sw + f.ph;
    var cx = sc.ax + sc.rx * sin(sc.wx * t + sc.px), cz = sc.az + sc.rz * cos(sc.wz * t + sc.pz);
    fx = cx + f.rho * cos(a) + 0.8 * sin(2.3 * a + f.ph); fz = cz + f.rho * sin(a * 0.8 + f.ph);
  }
  function updFish(t) {
    for (var i = 0; i < NF; i++) {
      var f = fish[i], sc = schools[f.s];
      fishPos(f, sc, t); var x1 = fx, z1 = fz; fishPos(f, sc, t + 0.2);
      var x2 = fx, z2 = fz, h = hgt(x1, z1);
      if (h > -0.7 || h < (f.s >= NS ? -7 : -3)) {
        x1 = sc.ax + (x1 - sc.ax) * 0.25; z1 = sc.az + (z1 - sc.az) * 0.25; x2 = sc.ax + (x2 - sc.ax) * 0.25; z2 = sc.az + (z2 - sc.az) * 0.25;
        h = hgt(x1, z1); if (h > -0.7) h = -0.9;
      }
      var lo = h + 0.2, hi = -0.25;
      var y = lo + Math.max(0, hi - lo) * (0.5 + 0.4 * sin(t * 0.7 + f.ph * 3));
      E.set(0, atan2(-(z2 - z1), x2 - x1) + 0.14 * sin(t * 9 + f.ph), 0); Q.setFromEuler(E);
      setM(fishMesh, i, x1, y, z1, Q, f.len, f.len, f.len);
    }
    fishMesh.instanceMatrix.needsUpdate = true;
  }

  // ---- 3. crabs ----
  var NC = 8, crabs = [];
  var crabGeoList = [xf(new THREE.SphereGeometry(1, 8, 6), [0, 0, 0], [0.09, 0.05, 0.12], [0, 0, 0])];
  for (var li = 0; li < 4; li++) for (var sd = -1; sd <= 1; sd += 2) {
    crabGeoList.push(xf(new THREE.BoxGeometry(0.012, 0.012, 0.1), [-0.05 + li * 0.035, -0.012, sd * 0.15], [1, 1, 1], [-sd * 0.5, 0, 0]));
  }
  for (sd = -1; sd <= 1; sd += 2) {
    crabGeoList.push(xf(new THREE.BoxGeometry(0.1, 0.014, 0.014), [0.1, 0.01, sd * 0.07], [1, 1, 1], [0, sd * 0.3, 0]));
    crabGeoList.push(xf(new THREE.SphereGeometry(0.04, 6, 4), [0.17, 0.012, sd * 0.1], [1, 0.45, 0.8], [0, 0, 0]));
    crabGeoList.push(xf(new THREE.SphereGeometry(0.012, 4, 3), [0.07, 0.045, sd * 0.04], [1, 1, 1], [0, 0, 0]));
  }
  var crabMesh = inst(merge(crabGeoList), lam(DS), NC, false);
  for (i = 0; i < NC; i++) {
    var cp = find(function (h) { return h > 0.15 && h < 0.9; }, HX - 75, HX + 75, HZ - 75, HZ + 75, 20000) || [0, 30, 0.3];
    crabs.push({ x: cp[0], z: cp[1], dx: 1, dz: 0, mv: false, tm: r(0, 2), yaw: 0 });
    C.setHSL(r(0.02, 0.07), r(0.45, 0.62), r(0.30, 0.42)); crabMesh.setColorAt(i, C);
  }
  crabMesh.instanceColor.needsUpdate = true;
  var OFFS = [0, 0.8, -0.8, 1.6, -1.6, 2.4, -2.4, 3.14];
  function updCrabs(t, dt, pp) {
    for (var i = 0; i < NC; i++) {
      var c = crabs[i], ex = c.x - pp.x, ez = c.z - pp.z, d2 = ex * ex + ez * ez, sp = 0, ang = atan2(c.dz, c.dx);
      if (d2 < 16) { var d = Math.sqrt(d2) + 1e-4; ang = atan2(ez / d, ex / d); sp = 2.4; c.mv = true; }else {
        c.tm -= dt;
        if (c.tm < 0) {
          c.mv = !c.mv; c.tm = c.mv ? r(0.3, 0.9) : r(0.8, 3);
          if (c.mv) ang = r(0, 6.28);
        }
        if (c.mv) sp = 0.7;
      }
      if (sp > 0) {
        for (var k = 0; k < 8; k++) {
          var a = ang + OFFS[k], nx = c.x + cos(a) * sp * dt, nz = c.z + sin(a) * sp * dt, h = hgt(nx, nz);
          if (h > 0.1 && h < 0.95) { c.x = nx; c.z = nz; c.dx = cos(a); c.dz = sin(a); break; }
          if (k === 0 && d2 >= 16) { c.tm = r(0.5, 1.5); c.mv = false; break; }
        }
      }
      var hh = hgt(c.x, c.z);
      E.set(0, atan2(c.dx, c.dz), 0); Q.setFromEuler(E);
      setM(crabMesh, i, c.x, hh + 0.035 + (sp > 0 ? 0.008 * sin(t * 40 + i) : 0), c.z, Q, 1, 1, 1);
    }
    crabMesh.instanceMatrix.needsUpdate = true;
  }

  // ---- 4. turtle ----
  var tMat = new THREE.MeshLambertMaterial({ color: 0x6b5a33 }), fMat = new THREE.MeshLambertMaterial({ color: 0x7f8f55, side: DS });
  var turtle = new THREE.Group(); scene.add(turtle);
  var tBody = new THREE.Mesh(merge([xf(new THREE.SphereGeometry(0.5, 12, 8), [0, 0, 0], [1.05, 0.38, 0.9], [0, 0, 0]),
    xf(new THREE.SphereGeometry(0.1, 8, 6), [0.62, 0.02, 0], [1.3, 0.9, 0.9], [0, 0, 0]),
    xf(new THREE.ConeGeometry(0.04, 0.2, 5), [-0.58, -0.02, 0], [1, 1, 1], [0, 0, PI / 2])]), tMat);
  turtle.add(tBody);
  var flips = [];
  function mkFlip(px, pz, len, wd, sgn) {
    var g = new THREE.SphereGeometry(1, 8, 5); g.scale(wd, 0.025, len); g.translate(0, 0, sgn * len * 0.9);
    var m = new THREE.Mesh(g, fMat); m.position.set(px, -0.05, pz); turtle.add(m); flips.push(m); return m;
  }
  mkFlip(0.25, 0.3, 0.32, 0.1, 1); mkFlip(0.25, -0.3, 0.32, 0.1, -1); mkFlip(-0.3, 0.2, 0.15, 0.06, 1); mkFlip(-0.3, -0.2, 0.15, 0.06, -1);
  var tc = null, tr = 9;
  for (i = 0; i < 400 && !tc; i++) {
    var cx0 = HX + r(-40, 40), cz0 = HZ + r(-75, 30), ok = true;
    for (var q = 0; q < 24; q++) {
      var h0 = hgt(cx0 + tr * cos(q / 24 * 6.283), cz0 + tr * 0.6 * sin(q / 24 * 6.283));
      if (h0 > -2 || h0 < -4.2) { ok = false; break; }
    }
    if (ok) tc = [cx0, cz0];
  }
  if (!tc) tc = [HX, HZ - 55];
  var tPath = [];
  (function () { for (var k = 0; k < 64; k++) { var th = k / 64 * 6.283185, rr = 40; while (rr < 120 && api.hgt(Math.cos(th) * rr, Math.sin(th) * rr) > -3) rr += 0.5; tPath.push(rr); } })();
  function tpr(u) { var f = (((u / 6.283185) % 1) + 1) % 1 * 64, i0 = Math.floor(f), fr = f - i0; return tPath[i0 % 64] * (1 - fr) + tPath[(i0 + 1) % 64] * fr; }
  function tpx(u) { return tpr(u) * Math.cos(u); }
  function tpz(u) { return tpr(u) * Math.sin(u); }
  function updTurtle(t, wl) {
    var u = t * 0.012 + 1.2, x = tpx(u), z = tpz(u);
    var dx = tpx(u + 0.01) - x, dz = tpz(u + 0.01) - z;
    turtle.position.set(x, wl - 0.5 + 0.12 * sin(t * 0.5), z);
    turtle.rotation.set(0.04 * sin(t * 0.8), atan2(-dz, dx), 0.05 * sin(t * 0.8 + 1));
    var a = 0.2 + 0.55 * sin(t * 1.5), b = 0.15 + 0.3 * sin(t * 1.5 + 1);
    flips[0].rotation.x = a; flips[1].rotation.x = -a; flips[2].rotation.x = b; flips[3].rotation.x = -b;
    flips[0].rotation.y = -0.3 * cos(t * 1.5); flips[1].rotation.y = 0.3 * cos(t * 1.5);
  }

  // ---- 5. beach details ----
  var rock = new THREE.Quaternion();
  function scatter(geo, n, col, lift, sMin, sMax, flat) {
    var m = inst(geo, lam(), n, false), cnt = 0;
    for (var i = 0; i < n; i++) {
      var p = find(function (h) { return h > 0.05 && h < 1.2; }, HX - 75, HX + 75, HZ - 75, HZ + 75, 600);
      if (!p) continue;
      E.set(flat ? 0 : r(-0.3, 0.3), r(0, 6.28), flat ? 0 : r(-0.3, 0.3)); rock.setFromEuler(E);
      var sc = r(sMin, sMax); setM(m, cnt, p[0], p[2] + lift * sc, p[1], rock, sc, sc * r(0.8, 1.2), sc * r(0.8, 1.2));
      col(C); m.setColorAt(cnt, C); cnt++;
    }
    m.count = cnt; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; return m;
  }
  scatter(star(0.09, 0.03, 0.018), 40, function (c) { c.setHSL(r(0.0, 0.08), 0.85, r(0.4, 0.55)); }, 0.002, 0.8, 1.4, true);
  scatter(xf(new THREE.SphereGeometry(0.04, 6, 4), [0, 0, 0], [1.1, 0.45, 0.8], [0, 0, 0]), 120,
    function (c) { c.setHSL(r(0.06, 0.12), r(0.1, 0.4), r(0.75, 0.92)); }, 0.006, 0.6, 1.3, false);
  scatter(xf(new THREE.SphereGeometry(0.05, 5, 4), [0, 0, 0], [1, 0.5, 0.8], [0, 0, 0]), 250,
    function (c) { var g = r(0.25, 0.6); c.setRGB(g, g * 0.97, g * 0.92); }, 0.01, 0.4, 1.3, false);

  // ---- 6. flowers ----
  var NFL = 350;
  var stems = inst(xf(new THREE.CylinderGeometry(0.004, 0.006, 0.2, 3), [0, 0.1, 0], [1, 1, 1], [0, 0, 0]),
    new THREE.MeshLambertMaterial({ color: 0x3f7a2c }), NFL, false);
  var blooms = inst(star(0.05, 0.02, 0.015), lam(DS), NFL, false);
  var fcols = [0xff7fb0, 0xffffff, 0xffe14a, 0xe02a2a], fc = 0;
  for (i = 0; i < NFL; i++) {
    var fp = find(function (h, x, z) { return h > 1.9 && (x - HX) * (x - HX) + (z - HZ) * (z - HZ) < 3600; }, HX - 60, HX + 60, HZ - 60, HZ + 60, 800);
    if (!fp) continue;
    var fs = r(0.7, 1.4);
    E.set(0, r(0, 6.28), 0); rock.setFromEuler(E); setM(stems, fc, fp[0], fp[2], fp[1], rock, fs, fs, fs);
    E.set(r(-0.3, 0.3), r(0, 6.28), r(-0.3, 0.3)); rock.setFromEuler(E);
    setM(blooms, fc, fp[0], fp[2] + 0.2 * fs, fp[1], rock, fs, fs, fs);
    C.setHex(fcols[(rnd() * 4) | 0]); blooms.setColorAt(fc, C); fc++;
  }
  stems.count = blooms.count = fc; stems.instanceMatrix.needsUpdate = blooms.instanceMatrix.needsUpdate = true;
  if (blooms.instanceColor) blooms.instanceColor.needsUpdate = true;

  // ---- 7. butterflies ----
  var NB = 14, bfs = [];
  function bwing(s) { return mk([0.03, 0, 0.005 * s, -0.025, 0, 0.005 * s, 0, 0, 0.09 * s, -0.04, 0, 0.07 * s], s > 0 ? [0, 2, 1, 1, 2, 3] : [0, 1, 2, 1, 3, 2]); }
  var bR = inst(bwing(1), lam(DS), NB, false), bL = inst(bwing(-1), lam(DS), NB, false);
  var bcols = [0xff8c1a, 0xffe14a, 0x4aa3ff, 0xffffff, 0xff5fa0];
  for (i = 0; i < NB; i++) {
    var bp = find(function (h) { return h > 1.9; }, HX - 50, HX + 50, HZ - 50, HZ + 50, 3000) || [0, 0, 2];
    bfs.push({ x: bp[0], z: bp[1], p: r(0, 6.28), k: r(0.6, 1.2), hh: r(0.3, 1.4), fr: r(22, 32) });
    C.setHex(bcols[i % 5]); bR.setColorAt(i, C); bL.setColorAt(i, C);
  }
  bR.instanceColor.needsUpdate = bL.instanceColor.needsUpdate = true;
  function bpos(b, t) {
    V.set(b.x + 3 * sin(0.31 * t * b.k + b.p) + 1.5 * sin(0.77 * t + b.p * 2), 0, b.z + 3 * cos(0.23 * t * b.k + b.p) + 1.5 * cos(0.6 * t + b.p));
  }
  function updButter(t) {
    for (var i = 0; i < NB; i++) {
      var b = bfs[i]; bpos(b, t); var x1 = V.x, z1 = V.z; bpos(b, t + 0.1);
      var yaw = atan2(-(V.z - z1), V.x - x1);
      var y = hgt(x1, z1) + 0.5 + b.hh * (0.5 + 0.5 * sin(0.4 * t + b.p)) + 0.15 * sin(5 * t + b.p);
      E.set(0, yaw, 0); Q.setFromEuler(E); V.set(x1, y, z1); S.set(1, 1, 1); M.compose(V, Q, S);
      var f = 0.4 + 0.9 * sin(t * b.fr + b.p);
      M3.makeRotationX(-f); M2.multiplyMatrices(M, M3); bR.setMatrixAt(i, M2);
      M3.makeRotationX(f); M2.multiplyMatrices(M, M3); bL.setMatrixAt(i, M2);
    }
    bR.instanceMatrix.needsUpdate = bL.instanceMatrix.needsUpdate = true;
  }

  // ---- 8. fireflies ----
  var NFF = 80, ffBase = new Float32Array(NFF * 3), ffPh = new Float32Array(NFF * 3);
  var ffPos = new Float32Array(NFF * 3), ffGeo = new THREE.BufferGeometry();
  for (i = 0; i < NFF; i++) {
    var ffp = i < 30 ? [api.hut.x + r(-8, 8), api.hut.z + r(-8, 8)] : (find(function (h) { return h > 1.7; }, HX - 50, HX + 50, HZ - 50, HZ + 50, 2000) || [0, 0]);
    ffBase[i * 3] = ffp[0]; ffBase[i * 3 + 1] = hgt(ffp[0], ffp[1]) + r(0.4, 2); ffBase[i * 3 + 2] = ffp[1];
    ffPh[i * 3] = r(0, 6.28); ffPh[i * 3 + 1] = r(0, 6.28); ffPh[i * 3 + 2] = r(0, 6.28);
  }
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  var cv = document.createElement('canvas'); cv.width = cv.height = 64;
  var cx = cv.getContext('2d'), gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,210,1)'); gr.addColorStop(0.35, 'rgba(210,255,110,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
  var ffMat = new THREE.PointsMaterial({ size: 0.14, sizeAttenuation: true, map: new THREE.CanvasTexture(cv), color: 0xd8ff70,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  var ffPts = new THREE.Points(ffGeo, ffMat); ffPts.frustumCulled = false; scene.add(ffPts);
  function updFlies(t, night) {
    ffMat.opacity = night; ffPts.visible = night > 0.01; if (!ffPts.visible) return;
    for (var i = 0; i < NFF; i++) {
      var j = i * 3;
      ffPos[j] = ffBase[j] + 1.0 * sin(0.5 * t + ffPh[j]); ffPos[j + 1] = ffBase[j + 1] + 0.4 * sin(0.7 * t + ffPh[j + 1]);
      ffPos[j + 2] = ffBase[j + 2] + 1.0 * cos(0.4 * t + ffPh[j + 2]);
    }
    ffGeo.attributes.position.needsUpdate = true;
  }

  // ---- 9. dolphins ----
  var dGeo = merge([spindle(2.2, 0.2, 0.25, 10, 8),
    xf(new THREE.ConeGeometry(0.05, 0.25, 6), [1.2, -0.03, 0], [1, 1, 1], [0, 0, -PI / 2]),
    xf(tri([0.25, 0, 0], [-0.2, 0, 0], [-0.25, 0.4, 0]), [0, 0.22, 0], [1, 1, 1], [0, 0, 0]),
    xf(tri([0, 0, 0], [-0.3, 0, 0.35], [-0.3, 0, -0.35]), [-1.15, 0, 0], [1, 1, 1], [0, 0, 0])]);
  var dMat = new THREE.MeshLambertMaterial({ color: 0x6f8796, side: DS }), dols = [];
  for (i = 0; i < 2; i++) {
    var dm = new THREE.Mesh(dGeo, dMat); dm.rotation.order = 'YZX'; dm.visible = false; dm.frustumCulled = false; scene.add(dm);
    dols.push({ m: dm, per: 9 + i * 2.5, off: i * 4.3 });
  }
  function updDolphins(t, wl) {
    for (var i = 0; i < 2; i++) {
      var d = dols[i], tt = t + d.off, idx = Math.floor(tt / d.per), tc2 = tt - idx * d.per, dur = 2.2;
      if (tc2 > dur) { d.m.visible = false; continue; }
      d.m.visible = true;
      // each leap is somewhere new in the deep water outside the reef, off the south side (57-71 m off the beach), swimming along the reef
      var s = tc2 / dur, dth = 1.45 + i * 0.22 + 0.55 * sin(idx * 2.3 + i), dr = api.islandR(dth) + 64 + 7 * cos(idx * 1.3 + i);
      var yaw = -dth - 1.5708 + 0.5 * sin(idx * 1.7 + i * 2), cx2 = cos(dth) * dr, cz2 = sin(dth) * dr;
      var run = (s - 0.5) * 8, dxx = cos(yaw), dzz = -sin(yaw);
      d.m.position.set(cx2 + dxx * run, wl - 1 + 3.2 * 4 * s * (1 - s), cz2 + dzz * run);
      d.m.rotation.set(0, yaw, atan2(12.8 * (1 - 2 * s), 8));
    }
  }

  return {
    update: function (t, dt, env) {
      try {
        var pp = env.playerPos, wl = env.waterLevel || 0;
        updGulls(t, dt); updFish(t); updCrabs(t, dt, pp); updTurtle(t, wl);
        updButter(t); bR.visible = bL.visible = env.day >= 0.3;
        updFlies(t, env.night); updDolphins(t, wl);
      } catch (e) { /* never throw */ }
    }
  };
}

export {buildLife};
