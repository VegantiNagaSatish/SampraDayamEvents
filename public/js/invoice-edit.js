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
import { auth, db } from './invoice-shared.js';
import { computeLine, formatINR, rupeesToWords, sumInvoiceLines } from './invoice-utils.js';

const SELLER = {
  name: 'SAMPRADAYAM EVENTS',
  phones: '+91 8309133572, +91 7997449444',
  email: 'sampradayam.events393@gmail.com'
};

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
const previewSub = document.getElementById('previewTaxable');
const previewTax = document.getElementById('previewTax');
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
  return { catalogItemId: null, description: '', qty: 1, price: 0, taxPercent: 0 };
}

function normalizeSavedLine(raw) {
  return {
    catalogItemId: raw.catalogItemId || null,
    description: raw.description || '',
    qty: Number(raw.qty) || 0,
    price: Number(raw.price) || 0,
    taxPercent: Number(raw.taxPercent) || 0
  };
}

/** Pick initial <select> value for a saved line. */
function resolveSelectValue(line) {
  if (line.catalogItemId && catalogItems.some((c) => c.id === line.catalogItemId)) {
    return line.catalogItemId;
  }
  const byName = catalogItems.find((c) => c.name === line.description);
  if (byName && Number(byName.price) === Number(line.price)) return byName.id;
  if (line.description?.trim()) return '__custom__';
  return '';
}

function getLinesFromDom() {
  const rows = tbody?.querySelectorAll('tr[data-line]') || [];
  const lines = [];
  rows.forEach((tr) => {
    const sel = tr.querySelector('.line-catalog');
    const ta = tr.querySelector('.line-desc-custom');
    let description = '';
    let catalogItemId = null;
    if (sel) {
      if (sel.value === '__custom__') {
        description = ta?.value?.trim() || '';
        catalogItemId = null;
      } else if (sel.value) {
        const opt = sel.selectedOptions[0];
        catalogItemId = sel.value;
        description = opt?.dataset?.name || '';
      }
    }
    lines.push({
      catalogItemId,
      description,
      qty: Number(tr.querySelector('.line-qty')?.value) || 0,
      price: Number(tr.querySelector('.line-price')?.value) || 0,
      taxPercent: Number(tr.querySelector('.line-tax')?.value) || 0
    });
  });
  return lines.length ? lines : [emptyLine()];
}

