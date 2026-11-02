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

/* =========================================================
   Transformations deck. Five cases shuffle through a three-card
   stage on their own (before, a wipe to after, then the next card
   moves to the middle). The person always wins: hover, focus, tap,
   swipe, arrows or a dot take over, and autoplay returns after a few
   quiet seconds. There's a pause button, and reduced-motion users
   get no autoplay at all.
   ========================================================= */
(function initShowcase() {
  const root = document.querySelector('[data-showcase]');
  if (!root) return;
  const q = (sel) => root.querySelector(sel);
  const stage = q('[data-sc-stage]');
  const cards = Array.from(root.querySelectorAll('[data-sc-slide]'));
  const pills = cards.map((c) => c.querySelector('[data-sc-pill]'));
  const dots = Array.from(root.querySelectorAll('[data-sc-dot]'));
  const bars = dots.map((d) => d.querySelector('i'));
  const countEl = q('[data-sc-count]');
  const titleEl = q('[data-sc-title]');
  const descEl = q('[data-sc-desc]');
  const seg = q('[data-seg]');
  const segOpts = Array.from(seg.querySelectorAll('[data-seg-option]'));
  const playBtn = q('[data-sc-play]');
  const N = cards.length;
  const half = Math.floor(N / 2);

  // Reading time: each phase stays up long enough to read its sentence.
  const phaseMs = (text) => Math.min(9000, Math.max(4200, 2200 + text.trim().split(/\s+/).length * 180));
  const cases = cards.map((c) => ({
    title: c.dataset.title,
    before: c.dataset.beforeText,
    after: c.dataset.afterText,
    dBefore: phaseMs(c.dataset.beforeText),
    dAfter: phaseMs(c.dataset.afterText),
  }));

  let index = 0, isAfter = false, elapsed = 0, last = 0, raf = 0;
  let userPaused = reduceMotion();
  let inView = false, tabVisible = !document.hidden, hover = false, focus = false, holdUntil = 0;
  let suppressClick = false, edgeT = 0, down = null;
  const lastP = [];

  const running = () => inView && tabVisible && !userPaused;
  const held = (now) => hover || focus || now < holdUntil;

  /* ---------- clock ---------- */
  function schedule() {
    if (raf || !running()) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const dt = Math.min(120, now - last);
    last = now;
    if (!held(now)) {
      elapsed += dt;
      const len = isAfter ? cases[index].dAfter : cases[index].dBefore;
      if (elapsed >= len) { if (!isAfter) setAfter(true); else goTo(index + 1); }
    }
    paintProgress();
    raf = requestAnimationFrame(frame);
  }
  function paintProgress() {
    const c = cases[index];
    const total = c.dBefore + c.dAfter;
    bars.forEach((bar, i) => {
      const p = i < index ? 1 : i > index ? 0 : ((isAfter ? c.dBefore : 0) + elapsed) / total;
      const v = Math.round(p * 500) / 500;
      if (lastP[i] !== v) { lastP[i] = v; bar.style.setProperty('--p', v); }
    });
  }
  function engage() {
    holdUntil = performance.now() + 9000;
    root.classList.add('has-interacted');
    updatePlay();
  }

  /* ---------- state ---------- */
  function setDesc(text) {
    if (descEl.textContent === text) return;
    if (reduceMotion()) { descEl.textContent = text; return; }
    descEl.classList.add('is-swapping');
    clearTimeout(descEl._t);
    descEl._t = setTimeout(() => { descEl.textContent = text; descEl.classList.remove('is-swapping'); }, 170);
  }
  function updatePlay() {
    playBtn.querySelector('i').className = userPaused ? 'ph ph-play' : 'ph ph-pause';
    playBtn.setAttribute('aria-label', userPaused ? 'Play autoplay' : 'Pause autoplay');
    // Screen readers shouldn't be narrated at while it plays on its own.
    descEl.setAttribute('aria-live', userPaused || root.classList.contains('has-interacted') ? 'polite' : 'off');
  }
  function render() {
    const c = cases[index];
    countEl.textContent = `Patient ${index + 1} of ${N}`;
    titleEl.textContent = c.title;
    setDesc(isAfter ? c.after : c.before);
    seg.dataset.state = isAfter ? '1' : '0';
    segOpts.forEach((o, i) => o.setAttribute('aria-pressed', String((i === 1) === isAfter)));
    dots.forEach((d, i) => {
      if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    cards.forEach((card, i) => {
      const pos = ((i - index + N + half) % N) - half;
      const active = i === index;
      card.dataset.pos = String(pos);
      card.inert = Math.abs(pos) > 1;
      pills[i].textContent = active && isAfter ? 'After' : 'Before';
      const flip = card.querySelector('[data-sc-flip]');
      flip.tabIndex = active ? 0 : -1;
      flip.setAttribute('aria-label', `Patient ${i + 1}: show ${active && isAfter ? 'before' : 'after'} treatment`);
    });
    paintProgress();
  }
  function flashEdge() {
    if (reduceMotion()) return;
    stage.setAttribute('data-wiping', '');
    clearTimeout(edgeT);
    edgeT = setTimeout(() => stage.removeAttribute('data-wiping'), 1000);
  }
  function setAfter(v, { manual = false } = {}) {
    if (isAfter === v) return;
    isAfter = v;
    elapsed = 0;
    if (manual) engage();
    cards[index].classList.toggle('is-after', v);
    flashEdge();
    render();
  }
  function prefetch(i) {
    cards[(i + N) % N].querySelectorAll('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
  }
  function goTo(next, { manual = false } = {}) {
    next = (next + N) % N;
    if (next === index) return;
    const leaving = cards[index];
    index = next;
    isAfter = false;
    elapsed = 0;
    if (manual) engage();
    // let the old card finish moving away before it wipes back to "before"
    setTimeout(() => { if (cards[index] !== leaving) leaving.classList.remove('is-after'); }, 820);
    cards[index].classList.remove('is-after');
    prefetch(index);
    prefetch(index + 1);
    render();
  }

  /* ---------- controls ---------- */
  q('[data-sc-prev]').addEventListener('click', () => goTo(index - 1, { manual: true }));
  q('[data-sc-next]').addEventListener('click', () => goTo(index + 1, { manual: true }));
  playBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    if (!userPaused) holdUntil = 0;
    updatePlay();
    schedule();
  });
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i, { manual: true })));
  segOpts.forEach((o, i) => o.addEventListener('click', () => setAfter(i === 1, { manual: true })));
  cards.forEach((card, i) => {
    card.querySelector('[data-sc-flip]').addEventListener('click', () => {
      if (suppressClick || i !== index) return;
      setAfter(!isAfter, { manual: true });
    });
    card.querySelector('[data-sc-pick]').addEventListener('click', () => {
      if (!suppressClick) goTo(i, { manual: true });
    });
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1, { manual: true }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1, { manual: true }); }
  });

  /* ---------- swipe ---------- */
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY };
  });
  stage.addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    down = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 80);
      goTo(index + (dx < 0 ? 1 : -1), { manual: true });
    }
  });
  stage.addEventListener('pointercancel', () => { down = null; });
  stage.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

  /* ---------- when to play ---------- */
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  root.addEventListener('pointerleave', () => { hover = false; });
  root.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) focus = true; });
  root.addEventListener('focusout', () => { focus = false; });
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) schedule(); }, { threshold: 0.3 }).observe(root);
  } else { inView = true; schedule(); }

  render();
  updatePlay();
  prefetch(0);
  prefetch(1);
})();

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

  const BLOCK = 5;
  const blockLabel = document.querySelector('[data-milestone-block]');
  const raised = Math.max(0, parseFloat(numEl.dataset.raised) || 0);
  // Patients who have finished treatment. The tracker shows the block of five being worked on: 1-5, then 6-10, 11-15...
  const completed = Math.max(0, parseInt(numEl.dataset.completed, 10) || 0);
  const blockStart = Math.floor(completed / BLOCK) * BLOCK;
  const segments = [];
  for (let n = blockStart + 1; n <= blockStart + BLOCK; n++) {
    if (n <= completed) segments.push({ n, kind: 'done', rest: 0 });
    else if (n === completed + 1) segments.push({ n, kind: 'current', rest: 100 });
    else segments.push({ n, kind: 'ghost', rest: 100 });
  }
  if (blockLabel) blockLabel.textContent = `Smiles ${blockStart + 1} to ${blockStart + BLOCK}`;

  list.innerHTML = segments.map((seg, i) => {
    const iconHtml = `<i class="${seg.kind === 'done' ? 'ph-fill ph-smiley' : 'ph ph-smiley'}"></i>`;
    const sr = seg.kind === 'done' ? `Smile ${seg.n} complete`
      : seg.kind === 'current' ? `Smile ${seg.n}, next to be funded`
      : `Smile ${seg.n}, not started`;
    return `<li class="milestone is-${seg.kind}" style="--i:${i};--rest:${seg.rest}%">
      <span class="ms-icon" aria-hidden="true">${iconHtml}</span>
      <span class="ms-bar" aria-hidden="true"><span class="ms-fill"></span></span>
      <span class="ms-label" aria-hidden="true">Smile ${seg.n}</span>
      <span class="sr-only">${sr}</span>
    </li>`;
  }).join('');

  const sub = document.querySelector('[data-raised-sub]');
  if (sub) {
    sub.innerHTML = completed > 0
      ? `<strong>${completed}</strong> smiles are complete. We are now working on smiles <strong>${completed + 1} to ${blockStart + BLOCK}</strong>. Every <strong>$500</strong> funds one patient's full smile.`
      : 'Every <strong>$500</strong> funds one patient\'s full smile. Be one of the first to help us get there.';
  }

  onceInView(list, () => {
    list.classList.add('is-in');
    countUp(numEl, raised, { prefix: '$', duration: 900 + segments.length * 240 });
  }, { threshold: 0.5 });
})();

