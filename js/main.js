document.documentElement.classList.add('js-ready');
document.getElementById('year').textContent = new Date().getFullYear();

/* =========================================================
   Mobile nav
   ========================================================= */
const navBurger = document.getElementById('navBurger');
const navMobile = document.getElementById('navMobile');
navBurger.addEventListener('click', () => {
  const open = navMobile.classList.toggle('open');
  navBurger.setAttribute('aria-expanded', String(open));
});
navMobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navMobile.classList.remove('open');
  navBurger.setAttribute('aria-expanded', 'false');
}));

/* =========================================================
   Before / After gallery: tap the photo to reveal the after
   (and swap the caption to the matching clinical description)
   ========================================================= */
function initBeforeAfterTap(root) {
  const beforeImg = root.querySelector('[data-ba-before]');
  const afterImg = root.querySelector('[data-ba-after]');
  const stateTag = root.querySelector('[data-ba-state-tag]');
  const hint = root.querySelector('[data-ba-hint]');
  const desc = root.closest('.ba-card')?.querySelector('[data-ba-desc]');
  let showingAfter = false;

  function render() {
    beforeImg.classList.toggle('is-visible', !showingAfter);
    afterImg.classList.toggle('is-visible', showingAfter);
    if (stateTag) {
      stateTag.textContent = showingAfter ? 'After' : 'Before';
      stateTag.classList.toggle('is-after', showingAfter);
    }
    if (hint) hint.textContent = showingAfter ? 'Tap to see before ↻' : 'Tap to see after ↻';
    if (desc) desc.textContent = showingAfter ? desc.dataset.afterText : desc.dataset.beforeText;
    root.setAttribute('aria-pressed', String(showingAfter));
  }

  root.addEventListener('click', () => {
    showingAfter = !showingAfter;
    render();
  });

  render();
}
document.querySelectorAll('[data-ba-tap]').forEach(initBeforeAfterTap);

/* =========================================================
   GSAP: scroll reveals + counters
   ========================================================= */
if (window.gsap) {
  gsap.registerPlugin(ScrollTrigger);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    document.querySelectorAll('.reveal').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
      });
    });
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.style.opacity = 1);
  }

  // Hero stat counters
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 1.6, ease: 'power2.out',
      onUpdate: () => el.textContent = Math.round(counter.val),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  // Total raised counter
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = parseFloat(el.dataset.countTo);
    const prefix = el.dataset.prefix ?? '$';
    const counter = { val: 0 };
    gsap.to(counter, {
      val: target, duration: 1.8, ease: 'power3.out',
      onUpdate: () => el.textContent = prefix + Math.round(counter.val).toLocaleString('en-US'),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  // Total raised bar — purely visual, no goal attached.
  // TODO: bump this width whenever you update data-count-to above, so the bar
  // keeps reflecting "funds raised" rather than being stuck at one value.
  document.querySelectorAll('[data-raised-fill]').forEach((el) => {
    gsap.to(el, {
      width: '0%', duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true }
    });
  });
}

/* =========================================================
   Shop: front/back scroll carousel + color swatches
   ========================================================= */
document.querySelectorAll('[data-shop-product]').forEach((card) => {
  const scrollEl = card.querySelector('[data-shop-scroll]');
  const dots = Array.from(card.querySelectorAll('[data-shop-dot]'));
  const label = card.querySelector('[data-shop-label]');
  const prevBtn = card.querySelector('[data-shop-prev]');
  const nextBtn = card.querySelector('[data-shop-next]');
  const frontImg = card.querySelector('[data-shop-front]');
  const backImg = card.querySelector('[data-shop-back]');
  const swatches = Array.from(card.querySelectorAll('.swatch'));
  const swatchNameLabel = card.querySelector('[data-swatch-name-label]');
  if (!scrollEl) return;

  function currentIndex() {
    const width = scrollEl.clientWidth || 1;
    return Math.round(scrollEl.scrollLeft / width);
  }
  function goTo(index) {
    scrollEl.scrollTo({ left: index * scrollEl.clientWidth, behavior: 'smooth' });
  }
  function syncActive() {
    const index = currentIndex();
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    if (label) label.textContent = index === 0 ? 'Front' : 'Back';
  }

  // Size the box to match the garment photo's own proportions so there's
  // no dead gray space around it, no matter how tall/narrow that color's shot is.
  function fitRatioToImage(img) {
    if (!img) return;
    const apply = () => {
      if (img.naturalWidth && img.naturalHeight) {
        scrollEl.style.setProperty('--shop-ratio', `${img.naturalWidth} / ${img.naturalHeight}`);
      }
    };
    if (img.complete) apply();
    else img.addEventListener('load', apply, { once: true });
  }
  fitRatioToImage(frontImg);

  scrollEl.addEventListener('scroll', () => {
    clearTimeout(scrollEl._t);
    scrollEl._t = setTimeout(syncActive, 80);
  });
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(Math.max(0, currentIndex() - 1)));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(Math.min(1, currentIndex() + 1)));

  swatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('is-active'));
      sw.classList.add('is-active');
      if (frontImg) frontImg.src = sw.dataset.front;
      if (backImg) backImg.src = sw.dataset.back;
      if (swatchNameLabel) swatchNameLabel.textContent = sw.dataset.swatchName;
      fitRatioToImage(frontImg);
      goTo(0);
    });
  });
});

