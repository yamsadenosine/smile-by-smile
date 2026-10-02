document.documentElement.classList.add('js-ready');
document.getElementById('year').textContent = new Date().getFullYear();

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion = () => motionQuery.matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/* Run `cb` once, the first time `el` scrolls into view. */
function onceInView(el, cb, options = { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }) {
  if (!('IntersectionObserver' in window)) { cb(el); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      cb(entry.target);
    });
  }, options);
  io.observe(el);
}

/* Count a number up from 0. Under reduced motion it just lands on the value. */
function countUp(el, target, { prefix = '', duration = 1200 } = {}) {
  const format = (n) => prefix + Math.round(n).toLocaleString('en-US');
  if (reduceMotion() || target === 0) { el.textContent = format(target); return; }
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = format(target * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* Wrap each letter of a word in a span with its running index as --c. */
function splitChars(wordEls, className) {
  let c = 0;
  wordEls.forEach((word) => {
    const text = word.textContent.trim();
    word.textContent = '';
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = className;
      span.style.setProperty('--c', c++);
      span.textContent = ch;
      word.appendChild(span);
    }
  });
}

/* =========================================================
   Mobile nav
   ========================================================= */
const navBurger = document.getElementById('navBurger');
const navMobile = document.getElementById('navMobile');
function setNav(open) {
  navMobile.classList.toggle('open', open);
  navBurger.setAttribute('aria-expanded', String(open));
}
navBurger.addEventListener('click', () => setNav(!navMobile.classList.contains('open')));
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

/* =========================================================
   Opening: a short frosted-glass intro (once per visit,
   tap to skip), then the hero wordmark writes itself in.
   ========================================================= */
(function initOpening() {
  const hero = document.getElementById('hero');
  const title = hero.querySelector('[data-hero-title]');
  splitChars(Array.from(title.querySelectorAll('.ht-word')), 'ht-char');

  // Hero copy below the title follows a beat after the letters.
  hero.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--i', i === 0 ? 0 : i + 3));

  let started = false;
  function startHero() {
    if (started) return;
    started = true;
    requestAnimationFrame(() => {
      hero.classList.add('is-ready');
      title.classList.add('is-in');
      hero.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
      hero.querySelectorAll('[data-count]').forEach((el) => {
        countUp(el, parseFloat(el.dataset.count) || 0, { duration: 1100 });
      });
    });
  }

  let seen = false;
  try { seen = sessionStorage.getItem('sbs-intro') === '1'; } catch (_) { /* storage blocked */ }
  if (seen || reduceMotion()) { startHero(); return; }
  try { sessionStorage.setItem('sbs-intro', '1'); } catch (_) { /* storage blocked */ }

  const intro = document.createElement('div');
  intro.className = 'intro';
  intro.setAttribute('aria-hidden', 'true');
  intro.innerHTML = `
    <div class="intro-mark">
      <span class="intro-logo"><i class="ph-fill ph-smiley"></i></span>
      <div class="intro-word">
        <span data-iw>Smile</span> <span class="soft" data-iw>by</span> <span data-iw>Smile</span>
      </div>
      <svg class="intro-smile" viewBox="0 0 240 44"><path d="M10 8 Q120 66 230 8" pathLength="1"></path></svg>
    </div>`;
  splitChars(Array.from(intro.querySelectorAll('[data-iw]')), 'intro-char');
  document.body.appendChild(intro);

  let left = false;
  function leave() {
    if (left) return;
    left = true;
    intro.classList.add('is-leaving');
    startHero();
    setTimeout(() => intro.remove(), 600);
    window.removeEventListener('keydown', leave);
  }
  intro.addEventListener('click', leave);
  window.addEventListener('keydown', leave);
  setTimeout(leave, 1500);
})();

/* Glass bubbles drift a little with the cursor (mouse devices only). */
(function initParallax() {
  const layers = Array.from(document.querySelectorAll('[data-parallax]'));
  if (!layers.length || !finePointer.matches || reduceMotion()) return;
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
  function frame() {
    x += (tx - x) * 0.08;
    y += (ty - y) * 0.08;
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.parallax);
      layer.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
    });
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(frame) : 0;
  }
  window.addEventListener('pointermove', (e) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: true });
})();

