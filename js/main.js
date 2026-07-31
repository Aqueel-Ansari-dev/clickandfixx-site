// ============================================================
// main.js — page state, glitch text, HUD, cursor, compare,
// terminal, final-mark canvas, form.
// ============================================================

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const GLITCH = "!<>-_\\/[]{}—=+*^?#";

// ------------------------------------------------------------
// Scramble-resolve text
// ------------------------------------------------------------
function scramble(el, finalText, duration = 420) {
  if (reduced) { el.textContent = finalText; return; }
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const settled = Math.floor(finalText.length * p);
    el.textContent = [...finalText]
      .map((c, i) => (i < settled || c === " " ? c : GLITCH[(Math.random() * GLITCH.length) | 0]))
      .join("");
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = finalText;
  };
  requestAnimationFrame(tick);
}

// Glitch headlines resolve on first entry into view
const glitchObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    glitchObserver.unobserve(el);
    if (!el.classList.contains("hero-word")) scramble(el, el.dataset.text || el.textContent, 340);
  });
}, { threshold: 0.4 });
document.querySelectorAll(".glitch-line").forEach((el) => glitchObserver.observe(el));

// ------------------------------------------------------------
// Scroll reveals
// ------------------------------------------------------------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in-view");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal, .process-card").forEach((el) => revealObserver.observe(el));

// ------------------------------------------------------------
// BROKEN -> FIXED
// ------------------------------------------------------------
let fixed = false;

function runFix() {
  if (fixed) return;
  fixed = true;
  document.body.classList.replace("is-broken", "is-fixed");

  // hero word: broken. -> fixed. (green), then settles to bone
  const word = document.querySelector(".hero-word");
  if (word) {
    scramble(word, word.dataset.fixed, 600);
    setTimeout(() => word.classList.add("settled"), reduced ? 600 : 2400);
  }

  // 3D system
  window.__triggerHeroFix?.();

  // status chip countdown 4 -> 0
  const chip = document.getElementById("chipText");
  if (chip) {
    let n = 4;
    const step = () => {
      n--;
      chip.textContent = n > 0 ? `${n} system${n === 1 ? "" : "s"} down` : "all systems fixed";
      if (n > 0) setTimeout(step, reduced ? 40 : 230);
    };
    setTimeout(step, reduced ? 40 : 230);
  }

  // HUD flips FAIL -> OK, one line at a time
  document.querySelectorAll("#hud [data-sys] b").forEach((b, i) => {
    setTimeout(() => {
      b.textContent = "OK";
      b.classList.replace("fail", "ok");
    }, (reduced ? 60 : 320) * (i + 1) + (reduced ? 0 : 900));
  });

  // hero CTAs
  const ctas = document.getElementById("heroCtas");
  if (ctas) {
    setTimeout(() => { ctas.hidden = false; }, reduced ? 100 : 1000);
  }

  // micro shake at the snap moment
  if (!reduced) {
    setTimeout(() => {
      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 130);
    }, 1050);
  }
}

document.addEventListener("click", (e) => {
  if (fixed) return;
  if (e.target.closest("a")) return; // links navigate; they don't fix
  runFix();
});
document.getElementById("fixPrompt")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runFix(); }
});

// ------------------------------------------------------------
// Mobile nav toggle
// ------------------------------------------------------------
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
if (navToggle && navLinks) {
  const closeNav = () => {
    navToggle.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("is-open");
  };
  const openNav = () => {
    navToggle.setAttribute("aria-expanded", "true");
    navLinks.classList.add("is-open");
  };
  navToggle.addEventListener("click", () => {
    if (navLinks.classList.contains("is-open")) closeNav();
    else openNav();
  });
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
  document.addEventListener("click", (e) => {
    if (!navLinks.classList.contains("is-open")) return;
    if (navLinks.contains(e.target) || navToggle.contains(e.target)) return;
    closeNav();
  });
  matchMedia("(min-width: 861px)").addEventListener("change", (e) => {
    if (e.matches) closeNav();
  });
}