function renderLines(lines) {
  if (!tbody) return;
  tbody.innerHTML = '';
  lines.forEach((line, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.line = String(idx);
    const L = normalizeSavedLine(line);
    const { taxable, tax, total } = computeLine(L.qty, L.price, L.taxPercent);

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td class="line-item-cell">
        <select class="line-catalog">
          <option value="">Choose item…</option>
        </select>
        <div class="line-custom-wrap" hidden>
          <textarea class="line-desc-custom" rows="2" placeholder="Custom line description"></textarea>
        </div>
      </td>
      <td><input type="number" class="line-qty" min="0" step="1" value="${L.qty}"></td>
      <td><input type="number" class="line-price" min="0" step="0.01" value="${L.price}"></td>
      <td><input type="number" class="line-tax" min="0" step="0.1" value="${L.taxPercent}"></td>
      <td class="line-taxable">${formatINR(taxable)}</td>
      <td class="line-taxamt">${formatINR(tax)}</td>
      <td class="line-total">${formatINR(total)}</td>
      <td><button type="button" class="btn btn-sm btn-danger-outline line-remove" aria-label="Remove line">×</button></td>
    `;

    const sel = tr.querySelector('.line-catalog');
    catalogItems.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.dataset.name = c.name;
      opt.dataset.price = String(Number(c.price) || 0);
      opt.textContent = `${c.name} — ${formatINR(c.price)}`;
      sel.appendChild(opt);
    });
    const optCustom = document.createElement('option');
    optCustom.value = '__custom__';
    optCustom.textContent = 'Custom description…';
    sel.appendChild(optCustom);

    const selVal = resolveSelectValue(L);
    sel.value = selVal || '';

    const wrap = tr.querySelector('.line-custom-wrap');
    const ta = tr.querySelector('.line-desc-custom');
    if (selVal === '__custom__') {
      wrap.hidden = false;
      if (ta) ta.value = L.description;
    }

    const onCatalogChange = () => {
      if (sel.value === '__custom__') {
        wrap.hidden = false;
      } else if (sel.value) {
        wrap.hidden = true;
        const opt = sel.selectedOptions[0];
        const p = tr.querySelector('.line-price');
        if (p && opt?.dataset?.price != null) p.value = opt.dataset.price;
        if (ta) ta.value = '';
      } else {
        wrap.hidden = true;
        if (ta) ta.value = '';
      }
      refreshLineTotals();
    };
    sel.addEventListener('change', onCatalogChange);
    if (ta) ta.addEventListener('input', () => refreshLineTotals());

    tbody.appendChild(tr);
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
    const { taxable, tax, total } = computeLine(line.qty, line.price, line.taxPercent);
    const tdT = tr.querySelector('.line-taxable');
    const tdX = tr.querySelector('.line-taxamt');
    const tdG = tr.querySelector('.line-total');
    if (tdT) tdT.textContent = formatINR(taxable);
    if (tdX) tdX.textContent = formatINR(tax);
    if (tdG) tdG.textContent = formatINR(total);
  });
  const sums = sumInvoiceLines(lines);
  if (previewSub) previewSub.textContent = formatINR(sums.taxable);
  if (previewTax) previewTax.textContent = formatINR(sums.tax);
  if (previewGrand) previewGrand.textContent = formatINR(sums.grand);
  if (previewWords) previewWords.textContent = rupeesToWords(sums.grand);
  const pBill = document.getElementById('previewBillTo');
  const pDate = document.getElementById('previewDate');
  if (pBill) pBill.textContent = billToEl?.value?.trim() || '—';
  if (pDate) pDate.textContent = dateEl?.value || '—';
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
  const sums = sumInvoiceLines(lines);
  const lineText = lines
    .map((l, i) => `${i + 1}. ${l.description} × ${l.qty} @ ${formatINR(l.price)} → ${formatINR(computeLine(l.qty, l.price, l.taxPercent).total)}`)
    .join('\n');
  return (
    `*SAMPRADAYAM EVENTS* — Tax invoice\n` +
    `Invoice #: *${num}*\n` +
    `Bill to: ${bill}\n` +
    `Date: ${date}\n\n` +
    `${lineText || '(no lines)'}\n\n` +
    `Taxable: ${formatINR(sums.taxable)}\n` +
    `Tax: ${formatINR(sums.tax)}\n` +
    `*Grand total: ${formatINR(sums.grand)}*\n` +
    `${rupeesToWords(sums.grand)}`
  );
}

async function persistDraft() {
  const lines = getLinesFromDom();
  const sums = sumInvoiceLines(lines);
  const payload = {
    billToName: billToEl?.value?.trim() || '',
    invoiceDate: dateEl?.value || new Date().toISOString().slice(0, 10),
    lineItems: lines.map((l) => ({
      catalogItemId: l.catalogItemId || null,
      description: l.description,
      qty: l.qty,
      price: l.price,
      taxPercent: l.taxPercent
    })),
    totals: { taxable: sums.taxable, tax: sums.tax, grand: sums.grand },
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
    totals: { taxable: 0, tax: 0, grand: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  window.location.replace(`invoice-edit.html?id=${ref.id}`);
}

async function loadInvoice(id) {
  const snap = await getDoc(doc(db, 'invoices', id));
  if (!snap.exists()) {
    alert('Invoice not found.');
    window.location.href = 'invoice-admin.html';
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

  const sums = sumInvoiceLines(lines);
  const invRef = doc(db, 'invoices', invoiceId);
  const counterRef = doc(db, 'settings', 'invoiceCounter');

  try {
    await runTransaction(db, async (transaction) => {
      const invSnap = await transaction.get(invRef);
      if (!invSnap.exists()) throw new Error('Missing invoice');
      if (invSnap.data().status === 'completed') {
        throw new Error('This invoice is already completed. Use Save to update.');
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
          qty: l.qty,
          price: l.price,
          taxPercent: l.taxPercent
        })),
        totals: { taxable: sums.taxable, tax: sums.tax, grand: sums.grand },
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
    showFormError(e.message || 'Could not complete invoice. Try again.');
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'invoice-login.html';
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
    alert('Could not load invoice. Check Firebase config and rules.');
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

if (printBtn) {
  printBtn.addEventListener('click', () => window.print());
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
const printSellerContact = document.getElementById('printSellerContact');
if (printSellerName) printSellerName.textContent = SELLER.name;
if (printSellerContact) printSellerContact.textContent = `${SELLER.phones} · ${SELLER.email}`;
