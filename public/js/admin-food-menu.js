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
    updateDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './admin-shared.js';
import { DEFAULT_FOOD_MENU_SECTIONS } from './food-menu-defaults.js';

const listEl = document.getElementById('foodMenuAdminList');
const errEl = document.getElementById('foodMenuAdminError');

const TOAST_DURATION_MS = 4200;

/**
 * @param {string} message
 * @param {'success' | 'error'} variant
 */
function showToast(message, variant = 'success') {
    const host = document.getElementById('adminToastHost');
    if (!host || !message) return;

    const toast = document.createElement('div');
    toast.className = 'admin-toast admin-toast--' + (variant === 'error' ? 'error' : 'success');
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    host.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('admin-toast--visible');
    });

    const remove = () => {
        toast.classList.remove('admin-toast--visible');
        const done = () => {
            toast.remove();
        };
        toast.addEventListener('transitionend', done, { once: true });
        setTimeout(done, 350);
    };

    setTimeout(remove, TOAST_DURATION_MS);
}

function showError(msg) {
    if (errEl) {
        errEl.textContent = msg || '';
        errEl.hidden = !msg;
    }
}

/** Firestore often fails silently in the UI without this (e.g. empty batch commit, permission-denied). */
function formatFirestoreError(err) {
    const code = err && err.code;
    const msg = err && err.message;
    if (code === 'permission-denied') {
        return 'Permission denied. Deploy the latest Firestore rules (run: firebase deploy --only firestore:rules), wait a minute, then refresh and sign in again.';
    }
    if (code === 'failed-precondition') {
        return 'Database precondition failed. ' + (msg || '') + ' Open the browser console (F12) for the full error.';
    }
    if (msg) {
        return msg + (code ? ' (' + code + ')' : '');
    }
    return String(err || 'Unknown error');
}

function parseItemsTextarea(text) {
    return String(text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}

/**
 * Renumber all sections to unique orders 1, 2, 3, … (by current order, then doc id for ties).
 * Removes duplicates and fixes legacy 0-based values.
 */
async function ensureSequentialOrdersFromOne() {
    const snap = await getDocs(collection(db, 'foodMenuSections'));
    if (snap.empty) return;

    const rows = snap.docs.map((d) => ({
        id: d.id,
        ref: d.ref,
        order: Number(d.data().order)
    }));

    rows.sort((a, b) => {
        const ao = Number.isFinite(a.order) ? a.order : 999999;
        const bo = Number.isFinite(b.order) ? b.order : 999999;
        if (ao !== bo) return ao - bo;
        return a.id.localeCompare(b.id);
    });

    const batch = writeBatch(db);
    let updates = 0;
    rows.forEach((row, i) => {
        const want = i + 1;
        if (row.order !== want) {
            batch.update(row.ref, { order: want, updatedAt: serverTimestamp() });
            updates += 1;
        }
    });
    if (updates > 0) {
        await batch.commit();
    }
}

async function loadSections() {
    showError('');
    try {
        await ensureSequentialOrdersFromOne();
        const q = query(collection(db, 'foodMenuSections'), orderBy('order'));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            items: Array.isArray(d.data().items) ? d.data().items : []
        }));
        renderList(rows);
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Could not load menu: ' + detail);
        showToast('Could not load menu.', 'error');
        if (listEl) {
            listEl.innerHTML = '';
        }
    }
}

function renderList(sections) {
    if (!listEl) return;
    listEl.innerHTML = '';

    sections.forEach((sec, index) => {
        const raw = Number(sec.order);
        const orderVal = Number.isFinite(raw) && raw >= 1 ? raw : index + 1;
        const card = document.createElement('article');
        card.className = 'food-menu-admin-card';
        card.dataset.id = sec.id;

        card.innerHTML = `
          <div class="food-menu-admin-card__head">
            <span class="food-menu-admin-card__index">#${index + 1}</span>
            <div class="food-menu-admin-card__order">
              <label class="food-menu-admin-field-label">Order</label>
              <input type="number" class="food-menu-admin-order-input" min="1" step="1" value="${orderVal}" aria-label="Section order">
            </div>
            <div class="food-menu-admin-card__move">
              <button type="button" class="btn btn-sm btn-outline food-menu-admin-move-up btn--toolbar" ${index === 0 ? 'disabled' : ''}>Up</button>
              <button type="button" class="btn btn-sm btn-outline food-menu-admin-move-down btn--toolbar" ${index === sections.length - 1 ? 'disabled' : ''}>Down</button>
            </div>
          </div>
          <div class="food-menu-admin-grid">
            <div class="food-menu-admin-field">
              <label class="food-menu-admin-field-label">Section title (English)</label>
              <input type="text" class="food-menu-admin-title-en" maxlength="200" value="" placeholder="e.g. Sweets">
            </div>
            <div class="food-menu-admin-field">
              <label class="food-menu-admin-field-label">Section title (Telugu)</label>
              <input type="text" class="food-menu-admin-title-te" maxlength="200" value="" placeholder="e.g. స్వీట్స్" lang="te">
            </div>
          </div>
          <div class="food-menu-admin-field">
            <label class="food-menu-admin-field-label">Dishes (one per line)</label>
            <textarea class="food-menu-admin-items" rows="10" placeholder="పూర్ణం పూరి — Purnam Puri"></textarea>
          </div>
          <div class="food-menu-admin-card__actions">
            <button type="button" class="btn btn-sm btn-primary food-menu-admin-save btn--toolbar">Save section</button>
            <button type="button" class="btn btn-sm btn-danger-outline food-menu-admin-delete btn--toolbar">Delete section</button>
          </div>
        `;

        card.querySelector('.food-menu-admin-title-en').value = sec.title || '';
        card.querySelector('.food-menu-admin-title-te').value = sec.titleTe || '';
        card.querySelector('.food-menu-admin-items').value = (sec.items || []).join('\n');

        card.querySelector('.food-menu-admin-save').addEventListener('click', () => saveSection(card));
        card.querySelector('.food-menu-admin-delete').addEventListener('click', () => deleteSection(card));
        card.querySelector('.food-menu-admin-move-up').addEventListener('click', () => moveSection(sections, index, -1));
        card.querySelector('.food-menu-admin-move-down').addEventListener('click', () => moveSection(sections, index, 1));

        listEl.appendChild(card);
    });
}

