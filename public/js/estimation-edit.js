import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './admin-shared.js';
import { computeLine, formatINR, rupeesToWords, sumLineTotals } from './admin-utils.js';

const SELLER = {
  name: 'సంప్రదాయం ఈవెంట్స్',
  phones: '+91 8309133572, +91 7997449444',
  email: 'sampradayam.events393@gmail.com'
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Catalog `name` values often include a trailing " — ₹…" from admin copy/paste; strip for dropdown + saved descriptions. */
function stripCatalogPriceLabel(name) {
  return String(name || '')
    .replace(/\s*[—–-]\s*₹[\d,.]+\s*$/u, '')
    .trim();
}

const PHONE_ICON_SVG =
  '<svg class="invoice-letterhead__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

const EMAIL_ICON_SVG =
  '<svg class="invoice-letterhead__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 2v.01L12 13 4 6.01V6l8 7 8-7z"/></svg>';

function renderLetterheadPhones(el) {
  if (!el) return;
  const p = escapeHtml(SELLER.phones);
  el.innerHTML =
    '<span class="invoice-letterhead__contact-row">' + PHONE_ICON_SVG + `<span>${p}</span></span>`;
}

function renderLetterheadEmail(el) {
  if (!el) return;
  const e = escapeHtml(SELLER.email);
  el.innerHTML =
    '<span class="invoice-letterhead__contact-row">' + EMAIL_ICON_SVG + `<span>${e}</span></span>`;
}

const params = new URLSearchParams(window.location.search);
let invoiceId = params.get('id');

const billToEl = document.getElementById('billToName');
const dateEl = document.getElementById('invoiceDate');
const tbody = document.getElementById('lineItemsBody');
const addLineBtn = document.getElementById('addLineBtn');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const completeBtn = document.getElementById('completeInvoiceBtn');
const printBtn = document.getElementById('printInvoiceBtn');
const shareWaBtn = document.getElementById('invoiceShareWhatsappBtn');
const formError = document.getElementById('invoiceFormError');
const previewGrand = document.getElementById('previewGrand');
const previewWords = document.getElementById('previewAmountWords');
const invoicePreviewNum = document.getElementById('invoicePreviewNum');

let currentStatus = 'draft';
let currentInvoiceNumber = null;
/** @type {{ id: string, name: string, price: number }[]} */
let catalogItems = [];

async function fetchCatalog() {
  const q = query(collection(db, 'catalogItems'), orderBy('name'));
  const snap = await getDocs(q);
  catalogItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function showFormError(msg) {
  if (formError) {
    formError.textContent = msg || '';
    formError.hidden = !msg;
  }
}

function emptyLine() {
  return { catalogItemId: null, description: '', lineNote: '', qty: 1, price: 0 };
}

function normalizeSavedLine(raw) {
  return {
    catalogItemId: raw.catalogItemId || null,
    description: raw.description || '',
    lineNote: raw.lineNote || '',
    qty: Number(raw.qty) || 0,
    price: Number(raw.price) || 0
  };
}

/** Pick initial <select> value for a saved line. */
function resolveSelectValue(line) {
  if (line.catalogItemId && catalogItems.some((c) => c.id === line.catalogItemId)) {
    return line.catalogItemId;
  }
  const desc = line.description || '';
  const descStripped = stripCatalogPriceLabel(desc);
  const byName = catalogItems.find((c) => {
    const nameMatch =
      c.name === desc ||
      (descStripped.length > 0 && stripCatalogPriceLabel(c.name) === descStripped);
    return nameMatch && Number(c.price) === Number(line.price);
  });
  if (byName) return byName.id;
  if (desc.trim()) return '__custom__';
  return '';
}

function getLinesFromDom() {
  const rows = tbody?.querySelectorAll('tr[data-line]') || [];
  const lines = [];
  rows.forEach((tr) => {
    const sel = tr.querySelector('.line-catalog');
    const ta = tr.querySelector('.line-desc-custom');
    const noteTa = tr.querySelector('.line-item-note');
    let description = '';
    let catalogItemId = null;
    let lineNote = '';
    if (sel) {
      if (sel.value === '__custom__') {
        description = ta?.value?.trim() || '';
        catalogItemId = null;
        lineNote = '';
      } else if (sel.value) {
        const opt = sel.selectedOptions[0];
        catalogItemId = sel.value;
        description = opt?.dataset?.name || '';
        lineNote = noteTa?.value?.trim() || '';
      }
    }
    lines.push({
      catalogItemId,
      description,
      lineNote,
      qty: Number(tr.querySelector('.line-qty')?.value) || 0,
      price: Number(tr.querySelector('.line-price')?.value) || 0
    });
  });
  return lines.length ? lines : [emptyLine()];
}

/** Show catalog line-note vs custom description based on the row's <select> value (not only on `change`, so UI stays in sync). */
function syncLineItemFieldVisibility(tr) {
  const sel = tr.querySelector('.line-catalog');
  const customWrap = tr.querySelector('.line-custom-wrap');
  const noteWrap = tr.querySelector('.line-note-wrap');
  if (!sel || !noteWrap) return;
  const v = sel.value;
  const showCustom = v === '__custom__';
  const showNote = Boolean(v && v !== '__custom__');
  noteWrap.classList.toggle('line-note-wrap--active', showNote);
  if (customWrap) customWrap.classList.toggle('line-custom-wrap--active', showCustom);
  syncOptionalLineDescPrintClasses(tr);
}

/** Marks rows that have optional description text so print/PDF can omit empty blocks. */
function syncOptionalLineDescPrintClasses(tr) {
  const noteWrap = tr.querySelector('.line-note-wrap');
  const noteTa = tr.querySelector('.line-item-note');
  const customWrap = tr.querySelector('.line-custom-wrap');
  const ta = tr.querySelector('.line-desc-custom');
  if (noteWrap && noteTa) {
    noteWrap.classList.toggle('line-note-wrap--filled', Boolean(noteTa.value.trim()));
  }
  if (customWrap && ta) {
    customWrap.classList.toggle('line-custom-wrap--filled', Boolean(ta.value.trim()));
  }
}

function syncAllOptionalLineDescPrintClasses() {
  tbody?.querySelectorAll('tr[data-line]').forEach((tr) => syncOptionalLineDescPrintClasses(tr));
}

function renderLines(lines) {
  if (!tbody) return;
  tbody.innerHTML = '';
  lines.forEach((line, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.line = String(idx);
    const L = normalizeSavedLine(line);
    const { lineTotal } = computeLine(L.qty, L.price);

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="line-item-cell">
        <select class="line-catalog">
          <option value="">Choose item…</option>
        </select>
        <div class="line-custom-wrap">
          <textarea class="line-desc-custom" rows="2" placeholder="Describe the line item…"></textarea>
        </div>
      </td>
      <td><input type="number" class="line-qty" min="0" step="1" value="${L.qty}"></td>
      <td class="invoice-col--price"><input type="number" class="line-price" min="0" step="0.01" value="${L.price}"></td>
      <td class="line-total invoice-col--amount">${formatINR(lineTotal)}</td>
      <td class="no-print"><button type="button" class="btn btn-sm btn-danger-outline line-remove" aria-label="Remove line">×</button></td>
    `;

    const sel = tr.querySelector('.line-catalog');
    catalogItems.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const displayName = stripCatalogPriceLabel(c.name);
      opt.dataset.name = displayName;
      opt.dataset.price = String(Number(c.price) || 0);
      opt.textContent = displayName;
      sel.appendChild(opt);
    });
    const optCustom = document.createElement('option');
    optCustom.value = '__custom__';
    optCustom.textContent = 'Custom description…';
    sel.appendChild(optCustom);

    const selVal = resolveSelectValue(L);
    sel.value = selVal || '';

    const ta = tr.querySelector('.line-desc-custom');
    const noteTa = tr.querySelector('.line-item-note');
    if (selVal === '__custom__') {
      if (ta) ta.value = L.description;
    } else if (selVal) {
      if (noteTa) noteTa.value = L.lineNote || '';
    }

    const onCatalogChange = () => {
      if (sel.value === '__custom__') {
        if (noteTa) noteTa.value = '';
      } else if (sel.value) {
        const opt = sel.selectedOptions[0];
        const p = tr.querySelector('.line-price');
        if (p && opt?.dataset?.price != null) p.value = opt.dataset.price;
        if (ta) ta.value = '';
        if (noteTa) noteTa.value = '';
      } else {
        if (ta) ta.value = '';
        if (noteTa) noteTa.value = '';
      }
      syncLineItemFieldVisibility(tr);
      refreshLineTotals();
    };
    sel.addEventListener('change', onCatalogChange);
    if (ta) ta.addEventListener('input', () => refreshLineTotals());
    if (noteTa) noteTa.addEventListener('input', () => refreshLineTotals());

    tbody.appendChild(tr);
    syncLineItemFieldVisibility(tr);
    requestAnimationFrame(() => syncLineItemFieldVisibility(tr));
  });

  tbody.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => refreshLineTotals());
  });
  tbody.querySelectorAll('.line-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('tr');
      if (tbody.querySelectorAll('tr[data-line]').length <= 1) return;
      row.remove();
      renumberLines();
      refreshLineTotals();
    });
  });
  refreshLineTotals();
}

function renumberLines() {
  tbody.querySelectorAll('tr[data-line]').forEach((tr, i) => {
    tr.dataset.line = String(i);
    tr.querySelector('td:first-child').textContent = String(i + 1);
  });
}

function refreshLineTotals() {
  const lines = getLinesFromDom();
  lines.forEach((line, idx) => {
    const tr = tbody.querySelectorAll('tr[data-line]')[idx];
    if (!tr) return;
    const { lineTotal } = computeLine(line.qty, line.price);
    const tdG = tr.querySelector('.line-total');
    if (tdG) tdG.textContent = formatINR(lineTotal);
  });
  const sums = sumLineTotals(lines);
  if (previewGrand) previewGrand.textContent = formatINR(sums.grand);
  if (previewWords) previewWords.textContent = rupeesToWords(sums.grand);
  const pBill = document.getElementById('previewBillTo');
  const pDate = document.getElementById('previewDate');
  if (pBill) pBill.textContent = billToEl?.value?.trim() || '—';
  if (pDate) pDate.textContent = dateEl?.value || '—';
  syncAllOptionalLineDescPrintClasses();
}

function updateInvoiceChrome() {
  const completed = currentStatus === 'completed';
  if (completeBtn) completeBtn.hidden = completed;
  if (printBtn) printBtn.hidden = !completed;
  if (shareWaBtn) shareWaBtn.hidden = !completed;
  if (saveDraftBtn) saveDraftBtn.textContent = completed ? 'Save' : 'Save draft';
  if (invoicePreviewNum) {
    invoicePreviewNum.textContent = completed && currentInvoiceNumber ? currentInvoiceNumber : '—';
  }
}

function buildInvoiceShareText() {
  const bill = billToEl?.value?.trim() || '—';
  const date = dateEl?.value || '—';
  const num = currentInvoiceNumber || '—';
  const lines = getLinesFromDom().filter((l) => l.description.trim() && l.qty > 0);
  const sums = sumLineTotals(lines);
  const lineText = lines
    .map((l, i) => {
      let t = `${i + 1}. ${l.description} × ${l.qty} @ ${formatINR(l.price)} → ${formatINR(computeLine(l.qty, l.price).lineTotal)}`;
      if (l.lineNote?.trim()) t += `\n   ${l.lineNote.trim()}`;
      return t;
    })
    .join('\n');
  return (
    `*${SELLER.name}* — Estimation\n` +
    `Estimation #: *${num}*\n` +
    `Bill to: ${bill}\n` +
    `Date: ${date}\n\n` +
    `${lineText || '(no lines)'}\n\n` +
    `*Total: ${formatINR(sums.grand)}*\n` +
    `${rupeesToWords(sums.grand)}`
  );
}

async function persistDraft() {
  const lines = getLinesFromDom();
  const sums = sumLineTotals(lines);
  const payload = {
    billToName: billToEl?.value?.trim() || '',
    invoiceDate: dateEl?.value || new Date().toISOString().slice(0, 10),
    lineItems: lines.map((l) => ({
      catalogItemId: l.catalogItemId || null,
      description: l.description,
      lineNote: l.lineNote || '',
      qty: l.qty,
      price: l.price
    })),
    totals: { grand: sums.grand },
    updatedAt: serverTimestamp()
  };
  await updateDoc(doc(db, 'invoices', invoiceId), payload);
}

async function createDraftAndRedirect() {
  const ref = await addDoc(collection(db, 'invoices'), {
    status: 'draft',
    billToName: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    lineItems: [{ ...emptyLine() }],
    totals: { grand: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  window.location.replace(`estimation-edit.html?id=${ref.id}`);
}

async function loadInvoice(id) {
  const snap = await getDoc(doc(db, 'invoices', id));
  if (!snap.exists()) {
    alert('Estimation not found.');
    window.location.href = 'estimations.html';
    return;
  }
  const d = snap.data();
  currentStatus = d.status || 'draft';
  currentInvoiceNumber = d.invoiceNumber || null;

  if (billToEl) billToEl.value = d.billToName || '';
  if (dateEl) dateEl.value = d.invoiceDate || new Date().toISOString().slice(0, 10);

  await fetchCatalog();
  const rawLines = Array.isArray(d.lineItems) && d.lineItems.length ? d.lineItems : [emptyLine()];
  renderLines(rawLines.map(normalizeSavedLine));
  updateInvoiceChrome();
}

async function markComplete() {
  showFormError('');
  const bill = billToEl?.value?.trim();
  if (!bill) {
    showFormError('Enter Bill to (customer name).');
    return;
  }
  const lines = getLinesFromDom().filter((l) => l.description.trim() && l.qty > 0);
  if (!lines.length) {
    showFormError('Add at least one line item with description and quantity.');
    return;
  }

  const sums = sumLineTotals(lines);
  const invRef = doc(db, 'invoices', invoiceId);
  const counterRef = doc(db, 'settings', 'invoiceCounter');

  try {
    await runTransaction(db, async (transaction) => {
      const invSnap = await transaction.get(invRef);
      if (!invSnap.exists()) throw new Error('Missing estimation');
      if (invSnap.data().status === 'completed') {
        throw new Error('This estimation is already completed. Use Save to update.');
      }

      const cSnap = await transaction.get(counterRef);
      let nextNum = 1;
      if (cSnap.exists() && typeof cSnap.data().nextNumber === 'number') {
        nextNum = cSnap.data().nextNumber;
      }

      transaction.set(counterRef, { nextNumber: nextNum + 1 }, { merge: true });
      transaction.update(invRef, {
        status: 'completed',
        invoiceNumber: `INV-${nextNum}`,
        billToName: bill,
        invoiceDate: dateEl?.value || new Date().toISOString().slice(0, 10),
        lineItems: lines.map((l) => ({
          catalogItemId: l.catalogItemId ?? null,
          description: l.description,
          lineNote: l.lineNote || '',
          qty: l.qty,
          price: l.price
        })),
        totals: { grand: sums.grand },
        updatedAt: serverTimestamp()
      });
    });

    currentStatus = 'completed';
    const refreshed = await getDoc(invRef);
    const d = refreshed.data();
    currentInvoiceNumber = d?.invoiceNumber || null;
    const savedLines = (d?.lineItems || lines).map(normalizeSavedLine);
    renderLines(savedLines);
    updateInvoiceChrome();
  } catch (e) {
    console.error(e);
    showFormError(e.message || 'Could not complete estimation. Try again.');
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'admin-login.html';
    return;
  }
  try {
    if (!invoiceId) {
      await createDraftAndRedirect();
      return;
    }
    await loadInvoice(invoiceId);
  } catch (e) {
    console.error(e);
    alert('Could not load estimation. Check Firebase config and rules.');
  }
});

if (addLineBtn) {
  addLineBtn.addEventListener('click', () => {
    const lines = getLinesFromDom();
    lines.push(emptyLine());
    renderLines(lines);
  });
}

if (saveDraftBtn) {
  saveDraftBtn.addEventListener('click', async () => {
    showFormError('');
    try {
      await persistDraft();
      const label = currentStatus === 'completed' ? 'Save' : 'Save draft';
      saveDraftBtn.textContent = 'Saved';
      setTimeout(() => {
        saveDraftBtn.textContent = label;
        updateInvoiceChrome();
      }, 1500);
    } catch (e) {
      console.error(e);
      showFormError('Save failed.');
    }
  });
}

if (completeBtn) {
  completeBtn.addEventListener('click', () => markComplete());
}

const printFormatDialog = document.getElementById('printFormatDialog');
const printDeliveryNoteBtn = document.getElementById('printDeliveryNoteBtn');
const printEstimationNoteBtn = document.getElementById('printEstimationNoteBtn');
const printFormatCancelBtn = document.getElementById('printFormatCancelBtn');
const docKickerEl = document.querySelector('.invoice-letterhead__doc-kicker');
const DOC_KICKER_DEFAULT = 'ESTIMATION';

function setPrintDeliveryMode(on) {
  const v = Boolean(on);
  document.documentElement.classList.toggle('print-mode-delivery', v);
  document.body.classList.toggle('print-mode-delivery', v);
}

function runPrintWithMode(mode) {
  syncAllOptionalLineDescPrintClasses();
  if (mode === 'delivery') {
    setPrintDeliveryMode(true);
    if (docKickerEl) docKickerEl.textContent = 'DELIVERY NOTE';
  } else {
    setPrintDeliveryMode(false);
    if (docKickerEl) docKickerEl.textContent = DOC_KICKER_DEFAULT;
  }
  const doPrint = () => window.print();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(doPrint));
  } else {
    setTimeout(doPrint, 0);
  }
}

window.addEventListener('beforeprint', () => {
  syncAllOptionalLineDescPrintClasses();
});

window.addEventListener('afterprint', () => {
  setPrintDeliveryMode(false);
  if (docKickerEl) docKickerEl.textContent = DOC_KICKER_DEFAULT;
});

if (printBtn) {
  printBtn.addEventListener('click', () => {
    if (printFormatDialog && typeof printFormatDialog.showModal === 'function') {
      printFormatDialog.showModal();
    } else {
      runPrintWithMode('estimation');
    }
  });
}

if (printDeliveryNoteBtn && printFormatDialog) {
  printDeliveryNoteBtn.addEventListener('click', () => {
    printFormatDialog.close();
    requestAnimationFrame(() => runPrintWithMode('delivery'));
  });
}

if (printEstimationNoteBtn && printFormatDialog) {
  printEstimationNoteBtn.addEventListener('click', () => {
    printFormatDialog.close();
    requestAnimationFrame(() => runPrintWithMode('estimation'));
  });
}

if (printFormatCancelBtn && printFormatDialog) {
  printFormatCancelBtn.addEventListener('click', () => printFormatDialog.close());
}

if (shareWaBtn) {
  shareWaBtn.addEventListener('click', () => {
    const text = buildInvoiceShareText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

if (billToEl) billToEl.addEventListener('input', () => refreshLineTotals());
if (dateEl) dateEl.addEventListener('input', () => refreshLineTotals());

const printSellerName = document.getElementById('printSellerName');
const printSellerPhones = document.getElementById('printSellerPhones');
const printSellerEmail = document.getElementById('printSellerEmail');
const printSignFor = document.getElementById('printSignFor');
if (printSellerName) {
  printSellerName.textContent = SELLER.name;
  printSellerName.setAttribute('lang', 'te');
}
renderLetterheadPhones(printSellerPhones);
renderLetterheadEmail(printSellerEmail);
if (printSignFor) {
  printSignFor.textContent = SELLER.name;
  printSignFor.setAttribute('lang', 'te');
}
