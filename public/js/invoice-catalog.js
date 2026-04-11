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
const tbody = document.getElementById('catalogBody');
const errEl = document.getElementById('catalogError');

function showError(msg) {
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }
}

async function loadCatalog() {
  showError('');
  const q = query(collection(db, 'catalogItems'), orderBy('name'));
  const snap = await getDocs(q);
  render(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

function render(items) {
  if (!tbody) return;
  tbody.innerHTML = '';

  items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    tr.innerHTML = `
      <td><input type="text" class="cat-name" value="" maxlength="500"></td>
      <td><input type="number" class="cat-price" min="0" step="0.01" value="0"></td>
      <td class="invoice-table__actions">
        <button type="button" class="btn btn-sm btn-primary cat-save">Save</button>
        <button type="button" class="btn btn-sm btn-danger-outline cat-delete">Delete</button>
      </td>
    `;
    tr.querySelector('.cat-name').value = item.name || '';
    tr.querySelector('.cat-price').value = Number(item.price) || 0;
    tr.querySelector('.cat-save').addEventListener('click', () => saveRow(tr));
    tr.querySelector('.cat-delete').addEventListener('click', () => deleteRow(tr));
    tbody.appendChild(tr);
  });

  const addTr = document.createElement('tr');
  addTr.className = 'catalog-new-row';
  addTr.innerHTML = `
    <td><input type="text" class="cat-name-new" placeholder="New item name" maxlength="500"></td>
    <td><input type="number" class="cat-price-new" min="0" step="0.01" placeholder="Price" value=""></td>
    <td><button type="button" class="btn btn-sm btn-outline catalog-add-btn">Add item</button></td>
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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'invoice-login.html';
    return;
  }
  loadCatalog().catch(console.error);
});
