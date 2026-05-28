(function () {
  const openBtn = document.getElementById('open-new-txn');
  const modal = document.getElementById('new-txn-modal');
  const form = document.getElementById('new-txn-form');
  const tbody = document.querySelector('#txn-table tbody');

  function openModal() { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  function closeModal() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); form.reset(); }

  openBtn.addEventListener('click', openModal);
  modal.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });

  // Row click → placeholder
  document.querySelectorAll('.txn-row').forEach(row => {
    row.addEventListener('click', () => {
      alert('Transaction detail view coming in v2');
    });
  });

  // Add row on submit
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const address = (fd.get('address') || '').toString().trim();
    const type    = (fd.get('type')    || '').toString().trim();
    const agent   = (fd.get('agent')   || '').toString().trim();
    const priceRaw = (fd.get('price')  || '').toString().trim();
    const closing = (fd.get('closing') || '').toString().trim();

    if (!address || !type || !agent || !priceRaw) return;

    // Format price — prepend $ if missing
    const price = priceRaw.startsWith('$') ? priceRaw : `$${priceRaw}`;

    // Format status from closing date
    let statusLabel = 'Active';
    if (closing) {
      const d = new Date(closing);
      if (!isNaN(d.valueOf())) {
        const month = d.toLocaleString('en-US', { month: 'short' });
        statusLabel = `Closing: ${month} ${d.getDate()}`;
      }
    }

    const tr = document.createElement('tr');
    tr.className = 'txn-row';
    tr.dataset.address = address;
    tr.innerHTML = `
      <td>${escapeHtml(address)}</td>
      <td>${escapeHtml(type)}</td>
      <td>${escapeHtml(agent)}</td>
      <td>${escapeHtml(price)}</td>
      <td>${escapeHtml(statusLabel)}</td>
      <td><span class="badge badge-gray">PENDING REVIEW</span></td>
    `;
    tr.addEventListener('click', () => alert('Transaction detail view coming in v2'));
    tbody.prepend(tr);

    closeModal();
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
})();
