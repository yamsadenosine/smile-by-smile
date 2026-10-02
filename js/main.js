document.documentElement.classList.add('js-ready');
document.getElementById('year').textContent = new Date().getFullYear();

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduceMotion = () => motionQuery.matches;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

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
   Section reveals: each .reveal fades up as it enters view,
   staggered by its order inside its section.
   ========================================================= */
document.querySelectorAll('section').forEach((section) => {
  section.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 4));
  });
});
// The hero is always on screen at load, so it animates in right away.
requestAnimationFrame(() => {
  document.querySelectorAll('#hero .reveal').forEach((el) => el.classList.add('is-in'));
});
document.querySelectorAll('main section:not(#hero) .reveal').forEach((el) => {
  onceInView(el, (target) => target.classList.add('is-in'), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
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
   Hero stat counters
   ========================================================= */
document.querySelectorAll('[data-count]').forEach((el) => {
  onceInView(el, () => countUp(el, parseFloat(el.dataset.count) || 0, { duration: 1100 }));
});

/* =========================================================
   Total raised: the bar shows progress toward funding the
   next $500 patient, and fills when it scrolls into view.
   ========================================================= */
(function initRaised() {
  const numEl = document.querySelector('[data-raised]');
  const meter = document.querySelector('[data-raised-meter]');
  if (!numEl || !meter) return;

  const PATIENT_COST = 500;
  const raised = Math.max(0, parseFloat(numEl.dataset.raised) || 0);
  const funded = Math.floor(raised / PATIENT_COST);
  const remainder = raised - funded * PATIENT_COST;
  // Right on a $500 boundary, show the patient just funded as a full bar.
  const justFunded = raised > 0 && remainder === 0;
  const pct = justFunded ? 100 : (remainder / PATIENT_COST) * 100;

  const fill = meter.querySelector('[data-raised-fill]');
  const track = meter.querySelector('[role="progressbar"]');
  const startLabel = meter.querySelector('[data-raised-start]');
  const goalLabel = meter.querySelector('[data-raised-goal]');
  const sub = document.querySelector('[data-raised-sub]');

  const base = justFunded ? (funded - 1) * PATIENT_COST : funded * PATIENT_COST;
  if (startLabel) startLabel.textContent = '$' + base.toLocaleString('en-US');
  if (goalLabel) goalLabel.textContent = '$' + (base + PATIENT_COST).toLocaleString('en-US');
  track?.setAttribute('aria-valuenow', String(Math.round(justFunded ? PATIENT_COST : remainder)));

  if (sub && raised > 0) {
    const patientsLine = funded > 0
      ? `<strong>${funded}</strong> full smile${funded > 1 ? 's' : ''} funded so far. `
      : '';
    sub.innerHTML = justFunded
      ? `${patientsLine}Every <strong>$500</strong> funds roughly one patient's full smile.`
      : `${patientsLine}<strong>$${Math.round(PATIENT_COST - remainder).toLocaleString('en-US')}</strong> to go until the next patient's smile is fully funded.`;
  }

  onceInView(meter, () => {
    meter.classList.add('is-in');
    fill.style.clipPath = `inset(0 ${100 - pct}% 0 0 round 999px)`;
    countUp(numEl, raised, { prefix: '$', duration: 1400 });
  }, { threshold: 0.6 });
})();

/* =========================================================
   Impact calculator: live donation to smiles-restored visual
   ========================================================= */
(function initImpactCalculator() {
  const slider = document.querySelector('[data-impact-slider]');
  if (!slider) return;

  const amountNumEl = document.querySelector('[data-impact-amount-num]');
  const donateAmountEl = document.querySelector('[data-impact-donate-amount]');
  const donateBtn = document.querySelector('[data-impact-donate]');
  const resultEl = document.querySelector('[data-impact-result]');
  const captionEl = document.querySelector('[data-impact-caption]');
  const presetChips = Array.from(document.querySelectorAll('[data-impact-preset]'));
  const toothGroups = Array.from(document.querySelectorAll('svg [data-tooth-index]'));

  const FULL_SMILE = 500;
  const TEETH_COUNT = 10;

  function sparkleTooth(g) {
    if (reduceMotion() || !g.animate) return;
    const spark = g.querySelector('.tooth-sparkle');
    const fixedShape = g.querySelector('.tooth-fixed');
    spark?.animate(
      [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.2)', offset: 0.4 }, { opacity: 0, transform: 'scale(0.7)' }],
      { duration: 520, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
    fixedShape?.animate(
      [{ transform: 'scale(0.9)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  }

  function render(amount) {
    amount = Math.max(0, Math.min(parseFloat(slider.max), Math.round(amount)));
    slider.value = amount;
    if (amountNumEl) amountNumEl.textContent = amount.toLocaleString('en-US');
    if (donateAmountEl) donateAmountEl.textContent = amount.toLocaleString('en-US');
    slider.style.setProperty('--fill', Math.min(100, (amount / slider.max) * 100) + '%');

    const smilesFunded = Math.floor(amount / FULL_SMILE);
    const remainderAmount = amount - smilesFunded * FULL_SMILE;
    const rawTeethFixed = Math.round((remainderAmount / FULL_SMILE) * TEETH_COUNT);
    const teethFixed = (remainderAmount === 0 && smilesFunded > 0) ? TEETH_COUNT : rawTeethFixed;

    toothGroups.forEach((g, i) => {
      const shouldBeFixed = i < teethFixed;
      const wasFixed = g.classList.contains('is-fixed');
      if (shouldBeFixed && !wasFixed) {
        g.classList.add('is-fixed');
        sparkleTooth(g);
      } else if (!shouldBeFixed && wasFixed) {
        g.classList.remove('is-fixed');
      }
    });

    if (resultEl) {
      if (amount === 0) {
        resultEl.innerHTML = '<span>Move the slider to see exactly what your gift restores.</span>';
      } else if (smilesFunded > 0 && remainderAmount === 0) {
        resultEl.innerHTML = `<span><strong>${smilesFunded}</strong> full smile reconstruction${smilesFunded > 1 ? 's' : ''} funded. Every tooth restored.</span>`;
      } else if (smilesFunded > 0) {
        resultEl.innerHTML = `<span><strong>${smilesFunded}</strong> full smile${smilesFunded > 1 ? 's' : ''} funded, plus <strong>${teethFixed}</strong> of 10 teeth toward the next.</span>`;
      } else {
        resultEl.innerHTML = `<span>Restores <strong>${teethFixed}</strong> of 10 teeth for one patient. <strong>${TEETH_COUNT - teethFixed}</strong> more to a full smile.</span>`;
      }
    }

    if (captionEl) {
      if (smilesFunded > 0 && remainderAmount === 0) {
        captionEl.textContent = smilesFunded === 1
          ? `Patient 1's smile, fully restored.`
          : `Patients 1 to ${smilesFunded}, every smile fully restored.`;
      } else if (smilesFunded > 0) {
        captionEl.textContent = `Patient ${smilesFunded + 1}'s smile, restored tooth by tooth as your gift grows.`;
      } else {
        captionEl.textContent = `One patient's smile, restored tooth by tooth as your gift grows.`;
      }
    }

    presetChips.forEach((chip) => {
      chip.classList.toggle('is-active', parseInt(chip.dataset.impactPreset, 10) === amount);
    });
  }

  slider.addEventListener('input', () => render(parseFloat(slider.value)));
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => render(parseFloat(chip.dataset.impactPreset)));
  });
  if (donateBtn) {
    donateBtn.addEventListener('click', () => handleDonate('One-Time', parseFloat(slider.value) || null));
  }

  render(parseFloat(slider.value));
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
   Referral form: opens the visitor's email app with the
   referral pre-filled, sent straight to the founder's inbox.
   ========================================================= */
function handleReferralSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());

  // TODO: swap this destination for whatever inbox should receive referrals.
  const to = 'yamminaldeib@gmail.com';
  const subject = `Dental Care Referral: ${data.personName}`;
  const body =
`New referral submitted through Smile by Smile:

Person in need: ${data.personName}
Relationship to referrer: ${data.relationship}
Their contact info: ${data.personContact || 'Not provided'}

Situation:
${data.situation}

--
Submitted by: ${data.referrerName}
Referrer contact: ${data.referrerContact}`;

  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  showToast('Opening your email app to send this referral...');
  window.location.href = mailtoUrl;
}

const referForm = document.querySelector('[data-refer-form]');
if (referForm) referForm.addEventListener('submit', handleReferralSubmit);
