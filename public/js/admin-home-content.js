import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './admin-shared.js';
import { DEFAULT_HOMEPAGE_STATS, DEFAULT_TESTIMONIALS } from './home-content-defaults.js';

const HOMEPAGE_STATS_DOC = 'homepage';
const errEl = document.getElementById('homeContentError');
const statsFields = document.getElementById('statsFields');
const statsForm = document.getElementById('statsForm');
const reviewsList = document.getElementById('reviewsList');

function showError(msg) {
    if (errEl) {
        errEl.textContent = msg || '';
        errEl.hidden = !msg;
    }
}

function showToast(message, variant = 'success') {
    const host = document.getElementById('adminToastHost');
    if (!host || !message) return;
    const toast = document.createElement('div');
    toast.className = 'admin-toast admin-toast--' + (variant === 'error' ? 'error' : 'success');
    toast.textContent = message;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('admin-toast--visible'));
    setTimeout(() => {
        toast.classList.remove('admin-toast--visible');
        setTimeout(() => toast.remove(), 350);
    }, 4200);
}

function statRowHtml(value = '', label = '') {
    return `
    <div class="home-content-stat-row">
      <label class="home-content-stat-row__field">
        <span>Number</span>
        <input type="number" class="stat-value-input" min="0" step="1" value="${value}" required>
      </label>
      <label class="home-content-stat-row__field home-content-stat-row__field--grow">
        <span>Label</span>
        <input type="text" class="stat-label-input" maxlength="80" value="${escapeAttr(label)}" required>
      </label>
      <button type="button" class="btn btn-outline btn--toolbar stat-remove-btn" title="Remove">Remove</button>
    </div>`;
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');
}

function readStatsFromForm() {
    const rows = statsFields?.querySelectorAll('.home-content-stat-row') || [];
    return Array.from(rows)
        .map((row) => ({
            value: Number(row.querySelector('.stat-value-input')?.value) || 0,
            label: String(row.querySelector('.stat-label-input')?.value || '').trim()
        }))
        .filter((s) => s.label);
}

function renderStatsForm(stats) {
    if (!statsFields) return;
    const rows = stats.length ? stats : [{ value: 0, label: '' }];
    statsFields.innerHTML = rows.map((s) => statRowHtml(s.value, s.label)).join('');
}

