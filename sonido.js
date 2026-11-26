// sonido.js — Efectos de sonido sintetizados con Web Audio (sin archivos de audio).
window.SONIDO = (() => {
  let ctx = null, master = null, ruido = null, tension = null;
  let mudo = localStorage.getItem("ragdolls_mudo") === "1";

  function iniciar() {                       // los navegadores exigen un gesto del usuario
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = mudo ? 0 : 0.5; master.connect(ctx.destination);
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);   // 1 s de ruido blanco
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  ["pointerdown", "keydown", "touchstart"].forEach(ev => window.addEventListener(ev, iniciar, { passive: true }));

  const listo = () => ctx && master && !mudo;

  // Tono con envolvente: tipo, frecuencia inicial -> final, duración, volumen
  function tono(tipo, f0, f1, dur, vol = 0.3, retraso = 0) {
    if (!listo()) return;
    const t = ctx.currentTime + retraso;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  // Ráfaga de ruido filtrado
  function soplo(dur, filtro, f0, f1, vol = 0.3, retraso = 0) {
    if (!listo()) return;
    const t = ctx.currentTime + retraso;
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const fl = ctx.createBiquadFilter(); fl.type = filtro;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  return {
    // Tensado del arco: zumbido que sube de tono con la carga (k = 0..1)
    tensarInicio() {
      if (!listo() || tension) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = 110; g.gain.value = 0.0001;
      o.connect(g).connect(master); o.start();
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.1);
      tension = { o, g };
    },
    tensar(k) { if (tension) tension.o.frequency.setTargetAtTime(110 + 330 * k, ctx.currentTime, 0.03); },
    tensarFin() {
      if (!tension) return;
      const { o, g } = tension; tension = null;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      o.stop(ctx.currentTime + 0.1);
    },
    disparo(pot = 50, n = 1) {                      // "fiuu"
      const k = pot / 100;
      soplo(0.25 + 0.1 * k, "bandpass", 2500 + 2000 * k, 600, 0.25 + 0.15 * k);
      tono("square", 180, 60, 0.06, 0.08);          // cuerda del arco
      if (n > 1) soplo(0.2, "bandpass", 3500, 900, 0.12, 0.03);
    },
    golpe(fuerte = false) {                         // impacto en ragdoll
      tono("sine", fuerte ? 140 : 220, 50, 0.18, 0.45);
      soplo(0.08, "lowpass", 1500, 200, 0.25);
    },
    metal() { tono("square", 900, 600, 0.12, 0.12); tono("triangle", 1350, 900, 0.2, 0.08); },   // tanque/jefe aguanta
    pared() { tono("triangle", 320, 120, 0.1, 0.25); soplo(0.05, "highpass", 2000, 800, 0.15); },
    explosion() { soplo(0.7, "lowpass", 1200, 60, 0.6); tono("sine", 90, 30, 0.6, 0.5); },
    poder() { [660, 880, 1320].forEach((f, i) => tono("sine", f, f, 0.12, 0.15, i * 0.05)); },
    meta() { tono("sawtooth", 160, 110, 0.3, 0.15); },
    jefe() { tono("sawtooth", 70, 55, 1.2, 0.3); tono("sawtooth", 105, 82, 1.2, 0.18); },
    jefeMuerto() { [523, 659, 784, 1047].forEach((f, i) => tono("triangle", f, f, 0.25, 0.25, i * 0.12)); },
    fin() { [392, 330, 262, 196].forEach((f, i) => tono("triangle", f, f * 0.98, 0.35, 0.25, i * 0.2)); },

    get mudo() { return mudo; },
    alternar() {
      mudo = !mudo; localStorage.setItem("ragdolls_mudo", mudo ? "1" : "0");
      iniciar();
      if (master) master.gain.value = mudo ? 0 : 0.5;
      if (mudo) this.tensarFin();
      return mudo;
    }
  };
})();
