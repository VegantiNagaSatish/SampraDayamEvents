import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
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
const statusBanner = document.getElementById('invoiceStatusBanner');
const formError = document.getElementById('invoiceFormError');
const previewSub = document.getElementById('previewTaxable');
const previewTax = document.getElementById('previewTax');
const previewGrand = document.getElementById('previewGrand');
const previewWords = document.getElementById('previewAmountWords');
const invoicePreviewNum = document.getElementById('invoicePreviewNum');

let currentStatus = 'draft';
let currentInvoiceNumber = null;

function showFormError(msg) {
  if (formError) {
    formError.textContent = msg || '';
    formError.hidden = !msg;
  }
}

function emptyLine() {
  return { description: '', qty: 1, price: 0, taxPercent: 0 };
}

function getLinesFromDom() {
  const rows = tbody?.querySelectorAll('tr[data-line]') || [];
  const lines = [];
  rows.forEach((tr) => {
    lines.push({
      description: tr.querySelector('.line-desc')?.value || '',
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
    const { taxable, tax, total } = computeLine(line.qty, line.price, line.taxPercent);
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><textarea class="line-desc" rows="3" placeholder="Description"></textarea></td>
      <td><input type="number" class="line-qty" min="0" step="1" value="${line.qty}"></td>
      <td><input type="number" class="line-price" min="0" step="0.01" value="${line.price}"></td>
      <td><input type="number" class="line-tax" min="0" step="0.1" value="${line.taxPercent}"></td>
      <td class="line-taxable">${formatINR(taxable)}</td>
      <td class="line-taxamt">${formatINR(tax)}</td>
      <td class="line-total">${formatINR(total)}</td>
      <td><button type="button" class="btn btn-sm btn-danger-outline line-remove" aria-label="Remove line">×</button></td>
    `;
    const descTa = tr.querySelector('.line-desc');
    if (descTa) descTa.value = line.description;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('input, textarea').forEach((el) => {
    el.addEventListener('input', () => refreshLineTotals());
  });
  tbody.querySelectorAll('.line-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      if (tbody.querySelectorAll('tr[data-line]').length <= 1) return;
      tr.remove();
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

function setReadOnly(completed) {
  const ro = completed;
  [billToEl, dateEl, addLineBtn, saveDraftBtn, completeBtn].forEach((el) => {
    if (el) el.disabled = ro;
  });
  if (tbody) {
    tbody.querySelectorAll('input, textarea, .line-remove').forEach((el) => {
      el.disabled = ro;
      if (el.classList?.contains('line-remove')) el.style.visibility = ro ? 'hidden' : '';
    });
  }
  if (printBtn) printBtn.hidden = !completed;
  if (statusBanner) {
    statusBanner.textContent = completed
      ? `Completed ${currentInvoiceNumber || ''} — print or return to list.`
      : 'Draft — save as you go, then mark complete to assign an invoice number.';
    statusBanner.classList.toggle('invoice-banner--done', completed);
  }
  if (invoicePreviewNum) {
    invoicePreviewNum.textContent = completed && currentInvoiceNumber ? currentInvoiceNumber : '—';
  }
}

async function persistDraft() {
  const lines = getLinesFromDom();
  const sums = sumInvoiceLines(lines);
  const payload = {
    billToName: billToEl?.value?.trim() || '',
    invoiceDate: dateEl?.value || new Date().toISOString().slice(0, 10),
    lineItems: lines,
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
    lineItems: [emptyLine()],
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
  renderLines(Array.isArray(d.lineItems) && d.lineItems.length ? d.lineItems : [emptyLine()]);

  const completed = currentStatus === 'completed';
  setReadOnly(completed);
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
      if (invSnap.data().status === 'completed') throw new Error('Already completed');

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
        lineItems: lines,
        totals: { taxable: sums.taxable, tax: sums.tax, grand: sums.grand },
        updatedAt: serverTimestamp()
      });
    });

    currentStatus = 'completed';
    const refreshed = await getDoc(invRef);
    currentInvoiceNumber = refreshed.data()?.invoiceNumber || null;
    setReadOnly(true);
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
    if (currentStatus === 'completed') return;
    const lines = getLinesFromDom();
    lines.push(emptyLine());
    renderLines(lines);
  });
}

if (saveDraftBtn) {
  saveDraftBtn.addEventListener('click', async () => {
    if (currentStatus === 'completed') return;
    showFormError('');
    try {
      await persistDraft();
      saveDraftBtn.textContent = 'Saved';
      setTimeout(() => {
        saveDraftBtn.textContent = 'Save draft';
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

if (billToEl) billToEl.addEventListener('input', () => refreshLineTotals());
if (dateEl) dateEl.addEventListener('input', () => refreshLineTotals());

const printSellerName = document.getElementById('printSellerName');
const printSellerContact = document.getElementById('printSellerContact');
if (printSellerName) printSellerName.textContent = SELLER.name;
if (printSellerContact) printSellerContact.textContent = `${SELLER.phones} · ${SELLER.email}`;