function reviewCardHtml(review) {
    const id = review.id || '';
    return `
    <article class="home-content-review-card" data-id="${escapeAttr(id)}">
      <div class="invoice-form">
        <label>Review text<textarea class="review-text-input" rows="4" maxlength="2000">${escapeHtml(review.text || '')}</textarea></label>
        <div class="home-content-review-card__meta">
          <label>Client name<input type="text" class="review-name-input" maxlength="120" value="${escapeAttr(review.authorName || '')}"></label>
          <label>Event type<input type="text" class="review-role-input" maxlength="120" value="${escapeAttr(review.authorRole || '')}" placeholder="e.g. Marriage"></label>
          <label>Stars (1–5)<input type="number" class="review-rating-input" min="1" max="5" step="1" value="${Number(review.rating) || 5}"></label>
        </div>
      </div>
      <div class="home-content-review-card__actions">
        <button type="button" class="btn btn-primary btn--toolbar review-save-btn">Save</button>
        <button type="button" class="btn btn-outline btn--toolbar review-delete-btn">Delete</button>
      </div>
    </article>`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function readReviewFromCard(card) {
    return {
        text: String(card.querySelector('.review-text-input')?.value || '').trim(),
        authorName: String(card.querySelector('.review-name-input')?.value || '').trim(),
        authorRole: String(card.querySelector('.review-role-input')?.value || '').trim(),
        rating: Math.max(1, Math.min(5, Number(card.querySelector('.review-rating-input')?.value) || 5))
    };
}

function renderReviews(reviews) {
    if (!reviewsList) return;
    if (!reviews.length) {
        reviewsList.innerHTML = '<p class="invoice-muted">No reviews yet. Click <strong>Add review</strong> or load defaults.</p>';
        return;
    }
    reviewsList.innerHTML = reviews.map((r) => reviewCardHtml(r)).join('');
}

reviewsList?.addEventListener('click', (e) => {
    const card = e.target.closest('.home-content-review-card');
    if (!card) return;
    if (e.target.closest('.review-save-btn')) saveReviewCard(card);
    if (e.target.closest('.review-delete-btn')) deleteReviewCard(card);
});

statsFields?.addEventListener('click', (e) => {
    const btn = e.target.closest('.stat-remove-btn');
    if (!btn || !statsFields) return;
    if (statsFields.querySelectorAll('.home-content-stat-row').length > 1) {
        btn.closest('.home-content-stat-row')?.remove();
    }
});

async function loadStats() {
    const snap = await getDoc(doc(db, 'settings', HOMEPAGE_STATS_DOC));
    if (snap.exists() && Array.isArray(snap.data().stats) && snap.data().stats.length) {
        renderStatsForm(snap.data().stats);
    } else {
        renderStatsForm(DEFAULT_HOMEPAGE_STATS);
    }
}

async function loadReviews() {
    const q = query(collection(db, 'testimonials'), orderBy('order'));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderReviews(rows);
}

async function loadAll() {
    showError('');
    try {
        await Promise.all([loadStats(), loadReviews()]);
    } catch (e) {
        console.error(e);
        showError('Could not load homepage content. ' + (e.message || e));
    }
}

async function saveStats(e) {
    e.preventDefault();
    const stats = readStatsFromForm();
    if (!stats.length) {
        showToast('Add at least one stat with a label.', 'error');
        return;
    }
    try {
        await setDoc(
            doc(db, 'settings', HOMEPAGE_STATS_DOC),
            { stats, updatedAt: serverTimestamp() },
            { merge: true }
        );
        showToast('Stats saved.');
    } catch (e) {
        console.error(e);
        showToast('Could not save stats.', 'error');
    }
}

async function saveReviewCard(card) {
    const payload = readReviewFromCard(card);
    if (!payload.text || !payload.authorName) {
        showToast('Review text and client name are required.', 'error');
        return;
    }
    const id = card.dataset.id;
    try {
        if (id) {
            await updateDoc(doc(db, 'testimonials', id), {
                ...payload,
                updatedAt: serverTimestamp()
            });
            showToast('Review updated.');
        } else {
            const snap = await getDocs(collection(db, 'testimonials'));
            const order = snap.size + 1;
            const ref = await addDoc(collection(db, 'testimonials'), {
                ...payload,
                order,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            card.dataset.id = ref.id;
            showToast('Review added.');
        }
    } catch (e) {
        console.error(e);
        showToast('Could not save review.', 'error');
    }
}

async function deleteReviewCard(card) {
    const id = card.dataset.id;
    if (!id) {
        card.remove();
        if (!reviewsList?.querySelector('.home-content-review-card')) {
            renderReviews([]);
        }
        return;
    }
    if (!confirm('Delete this review from the homepage?')) return;
    try {
        await deleteDoc(doc(db, 'testimonials', id));
        card.remove();
        showToast('Review deleted.');
        if (!reviewsList?.querySelector('.home-content-review-card')) {
            renderReviews([]);
        }
    } catch (e) {
        console.error(e);
        showToast('Could not delete review.', 'error');
    }
}

async function seedDefaults() {
    if (!confirm('This will save the default stats and reviews to Firebase (existing reviews will be replaced). Continue?')) {
        return;
    }
    try {
        await setDoc(doc(db, 'settings', HOMEPAGE_STATS_DOC), {
            stats: DEFAULT_HOMEPAGE_STATS,
            updatedAt: serverTimestamp()
        });

        const existing = await getDocs(collection(db, 'testimonials'));
        const batch = writeBatch(db);
        existing.docs.forEach((d) => batch.delete(d.ref));

        DEFAULT_TESTIMONIALS.forEach((t, i) => {
            const ref = doc(collection(db, 'testimonials'));
            batch.set(ref, {
                ...t,
                order: i + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        });
        await batch.commit();
        showToast('Defaults loaded into database.');
        await loadAll();
    } catch (e) {
        console.error(e);
        showToast('Could not load defaults.', 'error');
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace('admin-login.html');
        return;
    }
    loadAll();
});

statsForm?.addEventListener('submit', saveStats);
document.getElementById('statsAddRow')?.addEventListener('click', () => {
    statsFields?.insertAdjacentHTML('beforeend', statRowHtml());
});
document.getElementById('reviewAddBtn')?.addEventListener('click', () => {
    if (reviewsList?.querySelector('.invoice-muted')) {
        reviewsList.innerHTML = '';
    }
    reviewsList?.insertAdjacentHTML('beforeend', reviewCardHtml({}));
});
document.getElementById('seedDefaultsBtn')?.addEventListener('click', seedDefaults);
document.getElementById('homeContentRefresh')?.addEventListener('click', loadAll);