/* =========================================================
   Section reveals: each .reveal fades up as it enters view,
   staggered by its order inside its section.
   ========================================================= */
document.querySelectorAll('main section:not(#hero)').forEach((section) => {
  section.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 4));
    onceInView(el, (target) => target.classList.add('is-in'), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  });
});

/* =========================================================
   Two-state toggle: a tappable stage with stacked images
   plus a segmented control. Used by Before/After and the
   crewneck Front/Back.
   ========================================================= */
function initTwoStateToggle(root, { stage, faces, onChange }) {
  const seg = root.querySelector('[data-seg]');
  const options = seg ? Array.from(seg.querySelectorAll('[data-seg-option]')) : [];
  let state = 0;

  function set(next) {
    if (next === state) return;
    state = next;
    faces.forEach((face, i) => face.classList.toggle('is-visible', i === state));
    if (seg) seg.dataset.state = String(state);
    options.forEach((opt, i) => opt.setAttribute('aria-pressed', String(i === state)));
    onChange?.(state);
  }

  stage?.addEventListener('click', () => set(state === 0 ? 1 : 0));
  options.forEach((opt, i) => opt.addEventListener('click', () => set(i)));
}

/* Before / After cards: the clinical caption swaps with a quick blur crossfade. */
document.querySelectorAll('[data-ba]').forEach((card) => {
  const stage = card.querySelector('[data-ba-stage]');
  const desc = card.querySelector('[data-ba-desc]');
  const faces = [card.querySelector('[data-ba-before]'), card.querySelector('[data-ba-after]')];
  const patient = stage.getAttribute('aria-label').split(':')[0];

  initTwoStateToggle(card, {
    stage,
    faces,
    onChange(state) {
      card.classList.add('has-interacted');
      stage.setAttribute('aria-label', `${patient}: show ${state ? 'before' : 'after'} treatment`);
      if (!desc) return;
      const nextText = state ? desc.dataset.afterText : desc.dataset.beforeText;
      if (reduceMotion()) { desc.textContent = nextText; return; }
      desc.classList.add('is-swapping');
      clearTimeout(desc._t);
      desc._t = setTimeout(() => {
        desc.textContent = nextText;
        desc.classList.remove('is-swapping');
      }, 160);
    }
  });
});

/* Crewneck: tap the photo or use Front/Back. */
document.querySelectorAll('[data-shop-product]').forEach((card) => {
  const stage = card.querySelector('[data-shop-stage]');
  const faces = Array.from(card.querySelectorAll('[data-shop-face]'));
  initTwoStateToggle(card, {
    stage,
    faces,
    onChange(state) {
      stage.setAttribute('aria-label', `Show the ${state ? 'front' : 'back'} of the crewneck`);
    }
  });
});

/* =========================================================
   Total raised (all time): one segment per $500 smile.
   Funded smiles fill one after another, then the smile in
   progress fills partway. A faded segment trails off to
   show the count keeps going.
   ========================================================= */
