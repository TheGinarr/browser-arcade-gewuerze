/* ============================================================
   GEWÜRZE · game.js – Schieberegal: Reihen und Spalten drehen,
   bis jede Spalte nur noch eine Gewürzsorte enthält.
   Regeln + Löser: ../assets/sortieren/engine.js (schiebe*)
   Levelkarte, Rückgängig, Tipp, Sterne: ../assets/sortieren/rahmen.js
   ============================================================ */
import { sortierspiel } from "./assets/sortieren/rahmen.js";
import { schiebeStart, schiebeZuege, schieben } from "./assets/sortieren/engine.js";
import { GEWUERZE, gewuerzGlas } from "./assets/sortieren/symbole.js";
import { LEVELS } from "./levels.js";

const name = (s) => GEWUERZE[s][1];
const gesperrt = (z, art, i) => (art === "z" ? z.fz : z.fs).includes(i);
const richtung = (art, d) =>
  art === "z" ? (d > 0 ? "rechts" : "links") : d > 0 ? "unten" : "oben";
const linie = (art, i) => (art === "z" ? `Reihe ${i + 1}` : `Spalte ${i + 1} (${name(i)})`);
const spalteFertig = (z, c) => {
  for (let r = 0; r < z.R; r++) if (z.g[r * z.C + c] !== c) return false;
  return true;
};

const api = sortierspiel({
  spiel: "gewuerze",
  name: "Gewürze",
  levels: LEVELS,
  regeln: schiebeZuege,
  start: schiebeStart,
  kapitel: ["Kleines Regal", "Breites Regal", "Vierer-Regal", "Großes Regal", "Meisterregal"],
  migration: { welt: "gewuerz", nurFrei: true },
  markierung: (l) => (l.fz || l.fs ? { zeichen: "🗝", text: "Level mit Schloss" } : null),
  titelZusatz: (l) => ` · ${l.R}×${l.C}${l.fz || l.fs ? " · Schloss" : ""}`,
  siegTitel: "REGAL SORTIERT!",
  tippGewichte: [
    [3, 25000],
    [5, 25000],
  ],
  // Findet der Löser nichts, wenigstens den Zug mit der besten Schätzung vorschlagen
  tippNotfall(z) {
    let best = null,
      bestH = Infinity;
    for (const zug of schiebeZuege.liste(z)) {
      const h = schiebeZuege.schaetzung(schieben(z, zug));
      if (h < bestH) {
        bestH = h;
        best = zug;
      }
    }
    return best;
  },

  einfuehrung(l, ausHilfe) {
    const regeln =
      "Jede Spalte gehört einer Gewürzsorte – das Schild oben zeigt welche. Mit ◀ ▶ schiebst du eine ganze Reihe, mit ▲ ▼ eine ganze Spalte (oder wische über ein Glas). Was auf einer Seite hinausrutscht, kommt auf der anderen wieder herein – wie bei einem Drehregal. Gläser am richtigen Platz leuchten grün.";
    if (ausHilfe)
      return {
        titel: "So geht's",
        text:
          regeln +
          (l.fz || l.fs
            ? " Reihen oder Spalten mit Schloss-Symbol sind festgeschraubt und lassen sich nicht bewegen."
            : ""),
      };
    if (l.n === 1) return { titel: "Willkommen im Gewürzregal!", text: regeln };
    if (l.n === 11)
      return {
        titel: "Neue Sorte: Zimt",
        text: "Das Regal wird breiter: Jetzt gibt es vier Sorten. Tipp: Bring erst eine Reihe ganz in Ordnung und drehe dann die Spalten.",
      };
    if (l.n === 16)
      return {
        titel: "Neu: Schlösser",
        text: "Manche Reihen oder Spalten sind mit einem Schloss festgeschraubt (goldenes Schloss statt Pfeil) – die kannst du nicht schieben. Die Gläser darin bewegen sich nur, wenn du die quer laufenden Linien schiebst.",
      };
    if (l.n === 21)
      return {
        titel: "Vier Reihen",
        text: "Das Regal wächst in die Höhe. Plane voraus: Jede Spaltendrehung verschiebt Gläser in allen Reihen.",
      };
    if (l.n === 31)
      return {
        titel: "Neue Sorte: Lavendel",
        text: "Fünf Spalten, fünf Sorten. Mit Rückgängig (Z) kannst du jederzeit ausprobieren.",
      };
    return null;
  },

  zugText: ([art, i, d]) => `${linie(art, i)} nach ${richtung(art, d)}`,

  nachZug(vorher, nachher, zug, api) {
    if (schiebeZuege.gewonnen(nachher)) return;
    for (let c = 0; c < nachher.C; c++)
      if (spalteFertig(nachher, c) && !spalteFertig(vorher, c)) {
        api.meldung(`Spalte ${name(c)} ist komplett!`);
        api.ansagen(`Spalte ${name(c)} komplett.`);
        return;
      }
  },

  tasten(e, api) {
    const f = e.target.closest?.(".feld[data-i]");
    const zug = {
      ArrowLeft: ["z", -1],
      ArrowRight: ["z", 1],
      ArrowUp: ["s", -1],
      ArrowDown: ["s", 1],
    }[e.key];
    if (!f || !zug) return false;
    e.preventDefault();
    const i = Number(f.dataset.i),
      z = api.zustand;
    versuchen([zug[0], zug[0] === "z" ? Math.floor(i / z.C) : i % z.C, zug[1]]);
    return true;
  },

  zeichnen,
});

