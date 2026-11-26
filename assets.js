// assets.js — Mapa y decoración de "Resiste a los ragdolls".
// Solo visual (sin lógica de juego). Usa un RNG propio con semilla fija,
// así el mapa se ve igual para todos.
window.MAPA = (() => {
  const CFG = {
    puertasZ: [-9, -3, 3, 9],   // 4 puertas en la pared izquierda
    xPuertas: -15,
    xMeta: 13.5,
    cielo: "#8cc8f5"
  };

  function rng(seed) {   // mulberry32
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function texturaCanvas(scene, B, nombre, w, h, dibujar) {
    const tx = new B.DynamicTexture(nombre, { width: w, height: h }, scene, true);
    dibujar(tx.getContext(), w, h);
    tx.update();
    return tx;
  }

  function crear(scene, B) {
    const V = (x, y, z) => new B.Vector3(x, y, z);
    const mat = (nombre, hex, opt = {}) => {
      const m = new B.StandardMaterial(nombre, scene);
      m.diffuseColor = B.Color3.FromHexString(hex);
      m.specularColor = new B.Color3(0.05, 0.05, 0.05);
      Object.assign(m, opt);
      return m;
    };
    const r = rng(777);

    // ---------- Cielo ----------
    const cielo = B.Color3.FromHexString(CFG.cielo);
    scene.clearColor = new B.Color4(cielo.r, cielo.g, cielo.b, 1);
    scene.fogMode = B.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.007;
    scene.fogColor = B.Color3.FromHexString("#cfe8fb");

    const domo = B.MeshBuilder.CreateSphere("cielo", { diameter: 400, segments: 12,
      sideOrientation: B.Mesh.BACKSIDE }, scene);
    const txCielo = texturaCanvas(scene, B, "txCielo", 8, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2f6fd0"); g.addColorStop(0.42, "#8cc8f5");
      g.addColorStop(0.5, "#e4f3ff"); g.addColorStop(1, "#e4f3ff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    const mCielo = new B.StandardMaterial("mCielo", scene);
    mCielo.emissiveTexture = txCielo; mCielo.disableLighting = true; mCielo.fogEnabled = false;
    domo.material = mCielo; domo.isPickable = false;

    // Nubes: esferas blancas aplastadas
    const mNube = mat("mNube", "#ffffff", { emissiveColor: new B.Color3(0.85, 0.85, 0.9), fogEnabled: false });
    const nubeBase = B.MeshBuilder.CreateSphere("nube", { diameter: 1, segments: 6 }, scene);
    nubeBase.material = mNube; nubeBase.isPickable = false; nubeBase.isVisible = false;
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = 60 + r() * 70, y = 35 + r() * 25;
      for (let k = 0; k < 3; k++) {
        const n = nubeBase.createInstance("n" + i + k);
        n.position.set(Math.cos(a) * d + k * 5, y + r() * 2, Math.sin(a) * d + r() * 3);
        n.scaling.set(10 + r() * 8, 3 + r() * 2, 7 + r() * 5);
        n.isPickable = false;
      }
    }

    // ---------- Luz ----------
    const hemi = scene.lights[0];
    if (hemi) { hemi.intensity = 0.75; hemi.groundColor = new B.Color3(0.35, 0.4, 0.3); }
    const sol = new B.DirectionalLight("sol", V(-0.4, -1, 0.35), scene);
    sol.intensity = 0.55; sol.diffuse = B.Color3.FromHexString("#fff3d6");

    // ---------- Suelo ----------
    const suelo = scene.getMeshByName("suelo");
    const txPasto = texturaCanvas(scene, B, "txPasto", 512, 512, (ctx, w, h) => {
      const franjas = 10;
      for (let i = 0; i < franjas; i++) {
        ctx.fillStyle = i % 2 ? "#5f9c45" : "#6aab4d";
        ctx.fillRect(i * w / franjas, 0, w / franjas, h);
      }
      for (let i = 0; i < 2500; i++) {               // ruido de pasto
        ctx.fillStyle = r() < 0.5 ? "rgba(40,80,30,.25)" : "rgba(150,200,110,.2)";
        ctx.fillRect(r() * w, r() * h, 2, 3);
      }
    });
    if (suelo) suelo.material = mat("mPasto", "#ffffff", { diffuseTexture: txPasto });

    const exterior = B.MeshBuilder.CreateGround("exterior", { width: 300, height: 300 }, scene);
    exterior.position.y = -0.05; exterior.isPickable = false;
    exterior.material = mat("mExterior", "#4f8a3c");

    // Tierra frente a cada puerta
    const mTierra = mat("mTierra", "#8a6a45");
    CFG.puertasZ.forEach((z, i) => {
      const t = B.MeshBuilder.CreateDisc("tierra" + i, { radius: 1.8, tessellation: 20 }, scene);
      t.rotation.x = Math.PI / 2; t.position.set(CFG.xPuertas + 1.3, 0.015, z);
      t.scaling.x = 1.4; t.material = mTierra; t.isPickable = false;
    });

    // ---------- Paredes ----------
    const txPiedra = texturaCanvas(scene, B, "txPiedra", 256, 128, (ctx, w, h) => {
      ctx.fillStyle = "#7d7f86"; ctx.fillRect(0, 0, w, h);
      const fh = 16, fw = 32;
      for (let y = 0; y < h; y += fh) {
        const off = (y / fh) % 2 ? fw / 2 : 0;
        for (let x = -fw; x < w + fw; x += fw) {
          const g = 120 + Math.floor(r() * 40);
          ctx.fillStyle = `rgb(${g},${g + 2},${g + 8})`;
          ctx.fillRect(x + off + 1, y + 1, fw - 2, fh - 2);
        }
      }
    });
    txPiedra.uScale = 6; txPiedra.vScale = 1.5;
    const mPiedra = mat("mPiedra", "#ffffff", { diffuseTexture: txPiedra });
    const mVidrio = mat("mVidrio", "#bfe3ff", { alpha: 0.18 });
    // pared0: fondo (z=+15) · pared1: frente (z=-15, la cámara mira a través) · pared2: derecha · pared3: izquierda (puertas)
    ["pared0", "pared2", "pared3"].forEach(nm => { const p = scene.getMeshByName(nm); if (p) p.material = mPiedra; });
    const frente = scene.getMeshByName("pared1"); if (frente) frente.material = mVidrio;

    // ---------- Puertas ----------
    const mMarco = mat("mMarco", "#5a4632");
    const puertas = CFG.puertasZ.map((z, i) => {
      const x = CFG.xPuertas + 0.3;
      const poste = (dz) => {
        const p = B.MeshBuilder.CreateBox("poste", { width: 0.6, height: 3.4, depth: 0.5 }, scene);
        p.position.set(x, 1.7, z + dz); p.material = mMarco; p.isPickable = false;
      };
      poste(-1.25); poste(1.25);
      const din = B.MeshBuilder.CreateBox("dintel", { width: 0.7, height: 0.5, depth: 3.1 }, scene);
      din.position.set(x, 3.55, z); din.material = mMarco; din.isPickable = false;
      const portal = B.MeshBuilder.CreatePlane("portal", { width: 2.0, height: 3.2,
        sideOrientation: B.Mesh.DOUBLESIDE }, scene);
      portal.rotation.y = Math.PI / 2; portal.position.set(x + 0.02, 1.6, z); portal.isPickable = false;
      const mP = mat("mPortal" + i, "#120a1e", { emissiveColor: new B.Color3(0.15, 0.05, 0.25) });
      portal.material = mP;
      // antorchas
      [-1.25, 1.25].forEach(dz => {
        const fuego = B.MeshBuilder.CreateSphere("fuego", { diameter: 0.25, segments: 6 }, scene);
        fuego.position.set(x + 0.4, 3.0, z + dz); fuego.isPickable = false;
        fuego.material = mat("mFuego", "#ffb030", { emissiveColor: new B.Color3(1, 0.55, 0.1), disableLighting: true });
      });
      return { x: CFG.xPuertas + 0.8, z, mat: mP, brillo: 0 };
    });

    // ---------- Meta: franja a cuadros + banderas ----------
    const meta = B.MeshBuilder.CreateGround("meta", { width: 0.8, height: 30 }, scene);
    meta.position.set(CFG.xMeta, 0.02, 0); meta.isPickable = false;
    const txMeta = texturaCanvas(scene, B, "txMeta", 32, 512, (ctx, w, h) => {
      const s = 16;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
        ctx.fillStyle = ((x + y) / s) % 2 ? "#ffffff" : "#d01818";
        ctx.fillRect(x, y, s, s);
      }
    });
    const metaMat = mat("metaMat", "#ffffff", { diffuseTexture: txMeta, emissiveColor: new B.Color3(0.25, 0, 0) });
    meta.material = metaMat;
    const mMastil = mat("mMastil", "#dddddd");
    const mBandera = mat("mBandera", "#e02020", { backFaceCulling: false });
    [-14.3, 14.3].forEach(z => {
      const m = B.MeshBuilder.CreateCylinder("mastil", { height: 4, diameter: 0.12 }, scene);
      m.position.set(CFG.xMeta, 2, z); m.material = mMastil; m.isPickable = false;
      const b = B.MeshBuilder.CreatePlane("bandera", { width: 1.2, height: 0.7 }, scene);
      b.position.set(CFG.xMeta + 0.6, 3.6, z); b.material = mBandera; b.isPickable = false;
    });

    // ---------- Árboles y rocas fuera de la arena ----------
    const mTronco = mat("mTronco", "#6b4a2b"), mHoja = mat("mHoja", "#2f7a3a"), mHoja2 = mat("mHoja2", "#3d8f45");
    const tronco = B.MeshBuilder.CreateCylinder("tronco", { height: 1.6, diameterTop: 0.35, diameterBottom: 0.5, tessellation: 6 }, scene);
    const copa1 = B.MeshBuilder.CreateCylinder("copa1", { height: 2.6, diameterTop: 0, diameterBottom: 2.6, tessellation: 7 }, scene);
    const copa2 = B.MeshBuilder.CreateCylinder("copa2", { height: 2.0, diameterTop: 0, diameterBottom: 2.0, tessellation: 7 }, scene);
    tronco.material = mTronco; copa1.material = mHoja; copa2.material = mHoja2;
    const mRoca = mat("mRoca", "#8d8f96");
    const roca = B.MeshBuilder.CreateSphere("roca", { diameter: 1, segments: 4 }, scene);
    roca.material = mRoca;
    for (const base of [tronco, copa1, copa2, roca]) { base.isVisible = false; base.isPickable = false; }

    let puestos = 0;
    while (puestos < 55) {
      const x = (r() * 2 - 1) * 60, z = (r() * 2 - 1) * 60;
      if (Math.abs(x) < 19 && Math.abs(z) < 19) continue;          // fuera de la arena
      if (z < -16 && Math.abs(x) < 30 && z > -32) continue;         // no tapar la cámara
      const s = 0.8 + r() * 0.8;
      const t = tronco.createInstance("t"); t.position.set(x, 0.8 * s, z); t.scaling.setAll(s);
      const c1 = copa1.createInstance("c1"); c1.position.set(x, 2.6 * s, z); c1.scaling.setAll(s);
      const c2 = copa2.createInstance("c2"); c2.position.set(x, 3.7 * s, z); c2.scaling.setAll(s);
      [t, c1, c2].forEach(m => m.isPickable = false);
      puestos++;
    }
    for (let i = 0; i < 30; i++) {
      const x = (r() * 2 - 1) * 45, z = (r() * 2 - 1) * 45;
      if (Math.abs(x) < 17 && Math.abs(z) < 17) continue;
      const k = roca.createInstance("r"); k.isPickable = false;
      k.position.set(x, 0.1, z); k.scaling.set(0.6 + r() * 1.4, 0.4 + r() * 0.7, 0.6 + r() * 1.4);
      k.rotation.y = r() * 6;
    }

    // ---------- API para el juego ----------
    const base = new B.Color3(0.15, 0.05, 0.25), luz = new B.Color3(0.9, 0.4, 1);
    return {
      puertas,
      metaMat,
      brillarPuerta(i) { puertas[i].brillo = 1; },
      actualizar(dt) {
        for (const p of puertas) {
          if (p.brillo <= 0) continue;
          p.brillo = Math.max(0, p.brillo - dt * 2.5);
          p.mat.emissiveColor = B.Color3.Lerp(base, luz, p.brillo);
        }
      }
    };
  }

  return { CFG, crear };
})();
