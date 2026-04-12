// ── PAGE NAVIGATION ──────────────────────────────────────────────────────────
function go(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.remove('active'));

  const target = document.getElementById('pg-' + page);
  if (target) target.classList.add('active');

  const navBtn = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── FEATURES PAGE TABS ────────────────────────────────────────────────────────
function featTab(i) {
  document.querySelectorAll('.feat-tab').forEach((t, j) => t.classList.toggle('active', i === j));
  document.querySelectorAll('.feat-panel').forEach((p, j) => p.classList.toggle('active', i === j));
}

// ── EXTENSION PAGE TABS ───────────────────────────────────────────────────────
function extTab(i) {
  document.querySelectorAll('.ext-tab').forEach((t, j) => t.classList.toggle('active', i === j));
  document.querySelectorAll('.ext-panel').forEach((p, j) => p.classList.toggle('active', i === j));
}

// ── DEMO: SCAN ────────────────────────────────────────────────────────────────
function demoScan() {
  const res = document.getElementById('sr');
  const txt = document.getElementById('sr-txt');
  res.style.display = 'none';

  setTimeout(() => {
    res.style.display = 'block';
    typeText(txt, 'Buyer offers to overpay and requests the difference be sent back via wire transfer. Classic overpayment pattern — do not proceed.');
  }, 900);
}

// ── DEMO: PASTE ───────────────────────────────────────────────────────────────
function demoPaste() {
  const res = document.getElementById('pr');
  const txt = document.getElementById('pr-txt');
  res.style.display = 'none';

  setTimeout(() => {
    res.style.display = 'block';
    typeText(txt, 'Fake urgency combined with a spoofed Netflix domain designed to steal billing credentials. Do not click the link.');
  }, 900);
}

// ── DEMO: PHONE ───────────────────────────────────────────────────────────────
function demoPhone() {
  const res = document.getElementById('ph-res');
  res.style.display = 'none';

  setTimeout(() => {
    res.style.display = 'block';
  }, 700);
}

// ── DEMO: PASTE CHARACTER COUNT ───────────────────────────────────────────────
function paChar() {
  const len = document.getElementById('pa-inp').value.length;
  document.getElementById('pa-ct').textContent = len;
}

// ── TYPE ANIMATION ────────────────────────────────────────────────────────────
function typeText(el, text, speed) {
  el.textContent = '';
  let i = 0;
  const iv = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i++];
    } else {
      clearInterval(iv);
    }
  }, speed || 14);
}