/* ---------- Bedienung ---------- */
function versuchen([art, i, d]) {
  if (api.fertig) return;
  if (gesperrt(api.zustand, art, i)) {
    const els = [
      ...api.brett.querySelectorAll(art === "z" ? `.feld[data-r="${i}"]` : `.feld[data-c="${i}"]`),
    ];
    return api.fehler(
      `${art === "z" ? `Reihe ${i + 1}` : `Spalte ${i + 1}`} ist mit einem Schloss festgeschraubt und lässt sich nicht schieben – nimm eine ${art === "z" ? "Spalte" : "Reihe"} quer dazu.`,
      ...els,
    );
  }
  api.ziehen([art, i, d]);
}

api.brett.addEventListener("click", (e) => {
  const p = e.target.closest(".pfeil[data-art]");
  if (p) versuchen([p.dataset.art, Number(p.dataset.n), Number(p.dataset.d)]);
});

// Wischen über ein Glas: waagerecht = Reihe, senkrecht = Spalte
let wisch = null;
api.brett.addEventListener("pointerdown", (e) => {
  const f = e.target.closest(".feld[data-i]");
  if (!f) return;
  wisch = { i: Number(f.dataset.i), x: e.clientX, y: e.clientY };
});
api.brett.addEventListener("pointerup", (e) => {
  if (!wisch) return;
  const { i, x, y } = wisch;
  wisch = null;
  const dx = e.clientX - x,
    dy = e.clientY - y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
  const z = api.zustand;
  if (Math.abs(dx) > Math.abs(dy)) versuchen(["z", Math.floor(i / z.C), dx > 0 ? 1 : -1]);
  else versuchen(["s", i % z.C, dy > 0 ? 1 : -1]);
});
api.brett.addEventListener("pointercancel", () => (wisch = null));

