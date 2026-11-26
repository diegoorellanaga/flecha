// poderes.js — Súper poderes temporales y poder permanente de los jefes.
window.PODERES = (() => {
  const DURACION = 5;        // segundos por cada ragdoll eliminado (se acumulan)
  const MAX_FLECHAS = 7;     // tope total de flechas por disparo

  // Un poder por tipo. cantidad = cuántas acumulaciones da cada eliminación. max = tope que cuenta.
  const DEF = {
    normal:   { id: "multi",   icono: "🏹", nombre: "Multiflecha",  desc: "+1 flecha por disparo", cantidad: 1, max: MAX_FLECHAS - 1 },
    dorado:   { id: "multi",   icono: "🏹", nombre: "Multiflecha",  desc: "+2 flechas por disparo", cantidad: 2, max: MAX_FLECHAS - 1 },
    veloz:    { id: "rapida",  icono: "⚡", nombre: "Carga rápida", desc: "tensas el arco más rápido", cantidad: 1, max: 4 },
    tanque:   { id: "perfora", icono: "🗡️", nombre: "Perforante",   desc: "la flecha atraviesa ragdolls", cantidad: 1, max: 4 },
    mitosis:  { id: "explo",   icono: "💥", nombre: "Explosiva",    desc: "la flecha explota al impactar", cantidad: 1, max: 4 },
    ninja:    { id: "lenta",   icono: "🐢", nombre: "Cámara lenta", desc: "los ragdolls van más lento", cantidad: 1, max: 3 },
    fantasma: { id: "guia",    icono: "👻", nombre: "Teledirigida", desc: "la flecha persigue ragdolls", cantidad: 1, max: 4 },
    mini:     { id: "recta",   icono: "🎯", nombre: "Tiro recto",   desc: "sin gravedad ni viento", cantidad: 1, max: 1 },
    jefe:     null
  };
  const PODER = {};   // id -> definición (para HUD y topes)
  for (const d of Object.values(DEF)) if (d && !PODER[d.id]) PODER[d.id] = d;

  let activos = {};
  let nivelTitan = 0;
  let tDibujo = -1;

  const acum = id => Math.min((activos[id] || []).length, PODER[id] ? PODER[id].max : 9);

  function reset() { activos = {}; nivelTitan = 0; dibujar(); }

  function otorgar(tipo) {
    const d = DEF[tipo];
    if (!d) return null;
    for (let i = 0; i < d.cantidad; i++) (activos[d.id] ||= []).push(DURACION);
    dibujar();
    return d;
  }

  function jefeDerrotado() { nivelTitan++; dibujar(); return nivelTitan; }

  function actualizar(dt) {
    let cambio = false;
    for (const k in activos) {
      const antes = activos[k].length;
      activos[k] = activos[k].map(t => t - dt).filter(t => t > 0);
      if (activos[k].length !== antes) cambio = true;
    }
    const t = Math.floor(performance.now() / 250);
    if (cambio || t !== tDibujo) { tDibujo = t; dibujar(); }
  }

  function dibujar() {
    const el = document.getElementById("poderes"); if (!el) return;
    const chips = [];
    if (nivelTitan > 0)
      chips.push(`<div class="chip titan">👑 Flecha del Titán <b>Nv ${nivelTitan}</b><small>con tensión máxima</small></div>`);
    for (const [id, d] of Object.entries(PODER)) {
      const lista = activos[id] || [];
      if (!lista.length) continue;
      const n = acum(id), resto = Math.max(...lista);
      const etiqueta = id === "multi" ? ` <b>${1 + n} flechas</b>` : (n > 1 ? ` <b>x${n}</b>` : "");
      chips.push(`<div class="chip">${d.icono} ${d.nombre}${etiqueta}<small>${resto.toFixed(1)} s</small></div>`);
    }
    el.innerHTML = chips.join("");
    el.style.display = chips.length ? "flex" : "none";
  }

  function modDisparo(tensionMax) {
    const m = {
      flechas: 1 + acum("multi"),
      perfora: acum("perfora") * 2,
      explosion: acum("explo") ? 1.6 + 0.8 * acum("explo") : 0,
      guia: acum("guia") * 2.5,
      recta: acum("recta") > 0,
      titan: false
    };
    if (tensionMax && nivelTitan > 0) {
      m.titan = true;
      m.explosion = Math.max(m.explosion, 2 + nivelTitan);
      m.perfora += nivelTitan;
      m.flechas += nivelTitan - 1;
    }
    m.flechas = Math.min(MAX_FLECHAS, m.flechas);
    return m;
  }
  const factorCarga = () => 1 + 0.6 * acum("rapida");
  const factorRagdolls = () => 1 / (1 + acum("lenta"));
  const multPuntos = () => 1;     // (el dorado ahora da flechas; sus 10 puntos se mantienen)
  const info = tipo => DEF[tipo];

  return { DURACION, MAX_FLECHAS, reset, otorgar, jefeDerrotado, actualizar, modDisparo,
           factorCarga, factorRagdolls, multPuntos, info, get nivelTitan() { return nivelTitan; } };
})();
