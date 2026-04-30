/* AccountSwitch (Vanilla) — atualizado (hideBalance APENAS no init)
   - hideBalance NÃO vem mais do socket
   - hideBalance vem do init: options.initialHideBalance (boolean) OU data-hide-balance="true"
   - setData recebe: { active, real:{...}, demo:{...} } (sem hideBalance)
   - real/demo valores NUMÉRICOS (number)
   - bonusExpiresAt: timestamp (segundos ou ms) -> "dd/mm/aaaa, hh:mm:ss"
   - animação trader (▲/▼ + flash) quando valor muda
   - ocultar saldo IMEDIATO (sem delay) e persistível (callback)
   - diff: ignora updates iguais (não mexe no DOM)
*/

/* ---------- helpers ---------- */
function formatBRL(n) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(n);
}

function normalizeTimestamp(ts) {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return null;
  return ts < 1e11 ? ts * 1000 : ts; // seconds -> ms
}

function formatDateTimeBR(tsMs) {
  const d = new Date(tsMs);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
}

function isNumberEqual(a, b, eps = 1e-9) {
  if (typeof a !== "number" || typeof b !== "number") return a === b;
  return Math.abs(a - b) < eps;
}

/* ---------- number tween ---------- */
function animateNumber(elValueSpan, from, to, { duration = 650, easing } = {}) {
  if (!easing) easing = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  if (elValueSpan._numAnimRaf) cancelAnimationFrame(elValueSpan._numAnimRaf);

  const start = performance.now();
  const diff = to - from;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easing(t);
    const value = from + diff * eased;

    elValueSpan.textContent = formatBRL(value);

    if (t < 1) {
      elValueSpan._numAnimRaf = requestAnimationFrame(frame);
    } else {
      elValueSpan.textContent = formatBRL(to);
      elValueSpan._numAnimRaf = null;
    }
  }

  elValueSpan._numAnimRaf = requestAnimationFrame(frame);
}

/* ---------- trader flash (▲/▼ + glow) ---------- */
function traderFlash(moneyWrapper, direction, { flashMs = 120 } = {}) {
  if (!moneyWrapper) return;

  const tick = moneyWrapper.querySelector('[data-role="tick"]');
  const up = direction === "up";

  moneyWrapper.classList.remove("flash-up", "flash-down");
  if (tick) tick.classList.remove("show", "up", "down");

  // restart animations
  void moneyWrapper.offsetWidth;

  moneyWrapper.classList.add(up ? "flash-up" : "flash-down");

  if (tick) {
    tick.textContent = up ? "▲" : "▼";
    tick.classList.add(up ? "up" : "down", "show");
    setTimeout(() => tick.classList.remove("show"), flashMs);
  }

  setTimeout(() => moneyWrapper.classList.remove("flash-up", "flash-down"), 220);
}

function stopMoneyAnimation(moneyWrapper) {
  if (!moneyWrapper) return;
  const valueSpan = moneyWrapper.querySelector(".value");
  if (valueSpan && valueSpan._numAnimRaf) {
    cancelAnimationFrame(valueSpan._numAnimRaf);
    valueSpan._numAnimRaf = null;
  }
  moneyWrapper.classList.remove("flash-up", "flash-down");
  const tick = moneyWrapper.querySelector('[data-role="tick"]');
  if (tick) tick.classList.remove("show", "up", "down");
}

function hideMoneyInstant(moneyWrapper) {
  if (!moneyWrapper) return;
  stopMoneyAnimation(moneyWrapper);
  const valueSpan = moneyWrapper.querySelector(".value");
  if (valueSpan) valueSpan.textContent = "••••••";
}

/**
 * Atualiza um wrapper .money com number:
 * - se delta >= minDelta: flash trader + tween
 * - se delta pequeno: só tween (opcional)
 */
function setMoneyNumber(moneyWrapper, newValue, opts = {}) {
  const {
    animate = true,
    duration = 650,
    minDelta = 0.01,
    flashMs = 120
  } = opts;

  if (!moneyWrapper || typeof newValue !== "number" || !Number.isFinite(newValue)) return;

  const valueSpan = moneyWrapper.querySelector(".value");
  if (!valueSpan) return;

  // first set (no flash)
  if (typeof moneyWrapper._moneyValue !== "number") {
    moneyWrapper._moneyValue = newValue;
    valueSpan.textContent = formatBRL(newValue);
    return;
  }

  const oldValue = moneyWrapper._moneyValue;
  if (isNumberEqual(oldValue, newValue)) {
    valueSpan.textContent = formatBRL(newValue);
    return;
  }

  const delta = Math.abs(newValue - oldValue);
  moneyWrapper._moneyValue = newValue;

  if (delta >= minDelta) {
    const direction = newValue > oldValue ? "up" : "down";
    traderFlash(moneyWrapper, direction, { flashMs });
  } else {
    moneyWrapper.classList.remove("flash-up", "flash-down");
  }

  if (!animate) {
    valueSpan.textContent = formatBRL(newValue);
    return;
  }

  animateNumber(valueSpan, oldValue, newValue, { duration });
}