/* ---------- Zeichnen ---------- */
function pfeil(z, art, n, d, tipp) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "pfeil";
  b.dataset.art = art;
  b.dataset.n = n;
  b.dataset.d = d;
  const zu = gesperrt(z, art, n);
  if (zu) b.innerHTML = SCHLOSS;
  else b.textContent = art === "z" ? (d > 0 ? "▶" : "◀") : d > 0 ? "▼" : "▲";
  if (zu) {
    b.classList.add("zu");
    b.setAttribute("aria-disabled", "true");
  }
  if (tipp && tipp[0] === art && tipp[1] === n && tipp[2] === d) b.classList.add("tipp-nach");
  b.setAttribute(
    "aria-label",
    `${linie(art, n)} nach ${richtung(art, d)}${zu ? " – gesperrt" : ""}`,
  );
  return b;
}
const SCHLOSS =
  '<svg viewBox="0 0 16 18" width="16" height="18" aria-hidden="true"><path d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="#c9a227" stroke-width="2"/><rect x="2" y="8" width="12" height="9" rx="2" fill="#c9a227" stroke="#7a5f12"/><circle cx="8" cy="12" r="1.6" fill="#5a420c"/></svg>';
const leer = () => Object.assign(document.createElement("span"), { className: "leer" });

function zeichnen(api, letzterZug) {
  const z = api.zustand;
  const tipp = api.tipp;
  const gitter = document.createElement("div");
  gitter.className = "schiebe";
  gitter.style.setProperty("--c", z.C);
  const teile = [leer()];
  for (let c = 0; c < z.C; c++) {
    const e = document.createElement("span");
    e.className = "etikett";
    e.style.setProperty("--f", GEWUERZE[c][0]);
    e.textContent = name(c);
    if (spalteFertig(z, c)) e.classList.add("komplett");
    teile.push(e);
  }
  teile.push(leer(), leer());
  for (let c = 0; c < z.C; c++) teile.push(pfeil(z, "s", c, -1, tipp));
  teile.push(leer());
  const rein = letzterZug
    ? { z: letzterZug[2] > 0 ? "rein-l" : "rein-r", s: letzterZug[2] > 0 ? "rein-o" : "rein-u" }[
        letzterZug[0]
      ]
    : "";
  for (let r = 0; r < z.R; r++) {
    teile.push(pfeil(z, "z", r, -1, tipp));
    for (let c = 0; c < z.C; c++) {
      const i = r * z.C + c,
        s = z.g[i];
      const f = document.createElement("button");
      f.type = "button";
      f.className = "feld";
      f.dataset.i = i;
      f.dataset.r = r;
      f.dataset.c = c;
      if (s === c) f.classList.add("richtig");
      if (z.fz.includes(r) && z.fs.includes(c)) f.classList.add("gesperrt");
      if (
        letzterZug &&
        ((letzterZug[0] === "z" && letzterZug[1] === r) ||
          (letzterZug[0] === "s" && letzterZug[1] === c))
      )
        f.classList.add(rein);
      if (tipp && ((tipp[0] === "z" && tipp[1] === r) || (tipp[0] === "s" && tipp[1] === c)))
        f.classList.add("tipp-von");
      f.innerHTML = gewuerzGlas(s);
      f.setAttribute(
        "aria-label",
        `Reihe ${r + 1}, Spalte ${c + 1}: ${name(s)}${s === c ? ", richtig" : ""}. Pfeiltasten schieben.`,
      );
      teile.push(f);
    }
    teile.push(pfeil(z, "z", r, 1, tipp));
  }
  teile.push(leer());
  for (let c = 0; c < z.C; c++) teile.push(pfeil(z, "s", c, 1, tipp));
  teile.push(leer());
  gitter.append(...teile);
  // Fokus behalten (Tastatur): gleiches Feld bzw. gleicher Pfeil
  const a = document.activeElement;
  const fokus = a?.closest?.(".feld[data-i]")
    ? `.feld[data-i="${a.dataset.i}"]`
    : a?.closest?.(".pfeil[data-art]")
      ? `.pfeil[data-art="${a.dataset.art}"][data-n="${a.dataset.n}"][data-d="${a.dataset.d}"]`
      : null;
  api.brett.replaceChildren(gitter);
  if (fokus) api.brett.querySelector(fokus)?.focus({ preventScroll: true });
}
