/* =========================================================
   LogicLab — script.js
   Vanilla ES6. No frameworks, no build step.
   ========================================================= */
'use strict';

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const bit = v => (v ? 1 : 0);

/* =========================================================
   0. THEME, NAV, PARTICLES, SEARCH
   ========================================================= */
(function initChrome(){
  // Theme toggle
  const body = document.body;
  const themeBtn = $('#themeToggle');
  const saved = localStorage.getItem('logiclab-theme');
  if (saved) body.dataset.theme = saved;
  themeBtn.addEventListener('click', () => {
    const next = body.dataset.theme === 'dark' ? 'light' : 'dark';
    body.dataset.theme = next;
    themeBtn.setAttribute('aria-pressed', String(next === 'dark'));
    localStorage.setItem('logiclab-theme', next);
  });

  // Mobile nav
  const navToggle = $('#navToggle');
  const navLinks = $('#navLinks');
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));

  // Hero particles
  const field = $('#heroParticles');
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('span');
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = (Math.random() * 12) + 's';
    p.style.animationDuration = (8 + Math.random() * 10) + 's';
    field.appendChild(p);
  }

  // Search index — built once other sections have rendered (see bottom init)
  window.LL_SEARCH_INDEX = [];
  const input = $('#searchInput');
  const results = $('#searchResults');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = window.LL_SEARCH_INDEX.filter(item => item.text.toLowerCase().includes(q)).slice(0, 8);
    results.innerHTML = matches.map(m => `<a href="${m.href}">${m.label}</a>`).join('') || '<a href="#" style="color:var(--text-muted)">No matches</a>';
    results.hidden = false;
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-search')) results.hidden = true; });

  // Nav bar reacts to scroll for a more polished top panel
  const navbar = $('.navbar');
  let navTicking = false;
  window.addEventListener('scroll', () => {
    if (navTicking) return;
    navTicking = true;
    requestAnimationFrame(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 12);
      navTicking = false;
    });
  }, { passive: true });

  // Smooth scroll-reveal for sections (respects prefers-reduced-motion via CSS)
  $$('main > .section').forEach(s => s.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal').forEach(s => io.observe(s));
})();

/* =========================================================
   0b. THEMED MODAL / TOAST (replaces native alert/confirm so
   every popup inherits the active dark/light theme)
   ========================================================= */
const LL = (() => {
  const overlay = document.createElement('div');
  overlay.className = 'll-modal-overlay';
  overlay.innerHTML = `<div class="ll-modal" role="alertdialog" aria-modal="true">
    <h4 id="llModalTitle"></h4><p id="llModalBody"></p>
    <button class="btn btn-primary btn-small" id="llModalOk">OK</button>
  </div>`;
  document.body.appendChild(overlay);
  const okBtn = $('#llModalOk', overlay);
  function close() { overlay.classList.remove('show'); }
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  function alertModal(message, title = 'Heads up') {
    $('#llModalTitle', overlay).textContent = title;
    $('#llModalBody', overlay).textContent = message;
    overlay.classList.add('show');
    okBtn.focus();
  }

  function toast(message) {
    const t = document.createElement('div');
    t.className = 'll-toast';
    t.textContent = message;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 2600);
  }

  return { alert: alertModal, toast };
})();

/* =========================================================
   Shared UI helpers
   ========================================================= */
function makeToggle(label, value, onToggle) {
  const wrap = document.createElement('div');
  wrap.className = 'io-toggle';
  const sw = document.createElement('div');
  sw.className = 'switch';
  sw.tabIndex = 0;
  sw.dataset.on = value ? '1' : '0';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', value ? 'true' : 'false');
  sw.setAttribute('aria-label', label);
  const fire = () => {
    const nv = sw.dataset.on === '1' ? 0 : 1;
    sw.dataset.on = String(nv);
    sw.setAttribute('aria-checked', nv ? 'true' : 'false');
    onToggle(nv);
  };
  sw.addEventListener('click', fire);
  sw.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fire(); } });
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = label;
  wrap.append(sw, name);
  return { wrap, sw, set: v => { sw.dataset.on = v ? '1' : '0'; sw.setAttribute('aria-checked', v ? 'true' : 'false'); } };
}
function setLed(el, on) { el.dataset.on = on ? '1' : '0'; }
function led(id) {
  const d = document.createElement('div');
  d.className = 'led';
  if (id) d.id = id;
  return d;
}
function makeLedField(labelText, initial) {
  const wrap = document.createElement('div');
  wrap.className = 'io-output';
  const l = led();
  const span = document.createElement('span');
  span.className = 'io-label';
  span.textContent = labelText;
  wrap.append(l, span);
  setLed(l, initial);
  return { wrap, led: l };
}

/* =========================================================
   1. LOGIC GATE SIMULATOR
   ========================================================= */
const GATES = {
  AND:    { inputs: 2, fn: (a,b) => a & b,              expr: 'A · B' },
  OR:     { inputs: 2, fn: (a,b) => a | b,              expr: 'A + B' },
  NOT:    { inputs: 1, fn: (a)   => a ? 0 : 1,           expr: "A'" },
  NAND:   { inputs: 2, fn: (a,b) => (a & b) ? 0 : 1,     expr: "(A · B)'" },
  NOR:    { inputs: 2, fn: (a,b) => (a | b) ? 0 : 1,     expr: "(A + B)'" },
  XOR:    { inputs: 2, fn: (a,b) => a ^ b,               expr: 'A ⊕ B' },
  XNOR:   { inputs: 2, fn: (a,b) => (a ^ b) ? 0 : 1,     expr: "(A ⊕ B)'" },
  BUFFER: { inputs: 1, fn: (a)   => a,                   expr: 'A' },
};
const GATE_DESC = {
  AND: 'Output is 1 only when every input is 1.',
  OR: 'Output is 1 when at least one input is 1.',
  NOT: 'Inverts the single input — a 0 becomes 1 and vice versa.',
  NAND: 'The universal gate: inverted AND. Any circuit can be built from NAND gates alone.',
  NOR: 'Inverted OR. Also a universal gate on its own.',
  XOR: 'Output is 1 when the inputs differ — the basis of binary addition.',
  XNOR: 'Output is 1 when the inputs match — an equality detector.',
  BUFFER: 'Passes the input through unchanged; used to restore signal strength.',
};

function gateSymbolSVG(type) {
  const inv = ['NAND','NOR','XNOR','NOT'].includes(type);
  const bubbleX = ['NOT'].includes(type) ? 52 : (['NAND'].includes(type) ? 70 : (['NOR','XNOR'].includes(type) ? 62 : 70));
  let body = '';
  if (['AND','NAND'].includes(type)) {
    body = `<path d="M10 6 H38 A26 26 0 0 1 38 58 H10 Z" class="g-body"/>`;
  } else if (['OR','NOR'].includes(type)) {
    body = `<path d="M8 6 Q26 6 40 32 Q26 58 8 58 Q22 32 8 6 Z" class="g-body"/>`;
  } else if (['XOR','XNOR'].includes(type)) {
    body = `<path d="M12 6 Q30 6 44 32 Q30 58 12 58 Q26 32 12 6 Z" class="g-body"/><path d="M4 6 Q18 32 4 58" class="g-body" fill="none"/>`;
  } else {
    body = `<path d="M8 6 L8 58 L46 32 Z" class="g-body"/>`;
  }
  const bubble = inv ? `<circle cx="${bubbleX}" cy="32" r="5" class="g-bubble"/>` : '';
  return `<svg viewBox="0 0 90 64" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <g fill="none" stroke="var(--accent-2)" stroke-width="2">${body}</g>
    <g fill="var(--bg-alt)" stroke="var(--accent-2)" stroke-width="2">${bubble}</g>
    <line x1="0" y1="18" x2="8" y2="18" stroke="var(--text-muted)" stroke-width="2"/>
    <line x1="0" y1="46" x2="8" y2="46" stroke="var(--text-muted)" stroke-width="2"/>
    <line x1="${inv ? bubbleX+5 : 46}" y1="32" x2="88" y2="32" stroke="var(--text-muted)" stroke-width="2"/>
  </svg>`;
}

