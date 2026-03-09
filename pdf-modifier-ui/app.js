/* =========================================================
   PDF Modifier Pro — app.js  (Build Statement Edition)
   ========================================================= */

/* ---- State ---- */
let state = {
  fileId: null,
  originalName: null,
  pages: 0,
  mode: 'smart',
  accountInfo: {},
  transactions: [],   // [{date, desc, debit, credit, balance, type}]
  nextRowId: 1,
};

/* ---- Animated canvas background ---- */
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * 1000, y: Math.random() * 800,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .5, a: Math.random() * .4 + .1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${p.a})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---- Utilities ---- */
function setStatus(txt) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = txt;
}

function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

function showLoading(msg = 'Processing…') {
  const o = document.getElementById('loading-overlay');
  const t = document.getElementById('loading-text');
  if (o) o.style.display = 'flex';
  if (t) t.textContent = msg;
}

function hideLoading() {
  const o = document.getElementById('loading-overlay');
  if (o) o.style.display = 'none';
}

function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(1) + ' MB';
}

function inr(n) {
  if (!n && n !== 0) return '';
  const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
  const fixed = num.toFixed(2);
  const [ip, dp] = fixed.split('.');
  let r = '', d = ip, cnt = 0;
  for (let i = d.length - 1; i >= 0; i--) {
    if (cnt === 3 || (cnt > 3 && (cnt - 3) % 2 === 0)) r = ',' + r;
    r = d[i] + r; cnt++;
  }
  return r + '.' + dp;
}

function parseNum(s) {
  return parseFloat(String(s || '').replace(/,/g, '').trim()) || 0;
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---- Mode toggle ---- */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
  });
});

/* ============================================================
   UPLOAD LOGIC
   ============================================================ */
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');

uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleUpload(fileInput.files[0]); });
uploadZone.addEventListener('click', e => {
  if (e.target.closest('button') || e.target === fileInput) return;
  fileInput.click();
});

async function handleUpload(file) {
  if (!file.name.endsWith('.pdf')) return toast('Only PDF files are supported.', 'error');
  if (file.size > 50 * 1024 * 1024) return toast('File exceeds 50MB limit.', 'error');

  const progress = document.getElementById('upload-progress');
  const content = uploadZone.querySelector('.upload-content');
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');

  progress.style.display = 'block';
  content.style.display = 'none';
  setStatus('Uploading…');

  let prog = 0;
  const iv = setInterval(() => {
    prog = Math.min(prog + Math.random() * 12, 88);
    fill.style.width = prog + '%';
  }, 150);

  try {
    const fd = new FormData();
    fd.append('pdf', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    clearInterval(iv);
    fill.style.width = '100%';
    label.textContent = 'Upload complete!';

    if (!res.ok) throw new Error(data.error || 'Upload failed');

    setTimeout(() => {
      state.fileId = data.fileId;
      state.originalName = data.originalName;
      state.pages = data.pages;
      state.accountInfo = data.accountInfo || {};

      progress.style.display = 'none';
      content.style.display = 'block';

      document.getElementById('file-name').textContent = data.originalName;
      document.getElementById('file-meta').textContent = `${data.pages} page(s) · ${fmtBytes(data.size)}`;
      document.getElementById('file-card').style.display = 'flex';

      // Auto-fill account info
      autoFillAccountInfo(data.accountInfo || {});

      // Show Build Statement section
      document.getElementById('smart-mode-sections').style.display = 'block';
      switchBuildTab('panel-acct');

      toast(`✅ PDF loaded — account info extracted!`, 'success');
      setStatus('Ready to build');

      // Auto import transactions so they don't have to click
      document.getElementById('btn-import-from-pdf').click();
    }, 500);

  } catch (err) {
    clearInterval(iv);
    fill.style.width = '0';
    progress.style.display = 'none';
    content.style.display = 'block';
    toast(err.message, 'error');
    setStatus('Ready');
  }
}

/* Remove file */
document.getElementById('file-card-remove').addEventListener('click', () => {
  state.fileId = null;
  state.accountInfo = {};
  document.getElementById('file-card').style.display = 'none';
  document.getElementById('smart-mode-sections').style.display = 'none';
  document.getElementById('file-input').value = '';
  setStatus('Ready');
  toast('File removed', 'info');
});

/* ---- Auto-fill account info ---- */
function autoFillAccountInfo(info) {
  const map = {
    'b-bank-name': info.bankName || '',
    'b-acc-name': info.accountName || '',
    'b-acc-no': info.accountNumber || '',
    'b-branch': info.branch || '',
    'b-ifsc': info.ifsc || '',
    'b-period': info.period || '',
    'b-cif': info.cif || '',
    'b-product': info.product || '',
    'b-micr': info.micr || '',
    'b-currency': info.currency || 'INR',
    'b-status': info.accountStatus || 'OPEN',
    'b-nominee': info.nominee || '',
    'b-ckyc': info.ckyc || '',
    'b-email': info.email || '',
    'b-address': info.address || '',
    'b-pin-code': info.customerPinCode || '',
    'b-branch-code': info.branchCode || '',
    'b-branch-email': info.branchEmail || '',
    'b-branch-phone': info.branchPhone || '',
    'b-acc-open-date': info.accountOpenDate || '',
    'b-branch-pin': info.branchPinCode || '',
    'b-branch-address': info.branchAddress || ''
  };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.value = val;
    if (val) el.classList.add('auto-filled');
    else el.classList.remove('auto-filled');
  }
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchBuildTab(panelId) {
  document.querySelectorAll('.build-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.panel === panelId);
  });
  document.querySelectorAll('.build-panel').forEach(p => {
    p.classList.toggle('active', p.id === panelId);
  });
  if (panelId === 'panel-download') refreshDownloadSummary();
}