(function initRaised() {
  const numEl = document.querySelector('[data-raised]');
  const list = document.querySelector('[data-milestones]');
  if (!numEl || !list) return;

  const PATIENT_COST = 500;
  const MAX_DONE_SHOWN = 5;
  const raised = Math.max(0, parseFloat(numEl.dataset.raised) || 0);
  const funded = Math.floor(raised / PATIENT_COST);
  const remainder = raised - funded * PATIENT_COST;
  const pct = (remainder / PATIENT_COST) * 100;

  const first = Math.max(0, funded - MAX_DONE_SHOWN);
  const segments = [];
  for (let n = first; n < funded; n++) segments.push({ n: n + 1, kind: 'done', rest: 0 });
  segments.push({ n: funded + 1, kind: 'current', rest: 100 - pct });
  segments.push({ n: funded + 2, kind: 'ghost', rest: 100 });

  list.innerHTML = segments.map((seg, i) => {
    const showPct = seg.kind === 'current' && pct > 0;
    const iconHtml = showPct
      ? `<span class="ms-pct">${Math.round(pct)}%</span>`
      : `<i class="${seg.kind === 'done' ? 'ph-fill ph-smiley' : 'ph ph-smiley'}"></i>`;
    const label = `Smile ${seg.n}`;
    const sr = seg.kind === 'done' ? `Smile ${seg.n} funded`
      : seg.kind === 'current' ? `Smile ${seg.n}, ${Math.round(pct)}% funded`
      : `Smile ${seg.n}, not started`;
    return `<li class="milestone is-${seg.kind}" style="--i:${i};--rest:${seg.rest}%" ${seg.kind === 'ghost' ? 'aria-hidden="true"' : ''}>
      <span class="ms-icon" aria-hidden="true">${iconHtml}</span>
      <span class="ms-bar" aria-hidden="true"><span class="ms-fill"></span></span>
      <span class="ms-label" aria-hidden="true">${label}</span>
      <span class="sr-only">${sr}</span>
    </li>`;
  }).join('');

  const sub = document.querySelector('[data-raised-sub]');
  if (sub && raised > 0) {
    const fundedLine = funded > 0
      ? `<strong>${funded}</strong> smile${funded > 1 ? 's' : ''} fully funded so far. `
      : '';
    sub.innerHTML = `${fundedLine}<strong>$${Math.round(PATIENT_COST - remainder).toLocaleString('en-US')}</strong> to go until smile #${funded + 1}.`;
  } else if (sub) {
    sub.innerHTML = 'Every <strong>$500</strong> funds one patient\'s full smile. Be one of the first to help us get there.';
  }

  onceInView(list, () => {
    list.classList.add('is-in');
    countUp(numEl, raised, { prefix: '$', duration: 900 + segments.length * 240 });
  }, { threshold: 0.5 });
})();

/* =========================================================
   Smile builder: an upper smile of ten decayed teeth.
   Tap a tooth to restore it ($50 each, $500 for a full smile).
   ========================================================= */
