import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { DEFAULT_HOMEPAGE_STATS, DEFAULT_TESTIMONIALS } from './home-content-defaults.js';

const HOMEPAGE_STATS_DOC = 'homepage';

function getPublicDb() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function starsForRating(rating) {
    const n = Math.max(1, Math.min(5, Number(rating) || 5));
    return '⭐'.repeat(n);
}

function renderStats(stats) {
    const bar = document.getElementById('heroStatsBar');
    if (!bar) return;

    bar.innerHTML = stats
        .map(
            (stat) => `
        <div class="stat-item" role="listitem">
            <div class="stat-number" data-target="${Number(stat.value) || 0}">0</div>
            <div class="stat-label">${escapeHtml(stat.label || '')}</div>
        </div>`
        )
        .join('');

    if (typeof window.initHeroStatCounters === 'function') {
        window.initHeroStatCounters();
    }
}

function renderTestimonials(rows) {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid) return;

    if (!rows.length) {
        grid.innerHTML = '<p class="invoice-muted" style="grid-column:1/-1;text-align:center;">No reviews yet.</p>';
        return;
    }

    grid.innerHTML = rows
        .map((item) => {
            const initial = escapeHtml((item.authorName || '?').trim().charAt(0).toUpperCase() || '?');
            return `
        <div class="testimonial-card">
            <div class="testimonial-stars">${starsForRating(item.rating)}</div>
            <p class="testimonial-text">"${escapeHtml(item.text || '')}"</p>
            <div class="testimonial-author">
                <div class="author-avatar">${initial}</div>
                <div>
                    <div class="author-name">${escapeHtml(item.authorName || '')}</div>
                    <div class="author-role">${escapeHtml(item.authorRole || '')}</div>
                </div>
            </div>
        </div>`;
        })
        .join('');
}

async function fetchHomepageStats(db) {
    try {
        const snap = await getDoc(doc(db, 'settings', HOMEPAGE_STATS_DOC));
        if (!snap.exists()) return null;
        const stats = snap.data().stats;
        if (!Array.isArray(stats) || !stats.length) return null;
        return stats
            .map((s) => ({
                value: Number(s.value) || 0,
                label: String(s.label || '').trim()
            }))
            .filter((s) => s.label);
    } catch (e) {
        console.warn('Could not load homepage stats:', e);
        return null;
    }
}

async function fetchTestimonials(db) {
    try {
        const q = query(collection(db, 'testimonials'), orderBy('order'));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs
            .map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    text: String(data.text || '').trim(),
                    authorName: String(data.authorName || '').trim(),
                    authorRole: String(data.authorRole || '').trim(),
                    rating: Number(data.rating) || 5,
                    order: Number(data.order) || 0
                };
            })
            .filter((t) => t.text && t.authorName);
    } catch (e) {
        console.warn('Could not load testimonials:', e);
        return null;
    }
}

async function loadHomeContent() {
    const db = getPublicDb();
    const [stats, testimonials] = await Promise.all([
        fetchHomepageStats(db),
        fetchTestimonials(db)
    ]);

    renderStats(stats && stats.length ? stats : DEFAULT_HOMEPAGE_STATS);
    renderTestimonials(
        testimonials && testimonials.length ? testimonials : DEFAULT_TESTIMONIALS
    );
}

loadHomeContent();