document.querySelectorAll('.build-tab').forEach(tab => {
  tab.addEventListener('click', () => switchBuildTab(tab.dataset.panel));
});

/* ============================================================
   TRANSACTION ENTRY
   ============================================================ */
const txBody = document.getElementById('tx-entry-body');

function createRow(data = {}) {
  const id = state.nextRowId++;
  const row = document.createElement('tr');
  row.dataset.id = id;
  row.innerHTML = `
    <td class="td-sno">${id}</td>
    <td><input class="td-date" type="text" placeholder="DD-MM-YYYY" value="${escHtml(data.date || '')}" /></td>
    <td><input class="td-desc" type="text" placeholder="Transaction description…" value="${escHtml(data.desc || '')}" /></td>
    <td><input class="td-num td-debit" type="text" placeholder="0.00" value="${data.debit || ''}" /></td>
    <td><input class="td-num td-credit" type="text" placeholder="0.00" value="${data.credit || ''}" /></td>
    <td class="td-bal-display" data-bal="0">—</td>
    <td class="td-type-display"><span class="tx-?">—</span></td>
    <td class="td-actions"><button class="row-del-btn" title="Delete row">🗑</button></td>
  `;

  // Delete row
  row.querySelector('.row-del-btn').addEventListener('click', () => {
    row.remove();
    rebuildBalances();
    updateTxCountBadge();
  });

  // Recalculate on any input change
  row.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => rebuildBalances());
  });

  return row;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addRows(n = 1) {
  for (let i = 0; i < n; i++) txBody.appendChild(createRow());
  rebuildBalances();
  updateTxCountBadge();
}

function clearAllRows() {
  if (!txBody.children.length) return;
  if (!confirm('Clear all transaction rows?')) return;
  txBody.innerHTML = '';
  state.nextRowId = 1;
  rebuildBalances();
  updateTxCountBadge();
}