(function initSmileBuilder() {
  const root = document.querySelector('[data-smile-builder]');
  if (!root) return;
  const svg = root.querySelector('[data-sb-svg]');
  const NS = 'http://www.w3.org/2000/svg';
  const COST = 50;
  const GAP = 3;
  const W = 600;

  // Viewer's left to right (the patient's right side first).
  const TEETH = [
    ['upper right second premolar', 'premolar', 34, 58],
    ['upper right first premolar', 'premolar', 38, 64],
    ['upper right canine', 'canine', 44, 80],
    ['upper right lateral incisor', 'incisor', 42, 74],
    ['upper right central incisor', 'incisor', 54, 90],
    ['upper left central incisor', 'incisor', 54, 90],
    ['upper left lateral incisor', 'incisor', 42, 74],
    ['upper left canine', 'canine', 44, 80],
    ['upper left first premolar', 'premolar', 38, 64],
    ['upper left second premolar', 'premolar', 34, 58],
  ];

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent?.appendChild(node);
    return node;
  }
  // Small seeded random so every visitor sees the same "damage".
  function seeded(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => n.toFixed(1);

  function healthyPath(type, w, h) {
    const hw = w / 2, nw = w * 0.41;
    const sides = `C ${f(hw)} ${f(h * 0.22)} ${f(hw)} ${f(h * 0.55)}`;
    const sidesL = `C ${f(-hw)} ${f(h * 0.55)} ${f(-hw)} ${f(h * 0.22)} ${f(-nw)} 0`;
    if (type === 'canine') {
      return `M ${f(-nw)} 0 L ${f(nw)} 0 ${sides} ${f(hw * 0.93)} ${f(h * 0.74)} Q ${f(hw * 0.5)} ${f(h * 0.9)} 0 ${f(h)} Q ${f(-hw * 0.5)} ${f(h * 0.9)} ${f(-hw * 0.93)} ${f(h * 0.74)} ${sidesL} Z`;
    }
    if (type === 'premolar') {
      return `M ${f(-nw)} 0 L ${f(nw)} 0 ${sides} ${f(hw * 0.95)} ${f(h * 0.72)} Q ${f(hw * 0.75)} ${f(h)} 0 ${f(h)} Q ${f(-hw * 0.75)} ${f(h)} ${f(-hw * 0.95)} ${f(h * 0.72)} ${sidesL} Z`;
    }
    return `M ${f(-nw)} 0 L ${f(nw)} 0 ${sides} ${f(hw * 0.98)} ${f(h - 9)} Q ${f(hw * 0.94)} ${f(h)} ${f(hw * 0.66)} ${f(h)} L ${f(-hw * 0.66)} ${f(h)} Q ${f(-hw * 0.94)} ${f(h)} ${f(-hw * 0.98)} ${f(h - 9)} ${sidesL} Z`;
  }

  // Same tooth, snapped off at a jagged line partway down.
  function damagedTooth(w, h, rnd) {
    const hw = w / 2, nw = w * 0.41;
    const yL = h * (0.55 + rnd() * 0.28);
    const yR = h * (0.55 + rnd() * 0.28);
    const points = [];
    const steps = 5;
    const notch = 1 + Math.floor(rnd() * 3);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const x = hw * 0.95 - t * hw * 1.9;
      let y = yR + (yL - yR) * t + (rnd() - 0.5) * 20;
      if (k === notch) y -= 10 + rnd() * 8;
      points.push([x, Math.max(h * 0.25, y)]);
    }
    const d = `M ${f(-nw)} 0 L ${f(nw)} 0 C ${f(hw)} ${f(h * 0.2)} ${f(hw)} ${f(yR * 0.6)} ${f(hw * 0.97)} ${f(yR)} `
      + points.map(([x, y]) => `L ${f(x)} ${f(y)}`).join(' ')
      + ` L ${f(-hw * 0.97)} ${f(yL)} C ${f(-hw)} ${f(yL * 0.6)} ${f(-hw)} ${f(h * 0.2)} ${f(-nw)} 0 Z`;
    return { d, points, edge: Math.min(yL, yR) };
  }

  function buildDefs() {
    const defs = el('defs', {}, svg);
    const grad = (id, stops) => {
      const g = el('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      stops.forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, g));
    };
    grad('sbDecay', [['0', '#A99263'], ['0.45', '#7D663B'], ['1', '#4A381D']]);
    grad('sbEnamel', [['0', '#FFFFFF'], ['0.55', '#F5F1E9'], ['1', '#E2DBCB']]);
    grad('sbGum', [['0', '#DC8A95'], ['0.7', '#B65B6A'], ['1', '#9C4655']]);
  }

  const layout = (() => {
    const total = TEETH.reduce((sum, t) => sum + t[2], 0) + GAP * (TEETH.length - 1);
    let x = (W - total) / 2;
    return TEETH.map(([name, type, w, h], i) => {
      const cx = x + w / 2;
      x += w + GAP;
      const d = (cx - W / 2) / (W / 2);
      return { name, type, w, h, i, cx, top: 92 - 66 * d * d, rot: -d * 13, nw: w * 0.41 };
    });
  })();

  function buildGum() {
    const L = layout[0], R = layout[layout.length - 1];
    const start = { x: L.cx - L.w / 2 - 4, y: L.top + 12 };
    const end = { x: R.cx + R.w / 2 + 4, y: R.top + 12 };
    let d = `M ${f(start.x)} ${f(start.y)} C ${f(start.x - 6)} ${f(start.y - 40)} ${W / 2 - 150} 34 ${W / 2} 34 C ${W / 2 + 150} 34 ${f(end.x + 6)} ${f(end.y - 40)} ${f(end.x)} ${f(end.y)} Q ${f(end.x - 2)} ${f(R.top + 12)} ${f(R.cx + R.w / 2)} ${f(R.top + 12)}`;
    // Lower edge runs just under the tooth tops; the teeth cover it and the gaps show gum.
    for (let k = layout.length - 1; k >= 0; k--) {
      const t = layout[k];
      d += ` L ${f(t.cx + t.w / 2)} ${f(t.top + 12)} L ${f(t.cx - t.w / 2)} ${f(t.top + 12)}`;
    }
    d += ` Q ${f(start.x + 2)} ${f(L.top + 10)} ${f(start.x)} ${f(start.y)} Z`;
    el('path', { d, fill: 'url(#sbGum)' }, svg);
    // soft highlight along the gum so it reads as glossy, not flat
    el('path', { d: `M ${f(start.x + 40)} ${f(start.y - 30)} Q ${W / 2} 30 ${f(end.x - 40)} ${f(end.y - 30)}`, fill: 'none', stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
  }

  const teeth = [];
  function buildTooth(t) {
    const rnd = seeded(t.i * 7919 + 13);
    const g = el('g', {
      class: 'sb-tooth',
      transform: `translate(${f(t.cx)} ${f(t.top)}) rotate(${f(t.rot)})`,
      tabindex: 0, role: 'button', 'aria-pressed': 'false',
    }, svg);
    g.style.setProperty('--i', Math.round(Math.abs(t.i - 4.5)));
    const body = el('g', { class: 't-body' }, g);

    const healthy = healthyPath(t.type, t.w, t.h);
    const broken = damagedTooth(t.w, t.h, rnd);
    el('path', { class: 't-damaged', d: broken.d }, body);

    const marks = el('g', { class: 't-marks' }, body);
    // Decay eating in from the broken edge: an irregular dark blob that touches the edge.
    const [hx, hy] = broken.points[Math.floor(rnd() * broken.points.length)];
    const r = 5 + rnd() * 4;
    const blob = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      const rr = r * (0.7 + rnd() * 0.5);
      return `${f(hx * 0.85 + Math.cos(a) * rr * 1.3)},${f(hy - 2 + Math.sin(a) * rr)}`;
    }).join(' ');
    el('polygon', { points: blob, fill: '#1B1209' }, marks);
    // brown staining along the gum line
    el('path', {
      d: `M ${f(-t.nw)} 1 L ${f(t.nw)} 1 L ${f(t.w * 0.46)} ${f(t.h * 0.16)} Q 0 ${f(t.h * 0.24)} ${f(-t.w * 0.46)} ${f(t.h * 0.16)} Z`,
      fill: '#3B2A14', opacity: 0.55,
    }, marks);
    const cx0 = f((rnd() - 0.5) * t.w * 0.4);
    el('path', {
      d: `M ${cx0} ${f(broken.edge)} Q ${f(+cx0 + 4)} ${f(broken.edge * 0.6)} ${f(+cx0 - 2)} ${f(broken.edge * 0.28)}`,
      fill: 'none', stroke: '#24180C', 'stroke-width': 1.2, 'stroke-linecap': 'round',
    }, marks);

    el('path', { class: 't-healthy', d: healthy }, body);
    const hw = t.w / 2;
    el('path', {
      class: 't-shine',
      d: `M ${f(-hw * 0.48)} ${f(t.h * 0.12)} Q ${f(-hw * 0.66)} ${f(t.h * 0.45)} ${f(-hw * 0.42)} ${f(t.h * 0.76)} Q ${f(-hw * 0.32)} ${f(t.h * 0.45)} ${f(-hw * 0.48)} ${f(t.h * 0.12)} Z`,
    }, body);
    el('path', { class: 't-focus', d: healthy, transform: 'translate(0 0) scale(1.08)' }, body);

    // Crumbs that fall away when the tooth is restored.
    const frags = broken.points.slice(0, 3).map(([x, y]) => {
      const s = 3 + rnd() * 3;
      return el('polygon', {
        class: 't-frag',
        points: `${f(x - s)},${f(y - s * 0.4)} ${f(x + s)},${f(y - s)} ${f(x + s * 0.6)},${f(y + s)} ${f(x - s * 0.7)},${f(y + s * 0.7)}`,
      }, g);
    });
    const sparkWrap = el('g', { transform: `translate(${f(hw * 0.35)} ${f(t.h * 0.3)})` }, g);
    const spark = el('path', { class: 't-spark', d: 'M0,-9 L2.2,-2.2 L9,0 L2.2,2.2 L0,9 L-2.2,2.2 L-9,0 L-2.2,-2.2 Z' }, sparkWrap);

    const tooth = { ...t, g, frags, spark, restored: false };
    teeth.push(tooth);
    g.addEventListener('click', () => toggle(tooth));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(tooth); }
    });
    return tooth;
  }

  buildDefs();
  buildGum();
  layout.forEach(buildTooth);
  // Frame the drawing tightly (with room below for falling crumbs).
  try {
    const bb = svg.getBBox();
    svg.setAttribute('viewBox', `${f(bb.x - 6)} ${f(bb.y - 6)} ${f(bb.width + 12)} ${f(bb.height + 30)}`);
  } catch (_) { svg.setAttribute('viewBox', '40 0 520 210'); }

  const countEl = root.querySelector('[data-sb-count]');
  const amountEl = root.querySelector('[data-sb-amount]');
  const messageEl = root.querySelector('[data-sb-message]');
  const donateBtn = root.querySelector('[data-sb-donate]');

  function bump(node) {
    if (reduceMotion() || !node.animate) return;
    node.parentElement.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: EASE_OUT }
    );
  }

  function playRestore(tooth, delay = 0) {
    if (reduceMotion() || !tooth.g.animate) return;
    tooth.frags.forEach((frag, k) => {
      const dx = (k - 1) * 10 + (Math.random() - 0.5) * 8;
      frag.animate([
        { opacity: 1, transform: 'translate(0, 0) rotate(0deg)' },
        { opacity: 0, transform: `translate(${dx}px, ${46 + k * 10}px) rotate(${(k - 1) * 70}deg)` },
      ], { duration: 520, delay, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'backwards' });
    });
    tooth.spark.animate([
      { opacity: 0, transform: 'scale(0.4) rotate(0deg)' },
      { opacity: 1, transform: 'scale(1.25) rotate(45deg)', offset: 0.4 },
      { opacity: 0, transform: 'scale(0.6) rotate(90deg)' },
    ], { duration: 620, delay: delay + 260, easing: EASE_OUT });
  }

  function update() {
    const count = teeth.filter(t => t.restored).length;
    const amount = count * COST;
    countEl.textContent = count;
    amountEl.textContent = amount.toLocaleString('en-US');
    bump(countEl); bump(amountEl);
    donateBtn.disabled = count === 0;
    donateBtn.textContent = count === 0 ? 'Pick Teeth to Restore' : `Donate $${amount.toLocaleString('en-US')}`;
    if (count === 0) {
      messageEl.innerHTML = 'Each tooth costs about <strong>$50</strong> to restore. Ten teeth make a full smile.';
    } else if (count < teeth.length) {
      const left = teeth.length - count;
      messageEl.innerHTML = `You're restoring <strong>${count}</strong> ${count === 1 ? 'tooth' : 'teeth'} for one patient. ${left} more for a full smile.`;
    } else {
      messageEl.innerHTML = '<strong>Full smile restored.</strong> $500 funds one patient\'s complete reconstruction.';
    }
  }

  function setRestored(tooth, restored, delay = 0) {
    if (tooth.restored === restored) return;
    tooth.restored = restored;
    const apply = () => {
      tooth.g.classList.toggle('is-restored', restored);
      tooth.g.setAttribute('aria-pressed', String(restored));
      tooth.g.setAttribute('aria-label', restored
        ? `${tooth.name}, restored. Tap to undo.`
        : `${tooth.name}, decayed. Restore for $${COST}.`);
      if (restored) playRestore(tooth);
    };
    delay ? setTimeout(apply, delay) : apply();
  }

  function toggle(tooth) {
    root.classList.add('has-interacted');
    setRestored(tooth, !tooth.restored);
    update();
  }

  // Center teeth first, rippling outward.
  const centerOut = [...teeth].sort((a, b) => Math.abs(a.i - 4.5) - Math.abs(b.i - 4.5));
  root.querySelector('[data-sb-all]').addEventListener('click', () => {
    root.classList.add('has-interacted');
    centerOut.filter(t => !t.restored).forEach((t, k) => setRestored(t, true, reduceMotion() ? 0 : k * 70));
    update();
  });
  root.querySelector('[data-sb-reset]').addEventListener('click', () => {
    teeth.forEach(t => setRestored(t, false));
    update();
  });
  donateBtn.addEventListener('click', () => {
    const amount = teeth.filter(t => t.restored).length * COST;
    if (amount) handleDonate('One-Time', amount);
  });

  teeth.forEach(t => t.g.setAttribute('aria-label', `${t.name}, decayed. Restore for $${COST}.`));
  update();

  onceInView(root, () => {
    root.classList.add('is-in');
    setTimeout(() => root.classList.add('is-settled'), 900);
  }, { threshold: 0.25 });
})();

