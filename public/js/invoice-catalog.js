import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './invoice-shared.js';
import { formatINR } from './invoice-utils.js';

const tbody = document.getElementById('catalogBody');
const errEl = document.getElementById('catalogError');

/** Latest items for Share / Print text (excludes the “add” row). */
let catalogSnapshotItems = [];

function showError(msg) {
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }
}

function buildCatalogShareText() {
  if (!catalogSnapshotItems.length) {
    return '*SAMPRADAYAM EVENTS* — Catalog\n\n(no items yet)';
  }
  const lines = catalogSnapshotItems.map(
    (i, n) => `${n + 1}. ${i.name} — ${formatINR(Number(i.price) || 0)}`
  );
  return `*SAMPRADAYAM EVENTS* — Catalog (price list)\n\n${lines.join('\n')}`;
}

async function loadCatalog() {
  showError('');
  const q = query(collection(db, 'catalogItems'), orderBy('name'));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  render(items);
}

function render(items) {
  if (!tbody) return;
  tbody.innerHTML = '';
  catalogSnapshotItems = items;

  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.className = 'catalog-row';
    tr.dataset.id = item.id;
    tr.innerHTML = `
      <td data-label="Item name"><input type="text" class="cat-name" value="" maxlength="500"></td>
      <td data-label="Price (₹)"><input type="number" class="cat-price" min="0" step="0.01" value="0"></td>
      <td data-label="Actions" class="catalog-actions-cell no-print">
        <div class="catalog-row-actions">
          <button type="button" class="btn btn-sm btn-primary cat-save btn--toolbar">Save</button>
          <button type="button" class="btn btn-sm btn-danger-outline cat-delete btn--toolbar">Delete</button>
        </div>
      </td>
    `;
    tr.querySelector('.cat-name').value = item.name || '';
    tr.querySelector('.cat-price').value = Number(item.price) || 0;
    tr.querySelector('.cat-save').addEventListener('click', () => saveRow(tr));
    tr.querySelector('.cat-delete').addEventListener('click', () => deleteRow(tr));
    tbody.appendChild(tr);
  });

  const addTr = document.createElement('tr');
  addTr.className = 'catalog-new-row no-print';
  addTr.innerHTML = `
    <td data-label="New item"><input type="text" class="cat-name-new" placeholder="New item name" maxlength="500"></td>
    <td data-label="Price (₹)"><input type="number" class="cat-price-new" min="0" step="0.01" placeholder="Price" value=""></td>
    <td class="catalog-actions-cell no-print">
      <button type="button" class="btn btn-sm btn-outline catalog-add-btn btn--toolbar">Add item</button>
    </td>
  `;
  tbody.appendChild(addTr);
  addTr.querySelector('.catalog-add-btn').addEventListener('click', () => addNew(addTr));
}

async function saveRow(tr) {
  const id = tr.dataset.id;
  const name = tr.querySelector('.cat-name')?.value?.trim();
  const price = Number(tr.querySelector('.cat-price')?.value);
  if (!name) {
    showError('Item name cannot be empty.');
    return;
  }
  showError('');
  try {
    await updateDoc(doc(db, 'catalogItems', id), {
      name,
      price: Number.isFinite(price) ? price : 0,
      updatedAt: serverTimestamp()
    });
    await loadCatalog();
  } catch (e) {
    console.error(e);
    showError('Could not save. Check connection and rules.');
  }
}

async function deleteRow(tr) {
  const id = tr.dataset.id;
  if (!id || !confirm('Remove this item from the price list?')) return;
  showError('');
  try {
    await deleteDoc(doc(db, 'catalogItems', id));
    await loadCatalog();
  } catch (e) {
    console.error(e);
    showError('Could not delete.');
  }
}

async function addNew(addTr) {
  const name = addTr.querySelector('.cat-name-new')?.value?.trim();
  const price = Number(addTr.querySelector('.cat-price-new')?.value);
  if (!name) {
    showError('Enter a name for the new item.');
    return;
  }
  showError('');
  try {
    await addDoc(collection(db, 'catalogItems'), {
      name,
      price: Number.isFinite(price) ? price : 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    addTr.querySelector('.cat-name-new').value = '';
    addTr.querySelector('.cat-price-new').value = '';
    await loadCatalog();
  } catch (e) {
    console.error(e);
    showError('Could not add item.');
  }
}

document.getElementById('catalogRefresh')?.addEventListener('click', () => loadCatalog().catch(console.error));

document.getElementById('catalogPrintBtn')?.addEventListener('click', () => window.print());

document.getElementById('catalogShareWhatsappBtn')?.addEventListener('click', () => {
  const url = `https://wa.me/?text=${encodeURIComponent(buildCatalogShareText())}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'invoice-login.html';
    return;
  }
  loadCatalog().catch(console.error);
});