const GateSim = (() => {
  let current = 'AND';
  let A = 1, B = 0;
  const tabsEl = $('#gateSelect');
  const inputsEl = $('#gateInputs');
  const symbolEl = $('#gateSymbol');
  const nameEl = $('#gateName');
  const descEl = $('#gateDesc');
  const eqEl = $('#gateEquation');
  const ledEl = $('#gateLed');
  const outValEl = $('#gateOutVal');
  const tableEl = $('#truthTable');

  Object.keys(GATES).forEach(type => {
    const o = document.createElement('option');
    o.value = type; o.textContent = type + ' Gate';
    if (type === current) o.selected = true;
    tabsEl.appendChild(o);
  });
  tabsEl.addEventListener('change', () => { current = tabsEl.value; render(); });

  function computeOutput() {
    const g = GATES[current];
    return g.inputs === 1 ? g.fn(A) : g.fn(A, B);
  }

  function renderInputs() {
    inputsEl.innerHTML = '';
    const tA = makeToggle('A', A, v => { A = v; refreshOutput(); });
    inputsEl.appendChild(tA.wrap);
    if (GATES[current].inputs === 2) {
      const tB = makeToggle('B', B, v => { B = v; refreshOutput(); });
      inputsEl.appendChild(tB.wrap);
    }
  }

  function refreshOutput() {
    const out = computeOutput();
    setLed(ledEl, out);
    outValEl.textContent = out;
    highlightRow();
  }

  function highlightRow() {
    $$('#truthTable tbody tr').forEach(tr => tr.classList.remove('active-row'));
    const g = GATES[current];
    const idx = g.inputs === 1 ? A : (A << 1) | B;
    const rows = $$('#truthTable tbody tr');
    if (rows[idx]) rows[idx].style.outline = '1px solid var(--accent-2)';
  }

  function renderTable() {
    const g = GATES[current];
    const rowsCount = g.inputs === 1 ? 2 : 4;
    let head = g.inputs === 1 ? '<tr><th>A</th><th>Y</th></tr>' : '<tr><th>A</th><th>B</th><th>Y</th></tr>';
    let rows = '';
    for (let i = 0; i < rowsCount; i++) {
      const a = g.inputs === 1 ? i : (i >> 1) & 1;
      const b = g.inputs === 1 ? null : i & 1;
      const y = g.inputs === 1 ? g.fn(a) : g.fn(a, b);
      rows += `<tr><td>${a}</td>${b === null ? '' : `<td>${b}</td>`}<td class="result-${y}">${y}</td></tr>`;
    }
    tableEl.innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;
  }

  function render() {
    tabsEl.value = current;
    symbolEl.innerHTML = gateSymbolSVG(current);
    nameEl.textContent = current.charAt(0) + current.slice(1).toLowerCase() + ' Gate';
    descEl.textContent = GATE_DESC[current];
    eqEl.textContent = GATES[current].expr;
    renderInputs();
    renderTable();
    refreshOutput();
  }

  $('#downloadCsv').addEventListener('click', () => {
    const g = GATES[current];
    let csv = g.inputs === 1 ? 'A,Y\n' : 'A,B,Y\n';
    const rowsCount = g.inputs === 1 ? 2 : 4;
    for (let i = 0; i < rowsCount; i++) {
      const a = g.inputs === 1 ? i : (i >> 1) & 1;
      const b = g.inputs === 1 ? null : i & 1;
      const y = g.inputs === 1 ? g.fn(a) : g.fn(a, b);
      csv += g.inputs === 1 ? `${a},${y}\n` : `${a},${b},${y}\n`;
    }
    downloadBlob(`${current.toLowerCase()}_truth_table.csv`, csv, 'text/csv');
  });

  document.addEventListener('keydown', e => {
    if (!document.getElementById('gates').getBoundingClientRect || document.activeElement.tagName === 'INPUT') return;
    if (e.key.toLowerCase() === 'a') { A = A ? 0 : 1; renderInputs(); refreshOutput(); }
    if (e.key.toLowerCase() === 'b' && GATES[current].inputs === 2) { B = B ? 0 : 1; renderInputs(); refreshOutput(); }
  });

  render();
  return { getState: () => ({ current, A, B }) };
})();

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* =========================================================
   2. K-MAP SOLVER (Quine–McCluskey)
   ========================================================= */
const KMap = (() => {
  let n = 4;
  let state = new Array(16).fill(0);
  const varsSelect = $('#kmapVars');
  const mintermsEl = $('#kmapMinterms');
  const gridEl = $('#kmapGrid');
  const exprEl = $('#kmapExpr');
  const groupsEl = $('#kmapGroups');

  function toBits(num, bits) { return num.toString(2).padStart(bits, '0'); }
  function gray(bits) { return bits === 1 ? [0,1] : [0,1,3,2]; }
  function dims() { return n === 2 ? { r:1,c:1 } : n === 3 ? { r:1,c:2 } : { r:2,c:2 }; }

  function combineBits(a, b) {
    let diff = 0, idx = -1;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { diff++; idx = i; }
    if (diff !== 1) return null;
    return a.slice(0, idx) + '-' + a.slice(idx + 1);
  }

  function qmMinimize(minterms) {
    if (minterms.length === 0) return { expr: '0', groups: [] };
    if (minterms.length === Math.pow(2, n)) return { expr: '1', groups: [] };
    let group = minterms.map(m => ({ bits: toBits(m, n), mints: [m] }));
    const allPI = [];
    while (group.length) {
      const next = [];
      const used = new Set();
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const combo = combineBits(group[i].bits, group[j].bits);
          if (combo !== null) {
            used.add(i); used.add(j);
            const mints = Array.from(new Set([...group[i].mints, ...group[j].mints])).sort((a,b)=>a-b);
            if (!next.find(t => t.bits === combo && t.mints.join(',') === mints.join(','))) next.push({ bits: combo, mints });
          }
        }
      }
      group.forEach((t, idx) => { if (!used.has(idx)) allPI.push(t); });
      group = next;
    }
    const seen = new Set(); const PIs = [];
    allPI.forEach(t => { if (!seen.has(t.bits)) { seen.add(t.bits); PIs.push(t); } });

    let remaining = new Set(minterms);
    const chosen = [];
    minterms.forEach(m => {
      const covering = PIs.filter(p => p.mints.includes(m));
      if (covering.length === 1 && !chosen.includes(covering[0])) chosen.push(covering[0]);
    });
    chosen.forEach(p => p.mints.forEach(m => remaining.delete(m)));
    while (remaining.size > 0) {
      let best = null, bestCover = -1;
      PIs.forEach(p => {
        if (chosen.includes(p)) return;
        const cover = p.mints.filter(m => remaining.has(m)).length;
        if (cover > bestCover) { bestCover = cover; best = p; }
      });
      if (!best) break;
      chosen.push(best);
      best.mints.forEach(m => remaining.delete(m));
    }
    const varNames = ['A','B','C','D'].slice(0, n);
    const terms = chosen.map(p => {
      let s = '';
      for (let i = 0; i < n; i++) {
        if (p.bits[i] === '1') s += varNames[i];
        else if (p.bits[i] === '0') s += varNames[i] + "'";
      }
      return s || '1';
    });
    return { expr: terms.join(' + '), groups: chosen };
  }

  function renderMinterms() {
    mintermsEl.innerHTML = '';
    for (let i = 0; i < Math.pow(2, n); i++) {
      const btn = document.createElement('button');
      btn.className = 'mt-toggle';
      btn.dataset.val = state[i];
      btn.innerHTML = `<span>m${i} <span class="muted">(${toBits(i,n)})</span></span><b>${state[i]}</b>`;
      btn.addEventListener('click', () => { state[i] = state[i] ? 0 : 1; renderMinterms(); renderGrid(); });
      mintermsEl.appendChild(btn);
    }
  }

  function renderGrid(groups = []) {
    const { r, c } = dims();
    const rowVals = gray(r), colVals = gray(c);
    gridEl.style.gridTemplateColumns = `repeat(${colVals.length}, 1fr)`;
    gridEl.innerHTML = '';
    for (let ri = 0; ri < rowVals.length; ri++) {
      for (let ci = 0; ci < colVals.length; ci++) {
        const idx = (rowVals[ri] << c) | colVals[ci];
        const cell = document.createElement('div');
        cell.className = 'kcell';
        cell.dataset.val = state[idx];
        cell.textContent = state[idx];
        cell.title = `m${idx}`;
        const g = groups.find(gr => gr.mints.includes(idx));
        if (g) cell.style.boxShadow = `inset 0 0 0 2px ${g.color}`;
        cell.addEventListener('click', () => { state[idx] = state[idx] ? 0 : 1; renderMinterms(); renderGrid(); });
        gridEl.appendChild(cell);
      }
    }
  }

  const palette = ['#3B82F6','#22D3EE','#10B981','#F59E0B','#F43F5E','#A78BFA'];
  $('#kmapSimplify').addEventListener('click', () => {
    const minterms = state.map((v,i) => v ? i : -1).filter(i => i >= 0);
    const { expr, groups } = qmMinimize(minterms);
    groups.forEach((g, i) => g.color = palette[i % palette.length]);
    exprEl.textContent = 'Y = ' + expr;
    groupsEl.innerHTML = groups.map(g => `<span style="border-color:${g.color};color:${g.color}">${g.bits} → m{${g.mints.join(',')}}</span>`).join('');
    renderGrid(groups);
  });
  $('#kmapClear').addEventListener('click', () => {
    state = new Array(Math.pow(2, n)).fill(0);
    exprEl.textContent = 'Y = —';
    groupsEl.innerHTML = '';
    renderMinterms(); renderGrid();
  });
  varsSelect.addEventListener('change', () => {
    n = Number(varsSelect.value);
    state = new Array(Math.pow(2, n)).fill(0);
    exprEl.textContent = 'Y = —';
    groupsEl.innerHTML = '';
    renderMinterms(); renderGrid();
  });

  renderMinterms(); renderGrid();
})();

/* =========================================================
   3. FLIP-FLOP LAB
   ========================================================= */