/* =========================================================
   Chip groups: give amounts and crewneck sizes
   ========================================================= */
function initChipGroup(group, onSelect) {
  const chips = group.querySelectorAll('.chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      onSelect?.(chip);
    });
  });
}
document.querySelectorAll('.give-card').forEach((card) => {
  const donateBtn = card.querySelector('[data-donate-btn]');
  initChipGroup(card, (chip) => { if (donateBtn) donateBtn.dataset.selectedAmount = chip.dataset.amount; });
});
document.querySelectorAll('[data-size-group]').forEach((group) => initChipGroup(group));

/* =========================================================
   About: tap the panel (or the button) to flip to the
   dentistry side. The hidden face is made inert so it can't
   be tabbed into or clicked through.
   ========================================================= */
(function initAboutFlip() {
  const flip = document.querySelector('[data-flip]');
  if (!flip) return;
  const front = flip.querySelector('[data-flip-face="front"]');
  const back = flip.querySelector('[data-flip-face="back"]');
  const toggles = flip.querySelectorAll('[data-flip-toggle]');

  function set(flipped, { moveFocus = false } = {}) {
    flip.classList.toggle('is-flipped', flipped);
    front.inert = flipped;
    back.inert = !flipped;
    front.setAttribute('aria-hidden', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
    toggles.forEach(t => t.setAttribute('aria-expanded', String(flipped)));
    if (moveFocus) (flipped ? back : front).querySelector('[data-flip-toggle]')?.focus({ preventScroll: true });
  }

  toggles.forEach((t) => t.addEventListener('click', (e) => {
    e.stopPropagation();
    set(!flip.classList.contains('is-flipped'), { moveFocus: true });
  }));

  // Tapping anywhere on the card flips it, except on links, buttons, or while selecting text.
  [front, back].forEach((face) => face.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    if (window.getSelection()?.toString()) return;
    set(!flip.classList.contains('is-flipped'));
  }));

  set(false);
})();

