/* OpenBar DS — génération des fondations + scrollspy TOC */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };

  function swatch(name, value, role, dark) {
    const s = el("div", "swatch");
    const txt = dark ? "#0f0f1a" : "#ECEEFB";
    s.innerHTML =
      `<div class="chip" style="background:${value}"></div>` +
      `<div class="meta"><span class="nm">${name}</span><span class="vl">${value}</span>` +
      (role ? `<span class="role">${role}</span>` : "") + `</div>`;
    return s;
  }
  function fill(id, items) { const g = $(id); if (!g) return; items.forEach(it => g.appendChild(swatch(...it))); }

  fill("#grid-primary", [
    ["Primary", "#6C7FE8", "identité, bordures actives"],
    ["Primary strong", "#5A68D6", "remplissage + texte blanc (AA)"],
    ["Primary press", "#4D5AC4", "état pressé"],
    ["Primary light", "#AAB4F3", "texte/icone sur teinte"],
    ["Primary tint", "rgba(108,127,232,.2)", "fond état actif"],
  ]);
  fill("#grid-surface", [
    ["bg-0", "#0f0f1a", "fond global"],
    ["bg-1", "#15151f", "rails, colonnes"],
    ["surface-1", "#1a1a2e", "cards, panels"],
    ["surface-2", "#21263f", "inputs, surélevé"],
    ["surface-3", "#2a3050", "hover, actif"],
    ["border", "#2e3450", "contour de card"],
  ]);
  fill("#grid-text", [
    ["text-primary", "#ECEEFB", "titres · 15.8:1"],
    ["text-secondary", "#A4ADD0", "corps · 7.4:1"],
    ["text-muted", "#7E87A8", "méta · 4.6:1 (AA)"],
  ]);
  fill("#grid-roles", [
    ["Manager", "#F0A33B", "orange"],
    ["Serveur", "#34C77B", "vert"],
    ["Barman", "#4FC3F7", "cyan"],
    ["Admin", "#9B8AF2", "violet doux"],
  ]);
  fill("#grid-status", [
    ["En attente", "#F4A52A", "ambre"],
    ["En préparation", "#2BA8E8", "bleu"],
    ["Prête", "#2FBF6B", "vert"],
    ["Servie", "#6E7AA8", "neutre"],
    ["Annulée", "#E5604F", "rouge"],
  ]);

  // Type scale
  const types = [
    ["Display", 32, 700, "Carte des cocktails", "32 / 700 / -2%"],
    ["H1", 24, 700, "Tableau de bord", "24 / 700"],
    ["H2", 20, 600, "Commandes en cours", "20 / 600"],
    ["H3", 16, 600, "Mojito royal", "16 / 600"],
    ["Body", 14, 400, "Rhum, menthe, citron vert, champagne, sucre de canne", "14 / 400"],
    ["Small", 13, 400, "Utilisé dans 3 cocktails", "13 / 400"],
    ["Caption", 12, 400, "Restant : 1.2 L", "12 / 400"],
    ["Label", 11, 600, "EN PRÉPARATION", "11 / 600 / UPPER / +6%"],
  ];
  const ts = $("#type-scale");
  if (ts) types.forEach(([n, fs, fw, sample, meta]) => {
    const r = el("div", "type-row");
    const isLabel = n === "Label";
    r.innerHTML = `<span class="spec-meta">${n} · ${meta}</span>` +
      `<span style="font-size:${fs}px;font-weight:${fw};color:var(--text-primary);` +
      (isLabel ? "text-transform:uppercase;letter-spacing:.06em;" : "") + `">${sample}</span>`;
    ts.appendChild(r);
  });

  // Space scale
  const spaces = [["space-1", 4], ["space-2", 8], ["space-3", 12], ["space-4", 16], ["space-5", 20], ["space-6", 24], ["space-7", 32], ["space-8", 40]];
  const ss = $("#space-scale");
  if (ss) spaces.forEach(([n, px]) => {
    const r = el("div", "scale-row");
    r.innerHTML = `<span class="lab">${n}</span><span class="bar" style="width:${px}px"></span><span class="px">${px}px</span>`;
    ss.appendChild(r);
  });

  // Radius
  const radii = [["sm", 6], ["md", 10], ["lg", 14], ["xl", 20], ["pill", 28]];
  const rr = $("#radius-row");
  if (rr) radii.forEach(([n, px]) => {
    const sp = el("div", "specimen");
    sp.innerHTML = `<div style="width:84px;height:64px;background:var(--surface-2);border:1px solid var(--border-default);border-radius:${n === 'pill' ? '999px' : px + 'px'}"></div><span class="cap">${n} · ${n === 'pill' ? '999' : px}px</span>`;
    rr.appendChild(sp);
  });
  // Elevation
  const elevs = [["elev-1", "var(--elev-1)"], ["elev-2", "var(--elev-2)"], ["elev-3", "var(--elev-3)"]];
  const er = $("#elev-row");
  if (er) elevs.forEach(([n, sh]) => {
    const sp = el("div", "specimen");
    sp.innerHTML = `<div style="width:120px;height:72px;background:var(--surface-1);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:${sh}"></div><span class="cap">${n}</span>`;
    er.appendChild(sp);
  });

  // Token table
  const tokens = [
    ["--primary", "#6C7FE8", "--ion-color-primary-tint", "Identité, bordures actives"],
    ["--primary-strong", "#5A68D6", "--ion-color-primary", "Remplissages + texte blanc (AA)"],
    ["--bg-0", "#0f0f1a", "--ion-background-color", "Fond global"],
    ["--surface-1", "#1a1a2e", "--ion-card-background", "Cards, panels, toolbar"],
    ["--text-primary", "#ECEEFB", "--ion-text-color", "Titres, valeurs"],
    ["--text-muted", "#7E87A8", "--ion-color-step-600", "Méta, hints (AA)"],
    ["--success", "#2FBF6B", "--ion-color-success", "Prête, stock normal"],
    ["--warning", "#F4A52A", "--ion-color-warning", "En attente, stock faible"],
    ["--danger", "#E5604F", "--ion-color-danger", "Annulée, stock critique"],
    ["--radius-md", "10px", "—", "Boutons, inputs"],
    ["--radius-lg", "14px", "—", "Cards"],
    ["--tap-min", "44px", "—", "Cible tactile mini"],
  ];
  const tb = $("#token-table tbody");
  if (tb) tokens.forEach(([t, v, ion, use]) => {
    const isColor = v.startsWith("#");
    const tr = el("tr");
    tr.innerHTML =
      `<td><code>${t}</code></td>` +
      `<td>${isColor ? `<span class="swdot" style="background:${v}"></span>` : ""}${v}</td>` +
      `<td><code>${ion}</code></td>` +
      `<td>${use}</td>`;
    tb.appendChild(tr);
  });

  // Scrollspy
  const links = [...document.querySelectorAll(".toc a")];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove("active"));
        const a = map.get(e.target.id);
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll("section.block").forEach(s => obs.observe(s));
})();