const FlipFlopLab = (() => {
  const types = ['SR','JK','D','T'];
  let current = 'SR';
  let Q = 0;
  let inputs = { S:0, R:0, J:0, K:0, D:0, T:0 };
  let history = [];
  const tabsEl = $('#ffSelect');
  const controlsEl = $('#ffControls');
  const qLed = $('#ffQLed');
  const qnLed = $('#ffQnLed');
  const tableEl = $('#ffTruthTable');
  const canvas = $('#ffTimingCanvas');
  const ctx = canvas.getContext('2d');

  const truthTables = {
    SR: [['S','R','Q(next)'],['0','0','Q (hold)'],['0','1','0'],['1','0','1'],['1','1','Invalid']],
    JK: [['J','K','Q(next)'],['0','0','Q (hold)'],['0','1','0'],['1','0','1'],['1','1',"Q' (toggle)"]],
    D:  [['D','Q(next)'],['0','0'],['1','1']],
    T:  [['T','Q(next)'],['0','Q (hold)'],['1',"Q' (toggle)"]],
  };

  types.forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t + ' Flip-Flop';
    if (t === current) o.selected = true;
    tabsEl.appendChild(o);
  });
  tabsEl.addEventListener('change', () => { current = tabsEl.value; history = []; renderControls(); renderTable(); drawTiming(); });

  function renderControls() {
    tabsEl.value = current;
    controlsEl.innerHTML = '';
    const pairs = { SR: ['S','R'], JK: ['J','K'], D: ['D'], T: ['T'] }[current];
    pairs.forEach(name => {
      const t = makeToggle(name, inputs[name], v => { inputs[name] = v; });
      controlsEl.appendChild(t.wrap);
    });
  }

  function nextQ() {
    if (current === 'SR') {
      if (inputs.S && inputs.R) return { q: Q, invalid: true };
      if (inputs.S) return { q: 1 };
      if (inputs.R) return { q: 0 };
      return { q: Q };
    }
    if (current === 'JK') {
      if (inputs.J && inputs.K) return { q: Q ? 0 : 1 };
      if (inputs.J) return { q: 1 };
      if (inputs.K) return { q: 0 };
      return { q: Q };
    }
    if (current === 'D') return { q: inputs.D };
    if (current === 'T') return { q: inputs.T ? (Q ? 0 : 1) : Q };
  }

  $('#ffClock').addEventListener('click', () => {
    const res = nextQ();
    if (res.invalid) {
      $('#circuitHint');
      LL.alert('S = 1 and R = 1 is not allowed for an SR flip-flop — the output is undefined on real hardware.', 'Invalid state');
    }
    Q = res.q;
    setLed(qLed, Q); setLed(qnLed, Q ? 0 : 1);
    history.push({ q: Q });
    if (history.length > 16) history.shift();
    drawTiming();
  });
  $('#ffReset').addEventListener('click', () => {
    Q = 0; history = [];
    setLed(qLed, 0); setLed(qnLed, 1);
    drawTiming();
  });

  function renderTable() {
    const rows = truthTables[current];
    const head = `<tr>${rows[0].map(h => `<th>${h}</th>`).join('')}</tr>`;
    const body = rows.slice(1).map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    tableEl.innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
  }

  function drawTiming() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border') || '#333';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#22D3EE';
    ctx.fillText('CLK', 8, 30);
    ctx.fillText('Q', 8, 120);
    const stepW = 44, x0 = 60, clkHigh = 16, clkLow = 40, qHigh = 96, qLow = 130;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    let x = x0;
    ctx.moveTo(x, clkLow);
    history.forEach(() => {
      ctx.lineTo(x, clkHigh); ctx.lineTo(x + stepW * 0.5, clkHigh);
      ctx.lineTo(x + stepW * 0.5, clkLow); ctx.lineTo(x + stepW, clkLow);
      x += stepW;
    });
    ctx.stroke();

    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    x = x0;
    let prevQ = 0;
    ctx.moveTo(x, prevQ ? qHigh : qLow);
    history.forEach(step => {
      const y = step.q ? qHigh : qLow;
      ctx.lineTo(x, prevQ ? qHigh : qLow);
      ctx.lineTo(x, y);
      ctx.lineTo(x + stepW, y);
      prevQ = step.q;
      x += stepW;
    });
    ctx.stroke();
  }

  renderControls(); renderTable(); drawTiming();
})();

/* =========================================================
   4. MUX / DEMUX
   ========================================================= */
const MuxDemux = (() => {
  let muxSize = 4, demuxSize = 4;
  let muxI = [0,1,0,1], muxS = [0,0];
  let demuxD = 1, demuxS = [0,0];

  function renderMux() {
    const inEl = $('#muxInputs'), selEl = $('#muxSelects'), ledEl = $('#muxLed'), valEl = $('#muxOutVal');
    inEl.innerHTML = ''; selEl.innerHTML = '';
    for (let i = 0; i < muxSize; i++) {
      const t = makeToggle(`I${i}`, muxI[i], v => { muxI[i] = v; refreshMux(); });
      inEl.appendChild(t.wrap);
    }
    const selCount = Math.log2(muxSize);
    for (let i = selCount - 1; i >= 0; i--) {
      const t = makeToggle(`S${i}`, muxS[i], v => { muxS[i] = v; refreshMux(); });
      selEl.appendChild(t.wrap);
    }
    refreshMux();
    function refreshMux() {
      let sel = 0;
      for (let i = 0; i < selCount; i++) sel = (sel << 1) | muxS[selCount - 1 - i];
      const out = muxI[sel] || 0;
      setLed(ledEl, out); valEl.textContent = out;
    }
  }

  function renderDemux() {
    const inEl = $('#demuxInputs'), selEl = $('#demuxSelects'), outEl = $('#demuxOutputs');
    inEl.innerHTML = ''; selEl.innerHTML = '';
    const t = makeToggle('D', demuxD, v => { demuxD = v; refreshDemux(); });
    inEl.appendChild(t.wrap);
    const selCount = Math.log2(demuxSize);
    for (let i = selCount - 1; i >= 0; i--) {
      const ts = makeToggle(`S${i}`, demuxS[i], v => { demuxS[i] = v; refreshDemux(); });
      selEl.appendChild(ts.wrap);
    }
    refreshDemux();
    function refreshDemux() {
      let sel = 0;
      for (let i = 0; i < selCount; i++) sel = (sel << 1) | demuxS[selCount - 1 - i];
      outEl.innerHTML = '';
      for (let i = 0; i < demuxSize; i++) {
        const field = makeLedField(`Y${i}`, i === sel ? demuxD : 0);
        outEl.appendChild(field.wrap);
      }
    }
  }

  $('#muxSize').addEventListener('change', e => { muxSize = Number(e.target.value); muxI = new Array(muxSize).fill(0); muxS = new Array(Math.log2(muxSize)).fill(0); renderMux(); });
  $('#demuxSize').addEventListener('change', e => { demuxSize = Number(e.target.value); demuxS = new Array(Math.log2(demuxSize)).fill(0); renderDemux(); });

  renderMux(); renderDemux();
})();

/* =========================================================
   5. ENCODER / DECODER
   ========================================================= */
const EncDec = (() => {
  let enc = [0,0,0,0];
  let dec = [0,0];

  function renderEncoder() {
    const inEl = $('#encInputs'), outEl = $('#encOutputs');
    inEl.innerHTML = '';
    enc.forEach((v, i) => {
      const t = makeToggle(`I${i}`, v, val => { enc[i] = val; refresh(); });
      inEl.appendChild(t.wrap);
    });
    refresh();
    function refresh() {
      const active = enc.map((v,i) => v ? i : -1).filter(i => i >= 0);
      let y1 = 0, y0 = 0, note = '';
      if (active.length === 0) note = 'No active input';
      else {
        const idx = active[active.length - 1];
        y1 = (idx >> 1) & 1; y0 = idx & 1;
        note = active.length > 1 ? 'Multiple inputs active — showing highest priority' : `Encoding I${idx}`;
      }
      outEl.innerHTML = '';
      outEl.appendChild(makeLedField('Y1', y1).wrap);
      outEl.appendChild(makeLedField('Y0', y0).wrap);
      const p = document.createElement('p'); p.className = 'muted small'; p.style.width = '100%'; p.textContent = note;
      outEl.appendChild(p);
    }
  }

  function renderDecoder() {
    const inEl = $('#decInputs'), outEl = $('#decOutputs');
    inEl.innerHTML = '';
    ['I1','I0'].forEach((name, i) => {
      const t = makeToggle(name, dec[i], val => { dec[i] = val; refresh(); });
      inEl.appendChild(t.wrap);
    });
    const en = makeToggle('Enable', 1, val => { dec.enable = val; refresh(); });
    dec.enable = 1;
    inEl.appendChild(en.wrap);
    refresh();
    function refresh() {
      const sel = (dec[0] << 1) | dec[1];
      outEl.innerHTML = '';
      for (let i = 0; i < 4; i++) outEl.appendChild(makeLedField(`Y${i}`, dec.enable && i === sel ? 1 : 0).wrap);
    }
  }

  renderEncoder(); renderDecoder();
})();

/* =========================================================
   6. HALF / FULL ADDER
   ========================================================= */