/* ---------- component ---------- */
function initAccountSwitch(root, options = {}) {
  // elements
  const trigger = root.querySelector('[data-role="trigger"]');
  const dropdown = root.querySelector('[data-role="dropdown"]');
  const toggleHideBtn = root.querySelector('[data-role="toggle-hide"]');
  const triggerLabel = root.querySelector('[data-role="trigger-label"]');

  const list = root.querySelector('[data-role="list"]');
  const realDetails = root.querySelector('[data-role="real-details"]');

  // money wrappers
  const triggerMoney = root.querySelector('[data-role="trigger-balance"]'); // wrapper .money
  const moneyWrappers = () => root.querySelectorAll(".money");

  // expiration element (fixed datetime)
  const expirationEl = root.querySelector('[data-role="real-expiration"]');

  // state
  let active =
    (root.dataset.active === "real" || root.dataset.active === "demo")
      ? root.dataset.active
      : "demo";

  // ✅ hideBalance SOMENTE no init: options.initialHideBalance OU data-hide-balance
  const dsHide = root.dataset.hideBalance;
  let hideBalance =
    (typeof options.initialHideBalance === "boolean")
      ? options.initialHideBalance
      : (dsHide === "true" ? true : false);

  // data (numbers only)
  const data = Object.assign(
    {
      real: { label: "Conta Real", balance: 0, saldo: 0, bonus: 0, bonusExpiresAt: null },
      demo: { label: "Conta Demo", balance: 0 }
    },
    options.data || {}
  );

  const animCfg = {
    duration: options.numberAnimationDuration ?? 700,
    minDelta: options.minDelta ?? 0.01,
    flashMs: options.flashMs ?? 120
  };

  /* ----- open/close ----- */
  function setOpen(isOpen) {
    dropdown.classList.toggle("is-open", isOpen);
    trigger.classList.toggle("is-open", isOpen);
    trigger.setAttribute("aria-expanded", String(isOpen));
  }
  function close() { setOpen(false); }
  function open() { setOpen(true); }
  function toggle() { setOpen(!dropdown.classList.contains("is-open")); }

  /* ----- active ----- */
  function setTriggerText() {
    if (!triggerLabel) return;
    triggerLabel.textContent =
      data[active]?.label ?? (active === "real" ? "Conta Real" : "Conta Demo");
  }

  function applyActive(nextActive, { render = true, emit = false } = {}) {
    if (nextActive !== "real" && nextActive !== "demo") return false;
    if (nextActive === active) return false;

    active = nextActive;
    root.dataset.active = active;

    root.querySelectorAll(".account-item").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.type === active);
    });

    setTriggerText();

    if (emit && typeof options.onChange === "function") options.onChange(active);
    if (render) updateUI({ animate: true });

    return true;
  }

  /* ----- hideBalance (instant) ----- */
  function applyHideBalance(nextHide, { render = true, emit = false } = {}) {
    const next = !!nextHide;
    if (hideBalance === next) return false;

    hideBalance = next;
    root.dataset.hideBalance = hideBalance ? "true" : "false"; // opcional (reflete no DOM)
    root.classList.toggle("is-hidden", hideBalance);

    toggleHideBtn.title = hideBalance ? "Mostrar saldo" : "Ocultar saldo";
    toggleHideBtn.setAttribute("aria-label", toggleHideBtn.title);

    if (render) {
      if (hideBalance) {
        moneyWrappers().forEach(hideMoneyInstant);
        if (realDetails) realDetails.style.display = "none";
      } else {
        updateUI({ animate: true });
      }
    }

    if (emit && typeof options.onHideBalanceChange === "function") {
      options.onHideBalanceChange(hideBalance);
    }

    return true;
  }

  /* ----- expiration (fixed datetime) ----- */
  function renderExpiration() {
    if (!expirationEl) return;
    const tsMs = normalizeTimestamp(data.real?.bonusExpiresAt);

    if (!tsMs) {
      expirationEl.textContent = "--/--/----, --:--:--";
      expirationEl.classList.remove("expired");
      return;
    }

    expirationEl.textContent = formatDateTimeBR(tsMs);
    expirationEl.classList.toggle("expired", tsMs <= Date.now());
  }

  /* ----- render UI ----- */
  function updateUI({ animate = true } = {}) {
    setTriggerText();

    if (hideBalance) {
      moneyWrappers().forEach(hideMoneyInstant);
      if (realDetails) realDetails.style.display = "none";
      return;
    }

    // list wrappers by data-type
    root.querySelectorAll('.money[data-type="real"]').forEach(w => {
      setMoneyNumber(w, data.real?.balance, { ...animCfg, animate });
    });
    root.querySelectorAll('.money[data-type="demo"]').forEach(w => {
      setMoneyNumber(w, data.demo?.balance, { ...animCfg, animate });
    });

    // trigger uses active balance
    if (triggerMoney) {
      setMoneyNumber(triggerMoney, data[active]?.balance, { ...animCfg, animate });
    }

    // real details only when active === real
    if (realDetails) {
      const show = active === "real";
      realDetails.style.display = show ? "block" : "none";

      if (show) {
        const saldoWrap = root.querySelector('[data-role="real-saldo"]')?.closest(".money");
        const bonusWrap = root.querySelector('[data-role="real-bonus"]')?.closest(".money");

        if (saldoWrap) setMoneyNumber(saldoWrap, data.real?.saldo, { ...animCfg, animate });
        if (bonusWrap) setMoneyNumber(bonusWrap, data.real?.bonus, { ...animCfg, animate });

        renderExpiration();
      }
    }
  }

  /* ----- diff + merge (ignore iguais) ----- */
  function diffAndMerge(next) {
    let changed = false;

    // top-level active (socket)
    if (next.active === "real" || next.active === "demo") {
      const changedActive = applyActive(next.active, { render: false, emit: false });
      if (changedActive) changed = true;
    }

    // ⚠️ hideBalance NÃO é lido do socket aqui (removido)

    // merge real/demo field-by-field
    ["real", "demo"].forEach(type => {
      if (!next[type]) return;

      Object.keys(next[type]).forEach(key => {
        const prev = data[type]?.[key];
        const val = next[type][key];

        let equal;
        if (typeof val === "number") equal = isNumberEqual(prev, val);
        else equal = prev === val;

        if (!equal) {
          data[type][key] = val;
          changed = true;
        }
      });
    });

    return changed;
  }

  /* ----- public API: setData (numbers + diff) ----- */
  function setData(nextData, { animate = true } = {}) {
    if (!nextData || typeof nextData !== "object") return false;

    const hasChanged = diffAndMerge(nextData);
    if (!hasChanged) return false;

    if (hideBalance) {
      moneyWrappers().forEach(hideMoneyInstant);
      if (realDetails) realDetails.style.display = "none";
      return true;
    }

    updateUI({ animate });
    return true;
  }

  /* ----- events ----- */
  trigger.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });

  document.addEventListener("click", (e) => { if (!root.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  dropdown.addEventListener("click", (e) => e.stopPropagation());

  toggleHideBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    applyHideBalance(!hideBalance, { render: true, emit: true }); // ✅ persiste via callback
  });

  list.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.dataset.action;

      if (action === "deposit") {
        if (typeof options.onDeposit === "function") options.onDeposit();
        close();
      } else if (action === "reload") {
        if (typeof options.onReload === "function") options.onReload();
      }
      return;
    }

    const item = e.target.closest(".account-item");
    if (!item) return;

    // user changed active locally
    applyActive(item.dataset.type, { render: true, emit: true });
    close();
  });

  /* ----- init (apply initial hideBalance instantly if true) ----- */
  setTriggerText();
  // set initial hide state (no delay)
  root.classList.toggle("is-hidden", hideBalance);
  toggleHideBtn.title = hideBalance ? "Mostrar saldo" : "Ocultar saldo";
  toggleHideBtn.setAttribute("aria-label", toggleHideBtn.title);

  updateUI({ animate: false });
  if (hideBalance) {
    moneyWrappers().forEach(hideMoneyInstant);
    if (realDetails) realDetails.style.display = "none";
  }

  /* ----- expose ----- */
  return {
    open, close, toggle,
    getActive: () => active,
    isHidden: () => hideBalance,

    setActive: (type, opts = {}) => applyActive(type, { render: true, emit: !!opts.emit }),
    setHideBalance: (v, opts = {}) => applyHideBalance(v, { render: true, emit: !!opts.emit }),

    // ✅ socket-friendly (sem hideBalance)
    setData
  };
}