// ------------------------------------------------------------
// Custom cursor
// ------------------------------------------------------------
const ring = document.querySelector(".cursor-ring");
const ringLabel = document.querySelector(".cursor-label");
if (ring && matchMedia("(pointer: fine)").matches) {
  let cx = -100, cy = -100, tx = -100, ty = -100, shown = false;

  addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!shown) { shown = true; cx = tx; cy = ty; ring.style.opacity = "1"; }
  });

  (function tick() {
    cx += (tx - cx) * 0.28;
    cy += (ty - cy) * 0.28;
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    requestAnimationFrame(tick);
  })();

  document.querySelectorAll("a, button, input, select, [data-cursor], .compare-range").forEach((el) => {
    el.addEventListener("pointerenter", () => {
      ring.classList.add("expand");
      ringLabel.textContent = el.dataset.cursor || "";
    });
    el.addEventListener("pointerleave", () => {
      ring.classList.remove("expand");
      ringLabel.textContent = "";
    });
  });
}

// ------------------------------------------------------------
// Repair-log metrics: count from broken value down to fixed value
// when the ticket scrolls into view
// ------------------------------------------------------------
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    countObserver.unobserve(entry.target);
    const el = entry.target;
    const from = parseFloat(el.dataset.from);
    const to = parseFloat(el.dataset.to);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    if (reduced) { el.textContent = to.toFixed(decimals); return; }
    const dur = 1100;
    const t0 = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (from + (to - from) * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  });
}, { threshold: 0.6 });
document.querySelectorAll(".count").forEach((el) => countObserver.observe(el));

// ------------------------------------------------------------
// Terminal typing loop
// ------------------------------------------------------------
const typed = document.getElementById("terminalType");
if (typed) {
  const cmd = "fix --business yours.com";
  if (reduced) {
    typed.textContent = cmd;
  } else {
    let i = 0;
    setInterval(() => {
      typed.textContent = cmd.slice(0, i);
      i = (i + 1) % (cmd.length + 10);
    }, 120);
  }
}

