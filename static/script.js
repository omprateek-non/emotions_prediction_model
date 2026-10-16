(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const COLORS = { sadness:"#6f8cf0", joy:"#f2c14e", love:"#f26d9b", anger:"#f0594c", fear:"#a78bf5", surprise:"#35d0b0" };
  const SAMPLES = [
    "I finally got the job and I can't stop smiling",
    "I miss how things used to be and it hurts",
    "You lied to me again and I am done with this",
    "I keep thinking something terrible is about to happen",
    "I adore the way you laugh at your own jokes",
    "I opened the box and had no idea what to say",
  ];
  const el = { text:$("text"), go:$("go"), count:$("count"), samples:$("samples"), status:$("status"), statusText:$("statusText"),
    empty:$("empty"), result:$("result"), panel:$("panel"), emoji:$("emoji"), emotion:$("emotion"), conf:$("conf"),
    quote:$("quote"), spectrum:$("spectrum"), rows:$("rows"), history:$("history"), list:$("historyList"), field:$("field") };
  const history = [];
  let busy = false;

  /* ---------- server status ---------- */
  async function checkHealth() {
    try {
      const r = await fetch("/health", { cache: "no-store" });
      const d = await r.json();
      setStatus(d.model_loaded ? "ok" : "down", d.model_loaded ? "Model ready" : "Model not loaded");
    } catch { setStatus("down", "Server unreachable"); }
  }
  function setStatus(state, text) { el.status.dataset.state = state; el.statusText.textContent = text; }

  /* ---------- input ---------- */
  function sync() {
    const n = el.text.value.length;
    el.count.textContent = n;
    el.go.disabled = busy || !el.text.value.trim();
  }
  el.text.addEventListener("input", sync);
  el.text.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") analyse(); });
  el.go.addEventListener("click", () => analyse());

  SAMPLES.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = s.length > 34 ? s.slice(0, 32) + "…" : s; b.title = s;
    b.addEventListener("click", () => { el.text.value = s; sync(); analyse(); });
    el.samples.appendChild(b);
  });

  /* ---------- prediction ---------- */
  async function analyse() {
    const text = el.text.value.trim();
    if (!text || busy) return;
    busy = true; el.go.classList.add("loading"); sync(); clearError();
    try {
      const res = await fetch("/predict", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ text }) });
      if (!res.ok) {
        let msg = `Request failed (${res.status}).`;
        try { const j = await res.json(); if (typeof j.detail === "string") msg = j.detail; } catch {}
        throw new Error(msg);
      }
      render(await res.json());
    } catch (err) {
      showError(err instanceof TypeError ? "Can't reach the server. Check your connection and try again." : err.message);
    } finally { busy = false; el.go.classList.remove("loading"); sync(); }
  }

  function render(d) {
    document.body.dataset.emotion = d.predicted_emotion;
    el.panel.dataset.state = "done";
    el.empty.hidden = true; el.result.hidden = false;
    el.result.classList.remove("show"); void el.result.offsetWidth; el.result.classList.add("show");

    el.emoji.textContent = d.emoji;
    el.emotion.textContent = d.predicted_emotion;
    el.quote.textContent = d.text;

    const entries = Object.entries(d.all_probabilities).sort((a, b) => b[1] - a[1]);
    el.spectrum.replaceChildren(); el.rows.replaceChildren();
    const bars = [], segs = [];
    entries.forEach(([name, p], i) => {
      const seg = document.createElement("span");
      seg.style.setProperty("--c", COLORS[name]); seg.title = `${name} ${(p * 100).toFixed(1)}%`;
      el.spectrum.appendChild(seg); segs.push([seg, p]);

      const li = document.createElement("li"); if (i === 0) li.className = "top";
      li.style.setProperty("--c", COLORS[name]);
      li.innerHTML = '<span class="name"></span><span class="bar"><b></b></span><span class="pct"></span>';
      li.querySelector(".name").textContent = name;
      li.querySelector(".pct").textContent = fmt(p);
      el.rows.appendChild(li); bars.push([li.querySelector("b"), p]);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      segs.forEach(([s, p]) => s.style.setProperty("--w", Math.max(p, 0.004)));
      bars.forEach(([b, p], i) => { b.style.transitionDelay = `${i * 70}ms`; b.style.transform = `scaleX(${Math.max(p, 0.004)})`; });
    }));
    countUp(el.conf, d.confidence * 100);
    pushHistory(d);
  }

  const fmt = (p) => (p * 100 < 0.1 ? "<0.1%" : (p * 100).toFixed(1) + "%");

  function countUp(node, target) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = target.toFixed(1); return; }
    const t0 = performance.now(), dur = 900;
    (function tick(t) {
      const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      node.textContent = (target * e).toFixed(1);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- history ---------- */
  function pushHistory(d) {
    history.unshift(d); if (history.length > 6) history.pop();
    el.history.hidden = false; el.list.replaceChildren();
    history.forEach((h) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<span></span><span class="t"></span><span class="p"></span>';
      b.children[0].textContent = h.emoji; b.children[1].textContent = h.text; b.children[2].textContent = (h.confidence * 100).toFixed(0) + "%";
      b.addEventListener("click", () => { el.text.value = h.text; sync(); render(h); });
      li.appendChild(b); el.list.appendChild(li);
    });
  }

  /* ---------- errors ---------- */
  function showError(msg) {
    clearError();
    const p = document.createElement("p"); p.className = "error"; p.id = "err"; p.setAttribute("role", "alert"); p.textContent = msg;
    el.field.after(p);
  }
  function clearError() { const e = $("err"); if (e) e.remove(); }

  sync(); checkHealth(); setInterval(checkHealth, 30000);
})();