/* =========================================================
   Donate / Buy: placeholder handlers.
   Swap these for real Stripe/PayPal/Shopify calls later.
   ========================================================= */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

function handleDonate(freq, amount) {
  // TODO: replace with real payment integration, e.g.:
  //   Stripe:  stripe.redirectToCheckout({ ... })
  //   PayPal:  paypal.Buttons({ ... }).render(...)
  showToast(`${freq} gift${amount ? ` of $${amount}` : ''}: secure checkout is coming soon.`);
}

function handleBuy(product, price, size) {
  // TODO: replace with a real checkout (Stripe Payment Link, Shopify Buy Button, etc.)
  showToast(`${product} (${size}), $${price}: checkout is coming soon.`);
}

document.querySelectorAll('[data-donate-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const amount = btn.dataset.selectedAmount;
    handleDonate(btn.dataset.freq, amount && amount !== 'custom' ? amount : null);
  });
});

document.querySelectorAll('[data-buy-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('[data-shop-product]');
    const size = card?.querySelector('[data-size].is-active')?.dataset.size || 'M';
    handleBuy(btn.dataset.product, btn.dataset.price, size);
  });
});

/* =========================================================
   Referral form: sends straight to the founder's inbox
   through FormSubmit (no mail app needed).
   The very first submission triggers a one-time activation
   email from FormSubmit to this address; click it once.
   ========================================================= */
