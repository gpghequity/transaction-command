(function () {
  const form = document.getElementById('doc-form');
  const fileInput = document.getElementById('doc-file');
  const dropZone = document.getElementById('doc-drop');
  const filenameLabel = document.getElementById('doc-filename');
  const submitBtn = document.getElementById('doc-submit');

  const emptyPanel = document.getElementById('doc-empty');
  const loadingPanel = document.getElementById('doc-loading');
  const reportPanel = document.getElementById('doc-report');

  // Drag-drop
  ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.remove('is-over');
  }));
  dropZone.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      renderFilename();
    }
  });
  fileInput.addEventListener('change', renderFilename);

  function renderFilename() {
    if (fileInput.files && fileInput.files[0]) {
      filenameLabel.textContent = '✓ ' + fileInput.files[0].name;
    } else {
      filenameLabel.textContent = '';
    }
  }

  // Submit
  form.addEventListener('submit', async e => {
    e.preventDefault();
    emptyPanel.hidden = true;
    reportPanel.hidden = true;
    loadingPanel.hidden = false;
    submitBtn.disabled = true;

    const started = Date.now();
    const fd = new FormData(form);

    // Fire the request but enforce a minimum 2.5s spinner time per brief.
    const fetchPromise = fetch('/document-check', { method: 'POST', body: fd }).then(r => r.json()).catch(() => null);
    const delayPromise = new Promise(resolve => setTimeout(resolve, 2500));

    const [report] = await Promise.all([fetchPromise, delayPromise]);

    loadingPanel.hidden = true;
    submitBtn.disabled = false;

    if (!report) {
      reportPanel.hidden = true;
      emptyPanel.hidden = false;
      emptyPanel.querySelector('div:last-child').textContent = 'Something went wrong. Please try again.';
      return;
    }

    renderReport(report);
    reportPanel.hidden = false;
  });

  function renderReport(r) {
    const statusCls = r.status.toLowerCase();
    const sections = (r.sections || []).map(s => `
      <div class="report-section ${s.tone || ''}">
        <div class="report-section-h">${escapeHtml(s.heading)}</div>
        ${s.subheading ? `<div class="report-subhead">${escapeHtml(s.subheading)}</div>` : ''}
        <ul>${(s.items || []).map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
      </div>
    `).join('');

    const broker = r.brokerReview && r.brokerReview.required ? `
      <div class="report-broker ${r.brokerReview.urgent ? 'urgent' : 'required'}">
        <div class="report-broker-title">Broker Review Required${r.brokerReview.urgent ? ' — URGENT' : ''}</div>
        ${r.brokerReview.reason ? `<div class="report-broker-reason">${escapeHtml(r.brokerReview.reason)}</div>` : ''}
      </div>
    ` : `
      <div class="report-broker">
        <div class="report-broker-title">Broker Review Required: No</div>
      </div>
    `;

    const nextSteps = (r.nextSteps && r.nextSteps.length) ? `
      <div class="report-next-steps">
        <div class="report-section-h">Next Steps</div>
        <ol>${r.nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      </div>
    ` : '';

    reportPanel.innerHTML = `
      <div class="report-head">
        <div class="report-status ${statusCls}">${escapeHtml(r.status)}</div>
        <div class="report-doc">
          <strong>${escapeHtml(r.docIdentified || 'Document')}</strong>
          <span>Automated Compliance Report</span>
        </div>
      </div>
      ${sections}
      ${broker}
      ${nextSteps}
      <div class="report-actions" id="report-actions">
        <button type="button" class="btn btn-primary" data-action="save">Save Report to Transaction File</button>
        <button type="button" class="btn btn-ghost"   data-action="email">Email Report to Agent</button>
        <button type="button" class="btn btn-ghost"   data-action="reset">Run Another Check</button>
      </div>
    `;

    const actions = reportPanel.querySelector('#report-actions');
    actions.addEventListener('click', onActionClick);
  }

  function onActionClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'reset') {
      form.reset();
      filenameLabel.textContent = '';
      reportPanel.hidden = true;
      emptyPanel.hidden = false;
      emptyPanel.querySelector('div:last-child').textContent = 'Upload a document to run compliance check';
      return;
    }

    if (btn.dataset.confirmed === '1') return;
    btn.dataset.confirmed = '1';
    const original = btn.textContent;
    if (action === 'save') btn.textContent = '✓ Saved to Transaction File';
    if (action === 'email') btn.textContent = '✓ Email Sent to Agent';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
      btn.dataset.confirmed = '0';
    }, 2500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
})();
