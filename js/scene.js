// ============================================================
// scene.js — "The System That Wires Itself"
// A business as a network: labeled nodes (website, bookings,
// payments, ads, CRM, reviews...) scattered and severed in red.
// One click: nodes snap into orbit around the hub, connections
// weld shut in amber, and data pulses flow for the session.
// ============================================================

import * as THREE from "three";

const C = {
  void: 0x0b0e14,
  panel: 0x131824,
  broken: 0xff4757,
  fixed: 0x3dd68c,
  spark: 0xf5a623,
  bone: 0xe8ecf4,
  dust: 0x8a94a8,
};

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = innerWidth < 700;
const canvas = document.getElementById("heroCanvas");
const hero = document.getElementById("top");

let fixed = false;
let fixStart = 0;

// ------------------------------------------------------------
// Label chips rendered to canvas textures (crisp mono text).
// One broken (red) + one fixed (amber/green) texture per chip.
// ------------------------------------------------------------
function makeChipTexture(text, state) {
  const scale = 4;
  const padX = 18, h = 34;
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  ctx.font = `500 13px "JetBrains Mono", monospace`;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  cv.width = w * scale;
  cv.height = h * scale;
  ctx.scale(scale, scale);

  const border = state === "broken" ? "#FF4757" : state === "hub" ? "#3DD68C" : "#F5A623";
  const fg = state === "broken" ? "#FF4757" : "#E8ECF4";

  ctx.fillStyle = "rgba(19,24,36,0.92)";
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 6);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.2;
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 6);
  ctx.stroke();

  ctx.font = `500 13px "JetBrains Mono", monospace`;
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, h / 2 + 0.5);

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return { tex, aspect: w / h };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ------------------------------------------------------------
// Scene setup (with graceful fallback)
// ------------------------------------------------------------
let api = { fix: () => {} };
let pendingFix = false;
window.__triggerHeroFix = () => { pendingFix = true; }; // replaced once the scene boots

// Wait for the mono font so chip textures render with the real face.
const fontsReady = document.fonts?.ready ?? Promise.resolve();
fontsReady.then(() => {
  try {
    init();
    if (pendingFix) api.fix();
  } catch (err) {
    canvas.style.display = "none";
    hero.classList.add("no-webgl");
  }
});