// ------------------------------------------------------------
// Final CTA — askew icon snaps straight (canvas 2D)
// ------------------------------------------------------------
const mark = document.getElementById("finalMark");
const cta = document.getElementById("ctaCanvas");
if (mark && cta) {
  const ctx = cta.getContext("2d");
  const S = 140;
  let angle = -9;
  let done = false;
  let particles = [];

  function draw() {
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.strokeStyle = done ? "#3DD68C" : "#FF4757";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-42, -32, 84, 64);
    ctx.fillRect(-42, -32, 84, 13);
    ctx.strokeRect(-33, -10, 30, 30);
    ctx.strokeRect(3, -10, 30, 30);
    ctx.restore();

    particles.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(245,166,35,${p.life})`;
      ctx.arc(S / 2 + p.x, S / 2 + p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function snap() {
    if (done) return;
    done = true;
    mark.classList.add("is-fixed");
    const from = angle;
    const t0 = performance.now();
    const dur = reduced ? 1 : 480;
    particles = Array.from({ length: 26 }, () => ({
      x: 0, y: 0,
      vx: (Math.random() - 0.5) * 4.5,
      vy: (Math.random() - 0.5) * 4.5,
      life: 1,
    }));
    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      angle = from * (1 - (1 - Math.pow(1 - p, 3)));
      particles.forEach((pt) => { pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.025; });
      particles = particles.filter((pt) => pt.life > 0);
      draw();
      if (p < 1 || particles.length) requestAnimationFrame(frame);
    })(t0);
  }

  draw();
  mark.addEventListener("pointerenter", snap);
  mark.addEventListener("click", snap);
  mark.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); snap(); }
  });
}

// ------------------------------------------------------------
// Diagnosis form — inline validation + friendly input handling
// ------------------------------------------------------------
const form = document.getElementById("diagnosisForm");
if (form) {
  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector("button[type=submit]");
  const btnLabel = submitBtn.querySelector(".btn-label");
  const defaultBtnHTML = btnLabel.innerHTML;

  // Ticket id + live signal meter — the form reads like an open diagnostic ticket
  const ticketEl = document.getElementById("formTicket");
  const ticketNum = Math.floor(1000 + Math.random() * 9000);
  if (ticketEl) ticketEl.textContent = `TICKET #${ticketNum} · OPEN`;

  const meterFill = document.getElementById("formMeterFill");
  const meterValue = document.getElementById("formMeterValue");
  const requiredInputs = [...form.querySelectorAll("input, select")].filter((el) => el.required);

  function updateMeter() {
    if (!meterFill) return;
    const done = requiredInputs.filter((el) => el.checkValidity() && el.value.trim() !== "").length;
    const total = requiredInputs.length;
    meterFill.style.width = `${(done / total) * 100}%`;
    meterFill.classList.toggle("is-complete", done === total);
    meterValue.textContent = `${done}/${total}`;
    if (ticketEl) ticketEl.textContent = `TICKET #${ticketNum} · ${done === total ? "READY" : "OPEN"}`;
  }
  updateMeter();

  const MESSAGES = {
    name: {
      valueMissing: "Tell us who to send the diagnosis to.",
      tooShort: "Just needs a first name — that's enough.",
    },
    email: {
      valueMissing: "We need an email to send the findings to.",
      typeMismatch: "That doesn't look like a full email address.",
    },
    website: {
      typeMismatch: "That URL doesn't look right — try yoursite.com.",
    },
    problem: {
      valueMissing: "Pick the one that's closest.",
    },
  };

  function fieldWrap(input) {
    return input.closest(".field");
  }

  function messageFor(input) {
    const v = input.validity;
    const msgs = MESSAGES[input.name] || {};
    if (v.valueMissing) return msgs.valueMissing || "This field is required.";
    if (v.typeMismatch || v.customError) return msgs.typeMismatch || "This doesn't look right.";
    if (v.tooShort) return msgs.tooShort || `Needs at least ${input.minLength} characters.`;
    return "";
  }

  function validateField(input, { showValid = true } = {}) {
    const wrap = fieldWrap(input);
    const errorEl = wrap.querySelector(".field-error");
    const statusEl = wrap.querySelector(".field-status");
    const ok = input.checkValidity();
    const isValid = ok && showValid && input.value.trim() !== "";
    wrap.classList.toggle("is-invalid", !ok);
    wrap.classList.toggle("is-valid", isValid);
    errorEl.textContent = ok ? "" : messageFor(input);
    if (statusEl) statusEl.textContent = isValid ? "OK" : !ok ? "ERR" : "––";
    updateMeter();
    return ok;
  }

  // Website is optional, but if they type something, normalize + validate it as a URL.
  const websiteInput = form.elements.website;
  function normalizeWebsite() {
    const v = websiteInput.value.trim();
    if (!v) { websiteInput.setCustomValidity(""); return; }
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      new URL(withScheme);
      websiteInput.value = withScheme;
      websiteInput.setCustomValidity("");
    } catch {
      websiteInput.setCustomValidity("invalid");
    }
  }
  websiteInput.addEventListener("blur", () => {
    normalizeWebsite();
    validateField(websiteInput);
  });
  // Clear the stale custom-validity flag as soon as they start editing again.
  websiteInput.addEventListener("input", () => websiteInput.setCustomValidity(""));

  // Validate on blur (first pass), then live-clear errors as the user fixes them.
  form.querySelectorAll("input, select").forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (fieldWrap(input).classList.contains("is-invalid")) validateField(input);
      else updateMeter();
    });
    input.addEventListener("change", () => validateField(input));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.classList.remove("error");
    status.textContent = "";

    normalizeWebsite();
    let valid = true;
    let firstInvalid = null;
    form.querySelectorAll("input, select").forEach((input) => {
      const ok = validateField(input);
      if (!ok && !firstInvalid) firstInvalid = input;
      valid = valid && ok;
    });

    if (!valid) {
      firstInvalid.focus();
      status.textContent = "Please fix the highlighted fields.";
      status.classList.add("error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add("is-sending");
    btnLabel.textContent = "Sending…";
    status.textContent = "";

    function resetFields() {
      form.reset();
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("is-valid", "is-invalid"));
      form.querySelectorAll(".field-status").forEach((s) => { s.textContent = "––"; });
      updateMeter();
    }

    if (!window.FORM_ENDPOINT) {
      status.textContent = "Thanks — we'll send your diagnosis shortly.";
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-sending");
      btnLabel.innerHTML = defaultBtnHTML;
      resetFields();
      if (ticketEl) ticketEl.textContent = `TICKET #${ticketNum} · CLOSED`;
      return;
    }

    try {
      const res = await fetch(window.FORM_ENDPOINT, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("bad status");
      status.textContent = "Thanks — we'll send your diagnosis shortly.";
      resetFields();
      if (ticketEl) ticketEl.textContent = `TICKET #${ticketNum} · CLOSED`;
    } catch {
      status.textContent = "Couldn't send. Email hello@clickandfixx.com instead.";
      status.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("is-sending");
      btnLabel.innerHTML = defaultBtnHTML;
    }
  });
}