async function saveSection(card) {
    const id = card.dataset.id;
    const title = card.querySelector('.food-menu-admin-title-en')?.value?.trim();
    const titleTe = card.querySelector('.food-menu-admin-title-te')?.value?.trim() || '';
    const orderRaw = card.querySelector('.food-menu-admin-order-input')?.value;
    let order = Number(orderRaw);
    if (!Number.isFinite(order) || order < 1) {
        order = 1;
    }
    const items = parseItemsTextarea(card.querySelector('.food-menu-admin-items')?.value);

    if (!title) {
        showError('Section title (English) cannot be empty.');
        showToast('Enter an English section title before saving.', 'error');
        return;
    }
    showError('');
    try {
        await updateDoc(doc(db, 'foodMenuSections', id), {
            title,
            titleTe,
            order,
            items,
            updatedAt: serverTimestamp()
        });
        await loadSections();
        showToast('Section saved.', 'success');
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Could not save. ' + detail);
        showToast('Save failed. ' + (detail.length > 120 ? detail.slice(0, 117) + '…' : detail), 'error');
    }
}

async function deleteSection(card) {
    const id = card.dataset.id;
    if (!id || !confirm('Delete this section and all its dishes from the database?')) return;
    showError('');
    try {
        await deleteDoc(doc(db, 'foodMenuSections', id));
        await loadSections();
        showToast('Section deleted.', 'success');
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Could not delete. ' + detail);
        showToast('Delete failed.', 'error');
    }
}

async function moveSection(sections, index, delta) {
    const j = index + delta;
    if (j < 0 || j >= sections.length) return;
    const a = sections[index];
    const b = sections[j];
    const orderA = Number.isFinite(Number(a.order)) && Number(a.order) >= 1 ? Number(a.order) : index + 1;
    const orderB = Number.isFinite(Number(b.order)) && Number(b.order) >= 1 ? Number(b.order) : j + 1;
    showError('');
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'foodMenuSections', a.id), { order: orderB, updatedAt: serverTimestamp() });
        batch.update(doc(db, 'foodMenuSections', b.id), { order: orderA, updatedAt: serverTimestamp() });
        await batch.commit();
        await loadSections();
        showToast('Section order updated.', 'success');
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Could not reorder sections. ' + detail);
        showToast('Could not reorder.', 'error');
    }
}

async function addSection() {
    showError('');
    try {
        const snap = await getDocs(collection(db, 'foodMenuSections'));
        let maxOrder = 0;
        snap.forEach((d) => {
            const o = Number(d.data().order);
            if (Number.isFinite(o) && o > maxOrder) maxOrder = o;
        });
        await addDoc(collection(db, 'foodMenuSections'), {
            title: 'New section',
            titleTe: '',
            order: maxOrder + 1,
            items: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        await loadSections();
        showToast('New section added.', 'success');
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Could not add section. ' + detail);
        showToast('Could not add section.', 'error');
    }
}

async function seedDefaults() {
    if (
        !confirm(
            'Replace ALL food menu sections in the database with the built-in default list? This cannot be undone. Customers will see the new menu immediately.'
        )
    ) {
        return;
    }
    showError('');
    try {
        const snap = await getDocs(collection(db, 'foodMenuSections'));
        if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach((d) => {
                batch.delete(d.ref);
            });
            await batch.commit();
        }

        let order = 1;
        for (const sec of DEFAULT_FOOD_MENU_SECTIONS) {
            await addDoc(collection(db, 'foodMenuSections'), {
                title: sec.title,
                titleTe: sec.titleTe || '',
                order,
                items: [...sec.items],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            order += 1;
        }
        await loadSections();
        showToast('Default menu imported successfully.', 'success');
    } catch (e) {
        console.error(e);
        const detail = formatFirestoreError(e);
        showError('Import failed. ' + detail);
        showToast('Import failed.', 'error');
    }
}

document.getElementById('foodMenuAdminRefresh')?.addEventListener('click', () => loadSections().catch(console.error));
document.getElementById('foodMenuAdminAddSection')?.addEventListener('click', () => addSection());
document.getElementById('foodMenuAdminSeedDefaults')?.addEventListener('click', () => seedDefaults());

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'admin-login.html';
        return;
    }
    loadSections();
});
