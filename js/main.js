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
  const BLOCK = 5;
  const blockLabel = document.querySelector('[data-milestone-block]');
  const raised = Math.max(0, parseFloat(numEl.dataset.raised) || 0);
  const funded = Math.floor(raised / PATIENT_COST);
  const remainder = raised - funded * PATIENT_COST;
  const pct = (remainder / PATIENT_COST) * 100;

  // Show the block of five that holds the smile in progress: 1-5, then 6-10, 11-15...
  const blockStart = Math.floor(funded / BLOCK) * BLOCK; // smiles before this block are all funded
  const segments = [];
  for (let n = blockStart + 1; n <= blockStart + BLOCK; n++) {
    if (n <= funded) segments.push({ n, kind: 'done', rest: 0 });
    else if (n === funded + 1) segments.push({ n, kind: 'current', rest: 100 - pct });
    else segments.push({ n, kind: 'ghost', rest: 100 });
  }
  if (blockLabel) blockLabel.textContent = `Smiles ${blockStart + 1} to ${blockStart + BLOCK}`;

  list.innerHTML = segments.map((seg, i) => {
    const showPct = seg.kind === 'current' && pct > 0;
    const iconHtml = showPct
      ? `<span class="ms-pct">${Math.round(pct)}%</span>`
      : `<i class="${seg.kind === 'done' ? 'ph-fill ph-smiley' : 'ph ph-smiley'}"></i>`;
    const label = `Smile ${seg.n}`;
    const sr = seg.kind === 'done' ? `Smile ${seg.n} funded`
      : seg.kind === 'current' ? `Smile ${seg.n}, ${Math.round(pct)}% funded`
      : `Smile ${seg.n}, not started`;
    return `<li class="milestone is-${seg.kind}" style="--i:${i};--rest:${seg.rest}%">
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
   Tap a tooth and a healthy one grows out of the gum
   ($50 each, $500 for a full smile).
   Drawing notes: teeth use frontal-view proportions (visible
   widths shrink toward the back of the arch), the gum is drawn
   OVER the teeth so restored teeth can emerge from under it.
   ========================================================= */
(function initSmileBuilder() {
  const root = document.querySelector('[data-smile-builder]');
  if (!root) return;
  const svg = root.querySelector('[data-sb-svg]');
  const popEl = root.querySelector('[data-sb-pop]');
  const NS = 'http://www.w3.org/2000/svg';
  const COST = 50;
  const CX = 300;
  const f = (n) => (Math.round(n * 10) / 10).toString();

  // [name, outline, visible width, crown height, crown top y, damage]
  // keep: how much of the crown survives (0-1); lesion: [x, y, size] as fractions of the tooth
  const SPEC = [
    ['upper right second premolar', 'premolar', 30, 50, 64, { keep: 0.2 }],
    ['upper right first premolar', 'premolar', 35, 56, 70, { keep: 0.74, lesion: [0.05, 0.52, 0.5] }],
    ['upper right canine', 'canine', 42, 76, 76, { keep: 0.88, cervical: true, lesion: [-0.25, 0.62, 0.32] }],
    ['upper right lateral incisor', 'lateral', 48, 66, 82, { keep: 0.36 }],
    ['upper right central incisor', 'central', 62, 80, 78, { keep: 0.64, lesion: [0.3, 0.42, 0.42] }],
    ['upper left central incisor', 'central', 62, 80, 78, { keep: 0.95, cervical: true, lesion: [0.12, 0.55, 0.5] }],
    ['upper left lateral incisor', 'lateral', 48, 66, 82, { keep: 0.6, lesion: [0.28, 0.4, 0.4] }],
    ['upper left canine', 'canine', 42, 76, 76, { keep: 0.76 }],
    ['upper left first premolar', 'premolar', 35, 56, 70, { keep: 0.84, cervical: true }],
    ['upper left second premolar', 'premolar', 30, 50, 64, { keep: 0.5, lesion: [0, 0.35, 0.45] }],
  ];
  const TILT = [0, 1.5, 3, 4.5, 6];

  function el(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent?.appendChild(node);
    return node;
  }
  // Seeded random so every visitor sees the same damage.
  function seeded(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Crown outlines, drawn with the mesial side (toward the midline) at +x, then mirrored per side.
  const OUTLINES = {
    central: [[-.36, 0], 'L', [.36, 0], 'C', [.44, .25], [.5, .55], [.5, .78], 'C', [.5, .9], [.45, .99], [.36, 1],
      'C', [.15, 1.012], [-.15, 1], [-.3, .985], 'C', [-.44, .97], [-.5, .88], [-.5, .74], 'C', [-.5, .5], [-.44, .22], [-.36, 0]],
    lateral: [[-.36, 0], 'L', [.36, 0], 'C', [.45, .25], [.5, .5], [.49, .72], 'C', [.48, .9], [.4, 1], [.25, 1],
      'C', [.05, 1.01], [-.2, .99], [-.34, .94], 'C', [-.46, .88], [-.5, .78], [-.5, .64], 'C', [-.5, .42], [-.44, .2], [-.36, 0]],
    canine: [[-.36, 0], 'L', [.36, 0], 'C', [.46, .22], [.52, .45], [.5, .62], 'C', [.46, .76], [.22, .9], [.04, 1],
      'C', [-.18, .93], [-.4, .84], [-.48, .72], 'C', [-.53, .52], [-.46, .22], [-.36, 0]],
    // Bicuspids: broad, blunt biting edge with only a soft rise at the buccal cusp (not pointed like a canine).
    premolar: [[-.36, 0], 'L', [.36, 0], 'C', [.46, .2], [.5, .45], [.5, .7], 'C', [.5, .84], [.44, .91], [.3, .94],
      'C', [.16, .96], [.07, 1], [0, 1], 'C', [-.07, 1], [-.16, .96], [-.3, .94], 'C', [-.44, .91], [-.5, .84], [-.5, .7],
      'C', [-.5, .45], [-.46, .2], [-.36, 0]],
  };
  function outlinePath(type, w, h, m) {
    let d = '';
    let first = true;
    for (const part of OUTLINES[type]) {
      if (typeof part === 'string') { d += ` ${part}`; continue; }
      d += `${first ? 'M' : ''} ${f(part[0] * w * m)} ${f(part[1] * h)}`;
      first = false;
    }
    return d + ' Z';
  }

  // Lay teeth side by side so they touch at their contact points.
  const totalW = SPEC.reduce((s, t) => s + t[2], 0);
  let cursor = CX - totalW / 2;
  const layout = SPEC.map(([name, type, w, h, top, damage], i) => {
    const cx = cursor + w / 2;
    cursor += w;
    const left = i < SPEC.length / 2;
    const depth = left ? 4 - i : i - 5;
    const rot = (left ? 1 : -1) * TILT[depth];
    return { name, type, w, h, top, damage, i, cx, depth, m: left ? 1 : -1, rot };
  });
  const toWorld = (t, x, y) => {
    const a = t.rot * Math.PI / 180;
    return { x: t.cx + x * Math.cos(a) - y * Math.sin(a), y: t.top + x * Math.sin(a) + y * Math.cos(a) };
  };

  /* ---------- shared paint ---------- */
  const defs = el('defs', {}, svg);
  function linear(id, stops, horizontal = false) {
    const g = el('linearGradient', { id, x1: 0, y1: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1 }, defs);
    stops.forEach(([o, c, a = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  }
  function radial(id, stops) {
    const g = el('radialGradient', { id }, defs);
    stops.forEach(([o, c, a = 1]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g));
  }
  // Enamel: warm at the neck, bright in the body, slightly translucent blue-grey at the biting edge.
  linear('sbEnamel', [['0', '#E6D7BC'], ['0.2', '#F2E9D8'], ['0.5', '#FBF8F1'], ['0.8', '#F3F2EC'], ['0.94', '#D9E0E4'], ['1', '#BCC7CF']]);
  // Rounded crowns: darker toward both sides.
  linear('sbSides', [['0', '#5A4630', 0.42], ['0.2', '#5A4630', 0], ['0.8', '#5A4630', 0], ['1', '#5A4630', 0.42]], true);
  radial('sbGloss', [['0', '#FFFFFF', 0.85], ['1', '#FFFFFF', 0]]);
  linear('sbDecay', [['0', '#8C7140'], ['0.35', '#B49A63'], ['0.75', '#A08550'], ['1', '#6E5428']]);
  radial('sbStain', [['0', '#4A3216', 0.75], ['1', '#4A3216', 0]]);
  radial('sbCaries', [['0', '#0B0703'], ['0.6', '#22160A'], ['1', '#4A3418', 0]]);
  linear('sbGum', [['0', '#9E3F52'], ['0.55', '#C9616F'], ['0.85', '#DE8590'], ['1', '#E99AA2']]);

  const fxBack = el('g', { class: 'sb-fx' }, svg);
  const teethLayer = el('g', {}, svg);

  /* ---------- teeth ---------- */
  const teeth = layout.map((t) => {
    const rnd = seeded(t.i * 7919 + 17);
    const { w, h, m } = t;
    const outline = outlinePath(t.type, w, h, m);

    el('path', { d: outline }, el('clipPath', { id: `sbTooth${t.i}` }, defs));
    el('rect', { x: f(-w), y: 0, width: f(w * 2), height: f(h * 2) }, el('clipPath', { id: `sbGrow${t.i}` }, defs));

    // Jagged fracture line: what's left of the crown sits above it.
    const keepY = t.damage.keep * h;
    const jag = [];
    const steps = 7;
    for (let k = 0; k <= steps; k++) {
      const x = -w * 0.55 + (k / steps) * w * 1.1;
      let y = keepY + (rnd() - 0.5) * h * 0.14;
      if (k === 2 + Math.floor(rnd() * 3)) y -= h * 0.08;
      jag.push([x, Math.max(h * 0.08, Math.min(h * 1.05, y))]);
    }
    el('polygon', {
      points: [[-w, -h], [w, -h], [w, jag[steps][1]], ...jag.slice().reverse(), [-w, jag[0][1]]].map(([x, y]) => `${f(x)},${f(y)}`).join(' '),
    }, el('clipPath', { id: `sbBreak${t.i}` }, defs));

    const g = el('g', {
      class: 'sb-tooth', transform: `translate(${f(t.cx)} ${f(t.top)}) rotate(${f(t.rot)})`,
      tabindex: 0, role: 'button', 'aria-pressed': 'false',
    }, teethLayer);
    g.style.setProperty('--i', Math.round(Math.abs(t.i - 4.5)));
    const body = el('g', { class: 't-body' }, g);
    const dim = [0, 0.04, 0.1, 0.17, 0.24][t.depth];

    // Decayed crown
    const damaged = el('g', { class: 't-damaged', 'clip-path': `url(#sbBreak${t.i})` }, body);
    const dInner = el('g', { 'clip-path': `url(#sbTooth${t.i})` }, damaged);
    el('path', { d: outline, fill: 'url(#sbDecay)' }, dInner);
    el('rect', { x: f(-w / 2), y: 0, width: f(w), height: f(h), fill: 'url(#sbSides)' }, dInner);
    for (let k = 0; k < 3; k++) {
      el('ellipse', {
        cx: f((rnd() - 0.5) * w * 0.8), cy: f(h * (0.1 + rnd() * 0.6)),
        rx: f(w * (0.18 + rnd() * 0.2)), ry: f(h * (0.1 + rnd() * 0.12)), fill: 'url(#sbStain)',
      }, dInner);
    }
    if (t.damage.cervical) {
      el('path', {
        d: `M ${f(-w * 0.6)} ${f(h * 0.12)} Q 0 ${f(h * 0.3)} ${f(w * 0.6)} ${f(h * 0.12)} L ${f(w * 0.6)} ${f(h * 0.2)} Q 0 ${f(h * 0.4)} ${f(-w * 0.6)} ${f(h * 0.2)} Z`,
        fill: '#2B1C0C', opacity: 0.75,
      }, dInner);
    }
    if (t.damage.lesion) {
      const [lx, ly, ls] = t.damage.lesion;
      const r = ls * w * 0.42;
      const pts = Array.from({ length: 11 }, (_, k) => {
        const a = (k / 11) * Math.PI * 2;
        const rr = r * (0.45 + rnd() * 0.7);
        return `${f(lx * w * m + Math.cos(a) * rr * 0.8)},${f(ly * h + Math.sin(a) * rr * 1.25)}`;
      }).join(' ');
      el('polygon', { points: pts, fill: 'url(#sbCaries)' }, dInner);
    }
    // Fracture edge: dark break line with a lighter chipped dentin line just above it.
    const jagD = jag.map(([x, y], k) => `${k ? 'L' : 'M'} ${f(x)} ${f(y)}`).join(' ');
    el('path', { d: jagD, fill: 'none', stroke: '#D8C79F', 'stroke-width': 2.2, transform: 'translate(0 -2.2)', opacity: 0.7 }, dInner);
    el('path', { d: jagD, fill: 'none', stroke: '#24170A', 'stroke-width': 2.4 }, dInner);
    if (dim) el('rect', { x: f(-w), y: 0, width: f(w * 2), height: f(h * 1.2), fill: '#0A0C10', opacity: dim }, dInner);
    el('path', { d: outline, fill: 'none', stroke: 'rgba(40,26,10,0.6)', 'stroke-width': 1.2 }, damaged);

    // Healthy crown (hidden until restored). Clipped at the crown top so it emerges from under the gum.
    const healthy = el('g', { class: 't-healthy', 'clip-path': `url(#sbGrow${t.i})` }, body);
    const grow = el('g', { class: 't-grow' }, healthy);
    const hInner = el('g', { 'clip-path': `url(#sbTooth${t.i})` }, grow);
    el('path', { d: outline, fill: 'url(#sbEnamel)' }, hInner);
    el('rect', { x: f(-w / 2), y: 0, width: f(w), height: f(h), fill: 'url(#sbSides)' }, hInner);
    // soft vertical reflection, slightly toward the midline
    el('ellipse', { cx: f(w * 0.1 * m), cy: f(h * 0.45), rx: f(w * 0.13), ry: f(h * 0.3), fill: 'url(#sbGloss)' }, hInner);
    el('ellipse', { cx: f(-w * 0.2 * m), cy: f(h * 0.5), rx: f(w * 0.05), ry: f(h * 0.22), fill: 'url(#sbGloss)', opacity: 0.5 }, hInner);
    if (dim) el('rect', { x: f(-w), y: 0, width: f(w * 2), height: f(h * 1.2), fill: '#0A0C10', opacity: dim }, hInner);
    el('path', { d: outline, fill: 'none', stroke: 'rgba(70,52,30,0.32)', 'stroke-width': 1 }, grow);

    el('rect', { class: 't-hit', x: f(-w / 2), y: 0, width: f(w), height: f(h) }, body);
    el('path', { class: 't-focus', d: outline }, body);

    const tooth = { ...t, g, damaged, grow, jag, restored: false };
    g.addEventListener('click', () => toggle(tooth));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(tooth); }
    });
    g.setAttribute('aria-label', `${t.name}, decayed. Restore for $${COST}.`);
    return tooth;
  });

  /* ---------- gum (drawn over the teeth) ---------- */
  (function buildGum() {
    // Gum margin: arcs up over each tooth, dips into a papilla point between teeth.
    const contact = (t, side, yFrac) => toWorld(t, side * t.w * 0.47, t.h * yFrac);
    const papillae = [];
    for (let k = 0; k < layout.length - 1; k++) {
      const a = contact(layout[k], 1, 0.3), b = contact(layout[k + 1], -1, 0.3);
      papillae.push({ x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 2 });
    }
    const L = layout[0], R = layout[layout.length - 1];
    const startPt = contact(L, -1, 0.26);
    const endPt = contact(R, 1, 0.26);
    const pts = [startPt, ...papillae, endPt];
    let margin = `M ${f(pts[0].x - 6)} ${f(pts[0].y)} L ${f(pts[0].x)} ${f(pts[0].y)}`;
    layout.forEach((t, k) => {
      const A = pts[k], B = pts[k + 1];
      const Z = toWorld(t, -t.w * 0.06 * t.m, t.h * 0.13); // zenith sits a touch distal of center
      const yc = (8 * Z.y - A.y - B.y) / 6;
      margin += ` C ${f(A.x + (Z.x - A.x) * 0.45)} ${f(yc)} ${f(B.x - (B.x - Z.x) * 0.45)} ${f(yc)} ${f(B.x)} ${f(B.y)}`;
    });
    const last = pts[pts.length - 1];
    margin += ` L ${f(last.x + 6)} ${f(last.y)}`;

    const topY = Math.min(...pts.map(p => p.y)) - 42;
    const gum = `${margin} C ${f(last.x + 16)} ${f(last.y - 18)} ${CX + 150} ${topY} ${CX} ${topY} C ${CX - 150} ${topY} ${f(pts[0].x - 22)} ${f(pts[0].y - 18)} ${f(pts[0].x - 6)} ${f(pts[0].y)} Z`;

    const gumLayer = el('g', { class: 'sb-gum' }, svg);
    // soft shadow the gum casts onto the teeth
    el('path', { d: margin, fill: 'none', stroke: 'rgba(40,18,14,0.35)', 'stroke-width': 7, 'stroke-linejoin': 'round' }, gumLayer);
    el('path', { d: gum, fill: 'url(#sbGum)' }, gumLayer);
    // wet highlight along the margin and across the arch
    el('path', { d: margin, fill: 'none', stroke: 'rgba(255,214,218,0.45)', 'stroke-width': 1.4, transform: 'translate(0 -2)' }, gumLayer);
    el('path', {
      d: `M ${f(pts[0].x + 34)} ${f(pts[0].y - 22)} C ${CX - 120} ${topY + 10} ${CX + 120} ${topY + 10} ${f(last.x - 34)} ${f(last.y - 22)}`,
      fill: 'none', stroke: 'rgba(255,255,255,0.18)', 'stroke-width': 3, 'stroke-linecap': 'round',
    }, gumLayer);
  })();

  const fxFront = el('g', { class: 'sb-fx' }, svg);

  // Frame the drawing tightly (with room below for falling crumbs).
  try {
    const bb = svg.getBBox();
    svg.setAttribute('viewBox', `${f(bb.x - 10)} ${f(bb.y - 4)} ${f(bb.width + 20)} ${f(bb.height + 26)}`);
  } catch (_) { svg.setAttribute('viewBox', '120 0 360 190'); }

  /* ---------- comic effects ---------- */
  function starburst(t) {
    const c = toWorld(t, 0, t.h * 0.62);
    const spikes = 12;
    const r1 = t.w * 0.62, r2 = t.w * 1.02;
    const pts = Array.from({ length: spikes * 2 }, (_, k) => {
      const a = (k / (spikes * 2)) * Math.PI * 2;
      const r = k % 2 ? r1 : r2;
      return `${f(c.x + Math.cos(a) * r)},${f(c.y + Math.sin(a) * r)}`;
    }).join(' ');
    const burst = el('polygon', { class: 'sb-burst', points: pts }, fxBack);
    burst.animate([
      { opacity: 0, transform: 'scale(0.3) rotate(-8deg)' },
      { opacity: 1, transform: 'scale(1.08) rotate(4deg)', offset: 0.35 },
      { opacity: 0, transform: 'scale(1.22) rotate(10deg)' },
    ], { duration: 620, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }).onfinish = () => burst.remove();

    const lines = el('g', {}, fxFront);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.2;
      const r = t.w * 0.75;
      const line = el('line', {
        class: 'sb-action',
        x1: f(c.x + Math.cos(a) * r), y1: f(c.y + Math.sin(a) * r),
        x2: f(c.x + Math.cos(a) * (r + 9)), y2: f(c.y + Math.sin(a) * (r + 9)),
      }, lines);
      line.animate([
        { opacity: 0, transform: 'translate(0, 0)' },
        { opacity: 1, offset: 0.3 },
        { opacity: 0, transform: `translate(${f(Math.cos(a) * 10)}px, ${f(Math.sin(a) * 10)}px)` },
      ], { duration: 460, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    setTimeout(() => lines.remove(), 500);
  }

  function crumble(t) {
    const pieces = t.damage.keep < 0.3 ? 2 : 4;
    for (let k = 0; k < pieces; k++) {
      const [lx, ly] = t.jag[1 + Math.floor((k / pieces) * (t.jag.length - 2))];
      const p = toWorld(t, lx, ly);
      const s = 2.5 + Math.random() * 3;
      const frag = el('polygon', {
        class: 'sb-crumb',
        points: `${f(p.x - s)},${f(p.y - s * 0.5)} ${f(p.x + s)},${f(p.y - s)} ${f(p.x + s * 0.7)},${f(p.y + s)} ${f(p.x - s * 0.6)},${f(p.y + s * 0.8)}`,
      }, fxFront);
      const dx = (Math.random() - 0.5) * 22;
      frag.animate([
        { opacity: 1, transform: 'translate(0, 0) rotate(0deg)' },
        { opacity: 0, transform: `translate(${f(dx)}px, ${f(36 + Math.random() * 24)}px) rotate(${f((Math.random() - 0.5) * 220)}deg)` },
      ], { duration: 560, easing: 'cubic-bezier(0.55, 0, 1, 0.45)' }).onfinish = () => frag.remove();
    }
  }

  /* ---------- restore / undo ---------- */
  const reduce = () => reduceMotion() || !svg.animate;

  function restore(tooth) {
    tooth.restored = true;
    tooth.g.setAttribute('aria-pressed', 'true');
    tooth.g.setAttribute('aria-label', `${tooth.name}, restored. Tap to undo.`);
    if (reduce()) { tooth.g.classList.add('is-restored'); return; }

    // 1. the old tooth shudders, 2. crumbles away, 3. a new one pops out of the gum, 4. comic burst
    tooth.damaged.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-1.6px)' }, { transform: 'translateX(1.6px)' },
      { transform: 'translateX(-1px)' }, { transform: 'translateX(0)' },
    ], { duration: 150, easing: 'linear' });
    setTimeout(() => {
      if (!tooth.restored) return;
      tooth.g.classList.add('is-restored');
      crumble(tooth);
      tooth.grow.animate([
        { transform: 'translateY(-100%) scale(1, 1.05)' },
        { transform: 'translateY(5%) scale(1.06, 0.9)', offset: 0.55 },
        { transform: 'translateY(-2%) scale(0.98, 1.04)', offset: 0.78 },
        { transform: 'translateY(0) scale(1, 1)' },
      ], { duration: 560, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)', fill: 'backwards' });
      setTimeout(() => tooth.restored && starburst(tooth), 300);
    }, 140);
  }

  function undo(tooth) {
    tooth.restored = false;
    tooth.g.setAttribute('aria-pressed', 'false');
    tooth.g.setAttribute('aria-label', `${tooth.name}, decayed. Restore for $${COST}.`);
    if (reduce()) { tooth.g.classList.remove('is-restored'); return; }
    tooth.grow.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(-100%)' },
    ], { duration: 220, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' }).onfinish = () => {
      if (!tooth.restored) tooth.g.classList.remove('is-restored');
    };
  }

  /* ---------- readout ---------- */
  const countEl = root.querySelector('[data-sb-count]');
  const amountEl = root.querySelector('[data-sb-amount]');
  const messageEl = root.querySelector('[data-sb-message]');
  const donateBtn = root.querySelector('[data-sb-donate]');

  function bump(node) {
    if (reduce()) return;
    node.parentElement.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: EASE_OUT }
    );
  }

  let wasFull = false;
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
    const full = count === teeth.length;
    if (full && !wasFull && popEl) {
      setTimeout(() => popEl.classList.add('is-on'), reduce() ? 0 : 520);
    } else if (!full && popEl) {
      popEl.classList.remove('is-on');
    }
    wasFull = full;
  }

  function toggle(tooth) {
    root.classList.add('has-interacted');
    tooth.restored ? undo(tooth) : restore(tooth);
    update();
  }

  // Center teeth first, rippling outward.
  const centerOut = [...teeth].sort((a, b) => Math.abs(a.i - 4.5) - Math.abs(b.i - 4.5));
  root.querySelector('[data-sb-all]').addEventListener('click', () => {
    root.classList.add('has-interacted');
    centerOut.filter(t => !t.restored && !t.queued).forEach((t, k) => {
      if (reduce()) { restore(t); return; }
      t.queued = setTimeout(() => { t.queued = 0; restore(t); update(); }, k * 90);
    });
    update();
  });
  root.querySelector('[data-sb-reset]').addEventListener('click', () => {
    teeth.forEach(t => {
      if (t.queued) { clearTimeout(t.queued); t.queued = 0; }
      if (t.restored) undo(t);
    });
    update();
  });
  donateBtn.addEventListener('click', () => {
    const amount = teeth.filter(t => t.restored).length * COST;
    if (amount) handleDonate('One-Time', amount);
  });

  update();

  onceInView(root, () => {
    root.classList.add('is-in');
    setTimeout(() => root.classList.add('is-settled'), 900);
  }, { threshold: 0.2 });
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
