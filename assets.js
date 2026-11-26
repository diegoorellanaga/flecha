// assets.js — Mapa y decoración de "Resiste a los ragdolls".
// Solo visual (más la princesa Antonita, que reacciona a los flechazos).
// RNG propio con semilla fija: el mapa es igual para todos.
window.MAPA = (() => {
  const CFG = {
    puertasZ: [-9, -3, 3, 9],
    xPuertas: -15,
    xMeta: 13.5,
    cielo: "#8cc8f5",
    castillo: { x: 21, z: 0 },
    princesa: { dz: -2.65, escala: 1.35 }  // sobre la muralla (entre dos almenas), a un lado del portón
  };

  function rng(seed) {
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
    const fijo = m => { m.isPickable = false; m.freezeWorldMatrix(); return m; };
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
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = r() < 0.5 ? "rgba(40,80,30,.25)" : "rgba(150,200,110,.2)";
        ctx.fillRect(r() * w, r() * h, 2, 3);
      }
    });
    if (suelo) suelo.material = mat("mPasto", "#ffffff", { diffuseTexture: txPasto });

    const exterior = B.MeshBuilder.CreateGround("exterior", { width: 300, height: 300 }, scene);
    exterior.position.y = -0.05; exterior.isPickable = false;
    exterior.material = mat("mExterior", "#4f8a3c");

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
    ["pared0", "pared2", "pared3"].forEach(nm => { const p = scene.getMeshByName(nm); if (p) p.material = mPiedra; });

    const frente = scene.getMeshByName("pared1");
    if (frente) {
      if (frente.physicsBody) { frente.physicsBody.shape?.dispose(); frente.physicsBody.dispose(); }
      frente.dispose();
    }
    const borde = B.MeshBuilder.CreateBox("bordeFrente", { width: 30.5, height: 0.35, depth: 0.4 }, scene);
    borde.position.set(0, 0.17, -15.1); borde.material = mPiedra; fijo(borde);

    // ---------- Puertas ----------
    const mMarco = mat("mMarco", "#5a4632");
    const puertas = CFG.puertasZ.map((z, i) => {
      const x = CFG.xPuertas + 0.3;
      const poste = dz => {
        const p = B.MeshBuilder.CreateBox("poste", { width: 0.6, height: 3.4, depth: 0.5 }, scene);
        p.position.set(x, 1.7, z + dz); p.material = mMarco; fijo(p);
      };
      poste(-1.25); poste(1.25);
      const din = B.MeshBuilder.CreateBox("dintel", { width: 0.7, height: 0.5, depth: 3.1 }, scene);
      din.position.set(x, 3.55, z); din.material = mMarco; fijo(din);
      const portal = B.MeshBuilder.CreatePlane("portal", { width: 2.0, height: 3.2,
        sideOrientation: B.Mesh.DOUBLESIDE }, scene);
      portal.rotation.y = Math.PI / 2; portal.position.set(x + 0.02, 1.6, z); portal.isPickable = false;
      const mP = mat("mPortal" + i, "#120a1e", { emissiveColor: new B.Color3(0.15, 0.05, 0.25) });
      portal.material = mP;
      [-1.25, 1.25].forEach(dz => {
        const fuego = B.MeshBuilder.CreateSphere("fuego", { diameter: 0.25, segments: 6 }, scene);
        fuego.position.set(x + 0.4, 3.0, z + dz); fijo(fuego);
        fuego.material = mat("mFuego", "#ffb030", { emissiveColor: new B.Color3(1, 0.55, 0.1), disableLighting: true });
      });
      return { x: CFG.xPuertas + 0.8, z, mat: mP, brillo: 0 };
    });

    // ---------- Meta ----------
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
      m.position.set(CFG.xMeta, 2, z); m.material = mMastil; fijo(m);
      const b = B.MeshBuilder.CreatePlane("bandera", { width: 1.2, height: 0.7 }, scene);
      b.position.set(CFG.xMeta + 0.6, 3.6, z); b.material = mBandera; fijo(b);
    });

    // ---------- Castillo + princesa ----------
    crearCastillo(scene, B, mat, fijo, mPiedra, CFG.castillo.x, CFG.castillo.z);
    const antonita = crearPrincesa(scene, B, mat, texturaCanvas,
      V(CFG.castillo.x - 2.5, 5.0, CFG.castillo.z + CFG.princesa.dz), CFG.princesa.escala);

    // ---------- Árboles y rocas ----------
    const mTronco = mat("mTronco", "#6b4a2b"), mHoja = mat("mHoja", "#2f7a3a"), mHoja2 = mat("mHoja2", "#3d8f45");
    const tronco = B.MeshBuilder.CreateCylinder("tronco", { height: 1.6, diameterTop: 0.35, diameterBottom: 0.5, tessellation: 6 }, scene);
    const copa1 = B.MeshBuilder.CreateCylinder("copa1", { height: 2.6, diameterTop: 0, diameterBottom: 2.6, tessellation: 7 }, scene);
    const copa2 = B.MeshBuilder.CreateCylinder("copa2", { height: 2.0, diameterTop: 0, diameterBottom: 2.0, tessellation: 7 }, scene);
    tronco.material = mTronco; copa1.material = mHoja; copa2.material = mHoja2;
    const roca = B.MeshBuilder.CreateSphere("roca", { diameter: 1, segments: 4 }, scene);
    roca.material = mat("mRoca", "#8d8f96");
    for (const base of [tronco, copa1, copa2, roca]) { base.isVisible = false; base.isPickable = false; }

    const libre = (x, z, margen) =>
      (Math.abs(x) < 17 + margen && Math.abs(z) < 17 + margen) ||
      (z < -16 && Math.abs(x) < 30 && z > -34) ||
      (x > 15 && x < 31 && Math.abs(z) < 15);
    let puestos = 0, intentos = 0;
    while (puestos < 55 && intentos++ < 2000) {
      const x = (r() * 2 - 1) * 60, z = (r() * 2 - 1) * 60;
      if (libre(x, z, 2)) continue;
      const s = 0.8 + r() * 0.8;
      const t = tronco.createInstance("t"); t.position.set(x, 0.8 * s, z); t.scaling.setAll(s);
      const c1 = copa1.createInstance("c1"); c1.position.set(x, 2.6 * s, z); c1.scaling.setAll(s);
      const c2 = copa2.createInstance("c2"); c2.position.set(x, 3.7 * s, z); c2.scaling.setAll(s);
      [t, c1, c2].forEach(m => m.isPickable = false);
      puestos++;
    }
    for (let i = 0; i < 30; i++) {
      const x = (r() * 2 - 1) * 45, z = (r() * 2 - 1) * 45;
      if (libre(x, z, 0)) continue;
      const k = roca.createInstance("r"); k.isPickable = false;
      k.position.set(x, 0.1, z); k.scaling.set(0.6 + r() * 1.4, 0.4 + r() * 0.7, 0.6 + r() * 1.4);
      k.rotation.y = r() * 6;
    }

    // ---------- API para el juego ----------
    const base = new B.Color3(0.15, 0.05, 0.25), luz = new B.Color3(0.9, 0.4, 1);
    return {
      puertas,
      metaMat,
      antonita,
      brillarPuerta(i) { puertas[i].brillo = 1; },
      actualizar(dt) {
        for (const p of puertas) {
          if (p.brillo <= 0) continue;
          p.brillo = Math.max(0, p.brillo - dt * 2.5);
          p.mat.emissiveColor = B.Color3.Lerp(base, luz, p.brillo);
        }
        antonita.actualizar(dt);
      }
    };
  }

  // Torre principal + 2 torres laterales + muralla almenada + portón. Todo decorativo (sin física).
  function crearCastillo(scene, B, mat, fijo, mPiedra, cx, cz) {
    const mTecho = mat("mTecho", "#9c2a22");
    const mOscuro = mat("mPorton", "#2a1c12");
    const mVentana = mat("mVentana", "#ffd27a", { emissiveColor: new B.Color3(0.8, 0.55, 0.2) });
    const mBanderaC = mat("mBanderaC", "#1f4fbf", { backFaceCulling: false });

    const almenas = (x, y, z, radio, n, alto = 0.7) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const b = B.MeshBuilder.CreateBox("almena", { width: 0.6, height: alto, depth: 0.6 }, scene);
        b.position.set(x + Math.cos(a) * radio, y + alto / 2, z + Math.sin(a) * radio);
        b.rotation.y = -a; b.material = mPiedra; fijo(b);
      }
    };
    const torre = (x, z, radio, alto, techo = true) => {
      const t = B.MeshBuilder.CreateCylinder("torre", { height: alto, diameter: radio * 2, tessellation: 16 }, scene);
      t.position.set(x, alto / 2, z); t.material = mPiedra; fijo(t);
      const anillo = B.MeshBuilder.CreateCylinder("anillo", { height: 0.4, diameter: radio * 2 + 0.5, tessellation: 16 }, scene);
      anillo.position.set(x, alto + 0.2, z); anillo.material = mPiedra; fijo(anillo);
      almenas(x, alto + 0.4, z, radio + 0.1, Math.round(radio * 4));
      for (let h = 2.5; h < alto - 1; h += 2.5) {
        const v = B.MeshBuilder.CreatePlane("ventana", { width: 0.45, height: 0.8 }, scene);
        v.position.set(x - radio - 0.01, h, z); v.rotation.y = Math.PI / 2; v.material = mVentana; fijo(v);
      }
      if (techo) {
        const c = B.MeshBuilder.CreateCylinder("techo", { height: radio * 1.8, diameterTop: 0, diameterBottom: radio * 2 + 0.7, tessellation: 16 }, scene);
        c.position.set(x, alto + 0.4 + radio * 0.9 + 0.35, z); c.material = mTecho; fijo(c);
        return alto + 0.75 + radio * 1.8;
      }
      return alto + 1.1;
    };

    const largo = 16;
    const muro = B.MeshBuilder.CreateBox("muralla", { width: 1.2, height: 5, depth: largo }, scene);
    muro.position.set(cx - 2.5, 2.5, cz); muro.material = mPiedra; fijo(muro);
    for (let z = -largo / 2 + 0.4; z <= largo / 2 - 0.4; z += 1.1) {
      const b = B.MeshBuilder.CreateBox("almenaMuro", { width: 1.3, height: 0.7, depth: 0.55 }, scene);
      b.position.set(cx - 2.5, 5.35, cz + z); b.material = mPiedra; fijo(b);
    }
    const porton = B.MeshBuilder.CreatePlane("porton", { width: 2.6, height: 3.2 }, scene);
    porton.position.set(cx - 3.11, 1.6, cz); porton.rotation.y = Math.PI / 2; porton.material = mOscuro; fijo(porton);
    const arco = B.MeshBuilder.CreateCylinder("arco", { height: 0.05, diameter: 2.6, tessellation: 16, arc: 0.5 }, scene);
    arco.position.set(cx - 3.12, 3.2, cz); arco.rotation.set(0, 0, Math.PI / 2); arco.material = mOscuro; fijo(arco);

    torre(cx - 2.5, cz - largo / 2, 1.6, 7);
    torre(cx - 2.5, cz + largo / 2, 1.6, 7);
    const cima = torre(cx + 1.5, cz, 2.6, 12);

    const mastil = B.MeshBuilder.CreateCylinder("mastilC", { height: 2.5, diameter: 0.1 }, scene);
    mastil.position.set(cx + 1.5, cima + 1.2, cz); mastil.material = mat("mMastilC", "#dddddd"); fijo(mastil);
    const bandera = B.MeshBuilder.CreatePlane("banderaC", { width: 1.6, height: 0.9 }, scene);
    bandera.position.set(cx + 1.5 - 0.8, cima + 2, cz); bandera.material = mBanderaC; fijo(bandera);
  }

  // ---------- Princesa Antonita ----------
  // Mira hacia la arena (-x). Pide ayuda agitando los brazos; si le llega una flecha dice "Nuuuu".
  function crearPrincesa(scene, B, mat, texturaCanvas, pos, esc) {
    const raiz = new B.TransformNode("antonita", scene);
    raiz.position.copyFrom(pos);
    raiz.scaling.setAll(esc);
    const pieza = (m, x, y, z, material) => {
      m.parent = raiz; m.position.set(x, y, z); m.material = material; m.isPickable = false; return m;
    };
    const mVestido = mat("mVestido", "#ff7eb9"), mVestido2 = mat("mVestido2", "#ffb3d6");
    const mPiel = mat("mPielP", "#f6cfa8"), mPelo = mat("mPelo", "#ffd84a");
    const mOro = mat("mOro", "#ffc81e", { emissiveColor: new B.Color3(0.35, 0.25, 0) });
    const mOjo = mat("mOjo", "#222222"), mBoca = mat("mBoca", "#d04060");
    const MB = B.MeshBuilder;

    // Vestido acampanado + volado
    pieza(MB.CreateCylinder("falda", { height: 0.9, diameterTop: 0.34, diameterBottom: 0.95, tessellation: 16 }, scene), 0, 0.45, 0, mVestido);
    pieza(MB.CreateTorus("volado", { diameter: 0.9, thickness: 0.08, tessellation: 16 }, scene), 0, 0.05, 0, mVestido2);
    pieza(MB.CreateCylinder("cintura", { height: 0.06, diameter: 0.36 }, scene), 0, 0.88, 0, mOro);
    pieza(MB.CreateCylinder("torsoP", { height: 0.42, diameterTop: 0.3, diameterBottom: 0.26 }, scene), 0, 1.1, 0, mVestido2);
    // Cabeza, pelo largo, corona
    pieza(MB.CreateSphere("cabezaP", { diameter: 0.34, segments: 12 }, scene), 0, 1.5, 0, mPiel);
    pieza(MB.CreateSphere("peloP", { diameter: 0.38, segments: 12 }, scene), 0.05, 1.54, 0, mPelo);
    pieza(MB.CreateBox("melena", { width: 0.12, height: 0.5, depth: 0.34 }, scene), 0.14, 1.3, 0, mPelo);
    pieza(MB.CreateCylinder("corona", { height: 0.1, diameterTop: 0.24, diameterBottom: 0.18, tessellation: 8 }, scene), 0, 1.72, 0, mOro);
    [-0.07, 0, 0.07].forEach(z => pieza(MB.CreateCylinder("pico", { height: 0.08, diameterTop: 0, diameterBottom: 0.05, tessellation: 4 }, scene), 0, 1.8, z, mOro));
    // Cara (mirando a -x)
    [-0.06, 0.06].forEach(z => pieza(MB.CreateSphere("ojo", { diameter: 0.04, segments: 4 }, scene), -0.16, 1.53, z, mOjo));
    const boca = pieza(MB.CreateSphere("boca", { diameter: 0.05, segments: 4 }, scene), -0.165, 1.44, 0, mBoca);

    // Brazos con pivote en el hombro
    const brazo = lado => {
      const piv = new B.TransformNode("hombro", scene);
      piv.parent = raiz; piv.position.set(0, 1.27, lado * 0.17);
      const b = MB.CreateCylinder("brazoP", { height: 0.42, diameter: 0.08 }, scene);
      b.parent = piv; b.position.y = -0.21; b.material = mPiel; b.isPickable = false;
      const mano = MB.CreateSphere("mano", { diameter: 0.1, segments: 4 }, scene);
      mano.parent = piv; mano.position.y = -0.43; mano.material = mPiel; mano.isPickable = false;
      return piv;
    };
    const bIzq = brazo(1), bDer = brazo(-1);

    // Globo de texto (billboard) con dos versiones: "Help!" y "Nuuuu"
    const globoTx = (nombre, texto, color) => texturaCanvas(scene, B, nombre, 512, 300, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#333"; ctx.lineWidth = 8;
      const rr = 60, x0 = 12, y0 = 12, x1 = w - 12, y1 = h - 80;
      ctx.beginPath();
      ctx.moveTo(x0 + rr, y0); ctx.lineTo(x1 - rr, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + rr);
      ctx.lineTo(x1, y1 - rr); ctx.quadraticCurveTo(x1, y1, x1 - rr, y1);
      ctx.lineTo(w / 2 + 40, y1); ctx.lineTo(w / 2, h - 14); ctx.lineTo(w / 2 - 20, y1);   // colita
      ctx.lineTo(x0 + rr, y1); ctx.quadraticCurveTo(x0, y1, x0, y1 - rr);
      ctx.lineTo(x0, y0 + rr); ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = color; ctx.font = "bold 110px Comic Sans MS, system-ui, sans-serif";
      ctx.fillText(texto, w / 2, 105);
      ctx.fillStyle = "#c0407a"; ctx.font = "bold 40px system-ui, sans-serif";
      ctx.fillText("👑 Antonita", w / 2, 180);
    });
    const txHelp = globoTx("txHelp", "Help!", "#1a1a1a");
    const txNuu = globoTx("txNuu", "Nuuuu", "#d01818");
    [txHelp, txNuu].forEach(t => { t.hasAlpha = true; });
    const mGlobo = new B.StandardMaterial("mGlobo", scene);
    mGlobo.diffuseTexture = txHelp; mGlobo.emissiveTexture = txHelp;
    mGlobo.useAlphaFromDiffuseTexture = true; mGlobo.disableLighting = true; mGlobo.backFaceCulling = false;
    mGlobo.fogEnabled = false;
    const globo = MB.CreatePlane("globo", { width: 1.7, height: 1.0 }, scene);
    globo.parent = raiz; globo.position.set(0, 2.55, 0); globo.material = mGlobo;
    globo.billboardMode = B.Mesh.BILLBOARDMODE_ALL; globo.isPickable = false;

    // Colisionador invisible para detectar flechazos (estático: la flecha se queda clavada en ella)
    const caja = MB.CreateBox("antonitaHit", { width: 0.9 * esc, height: 1.9 * esc, depth: 0.9 * esc }, scene);
    caja.position.set(pos.x, pos.y + 0.95 * esc, pos.z); caja.isVisible = false; caja.isPickable = false;
    const agg = new B.PhysicsAggregate(caja, B.PhysicsShapeType.BOX, { mass: 0 }, scene);

    let t = 0, nuu = 0, ultimo = -1;
    function golpe() {
      if (t - ultimo < 0.25) return;            // evita repetir por el mismo impacto
      ultimo = t; nuu = 1.8;
      mGlobo.diffuseTexture = txNuu; mGlobo.emissiveTexture = txNuu;
    }
    const plugin = scene.getPhysicsEngine && scene.getPhysicsEngine()?.getPhysicsPlugin();
    const esMio = ev => ev.collider === agg.body || ev.collidedAgainst === agg.body;
    if (plugin && plugin.onCollisionObservable) plugin.onCollisionObservable.add(ev => { if (esMio(ev)) golpe(); });
    else { agg.body.setCollisionCallbackEnabled(true); agg.body.getCollisionObservable().add(golpe); }

    function actualizar(dt) {
      t += dt;
      if (nuu > 0) {
        // asustada: se encoge, tiembla y se tapa la cara
        nuu -= dt;
        raiz.position.y = pos.y + Math.abs(Math.sin(t * 18)) * 0.05;
        raiz.rotation.y = Math.sin(t * 40) * 0.12;
        bIzq.rotation.x = -2.2; bDer.rotation.x = 2.2;
        bIzq.rotation.z = bDer.rotation.z = 0.9;
        boca.scaling.set(1, 2.2, 1.6);
        globo.scaling.setAll(1.15 + Math.sin(t * 30) * 0.05);
        if (nuu <= 0) { mGlobo.diffuseTexture = txHelp; mGlobo.emissiveTexture = txHelp; }
        return;
      }
      // pidiendo ayuda: saltitos y brazos en alto agitándose
      raiz.position.y = pos.y + Math.abs(Math.sin(t * 4)) * 0.12;
      raiz.rotation.y = Math.sin(t * 1.5) * 0.25;
      raiz.rotation.x = Math.sin(t * 4) * 0.04;
      bIzq.rotation.z = bDer.rotation.z = 0;
      bIzq.rotation.x = -(2.5 + 0.45 * Math.sin(t * 9));
      bDer.rotation.x = 2.5 + 0.45 * Math.sin(t * 9 + Math.PI);
      boca.scaling.set(1, 1 + 0.5 * Math.abs(Math.sin(t * 6)), 1);
      globo.scaling.setAll(1 + Math.sin(t * 3) * 0.04);
    }

    return { actualizar, golpe, raiz };
  }

  return { CFG, crear };
})();
