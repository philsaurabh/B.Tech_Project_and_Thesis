/* Page behaviour: theme, KaTeX, tabs, lightbox, firewall calculator, sensitivity chart */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- theme ---------- */
  const root = document.documentElement;
  try {
    const saved = localStorage.getItem("theme");
    if (saved) root.dataset.theme = saved;
  } catch (e) { /* storage unavailable */ }
  $("#themeToggle").addEventListener("click", () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    document.dispatchEvent(new Event("themechange"));
  });

  /* ---------- KaTeX ---------- */
  function renderMath(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el || document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false
      });
    }
  }
  window.renderMath = renderMath;
  window.addEventListener("load", () => renderMath());

  /* ---------- generic tab groups ---------- */
  function tabGroup(btnAttr, panelPrefix) {
    const btns = $$(`[data-${btnAttr}]`);
    btns.forEach(b => b.addEventListener("click", () => {
      btns.forEach(x => x.classList.toggle("active", x === b));
      btns.forEach(x => {
        const p = document.getElementById(panelPrefix + x.dataset[btnAttr]);
        if (p) p.classList.toggle("active", x === b);
      });
    }));
  }
  tabGroup("eq", "eq-");
  tabGroup("gal", "gal-");

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $(".lb-cap", lb);
  $$(".fig img").forEach(img => img.addEventListener("click", () => {
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.closest(".fig").querySelector("figcaption").textContent;
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
  }));
  const closeLb = () => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
  lb.addEventListener("click", e => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeLb(); });

  /* ---------- firewall coefficient calculator ---------- */
  const fwA = $("#fwA"), fwB = $("#fwB");
  function updateFw() {
    const a = +fwA.value, b = +fwB.value;
    const u = a + b - a * b;
    const m = -Math.log2(u);
    $("#fwAOut").textContent = a.toFixed(2);
    $("#fwBOut").textContent = b.toFixed(2);
    $("#fwM").textContent = isFinite(m) ? m.toFixed(3) : "∞";
    const damp = Math.exp(-m);
    $("#fwBar").style.width = (damp * 100).toFixed(1) + "%";
    $("#fwDamp").innerHTML = `e<sup>−m</sup> = ${damp.toFixed(3)} &nbsp;→&nbsp; transmission cut by ${((1 - damp) * 100).toFixed(1)}%`;
  }
  fwA.addEventListener("input", updateFw);
  fwB.addEventListener("input", updateFw);
  updateFw();

  /* ---------- sensitivity indices ----------
     Computed from the report's analytical expressions:
       R01 = (β1+1)/(d2+μ+η+1)     R02 = 1/(d2+λ0+1)     R̃0 = β̃1/(d̃2+μ̃+η̃)          */
  const sets = {
    A: { beta1: 0.001, mu: 0.003, eta: 0.004, d2: 0.4, lam: 0.008 },
    B: { beta1: 0.01, mu: 0.003, eta: 0.0004, d2: 0.004, lam: 0.0008 },
    C: { beta1: 0.5, mu: 0.3, eta: 0.4, d2: 0.4 },
    D: { beta1: 2.5, mu: 0.3, eta: 0.4, d2: 0.4 }
  };
  const views = {
    tilde: {
      sets: ["C", "D"],
      rows: p => {
        const s = p.d2 + p.mu + p.eta;
        return [["β̃₁", 1], ["μ̃", -p.mu / s], ["η̃", -p.eta / s], ["d̃₂", -p.d2 / s]];
      },
      formula: [["\\(\\Upsilon_{\\tilde\\beta_1}\\)", "\\(1\\)"],
                ["\\(\\Upsilon_{\\tilde\\mu}\\)", "\\(-\\tilde\\mu/(\\tilde d_2+\\tilde\\mu+\\tilde\\eta)\\)"],
                ["\\(\\Upsilon_{\\tilde\\eta}\\)", "\\(-\\tilde\\eta/(\\tilde d_2+\\tilde\\mu+\\tilde\\eta)\\)"],
                ["\\(\\Upsilon_{\\tilde d_2}\\)", "\\(-\\tilde d_2/(\\tilde d_2+\\tilde\\mu+\\tilde\\eta)\\)"]],
      note: "Identical for Sets C and D, since they share d̃₂, μ̃ and η̃. A 1% rise in d̃₂ lowers R̃₀ by 0.36%; β̃₁ is proportional to R̃₀ (index 1)."
    },
    r01: {
      sets: ["A", "B"],
      rows: p => {
        const s = p.d2 + p.mu + p.eta + 1;
        return [["β₁", p.beta1 / (p.beta1 + 1)], ["μ", -p.mu / s], ["η", -p.eta / s], ["d₂", -p.d2 / s]];
      },
      formula: [["\\(\\Upsilon_{\\beta_1}\\)", "\\(\\beta_1/(\\beta_1+1)\\)"],
                ["\\(\\Upsilon_{\\mu}\\)", "\\(-\\mu/(d_2+\\mu+\\eta+1)\\)"],
                ["\\(\\Upsilon_{\\eta}\\)", "\\(-\\eta/(d_2+\\mu+\\eta+1)\\)"],
                ["\\(\\Upsilon_{d_2}\\)", "\\(-d_2/(d_2+\\mu+\\eta+1)\\)"]],
      note: "Bars are scaled to the largest index in the selected set."
    },
    r02: {
      sets: ["A", "B"],
      rows: p => {
        const s = 1 + p.d2 + p.lam;
        return [["λ₀", -p.lam / s], ["d₂", -p.d2 / s]];
      },
      formula: [["\\(\\Upsilon_{\\lambda_0}\\)", "\\(-\\lambda_0/(1+d_2+\\lambda_0)\\)"],
                ["\\(\\Upsilon_{d_2}\\)", "\\(-d_2/(1+d_2+\\lambda_0)\\)"]],
      note: "Bars are scaled to the largest index in the selected set."
    }
  };

  let sensView = "tilde", sensSet = "C";
  const chart = $("#sensChart");

  function drawSens() {
    const v = views[sensView];
    if (!v.sets.includes(sensSet)) sensSet = v.sets[0];
    const rows = v.rows(sets[sensSet]);
    const max = Math.max(...rows.map(r => Math.abs(r[1])));
    const setBtns = v.sets.map(s =>
      `<button class="chip ${s === sensSet ? "active" : ""}" data-sset="${s}">Set ${s}</button>`).join("");
    chart.innerHTML =
      `<div class="preset-row" style="margin-bottom:.6rem">${setBtns}</div>` +
      rows.map(([p, val]) => {
        const w = (Math.abs(val) / max) * 50;
        return `<div class="sbar"><span class="p">${p}</span>
          <div class="track"><div class="fill ${val >= 0 ? "pos" : "neg"}" style="width:${w}%"></div></div>
          <span class="v">${val >= 0 ? "+" : ""}${fmt(val)}</span></div>`;
      }).join("") +
      `<div class="sens-axis"><span></span><div><span>−${fmt(max)}</span><span>0</span><span>+${fmt(max)}</span></div><span></span></div>`;
    $$("[data-sset]", chart).forEach(b => b.addEventListener("click", () => { sensSet = b.dataset.sset; drawSens(); }));

    $("#sensFormula").innerHTML =
      `<h3 style="font-size:1rem">Analytical indices</h3><table>` +
      v.formula.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("") + `</table>`;
    $("#sensNote").textContent = v.note;
    renderMath($("#sensFormula"));
  }
  function fmt(x) {
    const a = Math.abs(x);
    if (a === 0) return "0";
    if (a >= 0.1) return x.toFixed(2).replace("-", "−");
    if (a >= 0.001) return x.toFixed(4).replace("-", "−");
    return x.toExponential(2).replace("-", "−");
  }
  $$("[data-sens]").forEach(b => b.addEventListener("click", () => {
    $$("[data-sens]").forEach(x => x.classList.toggle("active", x === b));
    sensView = b.dataset.sens;
    drawSens();
  }));
  window.addEventListener("load", drawSens);

  /* ---------- copy bibtex ---------- */
  $("#copyBib").addEventListener("click", async () => {
    const text = $("#bibtex").innerText;
    try {
      await navigator.clipboard.writeText(text);
      $("#copyBib").textContent = "Copied ✓";
      setTimeout(() => ($("#copyBib").textContent = "Copy BibTeX"), 1800);
    } catch (e) { /* clipboard blocked */ }
  });
})();
