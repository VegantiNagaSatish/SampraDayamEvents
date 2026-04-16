import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    collection,
    getDocs,
    getFirestore,
    orderBy,
    query
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { DEFAULT_FOOD_MENU_SECTIONS } from './food-menu-defaults.js';

const WHATSAPP_E164 = '918309133572';

const TIME_SLOT_WHATSAPP = {
    udayam: 'Udayam / ఉదయం (morning)',
    madyanam: 'Madyanam / మధ్యాహ్నం (midday)',
    sayantram: 'Sayantram / సాయంత్రం (evening)'
};

let MENU_SECTIONS = [];

function getPublicDb() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return getFirestore(app);
}

async function fetchMenuFromFirestore() {
    const db = getPublicDb();
    const q = query(collection(db, 'foodMenuSections'), orderBy('order'));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const rows = snap.docs.map((d) => {
        const data = d.data();
        const items = Array.isArray(data.items) ? data.items.map((s) => String(s).trim()).filter(Boolean) : [];
        return {
            id: d.id,
            title: String(data.title || '').trim() || 'Section',
            titleTe: String(data.titleTe || '').trim(),
            items
        };
    });
    return rows;
}

function slugify(s) {
    return String(s)
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
}

function getSelectedBySection() {
    const selectedBySection = {};
    MENU_SECTIONS.forEach((sec) => {
        selectedBySection[sec.id] = [];
    });
    document.querySelectorAll('.food-menu-sections input[type="checkbox"]:checked').forEach((cb) => {
        const sid = cb.getAttribute('data-section');
        if (sid && selectedBySection[sid]) {
            selectedBySection[sid].push(cb.value);
        }
    });
    return selectedBySection;
}

function countSelected(selectedBySection) {
    let n = 0;
    MENU_SECTIONS.forEach((sec) => {
        n += selectedBySection[sec.id].length;
    });
    return n;
}

function updateSelectionSummary() {
    const selectedBySection = getSelectedBySection();
    const n = countSelected(selectedBySection);

    const headingEl = document.getElementById('food-menu-selection-heading');
    const previewEl = document.getElementById('food-menu-selection-preview');

    if (headingEl) {
        if (n === 0) {
            headingEl.textContent = 'Your selection';
        } else if (n === 1) {
            headingEl.textContent = 'Your selection — 1 item';
        } else {
            headingEl.textContent = 'Your selection — ' + n + ' items';
        }
    }

    if (!previewEl) return;
    previewEl.innerHTML = '';

    if (n === 0) {
        const empty = document.createElement('p');
        empty.className = 'food-menu-selection-empty';
        empty.textContent = 'No items selected yet. Tick dishes above to see them here.';
        previewEl.appendChild(empty);
        return;
    }

    MENU_SECTIONS.forEach((sec) => {
        const items = selectedBySection[sec.id];
        if (!items.length) return;

        const group = document.createElement('div');
        group.className = 'food-menu-preview-group';

        const h4 = document.createElement('h4');
        h4.className = 'food-menu-preview-group__title';
        h4.innerHTML = sec.title + ' <span class="food-menu-preview-group__te">' + sec.titleTe + '</span>';

        const ul = document.createElement('ul');
        ul.className = 'food-menu-preview-list';
        items.forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            ul.appendChild(li);
        });

        group.appendChild(h4);
        group.appendChild(ul);
        previewEl.appendChild(group);
    });
}

function formatEventDateForMessage(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const y = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(mo) || isNaN(d)) return iso;
    const dt = new Date(y, mo, d);
    return dt.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function buildMessage(selectedBySection, eventDateIso, timeSlot, personsCount) {
    const lines = [];
    lines.push('Hello SAMPRADAYAM EVENTS,');
    lines.push('');
    lines.push('I would like to enquire about these food menu selections:');
    lines.push('');
    lines.push('*Event date (ఈవెంట్ తేదీ):* ' + formatEventDateForMessage(eventDateIso));
    lines.push('*Time of day (రోజు సమయం):* ' + (TIME_SLOT_WHATSAPP[timeSlot] || timeSlot));
    lines.push('*Number of persons (వ్యక్తుల సంఖ్య):* ' + personsCount);
    lines.push('');

    MENU_SECTIONS.forEach((sec) => {
        const picked = selectedBySection[sec.id];
        if (!picked || !picked.length) return;
        lines.push('*' + sec.title + '* (' + sec.titleTe + ')');
        picked.forEach((item) => {
            lines.push('• ' + item);
        });
        lines.push('');
    });

    lines.push('— Sent from sampradayam.events food menu');
    return lines.join('\n');
}

