(function () {
  const dataEl = document.getElementById('v2-features-data');
  if (!dataEl) return;

  let features = [];
  try { features = JSON.parse(dataEl.textContent || '[]'); } catch (e) { features = []; }

  const modal = document.getElementById('v2-feature-modal');
  const modalTitle = document.getElementById('v2-modal-title');
  const modalBody = document.getElementById('v2-modal-body');
  const modalForm = document.getElementById('v2-modal-form');
  const modalEmail = document.getElementById('v2-modal-email');
  const modalFeature = document.getElementById('v2-modal-feature');
  const modalConfirm = modalForm.querySelector('.v2-modal-confirm');
  const submitBtn = modalForm.querySelector('.v2-modal-submit');

  function openModal(index) {
    const f = features[index];
    if (!f) return;
    modalTitle.textContent = f.name;
    modalBody.textContent = f.long;
    modalFeature.value = f.name;
    modalEmail.value = '';
    modalConfirm.hidden = true;
    modalConfirm.textContent = '';
    submitBtn.disabled = false;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modalEmail.focus(), 50);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.v2-card').forEach(card => {
    const idx = Number(card.dataset.v2Index);
    const open = () => openModal(idx);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  modal.querySelectorAll('[data-close-v2]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  modalForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = (modalEmail.value || '').trim();
    const feature = modalFeature.value;
    if (!email) return;

    submitBtn.disabled = true;
    try {
      const res = await fetch('/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feature })
      });
      const data = await res.json();
      if (data.ok) {
        modalConfirm.hidden = false;
        modalConfirm.textContent = `Thanks! You'll be notified when ${feature} launches.`;
      } else {
        modalConfirm.hidden = false;
        modalConfirm.textContent = data.error || 'Something went wrong. Please try again.';
        submitBtn.disabled = false;
      }
    } catch (err) {
      modalConfirm.hidden = false;
      modalConfirm.textContent = 'Network error. Please try again.';
      submitBtn.disabled = false;
    }
  });

  // Early access banner
  const bannerForm = document.getElementById('v2-banner-form');
  if (bannerForm) {
    const bannerConfirm = bannerForm.querySelector('.v2-banner-confirm');
    const bannerBtn = bannerForm.querySelector('.v2-banner-btn');
    bannerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const emailInput = bannerForm.querySelector('input[name="email"]');
      const email = (emailInput.value || '').trim();
      if (!email) return;
      bannerBtn.disabled = true;
      try {
        const res = await fetch('/early-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, feature: 'Full Platform' })
        });
        const data = await res.json();
        if (data.ok) {
          bannerConfirm.hidden = false;
          bannerConfirm.textContent = `Thanks! You'll be notified when Transaction Command v2 launches.`;
          emailInput.value = '';
        } else {
          bannerConfirm.hidden = false;
          bannerConfirm.textContent = data.error || 'Something went wrong. Please try again.';
          bannerBtn.disabled = false;
        }
      } catch (err) {
        bannerConfirm.hidden = false;
        bannerConfirm.textContent = 'Network error. Please try again.';
        bannerBtn.disabled = false;
      }
    });
  }
})();
