// gameover.js — Muestra una animación GIF (una sola vez) al perder, antes del cartel "¡Fin del juego!".
// Pon los archivos en la MISMA carpeta que index.html y agrégalos a la lista.
(() => {
  const ANIMACIONES = [
    // archivo                          ms = duración si no se puede leer del GIF
    { src: "princesa_gameover.gif",       ms: 3000 },
    { src: "princesa_gameover.gif", ms: 3000 }   // también sirve una imagen fija
  ];
  const ELEGIR = "azar";      // "azar" = una distinta cada vez · "orden" = una tras otra
  const SALTAR_CON_TOQUE = true;

  // Overlay a pantalla completa
  const capa = document.createElement("div");
  capa.id = "gameoverAnim";
  capa.innerHTML = '<img alt="">';
  Object.assign(capa.style, {
    position: "fixed", inset: "0", display: "none", zIndex: "50",
    background: "rgba(0,0,0,.85)", alignItems: "center", justifyContent: "center",
    opacity: "0", transition: "opacity .3s"
  });
  const img = capa.querySelector("img");
  Object.assign(img.style, {
    maxWidth: "92vw", maxHeight: "86vh", imageRendering: "pixelated",
    borderRadius: "10px", boxShadow: "0 0 30px rgba(0,0,0,.8)"
  });
  document.body.appendChild(capa);

  // Lee la duración real de UNA vuelta del GIF sumando los retardos de cada cuadro
  async function duracionGif(src) {
    try {
      const buf = new Uint8Array(await (await fetch(src, { cache: "no-store" })).arrayBuffer());
      if (String.fromCharCode(...buf.slice(0, 3)) !== "GIF") return null;
      let ms = 0;
      for (let i = 13 + ((buf[10] & 0x80) ? 3 * (1 << ((buf[10] & 7) + 1)) : 0); i < buf.length - 5; i++) {
        if (buf[i] === 0x21 && buf[i + 1] === 0xF9 && buf[i + 2] === 4) {   // Graphic Control Extension
          const d = (buf[i + 4] | (buf[i + 5] << 8)) * 10;
          ms += d < 20 ? 100 : d;                                          // navegadores: <20 ms ≈ 100 ms
          i += 7;
        }
      }
      return ms || null;
    } catch { return null; }   // con file:// puede fallar: se usa "ms" de la lista
  }

  let indice = 0, mostrando = false, timer = null;
  const fin = document.getElementById("fin");

  function elegir() {
    const a = ELEGIR === "orden" ? ANIMACIONES[indice++ % ANIMACIONES.length]
                                 : ANIMACIONES[Math.floor(Math.random() * ANIMACIONES.length)];
    return a;
  }

  function terminar() {
    if (!mostrando) return;
    mostrando = false; clearTimeout(timer);
    capa.style.opacity = "0";
    setTimeout(() => { capa.style.display = "none"; img.removeAttribute("src"); }, 300);
    fin.style.visibility = "visible";
  }

  async function reproducir() {
    if (mostrando || !ANIMACIONES.length) return;
    mostrando = true;
    fin.style.visibility = "hidden";                    // el cartel espera a que termine la animación
    const a = elegir();
    const esGif = /\.gif$/i.test(a.src);
    const ms = (esGif && await duracionGif(a.src)) || a.ms;
    img.onerror = terminar;                             // si falta el archivo, se salta
    img.onload = () => {
      capa.style.display = "flex";
      requestAnimationFrame(() => { capa.style.opacity = "1"; });
      clearTimeout(timer);
      timer = setTimeout(terminar, ms);
    };
    img.src = a.src + "?t=" + Date.now();               // fuerza a que el GIF parta desde el primer cuadro
  }

  if (SALTAR_CON_TOQUE) capa.addEventListener("pointerdown", e => { e.stopPropagation(); terminar(); });

  // Detecta cuándo el juego muestra el cartel de fin (sin tocar la lógica de index.html)
  // (solo reacciona al CAMBIO de display, no a los cambios de visibility que hace este archivo)
  let antes = fin.style.display === "block";
  new MutationObserver(() => {
    const ahora = fin.style.display === "block";
    if (ahora === antes) return;
    antes = ahora;
    if (ahora) reproducir();
    else if (mostrando) terminar();                     // "Jugar de nuevo" mientras se ve la animación
  }).observe(fin, { attributes: true, attributeFilter: ["style"] });
})();