/* =========================================================
   Impact calculator: live donation → smiles-restored visualizer
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FULL_SMILE = 500;
  const TEETH_COUNT = 10;

  function sparkleTooth(g) {
    const spark = g.querySelector('.tooth-sparkle');
    const fixedShape = g.querySelector('.tooth-fixed');
    if (!window.gsap || reduceMotion) return;
    if (spark) {
      gsap.fromTo(spark, { opacity: 0, scale: 0.3, transformOrigin: '50% 50%' }, {
        opacity: 1, scale: 1.3, duration: 0.25, ease: 'power2.out',
        onComplete: () => gsap.to(spark, { opacity: 0, scale: 0.6, duration: 0.35, delay: 0.05 })
      });
    }
    if (fixedShape) {
      gsap.fromTo(fixedShape, { scale: 0.85, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    }
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
        resultEl.innerHTML = `<span>🎉 <strong>${smilesFunded}</strong> full smile reconstruction${smilesFunded > 1 ? 's' : ''} funded — every tooth restored.</span>`;
      } else if (smilesFunded > 0) {
        resultEl.innerHTML = `<span>🎉 <strong>${smilesFunded}</strong> full smile${smilesFunded > 1 ? 's' : ''} funded, plus <strong>${teethFixed}</strong> of 10 teeth toward the next.</span>`;
      } else {
        resultEl.innerHTML = `<span>Restores <strong>${teethFixed}</strong> of 10 teeth for one patient — <strong>${TEETH_COUNT - teethFixed}</strong> more to a full smile.</span>`;
      }
    }

    if (captionEl) {
      if (smilesFunded > 0 && remainderAmount === 0) {
        captionEl.textContent = smilesFunded === 1
          ? `Patient 1's smile — fully restored!`
          : `Patients 1–${smilesFunded} — every smile fully restored!`;
      } else if (smilesFunded > 0) {
        captionEl.textContent = `Patient ${smilesFunded + 1}'s smile — restored tooth by tooth as your gift grows.`;
      } else {
        captionEl.textContent = `One patient's smile — restored tooth by tooth as your gift grows.`;
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
   Give amount chips
   ========================================================= */
document.querySelectorAll('.give-card').forEach((card) => {
  const chips = card.querySelectorAll('.chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      const donateBtn = card.querySelector('[data-donate-btn]');
      if (donateBtn) donateBtn.dataset.selectedAmount = chip.dataset.amount;
    });
  });
});

/* =========================================================
   Donate / Buy — placeholder handlers.
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
  showToast(`💛 ${freq} gift${amount ? ` of $${amount}` : ''} — payment integration coming soon!`);
}

function handleGiftClaim(product, threshold) {
  // Nonprofits can't sell merch for profit — these are thank-you gifts tied to a
  // donation tier, not a purchase. TODO: replace with your real donation + fulfillment
  // flow (e.g. a Stripe Checkout with a note field, or a form after donating).
  showToast(`🎁 Donate $${threshold}+ and we'll send you a "${product}" as a thank-you!`);
}

document.querySelectorAll('[data-donate-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const freq = btn.dataset.freq;
    const amount = btn.dataset.selectedAmount;
    handleDonate(freq, amount && amount !== 'custom' ? amount : null);
  });
});

document.querySelectorAll('[data-gift-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const card = btn.closest('[data-shop-product]');
    const activeSwatch = card?.querySelector('.swatch.is-active');
    const colorName = activeSwatch?.dataset.swatchName;
    const product = colorName ? `${btn.dataset.product} — ${colorName}` : btn.dataset.product;
    handleGiftClaim(product, btn.dataset.threshold);
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
  showToast('✉ Opening your email app to send this referral…');
  window.location.href = mailtoUrl;
}

const referForm = document.querySelector('[data-refer-form]');
if (referForm) referForm.addEventListener('submit', handleReferralSubmit);
