import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './admin-shared.js';
import { formatINR } from './admin-utils.js';

const listEl = document.getElementById('estimationList');
const filterEl = document.getElementById('estimationFilter');
const emptyEl = document.getElementById('estimationListEmpty');
const logoutBtn = document.getElementById('estimationLogout');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'admin-login.html';
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

function renderRows(rows) {
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!rows.length) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  for (const row of rows) {
    const d = row.data();
    const tr = document.createElement('tr');
    const num =
      d.status === 'completed' && d.invoiceNumber
        ? d.invoiceNumber
        : '— (draft)';
    const dateStr = d.invoiceDate || (d.updatedAt?.toDate?.()?.toISOString?.().slice(0, 10) ?? '—');
    const grand =
      d.totals?.grand != null
        ? d.totals.grand
        : d.totals?.taxable != null
          ? Number(d.totals.taxable) + Number(d.totals.tax || 0)
          : null;
    const total = grand != null ? formatINR(grand) : '—';
    const confirmTag =
      d.status === 'completed' && d.invoiceNumber ? d.invoiceNumber : 'draft';
    tr.innerHTML = `
      <td><span class="invoice-status invoice-status--${d.status}">${d.status}</span></td>
      <td>${num}</td>
      <td>${escapeHtml(d.billToName || '—')}</td>
      <td>${escapeHtml(String(dateStr))}</td>
      <td>${total}</td>
      <td class="invoice-table__actions">
        <a class="btn btn-sm btn-outline btn--toolbar" href="estimation-edit.html?id=${row.id}">Open</a>
        <button type="button" class="btn btn-sm btn-danger-outline btn--toolbar estimation-delete" data-id="${row.id}" data-status="${d.status}" data-confirm-tag="${escapeHtml(confirmTag)}">Delete</button>
      </td>
    `;
    listEl.appendChild(tr);
  }

  listEl.querySelectorAll('.estimation-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const st = btn.getAttribute('data-status');
      const tag = btn.getAttribute('data-confirm-tag') || '';
      const msg =
        st === 'completed'
          ? `Delete completed estimation ${tag}? This cannot be undone.`
          : 'Delete this draft permanently?';
      if (!id || !confirm(msg)) return;
      try {
        await deleteDoc(doc(db, 'invoices', id));
        await load();
      } catch (e) {
        console.error(e);
        alert('Could not delete.');
      }
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function load() {
  const filter = filterEl?.value || 'all';
  const base = collection(db, 'invoices');
  let qy = query(base, orderBy('updatedAt', 'desc'));
  if (filter === 'draft') {
    qy = query(base, where('status', '==', 'draft'), orderBy('updatedAt', 'desc'));
  } else if (filter === 'completed') {
    qy = query(base, where('status', '==', 'completed'), orderBy('updatedAt', 'desc'));
  }

  try {
    const snap = await getDocs(qy);
    renderRows(snap.docs);
  } catch (e) {
    console.error(e);
    if (listEl) {
      listEl.innerHTML = '';
    }
    if (emptyEl) {
      emptyEl.hidden = false;
      emptyEl.textContent =
        'Could not load estimations. Deploy Firestore indexes if prompted in the browser console, or check rules.';
    }
  }
}

if (filterEl) {
  filterEl.addEventListener('change', load);
}

load();