const Adders = (() => {
  let ha = { A: 0, B: 0 };
  let fa = { A: 0, B: 0, Cin: 0 };

  function renderHalf() {
    const inEl = $('#haInputs'), outEl = $('#haOutputs'), tableEl = $('#haTable');
    inEl.innerHTML = '';
    ['A','B'].forEach(name => inEl.appendChild(makeToggle(name, ha[name], v => { ha[name] = v; refresh(); }).wrap));
    tableEl.innerHTML = `<thead><tr><th>A</th><th>B</th><th>Sum</th><th>Carry</th></tr></thead><tbody>
      ${[0,1].flatMap(a=>[0,1].map(b=>`<tr><td>${a}</td><td>${b}</td><td>${a^b}</td><td>${a&b}</td></tr>`)).join('')}
    </tbody>`;
    refresh();
    function refresh() {
      outEl.innerHTML = '';
      outEl.appendChild(makeLedField('Sum', ha.A ^ ha.B).wrap);
      outEl.appendChild(makeLedField('Carry', ha.A & ha.B).wrap);
    }
  }

  function renderFull() {
    const inEl = $('#faInputs'), outEl = $('#faOutputs'), tableEl = $('#faTable');
    inEl.innerHTML = '';
    ['A','B','Cin'].forEach(name => inEl.appendChild(makeToggle(name, fa[name], v => { fa[name] = v; refresh(); }).wrap));
    let rows = '';
    for (let i = 0; i < 8; i++) {
      const a=(i>>2)&1,b=(i>>1)&1,c=i&1, sum=a^b^c, cout=(a&b)|(b&c)|(a&c);
      rows += `<tr><td>${a}</td><td>${b}</td><td>${c}</td><td>${sum}</td><td>${cout}</td></tr>`;
    }
    tableEl.innerHTML = `<thead><tr><th>A</th><th>B</th><th>Cin</th><th>Sum</th><th>Cout</th></tr></thead><tbody>${rows}</tbody>`;
    refresh();
    function refresh() {
      const sum = fa.A ^ fa.B ^ fa.Cin;
      const cout = (fa.A & fa.B) | (fa.B & fa.Cin) | (fa.A & fa.Cin);
      outEl.innerHTML = '';
      outEl.appendChild(makeLedField('Sum', sum).wrap);
      outEl.appendChild(makeLedField('Cout', cout).wrap);
    }
  }

  renderHalf(); renderFull();
})();

/* =========================================================
   6b. SIMULATOR DIAGRAMS — simple theme-aware block diagrams
   that make each simulator's pinout easy to understand at a glance
   ========================================================= */