function render() {
    const root = document.getElementById('food-menu-sections');
    if (!root) return;

    root.innerHTML = '';

    MENU_SECTIONS.forEach((sec) => {
        const article = document.createElement('article');
        article.className = 'food-menu-category';
        article.id = 'category-' + sec.id;

        const h2 = document.createElement('h2');
        h2.className = 'food-menu-category__title';
        h2.innerHTML =
            '<span class="food-menu-category__title-en">' +
            sec.title +
            '</span> <span class="food-menu-category__title-te">' +
            sec.titleTe +
            '</span>';
        article.appendChild(h2);

        const list = document.createElement('ul');
        list.className = 'food-menu-list';

        sec.items.forEach((itemText, idx) => {
            const li = document.createElement('li');
            li.className = 'food-menu-list__item';

            const inputId = 'fm-' + sec.id + '-' + idx + '-' + slugify(itemText).slice(0, 32);
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = inputId;
            input.name = 'food-item';
            input.value = itemText;
            input.setAttribute('data-section', sec.id);

            const label = document.createElement('label');
            label.htmlFor = inputId;
            label.className = 'food-menu-list__label';
            label.textContent = itemText;

            li.appendChild(input);
            li.appendChild(label);
            list.appendChild(li);
        });

        article.appendChild(list);
        root.appendChild(article);
    });

    if (!root.dataset.foodMenuChangeBound) {
        root.dataset.foodMenuChangeBound = '1';
        root.addEventListener('change', (e) => {
            if (e.target && e.target.matches('input[type="checkbox"]')) {
                updateSelectionSummary();
            }
        });
    }
}

function finalise() {
    const selectedBySection = getSelectedBySection();

    const any = MENU_SECTIONS.some((sec) => selectedBySection[sec.id].length > 0);

    if (!any) {
        window.alert('Please select at least one item before finalising.');
        return;
    }

    const dateInput = document.getElementById('food-menu-event-date');
    const eventDateIso = dateInput && dateInput.value ? dateInput.value.trim() : '';
    if (!eventDateIso) {
        window.alert('Please choose the event date before finalising.');
        if (dateInput) {
            dateInput.focus();
        }
        return;
    }

    const personsInput = document.getElementById('food-menu-persons-count');
    const personsCount = personsInput && personsInput.value ? parseInt(personsInput.value.trim(), 10) : 0;
    if (!personsCount || personsCount < 1) {
        window.alert('Please enter the number of persons before finalising.');
        if (personsInput) {
            personsInput.focus();
        }
        return;
    }

    const timeRadio = document.querySelector('input[name="food-menu-time-slot"]:checked');
    const timeSlot = timeRadio ? timeRadio.value : '';
    if (!timeSlot) {
        window.alert('Please choose a time of day: Udayam, Madyanam, or Sayantram.');
        const firstTime = document.querySelector('input[name="food-menu-time-slot"]');
        if (firstTime) {
            firstTime.focus();
        }
        return;
    }

    const message = buildMessage(selectedBySection, eventDateIso, timeSlot, personsCount);
    const url = 'https://wa.me/' + WHATSAPP_E164 + '?text=' + encodeURIComponent(message);

    if (url.length > 8000) {
        window.alert(
            'Your selection is very long for a single WhatsApp link. Please select fewer items and try again, or contact us by phone.'
        );
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

function setEventDateInputMinToday() {
    const el = document.getElementById('food-menu-event-date');
    if (!el) return;
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    el.min = y + '-' + m + '-' + d;
}

function setLoadingVisible(visible) {
    const el = document.getElementById('food-menu-loading');
    if (el) {
        el.hidden = !visible;
        el.setAttribute('aria-busy', visible ? 'true' : 'false');
    }
}

async function initFoodMenuPage() {
    setLoadingVisible(true);
    try {
        const fromDb = await fetchMenuFromFirestore();
        if (fromDb && fromDb.length) {
            MENU_SECTIONS = fromDb;
        } else {
            MENU_SECTIONS = DEFAULT_FOOD_MENU_SECTIONS;
        }
    } catch (e) {
        console.warn('Food menu: using built-in defaults (Firestore unavailable or empty).', e);
        MENU_SECTIONS = DEFAULT_FOOD_MENU_SECTIONS;
    } finally {
        setLoadingVisible(false);
    }

    render();
    updateSelectionSummary();
    setEventDateInputMinToday();
    bindFinaliseButton();
}

function bindFinaliseButton() {
    const btn = document.getElementById('food-menu-finalise');
    if (btn && !btn.dataset.foodMenuFinaliseBound) {
        btn.dataset.foodMenuFinaliseBound = '1';
        btn.addEventListener('click', finalise);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initFoodMenuPage().catch((err) => {
        console.error(err);
        MENU_SECTIONS = DEFAULT_FOOD_MENU_SECTIONS;
        setLoadingVisible(false);
        render();
        updateSelectionSummary();
        setEventDateInputMinToday();
        bindFinaliseButton();
    });
});