document.getElementById('btn-add-row').addEventListener('click', () => addRows(1));
document.getElementById('btn-add-5-rows').addEventListener('click', () => addRows(5));
document.getElementById('btn-clear-all-rows').addEventListener('click', clearAllRows);

/* ---- Auto Generate UI ---- */
const agPanel = document.getElementById('auto-gen-panel');
document.getElementById('btn-auto-generate').addEventListener('click', () => {
  agPanel.style.display = agPanel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('btn-cancel-auto-gen').addEventListener('click', () => {
  agPanel.style.display = 'none';
});
document.getElementById('btn-run-auto-gen').addEventListener('click', async () => {
  const existingRows = Array.from(txBody.querySelectorAll('tr'));
  const customDebitDescs = existingRows.map(r => r.querySelector('.td-desc')?.value).filter(Boolean);
  const customCreditDescs = customDebitDescs; // For simplicity, mix them or separate if needed

  const payload = {
    startMonth: document.getElementById('ag-start').value,
    endMonth: document.getElementById('ag-end').value,
    openingBalance: document.getElementById('ag-open').value,
    closingBalance: document.getElementById('ag-close').value,
    maxMonthlyDebit: document.getElementById('ag-max-dr').value,
    maxMonthlyCredit: document.getElementById('ag-max-cr').value,
    maxTxnDebit: document.getElementById('ag-max-dr-txn')?.value,
    maxTxnCredit: document.getElementById('ag-max-cr-txn')?.value,
    targetPages: document.getElementById('ag-target-pages')?.value || 8,
    monthlySalary: document.getElementById('ag-salary')?.value || 0,
    customDebitDescs,
    customCreditDescs
  };
  if (!payload.startMonth || !payload.endMonth || !payload.closingBalance) {
    return toast('Please fill in Date Range and Closing Balance. (Opening Balance is optional)', 'error');
  }

  showLoading('Generating realistic transactions...');
  try {
    const res = await fetch('/api/generate-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate');

    if (txBody.children.length > 0) {
      if (!confirm(`Clear existing ${txBody.children.length} rows and load ${data.transactions.length} generated rows?`)) {
        hideLoading();
        return;
      }
      txBody.innerHTML = '';
      state.nextRowId = 1;
    }

    for (const tx of data.transactions) {
      const row = createRow({ date: tx.date, desc: tx.desc || '', debit: tx.debit || '', credit: tx.credit || '' });
      txBody.appendChild(row);
    }

    // pre-fill the opening/closing amounts back into the main form
    const finalOpen = data.openingBalance !== undefined ? data.openingBalance : payload.openingBalance;
    const dlOpen = document.getElementById('dl-opening');
    if (dlOpen) dlOpen.value = finalOpen;
    const agOpen = document.getElementById('ag-open');
    if (agOpen) agOpen.value = finalOpen;

    const dlClose = document.getElementById('dl-closing');
    if (dlClose) dlClose.value = payload.closingBalance;

    rebuildBalances();
    updateTxCountBadge();
    agPanel.style.display = 'none';
    hideLoading();
    toast(`✅ Generated ${data.transactions.length} realistic transactions!`, 'success');
  } catch (err) {
    hideLoading();
    toast(err.message, 'error');
  }
});

/* ---- Smart Adjust UI ---- */
const saPanel = document.getElementById('smart-adjust-panel');
document.getElementById('btn-smart-adjust').addEventListener('click', () => {
  agPanel.style.display = 'none'; // hide auto-generate
  saPanel.style.display = saPanel.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('btn-cancel-smart-adjust').addEventListener('click', () => {
  saPanel.style.display = 'none';
});
document.getElementById('btn-run-smart-adjust').addEventListener('click', async () => {
  const payload = {
    openingBalance: parseNum(document.getElementById('sa-open').value),
    closingBalance: document.getElementById('sa-close').value ? parseNum(document.getElementById('sa-close').value) : null,
    maxMonthlyDebit: document.getElementById('sa-max-dr').value ? parseNum(document.getElementById('sa-max-dr').value) : null,
    maxMonthlyCredit: document.getElementById('sa-max-cr').value ? parseNum(document.getElementById('sa-max-cr').value) : null,
    maxTxnDebit: document.getElementById('sa-max-dr-txn')?.value ? parseNum(document.getElementById('sa-max-dr-txn').value) : null,
    maxTxnCredit: document.getElementById('sa-max-cr-txn')?.value ? parseNum(document.getElementById('sa-max-cr-txn').value) : null,
    monthlySalary: document.getElementById('sa-salary')?.value ? parseNum(document.getElementById('sa-salary').value) : 0,
  };

  const rows = Array.from(txBody.querySelectorAll('tr'));
  if (!rows.length) return toast('No rows to adjust. Import or add rows first.', 'error');
  if (isNaN(payload.openingBalance)) return toast('Please enter an Opening Balance.', 'error');
  if (payload.maxMonthlyDebit === null || payload.maxMonthlyCredit === null) {
    return toast('Please enter both Max Debit/Month and Max Credit/Month values.', 'error');
  }

  const currentTxs = rows.map(row => ({
    date: row.querySelector('.td-date')?.value || '',
    desc: row.querySelector('.td-desc')?.value || '',
    debit: parseNum(row.querySelector('.td-debit')?.value),
    credit: parseNum(row.querySelector('.td-credit')?.value),
    balance: parseNum(row.querySelector('.td-bal-display')?.dataset.bal)
  }));

  showLoading('Adjusting amounts intelligently...');
  try {
    const res = await fetch('/api/recalculate-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: currentTxs, constraints: payload })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to adjust');

    // Update existing rows or replace entirely
    if (data.transactions.length !== rows.length) {
      txBody.innerHTML = '';
      state.nextRowId = 1;
      for (const tx of data.transactions) {
        const row = createRow({ date: tx.date || '', desc: tx.desc || tx.description || '', debit: tx.debit || '', credit: tx.credit || '' });
        txBody.appendChild(row);
      }
    } else {
      data.transactions.forEach((tx, i) => {
        const row = rows[i];
        if (!row) return;
        const tDebit = row.querySelector('.td-debit');
        if (tDebit) tDebit.value = tx.debit || '';
        const tCredit = row.querySelector('.td-credit');
        if (tCredit) tCredit.value = tx.credit || '';
      });
    }

    // Update main DL form too
    const dlOpen = document.getElementById('dl-opening');
    if (dlOpen) dlOpen.value = payload.openingBalance;

    rebuildBalances();
    saPanel.style.display = 'none';
    hideLoading();
    toast(`✅ Adjusted values for ${data.transactions.length} transactions!`, 'success');
  } catch (err) {
    hideLoading();
    toast(err.message, 'error');
  }
});

/* Import detected transactions from uploaded PDF */
document.getElementById('btn-import-from-pdf').addEventListener('click', async () => {
  if (!state.fileId) return toast('Upload a PDF first', 'error');
  showLoading('Reading transactions from PDF…');
  try {
    const res = await fetch('/api/smart-analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: state.fileId }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Analyze failed');
    if (!data.transactions?.length) return toast('No transactions detected in PDF', 'error');

    // Ask user
    if (txBody.children.length > 0) {
      if (!confirm(`Replace existing ${txBody.children.length} rows with ${data.transactions.length} rows imported from PDF?`)) {
        hideLoading();
        return;
      }
      txBody.innerHTML = '';
      state.nextRowId = 1;
    }

    for (const tx of data.transactions) {
      const row = createRow({ date: tx.date, desc: tx.description || '', debit: tx.debit || '', credit: tx.credit || '' });
      txBody.appendChild(row);
    }

    // Auto populate Opening & Closing Balances
    if (data.transactions.length > 0) {
      const firstTx = data.transactions[0];
      const lastTx = data.transactions[data.transactions.length - 1];

      const firstBal = firstTx.balance || 0;
      const firstDr = firstTx.debit || 0;
      const firstCr = firstTx.credit || 0;

      // back-calculate opening balance from first tx running balance
      const openBal = firstBal - firstCr + firstDr;
      const closeBal = lastTx.balance || 0;

      const targets = {
        'dl-opening': openBal, 'dl-closing': closeBal,
        'sa-open': openBal, 'sa-close': closeBal,
        'ag-open': openBal, 'ag-close': closeBal
      };
      for (const [id, val] of Object.entries(targets)) {
        const el = document.getElementById(id);
        if (el) el.value = val.toFixed(2);
      }
    }

    rebuildBalances();
    updateTxCountBadge();
    hideLoading();
    toast(`✅ Imported ${data.transactions.length} transactions from PDF`, 'success');
  } catch (err) {
    hideLoading();
    toast(err.message, 'error');
  }
});

/* ---- Rebuild running balances from Opening Balance ---- */
function rebuildBalances() {
  const openBal = parseNum(document.getElementById('dl-opening')?.value);
  let running = openBal;
  let totalDr = 0, totalCr = 0;

  for (const row of txBody.querySelectorAll('tr')) {
    const debitInp = row.querySelector('.td-debit');
    const creditInp = row.querySelector('.td-credit');
    const balCell = row.querySelector('.td-bal-display');
    const typeCell = row.querySelector('.td-type-display');

    const dr = parseNum(debitInp?.value);
    const cr = parseNum(creditInp?.value);
    totalDr += dr;
    totalCr += cr;
    running = running + cr - dr;

    if (balCell) {
      balCell.textContent = '₹ ' + inr(running);
      balCell.dataset.bal = running;
    }
    if (typeCell) {
      const isCr = cr > 0 && dr === 0;
      const isDr = dr > 0 && cr === 0;
      typeCell.innerHTML = isCr ? '<span class="tx-cr">Cr</span>' : isDr ? '<span class="tx-dr">Dr</span>' : '<span style="color:rgba(255,255,255,0.2)">—</span>';
    }
  }

  // Live balance preview
  document.getElementById('lbp-open').textContent = '₹ ' + inr(openBal);
  document.getElementById('lbp-credit').textContent = '₹ ' + inr(totalCr);
  document.getElementById('lbp-debit').textContent = '₹ ' + inr(totalDr);
  document.getElementById('lbp-close').textContent = '₹ ' + inr(running);
  document.getElementById('lbp-count').textContent = txBody.querySelectorAll('tr').length;
}

function updateTxCountBadge() {
  const cnt = txBody.querySelectorAll('tr').length;
  const badge = document.getElementById('tx-count-badge');
  if (badge) badge.textContent = cnt + ' row' + (cnt === 1 ? '' : 's');
}

/* Listen to opening balance change */
document.getElementById('dl-opening')?.addEventListener('input', rebuildBalances);

/* Pages slider */
const dlSlider = document.getElementById('dl-max-pages');
const dlPagesVal = document.getElementById('dl-pages-val');
dlSlider?.addEventListener('input', () => { dlPagesVal.textContent = dlSlider.value + ' pages'; });

/* ---- Refresh Download tab summary ---- */
function refreshDownloadSummary() {
  const rows = txBody.querySelectorAll('tr');
  let totalDr = 0, totalCr = 0;
  for (const row of rows) {
    totalDr += parseNum(row.querySelector('.td-debit')?.value);
    totalCr += parseNum(row.querySelector('.td-credit')?.value);
  }
  const openBal = parseNum(document.getElementById('dl-opening')?.value);
  const closeBal = openBal + totalCr - totalDr;

  document.getElementById('dl-summary-name').textContent = document.getElementById('b-acc-name')?.value || '—';
  document.getElementById('dl-summary-count').textContent = rows.length;
  document.getElementById('dl-summary-debit').textContent = '₹ ' + inr(totalDr);
  document.getElementById('dl-summary-credit').textContent = '₹ ' + inr(totalCr);
  document.getElementById('dl-summary-closing').textContent = '₹ ' + inr(closeBal);

  // Pre-fill closing balance if empty
  const closingInp = document.getElementById('dl-closing');
  if (closingInp && !closingInp.value) closingInp.value = closeBal.toFixed(2);
}

/* ============================================================
   DOWNLOAD
   ============================================================ */
document.getElementById('btn-build-download').addEventListener('click', buildDownload);

async function buildDownload() {
  const rows = Array.from(txBody.querySelectorAll('tr'));
  if (!rows.length) return toast('Add at least one transaction row first.', 'error');

  // Build transaction array from table
  const transactions = rows.map((row, i) => {
    const dr = parseNum(row.querySelector('.td-debit')?.value);
    const cr = parseNum(row.querySelector('.td-credit')?.value);
    const bal = parseNum(row.querySelector('.td-bal-display')?.dataset.bal);
    return {
      date: row.querySelector('.td-date')?.value || '',
      desc: row.querySelector('.td-desc')?.value || '',
      debit: dr,
      credit: cr,
      balance: bal,
    };
  });

  const openBal = parseNum(document.getElementById('dl-opening')?.value);
  const closeBal = parseNum(document.getElementById('dl-closing')?.value)
    || transactions[transactions.length - 1]?.balance || 0;
  const maxPages = parseInt(document.getElementById('dl-max-pages')?.value || '8', 10);

  const body = {
    fileId: state.fileId,
    transactions,
    openingBalance: openBal,
    closingBalance: closeBal,
    targetMaxPages: maxPages,
    bankName: document.getElementById('b-bank-name')?.value || 'BANK',
    accountName: document.getElementById('b-acc-name')?.value || '',
    accountNumber: document.getElementById('b-acc-no')?.value || '',
    branch: document.getElementById('b-branch')?.value || '',
    ifsc: document.getElementById('b-ifsc')?.value || '',
    period: document.getElementById('b-period')?.value || '',
    cif: document.getElementById('b-cif')?.value || '',
    product: document.getElementById('b-product')?.value || '',
    micr: document.getElementById('b-micr')?.value || '',
    currency: document.getElementById('b-currency')?.value || '',
    accountStatus: document.getElementById('b-status')?.value || '',
    nominee: document.getElementById('b-nominee')?.value || '',
    ckyc: document.getElementById('b-ckyc')?.value || '',
    email: document.getElementById('b-email')?.value || '',
    address: document.getElementById('b-address')?.value || '',
    customerPinCode: document.getElementById('b-pin-code')?.value || '',
    branchCode: document.getElementById('b-branch-code')?.value || '',
    branchEmail: document.getElementById('b-branch-email')?.value || '',
    branchPhone: document.getElementById('b-branch-phone')?.value || '',
    accountOpenDate: document.getElementById('b-acc-open-date')?.value || '',
    branchPinCode: document.getElementById('b-branch-pin')?.value || '',
    branchAddress: document.getElementById('b-branch-address')?.value || '',
  };

  showLoading(`Generating clean PDF (${maxPages} pages max)… ~10s`);
  setStatus('Generating…');

  try {
    const res = await fetch('/api/build-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed' }));
      throw new Error(err.error || 'Generation failed');
    }
    const blob = await res.blob();
    triggerDownload(blob, `statement_${state.originalName || 'output.pdf'}`);
    hideLoading();
    setStatus('Done ✓');
    toast(`🎉 PDF downloaded! ${transactions.length} transactions, ${maxPages} pages max.`, 'success');
  } catch (err) {
    hideLoading();
    toast(err.message, 'error');
    setStatus('Error');
  }
}

/* ---- Initial: add 5 blank rows on load ---- */
addRows(5);