const REFERRAL_ENDPOINT = 'https://formsubmit.co/ajax/yamminaldeib@gmail.com';

async function handleReferralSubmit(e) {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.sending) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data._honey) return; // bot filled the hidden field

  const btn = form.querySelector('[data-refer-submit]');
  const status = form.querySelector('[data-refer-status]');
  form.dataset.sending = '1';
  btn.disabled = true;
  btn.textContent = 'Sending...';
  status.textContent = '';
  status.classList.remove('is-error');

  const payload = {
    _subject: `Dental Care Referral: ${data.personName}`,
    _template: 'table',
    _captcha: 'false',
    'Person in need': data.personName,
    'Relationship to referrer': data.relationship,
    'Their contact info': data.personContact || 'Not provided',
    'Situation': data.situation,
    'Submitted by': data.referrerName,
    'Referrer contact': data.referrerContact,
  };
  if (/\S+@\S+\.\S+/.test(data.referrerContact)) payload._replyto = data.referrerContact;

  try {
    const res = await fetch(REFERRAL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || 'Send failed');
    showReferralDone(form);
  } catch (err) {
    status.classList.add('is-error');
    status.textContent = 'Something went wrong sending your referral. Please try again in a moment.';
    btn.disabled = false;
    btn.textContent = 'Send Referral';
  } finally {
    delete form.dataset.sending;
  }
}

function showReferralDone(form) {
  const original = Array.from(form.children);
  original.forEach(child => { child.hidden = true; });
  const done = document.createElement('div');
  done.className = 'refer-done';
  done.innerHTML = `
    <span class="icon-tile"><i class="ph ph-check" aria-hidden="true"></i></span>
    <h3>Referral sent</h3>
    <p>Thank you for looking out for someone. We review every referral personally and will reach out using the contact info you shared.</p>
    <button type="button" class="btn btn-outline">Send Another</button>`;
  form.appendChild(done);
  done.querySelector('h3').setAttribute('tabindex', '-1');
  done.querySelector('h3').focus({ preventScroll: true });
  done.querySelector('button').addEventListener('click', () => {
    form.reset();
    done.remove();
    original.forEach(child => { child.hidden = false; });
    const btn = form.querySelector('[data-refer-submit]');
    btn.disabled = false;
    btn.textContent = 'Send Referral';
    form.querySelector('input')?.focus();
  });
}

const referForm = document.querySelector('[data-refer-form]');
if (referForm) referForm.addEventListener('submit', handleReferralSubmit);