function init() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.1, 9.5);

  scene.add(new THREE.AmbientLight(0x33456e, 1.2));
  const lamp = new THREE.PointLight(C.spark, 40, 30);
  lamp.position.set(5, 4, 6);
  scene.add(lamp);

  // The whole system lives right-of-center so hero copy owns the left.
  const root = new THREE.Group();
  root.position.set(mobile ? 0 : 2.5, mobile ? 1.3 : 0.1, 0);
  scene.add(root);

  // ----------------------------------------------------------
  // Nodes
  // ----------------------------------------------------------
  const NODE_DEFS = mobile
    ? ["WEBSITE", "BOOKINGS", "PAYMENTS", "ADS", "REVIEWS"]
    : ["WEBSITE", "BOOKINGS", "PAYMENTS", "ADS", "CRM", "REVIEWS", "EMAIL", "ANALYTICS"];

  const ringR = mobile ? 1.55 : 2.15;
  const nodes = [];

  // hub
  const hub = makeSprite("YOUR BUSINESS", "hub-broken");
  hub.userData.home = new THREE.Vector3(0, 0, 0);
  hub.userData.away = new THREE.Vector3(0.4, -0.3, 0.5);
  hub.position.copy(hub.userData.away);
  root.add(hub);

  NODE_DEFS.forEach((label, i) => {
    const sprite = makeSprite(label, "broken");
    const angle = (i / NODE_DEFS.length) * Math.PI * 2 - Math.PI / 2;
    sprite.userData.home = new THREE.Vector3(
      Math.cos(angle) * ringR,
      Math.sin(angle) * ringR * 0.82,
      Math.sin(angle * 2) * 0.25
    );
    sprite.userData.away = new THREE.Vector3(
      Math.cos(angle) * ringR + (Math.random() - 0.5) * 2.6,
      Math.sin(angle) * ringR + (Math.random() - 0.5) * 2.2,
      (Math.random() - 0.5) * 2.5
    );
    sprite.userData.seed = Math.random() * 10;
    sprite.userData.delay = i * 70;
    sprite.position.copy(sprite.userData.away);
    root.add(sprite);
    nodes.push(sprite);
  });

  function makeSprite(text, state) {
    const isHub = state.startsWith("hub");
    const broken = makeChipTexture(text, isHub ? "broken" : "broken");
    const fixedTex = makeChipTexture(isHub ? "ALL SYSTEMS GO" : text, isHub ? "hub" : "fixed");
    const mat = new THREE.SpriteMaterial({ map: broken.tex, transparent: true, opacity: 0.95 });
    const s = new THREE.Sprite(mat);
    const base = isHub ? 0.42 : 0.3;
    s.scale.set(base * broken.aspect, base, 1);
    s.userData.brokenTex = broken.tex;
    s.userData.fixedTex = fixedTex.tex;
    s.userData.fixedAspect = fixedTex.aspect;
    s.userData.baseH = base;
    return s;
  }

  // ----------------------------------------------------------
  // Edges: node -> hub. Severed & red while broken; welded amber after.
  // ----------------------------------------------------------
  const edges = nodes.map((node) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
    const mat = new THREE.LineDashedMaterial({
      color: C.broken,
      transparent: true,
      opacity: 0.55,
      dashSize: 0.12,
      gapSize: 0.18,
    });
    const line = new THREE.Line(geo, mat);
    line.userData.node = node;
    line.userData.flickSeed = Math.random() * 10;
    root.add(line);
    return line;
  });

  // Pulses: one glowing dot per edge, flowing node -> hub when fixed.
  const pulseGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const pulses = nodes.map((node, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: C.spark, transparent: true, opacity: 0 });
    const m = new THREE.Mesh(pulseGeo, mat);
    m.userData.node = node;
    m.userData.t = Math.random();
    m.userData.speed = 0.3 + Math.random() * 0.35;
    root.add(m);
    return m;
  });

  // ----------------------------------------------------------
  // Ambient dust
  // ----------------------------------------------------------
  const dustCount = mobile ? 150 : 380;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount * 3; i += 3) {
    dustPos[i] = (Math.random() - 0.5) * 22;
    dustPos[i + 1] = (Math.random() - 0.5) * 13;
    dustPos[i + 2] = (Math.random() - 0.5) * 12;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: C.spark, size: 0.025, transparent: true, opacity: 0.4 })
  );
  scene.add(dust);

  // ----------------------------------------------------------
  // Burst on fix
  // ----------------------------------------------------------
  const BURST = 150;
  const burstPos = new Float32Array(BURST * 3);
  const burstVel = [];
  for (let i = 0; i < BURST; i++) {
    burstVel.push(
      new THREE.Vector3((Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.14, (Math.random() - 0.5) * 0.1)
    );
  }
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute("position", new THREE.BufferAttribute(burstPos, 3));
  const burst = new THREE.Points(
    burstGeo,
    new THREE.PointsMaterial({ color: C.spark, size: 0.05, transparent: true, opacity: 0 })
  );
  root.add(burst);
  let bursting = false;

  // ----------------------------------------------------------
  // Camera drift + parallax
  // ----------------------------------------------------------
  let mx = 0, my = 0;
  if (!mobile) {
    addEventListener("pointermove", (e) => {
      mx = (e.clientX / innerWidth - 0.5) * 0.5;
      my = (e.clientY / innerHeight - 0.5) * -0.35;
    });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  let running = true;
  new IntersectionObserver(([e]) => (running = e.isIntersecting), { threshold: 0.01 }).observe(canvas);

  // ----------------------------------------------------------
  // THE FIX
  // ----------------------------------------------------------
  const FIX_DUR = reduced ? 400 : 1100;

  function easeOutBack(t) {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }

  function fix() {
    if (fixed) return;
    fixed = true;
    fixStart = performance.now();
    nodes.forEach((n) => {
      n.userData.from = n.position.clone();
    });
    hub.userData.from = hub.position.clone();

    // burst + hub texture swap at the snap moment
    const lastDelay = nodes[nodes.length - 1].userData.delay;
    setTimeout(() => {
      burst.material.opacity = 1;
      bursting = true;
      hub.material.map = hub.userData.fixedTex;
      hub.scale.set(hub.userData.baseH * hub.userData.fixedAspect, hub.userData.baseH, 1);
      hub.material.needsUpdate = true;
    }, FIX_DUR + lastDelay);
  }
  api.fix = fix;
  window.__triggerHeroFix = fix;

  // ----------------------------------------------------------
  // Render loop
  // ----------------------------------------------------------
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();

  function render(now) {
    requestAnimationFrame(render);
    if (!running) return;
    const t = now * 0.001;

    camera.position.x += (mx - camera.position.x) * 0.03;
    camera.position.y += (my + 0.1 - camera.position.y) * 0.03;
    camera.lookAt(mobile ? 0 : 0.6, 0.1, 0);

    dust.rotation.y = t * 0.015;

    // nodes
    nodes.forEach((n, i) => {
      const ud = n.userData;
      if (!fixed) {
        n.position.x = ud.away.x + Math.sin(t * 0.7 + ud.seed) * 0.09;
        n.position.y = ud.away.y + Math.cos(t * 0.55 + ud.seed) * 0.09;
        n.material.opacity = 0.7 + Math.sin(t * 3 + ud.seed) * 0.2 * (reduced ? 0 : 1);
      } else {
        const p = Math.max(0, Math.min(1, (now - fixStart - ud.delay) / FIX_DUR));
        const e = reduced ? p : easeOutBack(p);
        n.position.lerpVectors(ud.from, ud.home, e);
        n.material.opacity = 0.95;
        if (p >= 1 && n.material.map !== ud.fixedTex) {
          n.material.map = ud.fixedTex;
          n.scale.set(ud.baseH * ud.fixedAspect, ud.baseH, 1);
          n.material.needsUpdate = true;
        }
        // gentle orbit breathing once settled
        if (p >= 1 && !reduced) {
          n.position.x += Math.sin(t * 0.8 + ud.seed) * 0.02;
          n.position.y += Math.cos(t * 0.6 + ud.seed) * 0.02;
        }
      }
    });

    // hub
    if (!fixed) {
      hub.position.x = hub.userData.away.x + Math.sin(t * 0.5) * 0.05;
      hub.material.opacity = 0.65 + Math.sin(t * 4.2) * 0.25 * (reduced ? 0 : 1);
    } else {
      const p = Math.max(0, Math.min(1, (now - fixStart) / FIX_DUR));
      hub.position.lerpVectors(hub.userData.from, hub.userData.home, reduced ? p : easeOutBack(p));
      hub.material.opacity = 1;
    }

    // edges follow their endpoints every frame
    edges.forEach((line) => {
      const node = line.userData.node;
      const attr = line.geometry.attributes.position;
      tmpA.copy(node.position);
      tmpB.copy(hub.position);
      attr.setXYZ(0, tmpA.x, tmpA.y, tmpA.z);
      attr.setXYZ(1, tmpB.x, tmpB.y, tmpB.z);
      attr.needsUpdate = true;
      line.computeLineDistances();

      if (!fixed) {
        line.material.opacity = 0.15 + Math.max(0, Math.sin(t * 2.4 + line.userData.flickSeed)) * 0.45;
      } else {
        const p = Math.min(1, (now - fixStart) / (FIX_DUR + 400));
        line.material.color.lerpColors(new THREE.Color(C.fixed), new THREE.Color(C.spark), p);
        line.material.opacity = 0.5;
        line.material.dashSize = THREE.MathUtils.lerp(0.12, 10, p); // dashes close -> solid
        line.material.gapSize = THREE.MathUtils.lerp(0.18, 0.001, p);
      }
    });

    // pulses flow once the system is live
    if (fixed && !reduced) {
      const settled = now - fixStart > FIX_DUR + 500;
      pulses.forEach((pl) => {
        if (!settled) return;
        pl.userData.t += pl.userData.speed * 0.008;
        if (pl.userData.t > 1) pl.userData.t = 0;
        pl.position.lerpVectors(pl.userData.node.position, hub.position, pl.userData.t);
        pl.material.opacity = Math.sin(pl.userData.t * Math.PI) * 0.9;
      });
    }

    // burst physics
    if (bursting) {
      const attr = burst.geometry.attributes.position;
      for (let i = 0; i < BURST; i++) {
        attr.setXYZ(i, attr.getX(i) + burstVel[i].x, attr.getY(i) + burstVel[i].y, attr.getZ(i) + burstVel[i].z);
        burstVel[i].multiplyScalar(0.965);
      }
      attr.needsUpdate = true;
      burst.material.opacity -= 0.013;
      if (burst.material.opacity <= 0) bursting = false;
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(render);
}

export { api };