function ioBoxDiagram(title, ins, outs, bottomPins = []) {
  const w = 480, h = 200;
  const boxX = 170, boxW = 140, boxY = 30, boxH = 140;
  const inGap = boxH / (ins.length + 1);
  const outGap = boxH / (outs.length + 1);
  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="10" class="dia-body"/>`;
  svg += `<text x="${boxX + boxW / 2}" y="${boxY + boxH / 2 + 5}" text-anchor="middle" class="dia-label" font-weight="700">${title}</text>`;
  ins.forEach((label, i) => {
    const y = boxY + inGap * (i + 1);
    svg += `<line x1="${boxX - 40}" y1="${y}" x2="${boxX}" y2="${y}" class="dia-line"/><circle cx="${boxX - 40}" cy="${y}" r="3" class="dia-accent"/>`;
    svg += `<text x="${boxX - 48}" y="${y + 4}" text-anchor="end" class="dia-muted">${label}</text>`;
  });
  outs.forEach((label, i) => {
    const y = boxY + outGap * (i + 1);
    svg += `<line x1="${boxX + boxW}" y1="${y}" x2="${boxX + boxW + 40}" y2="${y}" class="dia-line"/><circle cx="${boxX + boxW + 40}" cy="${y}" r="3" class="dia-accent"/>`;
    svg += `<text x="${boxX + boxW + 48}" y="${y + 4}" text-anchor="start" class="dia-muted">${label}</text>`;
  });
  bottomPins.forEach((label, i) => {
    const gap = boxW / (bottomPins.length + 1);
    const x = boxX + gap * (i + 1);
    svg += `<line x1="${x}" y1="${boxY + boxH}" x2="${x}" y2="${boxY + boxH + 28}" class="dia-line"/><circle cx="${x}" cy="${boxY + boxH + 28}" r="3" class="dia-accent"/>`;
    svg += `<text x="${x}" y="${boxY + boxH + 42}" text-anchor="middle" class="dia-muted">${label}</text>`;
  });
  svg += `</svg>`;
  return svg;
}

(function renderDiagrams() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('muxDiagram', ioBoxDiagram('MUX', ['I0','I1','I2','I3'], ['Y'], ['S1','S0']));
  put('demuxDiagram', ioBoxDiagram('DEMUX', ['D'], ['Y0','Y1','Y2','Y3'], ['S1','S0']));
  put('encDiagram', ioBoxDiagram('ENCODER', ['I0','I1','I2','I3'], ['Y1','Y0'], []));
  put('decDiagram', ioBoxDiagram('DECODER', ['I1','I0'], ['Y0','Y1','Y2','Y3'], ['EN']));
  put('haDiagram', ioBoxDiagram('HALF ADDER', ['A','B'], ['Sum','Carry'], []));
  put('faDiagram', ioBoxDiagram('FULL ADDER', ['A','B','Cin'], ['Sum','Cout'], []));
  put('ffDiagram', ioBoxDiagram('D FLIP-FLOP', ['D'], ['Q',"Q'"], ['CLK']) +
    '<p class="muted small" style="text-align:center;margin-top:.5rem">Shown as a D flip-flop for reference — SR/JK/T share the same Q/Q\' outputs and clock pin, just with different data inputs.</p>');
})();

/* =========================================================
   7. PROPAGATION DELAY VISUALIZER
   ========================================================= */
const DelayLab = (() => {
  const sel = $('#delayGate');
  const range = $('#delayNs');
  const label = $('#delayNsLabel');
  const svg = $('#delaySvg');
  const status = $('#delayStatus');
  let A = 0; const Bfixed = 1;

  Object.keys(GATES).forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o);
  });
  sel.value = 'AND';
  range.addEventListener('input', () => label.textContent = range.value + ' ns');

  function draw(outputVal, animating) {
    const g = GATES[sel.value];
    const twoInput = g.inputs === 2;
    svg.innerHTML = `
      <line x1="20" y1="60" x2="280" y2="60" stroke="var(--accent)" stroke-width="3"/>
      ${twoInput ? '<line x1="20" y1="120" x2="280" y2="120" stroke="var(--text-muted)" stroke-width="3"/>' : ''}
      <rect x="280" y="${twoInput?40:70}" width="120" height="${twoInput?100:40}" rx="10" fill="var(--surface-strong)" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="340" y="${twoInput?96:94}" text-anchor="middle" fill="var(--text)" font-family="monospace" font-size="16" font-weight="700">${sel.value}</text>
      <line x1="400" y1="${twoInput?90:90}" x2="620" y2="90" stroke="${outputVal ? 'var(--accent-3)' : 'var(--text-muted)'}" stroke-width="3"/>
      <circle cx="650" cy="90" r="20" fill="${outputVal ? 'var(--accent-3)' : 'var(--bg-alt)'}" stroke="var(--border)" stroke-width="2"/>
      <text x="18" y="50" fill="var(--text-muted)" font-family="monospace" font-size="12">A=${A}</text>
      ${twoInput ? `<text x="18" y="112" fill="var(--text-muted)" font-family="monospace" font-size="12">B=${Bfixed}</text>` : ''}
      ${animating ? `<circle r="6" fill="var(--accent-2)"><animateMotion dur="${range.value}ms" repeatCount="1" path="M20 60 H280"/></circle>` : ''}
    `;
  }

  function currentOutput() {
    const g = GATES[sel.value];
    return g.inputs === 1 ? g.fn(A) : g.fn(A, Bfixed);
  }

  draw(currentOutput(), false);

  $('#delayFire').addEventListener('click', () => {
    A = A ? 0 : 1;
    const before = currentOutput.__last;
    status.textContent = `Signal propagating through ${sel.value}…`;
    draw($('#delaySvg') && Number($('#delaySvg').dataset.out || 0), true);
    const ns = Number(range.value);
    setTimeout(() => {
      const out = currentOutput();
      draw(out, false);
      status.textContent = `Signal settled after ${ns} ns.`;
    }, Math.min(ns, 1600));
  });
  sel.addEventListener('change', () => { draw(currentOutput(), false); status.textContent = 'Signal settled.'; });
})();

/* =========================================================
   8. CIRCUIT BUILDER
   ========================================================= */
const CircuitBuilder = (() => {
  const GATE_IN = { INPUT:0, OUTPUT:1, AND:2, OR:2, NOT:1, NAND:2, NOR:2, XOR:2, XNOR:2, BUFFER:1 };
  const GATE_FN = {
    AND: v=>v[0]&v[1], OR: v=>v[0]|v[1], NOT: v=>v[0]?0:1, NAND: v=>(v[0]&v[1])?0:1,
    NOR: v=>(v[0]|v[1])?0:1, XOR: v=>v[0]^v[1], XNOR: v=>(v[0]^v[1])?0:1, BUFFER: v=>v[0],
  };
  const PALETTE = ['INPUT','OUTPUT','AND','OR','NOT','NAND','NOR','XOR','XNOR','BUFFER'];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const paletteEl = $('#circuitPalette');
  const canvasWrap = $('.circuit-canvas-wrap');
  const canvasEl = $('#circuitCanvas');
  const wiresEl = $('#circuitWires');
  const hintEl = $('#circuitHint');
  const SVGNS = 'http://www.w3.org/2000/svg';

  let nodes = [];
  let connections = [];
  let idCounter = 1;
  let deleteMode = false;

  // caches — kept in sync by renderStructure(); simulate()/drag only ever
  // touch these cached elements instead of rebuilding the DOM each time.
  let nodeEls = new Map();   // nodeId -> div
  let valueEls = new Map();  // nodeId -> value span/button
  let portEls = new Map();   // "id:type:idx" -> port element
  let wireEls = new Map();   // connId -> line element
  let prevWireVal = new Map(); // connId -> last displayed value, for propagation pulses

  const portKey = (id, ptype, idx) => `${id}:${ptype}:${idx}`;

  PALETTE.forEach(type => {
    const item = document.createElement('div');
    item.className = 'pal-item';
    item.textContent = type;
    item.draggable = true;
    item.addEventListener('dragstart', e => e.dataTransfer.setData('text/type', type));
    paletteEl.appendChild(item);
  });

  canvasWrap.addEventListener('dragover', e => e.preventDefault());
  canvasWrap.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/type');
    if (!type) return;
    const rect = canvasEl.getBoundingClientRect();
    addNode(type, e.clientX - rect.left - 40, e.clientY - rect.top - 25);
  });

  function addNode(type, x, y) {
    const n = { id: 'n' + (idCounter++), type, x: Math.max(0,x), y: Math.max(0,y), value: type === 'INPUT' ? 0 : null };
    nodes.push(n);
    renderStructure();
    return n;
  }

  function deleteNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    connections = connections.filter(c => c.fromNode !== id && c.toNode !== id);
    renderStructure();
  }
  function deleteConnection(id) {
    connections = connections.filter(c => c.id !== id);
    renderStructure();
  }

  function tryConnect(a, b) {
    if (a.ptype === b.ptype) return;           // need one out + one in
    if (a.nodeId === b.nodeId) return;          // no self-loops
    const outSide = a.ptype === 'out' ? a : b;
    const inSide  = a.ptype === 'in'  ? a : b;
    connections = connections.filter(c => !(c.toNode === inSide.nodeId && c.toPort === inSide.idx));
    connections.push({ id: 'c' + (idCounter++), fromNode: outSide.nodeId, toNode: inSide.nodeId, toPort: inSide.idx });
    renderStructure();
  }

  function wrapRect() { return canvasWrap.getBoundingClientRect(); }
  function portCenter(portEl, rect) {
    const r = portEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - rect.left, y: r.top + r.height / 2 - rect.top };
  }

  // ---- drag to create a wire, starting from either an in or an out port ----
  function onPortMouseDown(e, nodeId, idx, ptype) {
    e.stopPropagation(); e.preventDefault();
    if (deleteMode) return;
    const rect = wrapRect();
    const portEl = portEls.get(portKey(nodeId, ptype, idx));
    const start = portCenter(portEl, rect);
    const temp = document.createElementNS(SVGNS, 'line');
    temp.setAttribute('class', 'pending-wire');
    temp.setAttribute('x1', start.x); temp.setAttribute('y1', start.y);
    temp.setAttribute('x2', start.x); temp.setAttribute('y2', start.y);
    wiresEl.appendChild(temp);

    function onMove(ev) {
      temp.setAttribute('x2', ev.clientX - rect.left);
      temp.setAttribute('y2', ev.clientY - rect.top);
    }
    function onUp(ev) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      temp.remove();
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const portTarget = target && target.closest && target.closest('.circuit-port');
      if (portTarget) {
        tryConnect({ nodeId, idx, ptype }, { nodeId: portTarget.dataset.nodeId, idx: Number(portTarget.dataset.port), ptype: portTarget.dataset.ptype });
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ---- drag to reposition a node; only touches cached wire elements ----
  function startNodeDrag(e, n, div) {
    const rect = wrapRect();
    const offX = e.clientX - rect.left - n.x;
    const offY = e.clientY - rect.top - n.y;
    let raf = null;
    function apply(clientX, clientY) {
      n.x = Math.max(0, Math.min(rect.width - 90, clientX - rect.left - offX));
      n.y = Math.max(0, Math.min(rect.height - 50, clientY - rect.top - offY));
      div.style.left = n.x + 'px'; div.style.top = n.y + 'px';
      updateWiresTouching(n.id);
      raf = null;
    }
    function onMove(ev) {
      if (raf) return;
      raf = requestAnimationFrame(() => apply(ev.clientX, ev.clientY));
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function updateWiresTouching(nodeId) {
    const rect = wrapRect();
    connections.forEach(c => {
      if (c.fromNode !== nodeId && c.toNode !== nodeId) return;
      const line = wireEls.get(c.id);
      const outPort = portEls.get(portKey(c.fromNode, 'out', 0));
      const inPort = portEls.get(portKey(c.toNode, 'in', c.toPort));
      if (!line || !outPort || !inPort) return;
      const p1 = portCenter(outPort, rect), p2 = portCenter(inPort, rect);
      line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
    });
  }

  function makePort(n, ptype, idx, topPct) {
    const p = document.createElement('div');
    p.className = 'circuit-port ' + ptype;
    p.style.top = topPct;
    p.dataset.nodeId = n.id; p.dataset.port = idx; p.dataset.ptype = ptype;
    p.title = ptype === 'in' ? `Input ${idx}` : 'Output';
    p.addEventListener('mousedown', e => onPortMouseDown(e, n.id, idx, ptype));
    portEls.set(portKey(n.id, ptype, idx), p);
    return p;
  }

  function renderNode(n) {
    const div = document.createElement('div');
    div.className = 'circuit-node';
    div.style.left = n.x + 'px'; div.style.top = n.y + 'px';
    const label = document.createElement('div'); label.textContent = n.type; div.appendChild(label);

    let valueEl;
    if (n.type === 'INPUT') {
      valueEl = document.createElement('button');
      valueEl.className = 'val';
      valueEl.textContent = n.value;
      valueEl.addEventListener('mousedown', e => e.stopPropagation());
      valueEl.addEventListener('click', e => { e.stopPropagation(); n.value = n.value ? 0 : 1; simulate(); });
    } else {
      valueEl = document.createElement('span');
      valueEl.className = 'val';
      valueEl.dataset.role = 'out';
      valueEl.textContent = '–';
    }
    div.appendChild(valueEl);
    valueEls.set(n.id, valueEl);

    const inCount = GATE_IN[n.type];
    for (let i = 0; i < inCount; i++) {
      div.appendChild(makePort(n, 'in', i, inCount === 1 ? '50%' : (i === 0 ? '30%' : '70%')));
    }
    if (n.type !== 'OUTPUT') div.appendChild(makePort(n, 'out', 0, '50%'));

    div.addEventListener('mousedown', e => {
      if (deleteMode) { deleteNode(n.id); return; }
      startNodeDrag(e, n, div);
    });
    div.classList.toggle('delete-armed', deleteMode);
    canvasEl.appendChild(div);
    nodeEls.set(n.id, div);
  }

  function renderWireEl(c) {
    const line = document.createElementNS(SVGNS, 'line');
    line.dataset.id = c.id;
    wiresEl.appendChild(line);
    const hit = document.createElementNS(SVGNS, 'line');
    hit.setAttribute('class', 'hit-area');
    hit.addEventListener('click', () => { if (deleteMode) deleteConnection(c.id); });
    wiresEl.appendChild(hit);
    wireEls.set(c.id, line);
    return { line, hit };
  }

  // full rebuild — only called on structural changes (add/delete/connect/import/reset)
  function renderStructure() {
    canvasEl.innerHTML = ''; wiresEl.innerHTML = '';
    nodeEls.clear(); valueEls.clear(); portEls.clear(); wireEls.clear();
    nodes.forEach(renderNode);
    const rect = wrapRect();
    connections.forEach(c => {
      const { line, hit } = renderWireEl(c);
      const outPort = portEls.get(portKey(c.fromNode, 'out', 0));
      const inPort = portEls.get(portKey(c.toNode, 'in', c.toPort));
      if (outPort && inPort) {
        const p1 = portCenter(outPort, rect), p2 = portCenter(inPort, rect);
        [line, hit].forEach(el => { el.setAttribute('x1', p1.x); el.setAttribute('y1', p1.y); el.setAttribute('x2', p2.x); el.setAttribute('y2', p2.y); });
      }
    });
    simulate();
  }

  function spawnPulse(line, on) {
    if (reduceMotion || !line) return;
    const x1 = line.getAttribute('x1'), y1 = line.getAttribute('y1'), x2 = line.getAttribute('x2'), y2 = line.getAttribute('y2');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', 4);
    dot.setAttribute('fill', on ? 'var(--sig-1)' : 'var(--sig-0)');
    const anim = document.createElementNS(SVGNS, 'animateMotion');
    anim.setAttribute('dur', '450ms');
    anim.setAttribute('path', `M${x1} ${y1} L${x2} ${y2}`);
    anim.addEventListener('endEvent', () => dot.remove());
    dot.appendChild(anim);
    wiresEl.appendChild(dot);
    setTimeout(() => dot.remove(), 500);
  }

  // value + color pass only — never touches node/wire DOM structure, so this
  // stays cheap even in large circuits and can run on every input toggle.
  function simulate() {
    const values = {};
    nodes.forEach(n => values[n.id] = n.type === 'INPUT' ? n.value : null);
    let changed = true, iter = 0;
    while (changed && iter < 60) {
      changed = false; iter++;
      nodes.forEach(n => {
        if (n.type === 'INPUT') return;
        const inConns = connections.filter(c => c.toNode === n.id);
        if (n.type === 'OUTPUT') {
          if (inConns.length && values[inConns[0].fromNode] != null) {
            if (values[n.id] !== values[inConns[0].fromNode]) { values[n.id] = values[inConns[0].fromNode]; changed = true; }
          }
          return;
        }
        const need = GATE_IN[n.type];
        const vals = []; let ready = true;
        for (let p = 0; p < need; p++) {
          const c = inConns.find(cc => cc.toPort === p);
          if (!c || values[c.fromNode] == null) { ready = false; break; }
          vals.push(values[c.fromNode]);
        }
        if (ready) {
          const out = GATE_FN[n.type](vals);
          if (values[n.id] !== out) { values[n.id] = out; changed = true; }
        }
      });
    }

    nodes.forEach(n => {
      if (n.type === 'INPUT') return;
      const el = valueEls.get(n.id);
      if (!el) return;
      const v = values[n.id];
      el.textContent = v === null || v === undefined ? '–' : v;
      el.classList.toggle('sig-1', v === 1);
      el.classList.toggle('sig-0', v === 0);
    });

    connections.forEach(c => {
      const line = wireEls.get(c.id);
      if (!line) return;
      const v = values[c.fromNode];
      line.classList.toggle('sig-1', v === 1);
      line.classList.toggle('sig-0', v === 0);
      const last = prevWireVal.get(c.id);
      if (v !== undefined && v !== null && v !== last) { spawnPulse(line, v === 1); prevWireVal.set(c.id, v); }
    });
  }

  $('#circuitSimulate').addEventListener('click', simulate);
  $('#circuitDeleteMode').addEventListener('click', (e) => {
    deleteMode = !deleteMode;
    e.target.classList.toggle('btn-primary', deleteMode);
    hintEl.textContent = deleteMode
      ? 'Delete mode: click a node or a wire to remove it.'
      : "Tip: drag from an output port (right, orange) to an input port (left, blue) to connect them.";
    nodeEls.forEach(div => div.classList.toggle('delete-armed', deleteMode));
    wiresEl.classList.toggle('delete-mode', deleteMode);
  });
  $('#circuitReset').addEventListener('click', () => { nodes = []; connections = []; renderStructure(); });
  $('#circuitExport').addEventListener('click', () => {
    downloadBlob('circuit.json', JSON.stringify({ nodes, connections }, null, 2), 'application/json');
    LL.toast('Circuit exported as circuit.json');
  });
  $('#circuitImport').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.nodes) && Array.isArray(data.connections)) {
          nodes = data.nodes; connections = data.connections;
          idCounter = 1 + nodes.reduce((m,n)=>Math.max(m, parseInt(n.id.slice(1))||0), 0);
          renderStructure();
          LL.toast('Circuit imported successfully.');
        }
      } catch (err) { LL.alert('That file does not look like a valid LogicLab circuit export.', 'Import failed'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // seed a starter demo circuit
  const a = addNode('INPUT', 20, 40);
  const b = addNode('INPUT', 20, 140);
  const g = addNode('AND', 220, 90);
  const o = addNode('OUTPUT', 420, 90);
  a.value = 1; b.value = 0;
  connections.push({ id: 'c'+(idCounter++), fromNode: a.id, toNode: g.id, toPort: 0 });
  connections.push({ id: 'c'+(idCounter++), fromNode: b.id, toNode: g.id, toPort: 1 });
  connections.push({ id: 'c'+(idCounter++), fromNode: g.id, toNode: o.id, toPort: 0 });
  renderStructure();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderStructure, 150);
  });

  return { getState: () => ({ nodes, connections, GATE_IN, GATE_FN }) };
})();

/* =========================================================
   9. BINARY CALCULATOR
   ========================================================= */
const Calculator = (() => {
  $$('.calc-tab').forEach(tab => tab.addEventListener('click', () => {
    $$('.calc-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $('#calcConvert').hidden = tab.dataset.mode !== 'convert';
    $('#calcArith').hidden = tab.dataset.mode !== 'arith';
  }));

  function convert() {
    const raw = $('#calcInput').value.trim();
    const base = Number($('#calcInputBase').value);
    const resEl = $('#calcResults');
    if (!raw) { resEl.innerHTML = ''; return; }
    const dec = parseInt(raw, base);
    if (Number.isNaN(dec)) { resEl.innerHTML = '<div><b>Error</b>Invalid digits for that base.</div>'; return; }
    resEl.innerHTML = `
      <div><b>Decimal</b>${dec}</div>
      <div><b>Binary</b>${dec.toString(2)}</div>
      <div><b>Hexadecimal</b>${dec.toString(16).toUpperCase()}</div>
      <div><b>Octal</b>${dec.toString(8)}</div>`;
  }
  $('#calcInput').addEventListener('input', convert);
  $('#calcInputBase').addEventListener('change', convert);

  $('#arithGo').addEventListener('click', () => {
    const a = $('#arithA').value.trim(), b = $('#arithB').value.trim(), op = $('#arithOp').value;
    const resEl = $('#arithResults');
    if (!/^[01]+$/.test(a) || !/^[01]+$/.test(b)) { resEl.innerHTML = '<div><b>Error</b>Enter valid binary numbers (0/1 only).</div>'; return; }
    const da = parseInt(a, 2), db = parseInt(b, 2);
    let result;
    if (op === '+') result = da + db;
    else if (op === '-') result = da - db;
    else if (op === '*') result = da * db;
    else result = db === 0 ? NaN : Math.trunc(da / db);
    if (Number.isNaN(result)) { resEl.innerHTML = '<div><b>Error</b>Division by zero.</div>'; return; }
    const sign = result < 0 ? '-' : '';
    const abs = Math.abs(result);
    resEl.innerHTML = `
      <div><b>Result (decimal)</b>${result}</div>
      <div><b>Result (binary)</b>${sign}${abs.toString(2)}</div>
      <div><b>Result (hex)</b>${sign}${abs.toString(16).toUpperCase()}</div>`;
  });
})();

/* =========================================================
   10. LEARNING CENTER
   ========================================================= */
const LEARN_TOPICS = [
  { tag:'Fundamentals', title:'Logic Gates', def:'The basic building blocks of digital circuits, each implementing a single Boolean operation on one or more binary inputs.', app:'Every digital chip — from a calculator to a CPU — is built entirely from gates.', adv:'Fast, cheap, and composable into arbitrarily complex logic.', ex:'A doorbell circuit using an OR gate for two buttons.' },
  { tag:'Fundamentals', title:'Boolean Algebra', def:'A mathematical system for describing logical relationships using AND, OR and NOT operations, governed by laws like De Morgan\'s theorems.', app:'Used to simplify circuits before they are fabricated, reducing gate count and cost.', adv:'Provides a rigorous way to prove two circuits are equivalent.', ex:'Simplifying A·B + A·B\' to just A.' },
  { tag:'Fundamentals', title:'Truth Tables', def:'A table listing every possible input combination for a circuit alongside its resulting output.', app:'Used to specify, verify, and debug combinational logic.', adv:'Exhaustive and unambiguous — leaves no input combination undefined.', ex:'A 3-input majority voter truth table with 8 rows.' },
  { tag:'Combinational', title:'Combinational Circuits', def:'Circuits whose output depends only on the current inputs, with no memory of past inputs.', app:'Adders, multiplexers, encoders and ALUs.', adv:'Simple to analyze since there is no timing/state dependency.', ex:'A full adder computing a sum instantly from A, B and Cin.' },
  { tag:'Sequential', title:'Sequential Circuits', def:'Circuits whose output depends on both current inputs and stored past state, driven by a clock.', app:'Counters, registers, memory, finite-state machines.', adv:'Can "remember" — essential for any system with state.', ex:'A 4-bit binary counter built from T flip-flops.' },
  { tag:'Sequential', title:'Flip-Flops', def:'The fundamental 1-bit memory element of digital electronics, updated on a clock edge.', app:'Registers, counters, and pipeline stages inside processors.', adv:'Reliable, synchronous state storage.', ex:'A D flip-flop capturing a sensor reading once per clock cycle.' },
  { tag:'Data Routing', title:'Multiplexers (MUX)', def:'A circuit that selects one of several input signals and forwards it to a single output, based on select lines.', app:'Routing data on a shared bus; implementing arbitrary Boolean functions.', adv:'Reduces the number of physical lines needed to route data.', ex:'A 4:1 MUX choosing which of four sensors feeds an ADC.' },
  { tag:'Data Routing', title:'Demultiplexers (DEMUX)', def:'The inverse of a MUX — it routes a single input to one of several outputs based on select lines.', app:'Distributing a single data stream to multiple destinations.', adv:'Enables one source to serve many receivers efficiently.', ex:'A 1:4 DEMUX sending a signal to one of four LEDs.' },
  { tag:'Code Conversion', title:'Encoders', def:'Circuits that convert an active input line (one-hot) into a compact binary code.', app:'Keyboard matrix scanning, priority interrupt controllers.', adv:'Compresses many lines into a small binary code.', ex:'An 8:3 encoder converting a keypress line into a 3-bit code.' },
  { tag:'Code Conversion', title:'Decoders', def:'Circuits that convert a binary code into a single active output line.', app:'Memory address decoding, seven-segment displays.', adv:'Cleanly expands a compact code into distinct control lines.', ex:'A 3:8 decoder selecting one of eight memory chips.' },
  { tag:'Arithmetic', title:'Half Adder', def:'A circuit that adds two single bits, producing a Sum and a Carry output.', app:'The basic building block of larger adders.', adv:'Minimal — only an XOR and an AND gate.', ex:'Adding bit 0 of two binary numbers.' },
  { tag:'Arithmetic', title:'Full Adder', def:'Adds two bits plus a carry-in, producing a Sum and Carry-out — chainable to build a ripple-carry adder.', app:'CPUs\' arithmetic logic units (ALUs).', adv:'Can be cascaded to add numbers of any width.', ex:'Four full adders chained to add two 4-bit numbers.' },
  { tag:'Number Systems', title:'Binary Number System', def:'A base-2 positional numbering system using only the digits 0 and 1, matching the two states a transistor can hold.', app:'The native representation for all digital computation.', adv:'Maps directly onto physical on/off electrical states.', ex:'1011₂ = 11 in decimal.' },
];

(function renderLearn(){
  const grid = $('#learnGrid');
  LEARN_TOPICS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'glass panel learn-card';
    card.innerHTML = `
      <span class="tag">${t.tag}</span>
      <h3>${t.title}</h3>
      <p class="muted small">${t.def}</p>
      <details>
        <summary>Applications, advantages &amp; example</summary>
        <ul>
          <li><b>Applications:</b> ${t.app}</li>
          <li><b>Advantages:</b> ${t.adv}</li>
          <li><b>Example:</b> ${t.ex}</li>
        </ul>
      </details>`;
    grid.appendChild(card);
    window.LL_SEARCH_INDEX.push({ text: t.title + ' ' + t.tag + ' ' + t.def, label: t.title, href: '#learn' });
  });
  Object.keys(GATES).forEach(g => window.LL_SEARCH_INDEX.push({ text: g + ' logic gate ' + GATES[g].expr, label: g + ' Gate', href: '#gates' }));
  ['K-Map','Flip-Flop','Multiplexer','Demultiplexer','Encoder','Decoder','Half Adder','Full Adder','Binary Calculator','Circuit Builder','Propagation Delay','Quiz'].forEach(t =>
    window.LL_SEARCH_INDEX.push({ text: t, label: t, href: '#' + t.toLowerCase().replace(/[^a-z]+/g,'') })
  );
})();

/* =========================================================
   11. QUIZ
   ========================================================= */
const QUIZ_QUESTIONS = [
  { q:'What is the output of an AND gate when both inputs are 1?', o:['0','1','Undefined','Depends on wiring'], a:1, ex:'AND outputs 1 only when every input is 1.' },
  { q:'Which gate is known as the "universal gate"?', o:['XOR','NAND','OR','Buffer'], a:1, ex:'NAND (and NOR) can implement any Boolean function on its own.' },
  { q:'What does XOR output when both inputs are equal?', o:['1','0','X','Depends'], a:1, ex:'XOR outputs 1 only when inputs differ, so equal inputs give 0.' },
  { q:'In a K-Map, what does a group of adjacent 1-cells represent?', o:['A syntax error','A term that can be simplified','A flip-flop','A clock edge'], a:1, ex:'Grouping adjacent 1s lets you eliminate variables that change within the group.' },
  { q:'Which flip-flop directly copies its input to Q on a clock edge?', o:['SR','JK','D','T'], a:2, ex:'A D flip-flop simply transfers D to Q at the clock edge.' },
  { q:'For a JK flip-flop, what happens when J=1 and K=1?', o:['Q holds','Q resets to 0','Q sets to 1','Q toggles'], a:3, ex:'J=K=1 is the toggle condition for a JK flip-flop.' },
  { q:'What is the binary equivalent of decimal 13?', o:['1101','1011','1110','1001'], a:0, ex:'8+4+1 = 13, which is 1101 in binary.' },
  { q:'A 4:1 multiplexer needs how many select lines?', o:['1','2','4','8'], a:1, ex:'log2(4) = 2 select lines are needed to choose among 4 inputs.' },
  { q:'What does a decoder do?', o:['Combines many lines into one code','Converts a binary code into one active output line','Stores one bit','Adds two numbers'], a:1, ex:'A decoder expands a binary code into a single active output line.' },
  { q:'In a half adder, what gate produces the Carry output?', o:['XOR','OR','AND','NOT'], a:2, ex:'Carry = A AND B in a half adder.' },
  { q:'What is (1010)₂ in decimal?', o:['8','10','12','9'], a:1, ex:'8+0+2+0 = 10.' },
  { q:'Which logic family combination is "combinational" rather than "sequential"?', o:['Has a clock input', 'Has memory of past state', 'Output depends only on current inputs', 'Uses flip-flops'], a:2, ex:'Combinational circuits have no memory — output depends only on present inputs.' },
  { q:'A full adder differs from a half adder because it also accepts:', o:['A clock signal', 'A carry-in', 'A reset line', 'A select line'], a:1, ex:'A full adder adds A, B and an incoming Carry-in (Cin).' },
  { q:'What is the hexadecimal value of decimal 255?', o:['FE','FF','F0','EE'], a:1, ex:'255 = 11111111₂ = FF in hex.' },
  { q:'What is propagation delay?', o:['The time a gate takes to physically move', 'The time for an output to respond after an input changes', 'A type of flip-flop', 'A K-map grouping rule'], a:1, ex:'Propagation delay is the real-world time lag between an input change and the resulting output change.' },
];

const Quiz = (() => {
  let order = [], idx = 0, score = 0, timer = null, timeLeft = 30;
  let currentOptions = []; // [{text, correct}] — reshuffled every question
  const LETTERS = ['A','B','C','D','E','F'];
  const introEl = $('#quizIntro'), bodyEl = $('#quizBody'), resultEl = $('#quizResult');
  const qEl = $('#quizQuestion'), optsEl = $('#quizOptions'), explainEl = $('#quizExplain');
  const nextBtn = $('#quizNext'), progressEl = $('#quizProgress'), counterEl = $('#quizCounter'), timerEl = $('#quizTimer');

  function shuffle(arr) { return arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]); }

  function start() {
    order = shuffle(QUIZ_QUESTIONS.map((_,i)=>i));
    idx = 0; score = 0;
    introEl.hidden = true; resultEl.hidden = true; bodyEl.hidden = false;
    showQuestion();
  }

  function showQuestion() {
    clearInterval(timer);
    timeLeft = 30;
    timerEl.textContent = timeLeft + 's';
    const q = QUIZ_QUESTIONS[order[idx]];
    qEl.textContent = q.q;
    counterEl.textContent = `${idx+1} / ${QUIZ_QUESTIONS.length}`;
    progressEl.style.width = `${(idx/QUIZ_QUESTIONS.length)*100}%`;
    optsEl.innerHTML = '';
    explainEl.hidden = true; nextBtn.hidden = true;

    // shuffle the answer options themselves, not just question order
    currentOptions = shuffle(q.o.map((text, i) => ({ text, correct: i === q.a })));
    currentOptions.forEach((opt, i) => {
      const b = document.createElement('button');
      const badge = document.createElement('span');
      badge.className = 'opt-badge';
      badge.textContent = LETTERS[i];
      const label = document.createElement('span');
      label.textContent = opt.text;
      b.append(badge, label);
      b.addEventListener('click', () => answer(i));
      optsEl.appendChild(b);
    });
    timer = setInterval(() => {
      timeLeft--; timerEl.textContent = timeLeft + 's';
      if (timeLeft <= 0) { clearInterval(timer); answer(-1); }
    }, 1000);
  }

  function answer(choice) {
    clearInterval(timer);
    $$('#quizOptions button').forEach((b,i) => {
      b.disabled = true;
      if (currentOptions[i].correct) b.classList.add('correct');
      else if (i === choice) b.classList.add('wrong');
    });
    if (choice >= 0 && currentOptions[choice].correct) score++;
    explainEl.hidden = false;
    explainEl.textContent = QUIZ_QUESTIONS[order[idx]].ex;
    nextBtn.hidden = false;
  }

  nextBtn.addEventListener('click', () => {
    idx++;
    if (idx >= QUIZ_QUESTIONS.length) finish(); else showQuestion();
  });

  function finish() {
    bodyEl.hidden = true; resultEl.hidden = false;
    $('#quizScore').textContent = score;
    const pct = score / QUIZ_QUESTIONS.length;
    $('#quizVerdict').textContent = pct >= 0.8 ? 'Excellent — you know your digital logic!' : pct >= 0.5 ? 'Good work — a bit more practice and you\'ll master it.' : 'Keep exploring the simulators above and try again.';
  }

  $('#quizStart').addEventListener('click', start);
  $('#quizRestart').addEventListener('click', start);
})();

/* =========================================================
   12. TODAY'S CHALLENGE — a new deterministic challenge each day
   ========================================================= */
const CHALLENGE_BANK = [
  { t:'Build a two-input AND from NAND gates only', d:'In the Circuit Builder, wire up an AND function using nothing but NAND gates — the universal gate. You should need exactly two NAND gates.', diff:'medium', href:'#circuit' },
  { t:'Derive the SOP for a 3-variable majority function', d:'In the K-Map solver, mark the minterms where at least 2 of A, B, C are 1, then simplify. What\'s the minimal expression?', diff:'medium', href:'#kmap' },
  { t:'Toggle a JK flip-flop into every state', d:'In the Flip-Flop Lab, switch to JK and find the input combination that toggles Q on every clock pulse.', diff:'easy', href:'#flipflops' },
  { t:'Predict a 4:1 MUX output before selecting', d:'Set all four MUX inputs to a unique pattern, guess the output for each select combination, then check yourself.', diff:'easy', href:'#muxdemux' },
  { t:'Convert 173 (decimal) to binary, hex and octal', d:'Use the Binary Calculator to convert 173 to all three bases without a calculator first — then verify.', diff:'easy', href:'#calculator' },
  { t:'Build a half adder from primitive gates', d:'In the Circuit Builder, wire an XOR and an AND gate together to reproduce a half adder from the Adders section.', diff:'easy', href:'#circuit' },
  { t:'Simplify a 4-variable "don\'t care free" expression', d:'Pick any 6 minterms in the 4-variable K-Map and find the minimal SOP — try to beat the solver by eye first.', diff:'hard', href:'#kmap' },
  { t:'Explain why NAND is universal', d:'Use the Logic Gate simulator to build NOT, AND and OR — each using only NAND gates conceptually — and check the truth tables match.', diff:'hard', href:'#gates' },
  { t:'Generate Verilog for an XOR gate', d:'Head to the HDL Generator and produce a Verilog module for the XOR gate. Read through the generated code line by line.', diff:'easy', href:'#hdl' },
  { t:'Time a signal through a NOR gate', d:'In the Propagation Delay Visualizer, set the delay to 1200ns on a NOR gate and toggle input A. Watch the settle time.', diff:'easy', href:'#timing' },
  { t:'Encode all 4 encoder inputs one at a time', d:'In the Encoder/Decoder lab, activate each of the 4 encoder inputs individually and note the 2-bit code each produces.', diff:'easy', href:'#encoders' },
  { t:'Design a full adder chain in your head', d:'Without touching the simulator, work out what Sum and Cout would be for A=1, B=1, Cin=1 — then verify with the Full Adder.', diff:'medium', href:'#adders' },
  { t:'Beat the 30-second quiz clock', d:'Take the Digital Logic Quiz and try to answer all 15 questions correctly before time runs out on any of them.', diff:'hard', href:'#quiz' },
  { t:'Wire a 1:4 DEMUX to light exactly Y2', d:'In the Demultiplexer, find the exact select-line combination that routes the input to output Y2 only.', diff:'easy', href:'#muxdemux' },
  { t:'Build an SR latch and hit the invalid state on purpose', d:'In the Flip-Flop Lab, set S=1 and R=1 to see what LogicLab does when a real SR latch would be undefined.', diff:'medium', href:'#flipflops' },
  { t:'Export a circuit and re-import it', d:'Build anything in the Circuit Builder, export it as JSON, reset the canvas, then import your file back in.', diff:'easy', href:'#circuit' },
  { t:'Find the minimal expression for a 2-variable XOR', d:'In the 2-variable K-Map, mark the XOR pattern (opposite corners) and confirm the solver can\'t simplify it below 2 terms.', diff:'medium', href:'#kmap' },
  { t:'Generate Verilog for your custom circuit', d:'Build any small circuit in the Circuit Builder, then generate its Verilog module from the HDL Generator.', diff:'medium', href:'#hdl' },
  { t:'Work out 1101₂ + 0111₂ by hand first', d:'Predict the binary sum of 1101 and 0111 on paper, then check your answer in the Binary Calculator.', diff:'easy', href:'#calculator' },
  { t:'Chain two 2:1 MUXes into a 4:1 MUX', d:'In the Circuit Builder, see if you can reason through how two 2:1 multiplexers would combine to behave like one 4:1 MUX.', diff:'hard', href:'#circuit' },
];

const Challenge = (() => {
  const dayIndex = Math.floor(Date.now() / 86400000); // days since epoch — same for everyone, all day
  const todayKey = new Date().toISOString().slice(0, 10);
  const challenge = CHALLENGE_BANK[dayIndex % CHALLENGE_BANK.length];
  const cardEl = $('#challengeCard');

  function streakInfo() {
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      if (localStorage.getItem('logiclab-challenge-' + d) === 'done') streak++;
      else break;
    }
    return streak;
  }

  function render() {
    const done = localStorage.getItem('logiclab-challenge-' + todayKey) === 'done';
    const streak = streakInfo();
    cardEl.innerHTML = `
      <span class="challenge-date">${new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}</span>
      <span class="challenge-diff ${challenge.diff}">${challenge.diff}</span>
      <h3 style="margin-top:.6rem">${challenge.t}</h3>
      <p class="muted">${challenge.d}</p>
      <div class="challenge-actions">
        <a class="btn btn-primary btn-small" href="${challenge.href}">Open simulator →</a>
        <button class="btn btn-small ${done ? 'btn-ghost' : ''}" id="challengeDoneBtn">${done ? 'Mark as not done' : 'Mark as complete'}</button>
        ${done ? '<span class="challenge-done-badge">✓ Completed today</span>' : ''}
      </div>
      <div class="challenge-streak">
        <div><span>${streak}</span><span class="muted small">day streak</span></div>
        <div><span>${CHALLENGE_BANK.length}</span><span class="muted small">challenges in rotation</span></div>
      </div>`;
    $('#challengeDoneBtn').addEventListener('click', () => {
      if (localStorage.getItem('logiclab-challenge-' + todayKey) === 'done') localStorage.removeItem('logiclab-challenge-' + todayKey);
      else { localStorage.setItem('logiclab-challenge-' + todayKey, 'done'); LL.toast('Nice work — challenge marked complete!'); }
      render();
    });
  }
  render();
})();

/* =========================================================
   13. VLSI / HDL GENERATOR — Verilog for a gate or a full circuit
   ========================================================= */
const HdlGenerator = (() => {
  const sourceSel = $('#hdlSource');
  const codeEl = $('#hdlCode');
  const VERILOG_OP = { AND:'&', OR:'|', XOR:'^', NAND:'~&', NOR:'~|', XNOR:'~^' };

  function highlight(code) {
    return code
      .replace(/\b(module|endmodule|input|output|wire|assign|always|posedge|begin|end|reg)\b/g, '<span class="hdl-kw">$1</span>')
      .replace(/(\/\/.*)$/gm, '<span class="hdl-com">$1</span>');
  }

  function gateVerilog(type) {
    const g = GATES[type];
    const ins = g.inputs === 1 ? ['a'] : ['a', 'b'];
    let body;
    if (type === 'NOT') body = 'assign y = ~a;';
    else if (type === 'BUFFER') body = 'assign y = a;';
    else body = `assign y = ${ins.join(` ${VERILOG_OP[type]} `)};`;
    return [
      `// LogicLab — auto-generated Verilog`,
      `// ${type} gate — ${GATE_DESC[type]}`,
      `module ${type.toLowerCase()}_gate (`,
      `  input  wire ${ins.join(', ')},`,
      `  output wire y`,
      `);`,
      ``,
      `  ${body}`,
      ``,
      `endmodule`,
    ].join('\n');
  }

  function circuitVerilog() {
    const { nodes, connections, GATE_FN } = CircuitBuilder.getState();
    if (!nodes.length) return '// The Circuit Builder canvas is empty — add some gates first.';
    const inputs = nodes.filter(n => n.type === 'INPUT');
    const outputs = nodes.filter(n => n.type === 'OUTPUT');
    const gates = nodes.filter(n => n.type !== 'INPUT' && n.type !== 'OUTPUT');
    const wireName = id => 'w_' + id;
    const lines = [];
    lines.push('// LogicLab — auto-generated Verilog from Circuit Builder');
    const ports = [...inputs.map(n => `input  wire ${wireName(n.id)}`), ...outputs.map(n => `output wire ${wireName(n.id)}`)];
    lines.push(`module custom_circuit (`);
    lines.push('  ' + ports.join(',\n  '));
    lines.push(');');
    lines.push('');
    gates.forEach(n => lines.push(`  wire ${wireName(n.id)}; // ${n.type} gate`));
    lines.push('');
    gates.forEach(n => {
      const inConns = connections.filter(c => c.toNode === n.id).sort((a,b)=>a.toPort-b.toPort);
      const args = inConns.map(c => wireName(c.fromNode));
      let expr;
      if (n.type === 'NOT') expr = `~${args[0] || "1'bz"}`;
      else if (n.type === 'BUFFER') expr = args[0] || "1'bz";
      else expr = args.length === 2 ? `${args[0]} ${VERILOG_OP[n.type]} ${args[1]}` : (args[0] || "1'bz");
      lines.push(`  assign ${wireName(n.id)} = ${expr}; // ${n.type}`);
    });
    outputs.forEach(n => {
      const inConn = connections.find(c => c.toNode === n.id);
      lines.push(`  assign ${wireName(n.id)} = ${inConn ? wireName(inConn.fromNode) : "1'bz"};`);
    });
    lines.push('');
    lines.push('endmodule');
    return lines.join('\n');
  }

  let lastCode = '';
  $('#hdlGenerate').addEventListener('click', () => {
    lastCode = sourceSel.value === 'gate' ? gateVerilog(GateSim.getState().current) : circuitVerilog();
    codeEl.innerHTML = highlight(lastCode);
  });
  $('#hdlCopy').addEventListener('click', () => {
    if (!lastCode) { LL.toast('Generate some Verilog first.'); return; }
    navigator.clipboard.writeText(lastCode).then(() => LL.toast('Verilog copied to clipboard.')).catch(() => LL.toast('Could not copy — select and copy manually.'));
  });
  $('#hdlDownload').addEventListener('click', () => {
    if (!lastCode) { LL.toast('Generate some Verilog first.'); return; }
    downloadBlob('logiclab_module.v', lastCode, 'text/plain');
  });
})();

/* =========================================================
   14. ABOUT — author links
   ========================================================= */
(function author(){
  const gh = $('#authorGitHub'), li = $('#authorLinkedIn');
  if (gh) gh.href = 'https://github.com/invictus127';
  // LinkedIn URL not yet provided — update the href below once you share it.
  if (li) li.href = 'https://www.linkedin.com/';
})();

/* =========================================================
   15. PWA — SERVICE WORKER REGISTRATION
   ========================================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {/* offline-first, fail silently */});
  });
}