/* =========================================================
   Sponsor a smile. The gift is a number and a ten-cell meter
   ($50 a cell, $500 a full smile). Pick an amount or type your
   own and the meter fills to match. The first time it comes into
   view it plays a short demo by itself, and stops the moment
   someone touches it.
   ========================================================= */
(function initGive() {
  const root = document.querySelector('[data-give]');
  if (!root) return;
  const $ = (sel) => root.querySelector(sel);
  const amountEl = $('[data-give-amount]');
  const perEl = $('[data-give-per]');
  const cells = Array.from(root.querySelectorAll('[data-give-cells] i'));
  const countEl = $('[data-give-count]');
  const impactEl = $('[data-give-impact]');
  const ctaEl = $('[data-give-cta]');
  const customEl = $('[data-give-custom]');
  const tiers = Array.from(root.querySelectorAll('[data-amt]'));
  const COST = 50, TEETH = cells.length, SMILE = COST * TEETH; // $500
  const money = (v) => '$' + Math.round(v).toLocaleString('en-US');
  const teethFor = (v) => Math.min(TEETH, Math.floor(v / COST));
  const demo = { timer: 0, step: 0, on: false };

  let amount = 0, monthly = false, shown = 0, tweenRaf = 0;

  // Move the visible number toward the new amount instead of snapping.
  function showNumber(to) {
    cancelAnimationFrame(tweenRaf);
    if (reduceMotion() || Math.abs(to - shown) < 2) { shown = to; amountEl.textContent = Math.round(to).toLocaleString('en-US'); return; }
    const from = shown, start = performance.now(), len = 420;
    (function tick(now) {
      const t = Math.min(1, (now - start) / len);
      shown = from + (to - from) * easeOutCubic(t);
      amountEl.textContent = Math.round(shown).toLocaleString('en-US');
      if (t < 1) tweenRaf = requestAnimationFrame(tick);
    })(start);
  }

  function impactText(n) {
    if (amount <= 0) return `Pick an amount to begin. <strong>${money(COST)}</strong> restores one tooth and <strong>${money(SMILE)}</strong> completes a patient's smile.`;
    if (monthly) {
      const months = SMILE / amount;
      const cadence = months <= 1.05 ? 'a full smile every month' : `about one full smile every ${Math.round(months)} months`;
      return `<strong>${money(amount)} a month</strong> is ${money(amount * 12)} a year: ${cadence}.`;
    }
    if (amount < COST) return `<strong>${money(amount)}</strong> goes toward the next tooth. ${money(COST)} restores one.`;
    if (amount >= SMILE) {
      const smiles = Math.floor(amount / SMILE), rest = amount - smiles * SMILE;
      if (!rest) return `<strong>${money(amount)}</strong> gives ${smiles === 1 ? 'one patient a complete smile' : `${smiles} patients complete smiles`}.`;
      return `<strong>${money(amount)}</strong> funds ${smiles === 1 ? 'a complete smile' : `${smiles} complete smiles`}, plus ${money(rest)} toward the next patient.`;
    }
    return `<strong>${money(amount)}</strong> restores ${n} ${n === 1 ? 'tooth' : 'teeth'}. ${money(SMILE - amount)} more completes this patient's smile.`;
  }

  function render() {
    const n = teethFor(amount);
    showNumber(amount);
    perEl.textContent = monthly ? 'per month' : 'one time';
    cells.forEach((c, i) => c.classList.toggle('is-on', i < n));
    countEl.textContent = n >= TEETH ? 'Full smile' : `${n} of ${TEETH} teeth`;
    tiers.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.amt) === amount)));
    impactEl.innerHTML = impactText(n);
    ctaEl.disabled = amount < 5;
    ctaEl.textContent = amount < 5 ? 'Choose an amount' : `Give ${money(amount)}${monthly ? ' every month' : ''}`;
  }

  function setAmount(v) {
    amount = Math.max(0, Math.round(v) || 0);
    if (document.activeElement !== customEl) customEl.value = tiers.some((t) => Number(t.dataset.amt) === amount) || !amount ? '' : String(amount);
    render();
  }

  tiers.forEach((t) => t.addEventListener('click', () => setAmount(Number(t.dataset.amt))));
  customEl.addEventListener('input', () => {
    const v = parseInt(customEl.value, 10);
    amount = Number.isFinite(v) && v > 0 ? Math.min(v, 100000) : 0;
    render();
  });
  initTwoStateToggle(root, { faces: [], onChange(state) { monthly = state === 1; render(); } });
  ctaEl.addEventListener('click', () => { if (amount >= 5) handleDonate(monthly ? 'Monthly' : 'One-Time', amount); });

  /* ---------- the self-playing demo ---------- */
  const DEMO = [100, 250, 500, 250];
  function demoStep() {
    if (!demo.on) return;
    setAmount(DEMO[demo.step]);
    demo.step += 1;
    if (demo.step >= DEMO.length) { demo.on = false; return; } // settles on the last (a friendly default)
    demo.timer = setTimeout(demoStep, demo.step === 3 ? 2200 : 2700);
  }
  function stopDemo() { demo.on = false; clearTimeout(demo.timer); }
  ['pointerdown', 'keydown', 'focusin'].forEach((ev) => root.addEventListener(ev, stopDemo));

  render();

  onceInView(root, () => {
    if (reduceMotion()) { setAmount(250); return; }
    demo.on = true;
    demo.timer = setTimeout(demoStep, 700);
  }, { threshold: 0.35 });
})();

/* =========================================================
   Chip groups: crewneck sizes
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
