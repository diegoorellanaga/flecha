// poderes.js — Súper poderes temporales y poder permanente de los jefes.
// Solo afecta al jugador (flechas, carga, puntos, cámara lenta). No usa la semilla.
window.PODERES = (() => {
  const DURACION = 5;   // segundos por cada ragdoll eliminado (se acumulan)

  // Un poder por tipo de ragdoll. "max" = tope de acumulaciones que cuentan.
  const DEF = {
    normal:   { id: "multi",   icono: "🏹", nombre: "Multiflecha",  desc: "+1 flecha por disparo", max: 4 },
    veloz:    { id: "rapida",  icono: "⚡", nombre: "Carga rápida", desc: "tensas el arco más rápido", max: 4 },
    dorado:   { id: "x2",      icono: "💰", nombre: "Puntos extra", desc: "multiplica los puntos", max: 4 },
    tanque:   { id: "perfora", icono: "🗡️", nombre: "Perforante",   desc: "la flecha atraviesa ragdolls", max: 4 },
    mitosis:  { id: "explo",   icono: "💥", nombre: "Explosiva",    desc: "la flecha explota al impactar", max: 4 },
    ninja:    { id: "lenta",   icono: "🐢", nombre: "Cámara lenta", desc: "los ragdolls van más lento", max: 3 },
    fantasma: { id: "guia",    icono: "👻", nombre: "Teledirigida", desc: "la flecha persigue ragdolls", max: 4 },
    mini:     { id: "recta",   icono: "🎯", nombre: "Tiro recto",   desc: "sin gravedad ni viento", max: 1 },
    jefe:     null   // el jefe da el poder permanente (ver jefeDerrotado)
  };

  let activos = {};        // id -> [segundos restantes de cada acumulación]
  let nivelTitan = 0;      // poder permanente: sube con cada jefe derrotado
  const hudEl = () => document.getElementById("poderes");

  const acum = id => Math.min((activos[id] || []).length, (Object.values(DEF).find(d => d && d.id === id) || {}).max || 9);

  function reset() { activos = {}; nivelTitan = 0; dibujar(); }

  function otorgar(tipo) {
    const d = DEF[tipo];
    if (!d) return null;
    (activos[d.id] ||= []).push(DURACION);
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
    if (cambio || Math.floor(performance.now() / 250) !== actualizar._t) { actualizar._t = Math.floor(performance.now() / 250); dibujar(); }
  }

  function dibujar() {
    const el = hudEl(); if (!el) return;
    const chips = [];
    if (nivelTitan > 0)
      chips.push(`<div class="chip titan">👑 Flecha del Titán <b>Nv ${nivelTitan}</b><small>con tensión máxima</small></div>`);
    for (const d of Object.values(DEF)) {
      if (!d || !(activos[d.id] || []).length) continue;
      const n = activos[d.id].length, resto = Math.max(...activos[d.id]);
      chips.push(`<div class="chip">${d.icono} ${d.nombre}${n > 1 ? ` <b>x${n}</b>` : ""}<small>${resto.toFixed(1)} s</small></div>`);
    }
    el.innerHTML = chips.join("");
    el.style.display = chips.length ? "flex" : "none";
  }

  // ---- Lo que el juego consulta ----
  // Modificadores del disparo. tensionMax = se soltó con potencia 100.
  function modDisparo(tensionMax) {
    const m = {
      flechas: 1 + acum("multi"),
      perfora: acum("perfora") * 2,                      // ragdolls que puede atravesar
      explosion: acum("explo") ? 1.6 + 0.8 * acum("explo") : 0,   // radio
      guia: acum("guia") * 2.5,                          // fuerza de giro hacia el objetivo
      recta: acum("recta") > 0,
      titan: false
    };
    if (tensionMax && nivelTitan > 0) {                  // poder permanente de los jefes
      m.titan = true;
      m.explosion = Math.max(m.explosion, 2 + nivelTitan);
      m.perfora += nivelTitan;
      m.flechas += nivelTitan - 1;
    }
    return m;
  }
  const factorCarga = () => 1 + 0.6 * acum("rapida");        // velocidad de tensado
  const factorRagdolls = () => 1 / (1 + acum("lenta"));       // 1, 0.5, 0.33, 0.25
  const multPuntos = () => 1 + acum("x2");                    // x1, x2, x3...
  const info = tipo => DEF[tipo];

  return { DURACION, reset, otorgar, jefeDerrotado, actualizar, modDisparo,
           factorCarga, factorRagdolls, multPuntos, info, get nivelTitan() { return nivelTitan; } };
})();
