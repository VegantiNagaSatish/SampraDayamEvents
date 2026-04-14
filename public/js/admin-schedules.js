import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { auth, db } from './admin-shared.js';

const COLLECTION = 'eventSchedules';

const errEl = document.getElementById('schedulesError');
const form = document.getElementById('schedulesAddForm');
const dateInput = document.getElementById('scheduleNewDate');
const contactInput = document.getElementById('scheduleNewContact');
const contactQuickWrap = document.getElementById('scheduleNewContactQuick');
const contactCallBtn = document.getElementById('scheduleNewCall');
const contactWaBtn = document.getElementById('scheduleNewWa');
const refreshBtn = document.getElementById('schedulesRefresh');
const signOutBtn = document.getElementById('schedulesSignOut');

const venueInput = document.getElementById('scheduleNewVenue');
const scheduleVenueMapsWrap = document.getElementById('scheduleVenueMapsWrap');
const scheduleVenueGoogle = document.getElementById('scheduleVenueGoogle');
const scheduleVenueApple = document.getElementById('scheduleVenueApple');
const scheduleVenueMapEmbed = document.getElementById('scheduleVenueMapEmbed');

const tabButtons = document.querySelectorAll('.schedules-tab');
const panelUpcoming = document.getElementById('panelUpcoming');
const panelCompleted = document.getElementById('panelCompleted');
const tbodyUpcoming = document.getElementById('tbodyUpcoming');
const tbodyCompleted = document.getElementById('tbodyCompleted');
const emptyUpcoming = document.getElementById('emptyUpcoming');
const emptyCompleted = document.getElementById('emptyCompleted');
const tableUpcoming = document.getElementById('tableUpcoming');
const tableCompleted = document.getElementById('tableCompleted');
const countUpcoming = document.getElementById('countUpcoming');
const countCompleted = document.getElementById('countCompleted');

let allItems = [];
let venueEmbedDebounceTimer;
let lastVenueEmbedQuery = '';
let venueAutocompleteTimer;
let currentVenueSuggestions = [];
let activeVenueInput = null;

const MIN_VENUE_MAP_CHARS = 3;
const MIN_VENUE_EMBED_CHARS = 12;
const MIN_VENUE_AUTOCOMPLETE_CHARS = 3;

function syncVenueMapLinks(text, googleEl, appleEl, containerEl) {
  const q = String(text).trim();
  const ok = q.length >= MIN_VENUE_MAP_CHARS;
  if (containerEl) containerEl.hidden = !ok;
  if (googleEl && ok) {
    googleEl.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  if (appleEl && ok) {
    appleEl.href = `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
  }
}

function debouncedVenueMapEmbed(text, iframeEl) {
  clearTimeout(venueEmbedDebounceTimer);
  venueEmbedDebounceTimer = setTimeout(() => {
    const q = String(text).trim();
    if (!iframeEl) return;
    if (q.length < MIN_VENUE_EMBED_CHARS) {
      lastVenueEmbedQuery = '';
      iframeEl.hidden = true;
      iframeEl.removeAttribute('src');
      return;
    }
    if (q === lastVenueEmbedQuery) return;
    lastVenueEmbedQuery = q;
    iframeEl.hidden = false;
    iframeEl.src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed&iwloc=near`;
  }, 500);
}

function resetAddFormVenueMaps() {
  clearTimeout(venueEmbedDebounceTimer);
  lastVenueEmbedQuery = '';
  if (scheduleVenueMapEmbed) {
    scheduleVenueMapEmbed.hidden = true;
    scheduleVenueMapEmbed.removeAttribute('src');
  }
  if (scheduleVenueMapsWrap) scheduleVenueMapsWrap.hidden = true;
  hideVenueAutocomplete();
}

function getUniqueVenues() {
  const venues = new Set();
  allItems.forEach(item => {
    const venue = String(item.venueLocation || '').trim();
    if (venue.length >= MIN_VENUE_AUTOCOMPLETE_CHARS) {
      venues.add(venue);
    }
  });
  return Array.from(venues).sort();
}

function filterVenueSuggestions(query) {
  const q = query.toLowerCase().trim();
  if (q.length < MIN_VENUE_AUTOCOMPLETE_CHARS) return [];
  
  const venues = getUniqueVenues();
  return venues.filter(venue => 
    venue.toLowerCase().includes(q) && venue.toLowerCase() !== q
  ).slice(0, 5); // Limit to 5 suggestions
}

function createVenueAutocompleteDropdown() {
  let dropdown = document.getElementById('venueAutocompleteDropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'venueAutocompleteDropdown';
    dropdown.className = 'venue-autocomplete-dropdown';
    dropdown.hidden = true;
    document.body.appendChild(dropdown);
  }
  return dropdown;
}

function showVenueAutocomplete(inputEl, suggestions) {
  if (!suggestions.length || !inputEl) {
    hideVenueAutocomplete();
    return;
  }

  const dropdown = createVenueAutocompleteDropdown();
  const rect = inputEl.getBoundingClientRect();
  
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
  dropdown.style.width = rect.width + 'px';
  
  dropdown.innerHTML = suggestions
    .map(venue => `<div class="venue-autocomplete-item" data-venue="${escapeAttr(venue)}">${escapeHtml(venue)}</div>`)
    .join('');
  
  dropdown.hidden = false;
  activeVenueInput = inputEl;
  currentVenueSuggestions = suggestions;

  // Add click handlers to suggestion items
  dropdown.querySelectorAll('.venue-autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const venue = item.dataset.venue;
      if (venue && activeVenueInput) {
        activeVenueInput.value = venue;
        activeVenueInput.dispatchEvent(new Event('input', { bubbles: true }));
        hideVenueAutocomplete();
      }
    });
  });
}

function hideVenueAutocomplete() {
  const dropdown = document.getElementById('venueAutocompleteDropdown');
  if (dropdown) {
    dropdown.hidden = true;
    dropdown.innerHTML = '';
  }
  activeVenueInput = null;
  currentVenueSuggestions = [];
}

function debouncedVenueAutocomplete(inputEl, query) {
  clearTimeout(venueAutocompleteTimer);
  venueAutocompleteTimer = setTimeout(() => {
    const suggestions = filterVenueSuggestions(query);
    showVenueAutocomplete(inputEl, suggestions);
  }, 300);
}

function showError(msg) {
  if (errEl) {
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }
}

function localDateISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function createdSeconds(data) {
  const ts = data?.createdAt;
  if (ts && typeof ts.seconds === 'number') return ts.seconds;
  return 0;
}

function relativeHint(iso, todayIso, upcoming) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const d1 = new Date(`${iso}T12:00:00`);
  const d0 = new Date(`${todayIso}T12:00:00`);
  const diff = Math.round((d1 - d0) / 86400000);
  if (upcoming) {
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 1 && diff <= 6) return `In ${diff} days`;
    return '';
  }
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff < -1 && diff >= -14) return `${-diff} days ago`;
  return '';
}

/** Last 10 digits for Indian mobile-style links (tel / WhatsApp). */
function digitsForMobileLinks(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return null;
}

function contactPickerSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof navigator.contacts.select === 'function'
  );
}

/**
 * Fills input with a phone number from the device contact list (Contact Picker API).
 * Works in secure context on browsers that support it (e.g. Chrome on Android).
 */
async function pickContactIntoInput(inputEl, callEl, waEl, wrapEl) {
  if (!inputEl) return;
  if (!contactPickerSupported()) {
    showError(
      'Opening your contacts is not supported in this browser. Use Chrome on Android, or type the number.'
    );
    return;
  }
  showError('');
  try {
    const contacts = await navigator.contacts.select(['tel'], { multiple: false });
    if (!contacts?.length) return;
    const tels = contacts[0]?.tel;
    if (!tels?.length) {
      showError('That contact has no phone number. Pick another or type the number.');
      return;
    }
    inputEl.value = String(tels[0]).trim();
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    syncContactQuickActions(inputEl, callEl, waEl, wrapEl);
  } catch (e) {
    if (e?.name === 'AbortError' || e?.name === 'NotAllowedError') return;
    console.error(e);
    showError('Could not read contacts. Allow permission if asked, or type the number.');
  }
}

function syncContactPickerButtonVisibility() {
  const ok = contactPickerSupported();
  const mainBtn = document.getElementById('schedulePickContact');
  if (mainBtn) mainBtn.hidden = !ok;
}

function syncContactQuickActions(inputEl, callEl, waEl, wrapEl) {
  if (!inputEl) return;
  const ten = digitsForMobileLinks(inputEl.value);
  const show = Boolean(ten);
  if (wrapEl) wrapEl.hidden = !show;
  if (callEl) {
    if (ten) {
      callEl.href = `tel:+91${ten}`;
      callEl.hidden = false;
    } else {
      callEl.hidden = true;
      callEl.removeAttribute('href');
    }
  }
  if (waEl) {
    if (ten) {
      waEl.href = `https://wa.me/91${ten}`;
      waEl.hidden = false;
    } else {
      waEl.hidden = true;
      waEl.removeAttribute('href');
    }
  }
}

function splitLists(todayIso) {
  const upcoming = [];
  const completed = [];
  for (const item of allItems) {
    const ed = item.eventDate;
    if (!ed || typeof ed !== 'string') continue;
    if (ed >= todayIso) upcoming.push(item);
    else completed.push(item);
  }
  upcoming.sort((a, b) => {
    if (a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    return createdSeconds(b) - createdSeconds(a);
  });
  completed.sort((a, b) => {
    if (a.eventDate !== b.eventDate) return b.eventDate.localeCompare(a.eventDate);
    return createdSeconds(b) - createdSeconds(a);
  });
  return { upcoming, completed };
}

function renderRow(item, todayIso, isUpcomingSection) {
  const tr = document.createElement('tr');
  tr.className = 'schedules-row';
  tr.dataset.id = item.id;
  const hint = relativeHint(item.eventDate, todayIso, isUpcomingSection);
  const hintBlock = hint
    ? `<span class="schedules-when__hint" aria-hidden="true">${escapeHtml(hint)}</span>`
    : '';

  const contact = String(item.contact || '').trim();
  const venue = String(item.venueLocation || '').trim();
  const eventType = String(item.eventType || '');

  tr.innerHTML = `
    <td data-label="Event date">
      <div class="schedules-date-cell">
        ${hintBlock}
        <input type="date" class="schedules-input schedules-input--date" value="${escapeAttr(item.eventDate || '')}" aria-label="Event date">
      </div>
    </td>
    <td data-label="Event type">
      <textarea class="schedules-input schedules-input--type schedules-textarea" rows="2" maxlength="500" aria-label="Event type">${escapeHtml(eventType)}</textarea>
    </td>
    <td data-label="Customer">
      <input type="text" class="schedules-input schedules-input--name" maxlength="200" value="${escapeAttr(item.customerName || '')}" aria-label="Customer name">
    </td>
    <td data-label="Venue">
      <div class="schedules-venue-cell">
        <textarea class="schedules-input schedules-input--venue schedules-textarea" rows="2" maxlength="600" aria-label="Venue or location" placeholder="Venue">${escapeHtml(venue)}</textarea>
        <div class="schedules-venue-maps-bar schedules-venue-maps-bar--row no-print" hidden>
          <a class="sched-venue-google schedules-venue-map-link--row" target="_blank" rel="noopener noreferrer" href="#">Google Maps</a>
          <a class="sched-venue-apple schedules-venue-map-link--row" target="_blank" rel="noopener noreferrer" href="#">Apple</a>
        </div>
      </div>
    </td>
    <td data-label="Contact">
      <div class="schedules-contact-cell">
        <div class="schedules-contact-stack">
          <div class="schedules-contact-inline">
            <input type="tel" class="schedules-input schedules-input--contact" maxlength="120" value="${escapeAttr(contact)}" aria-label="Contact" inputmode="tel" autocomplete="tel" placeholder="Mobile">
            <button type="button" class="btn btn-sm btn-outline sched-pick-contact schedules-pick-contact-btn btn--toolbar" aria-label="Pick from device contacts">Contacts</button>
          </div>
          <div class="schedules-contact-quick no-print">
            <a class="sched-contact-call schedules-contact-link btn btn-outline btn--toolbar" href="#" hidden>Call</a>
            <a class="sched-contact-wa schedules-contact-link btn btn-outline btn--toolbar" href="#" target="_blank" rel="noopener noreferrer" hidden>WhatsApp</a>
          </div>
        </div>
      </div>
    </td>
    <td data-label="Actions" class="schedules-actions-cell schedules-actions-cell--row no-print">
      <div class="schedules-row-actions">
        <button type="button" class="btn btn-sm btn-primary sched-save btn--toolbar">Save</button>
        <button type="button" class="btn btn-sm btn-danger-outline sched-delete btn--toolbar">Delete</button>
      </div>
    </td>
  `;

  const inp = tr.querySelector('.schedules-input--contact');
  const callEl = tr.querySelector('.sched-contact-call');
  const waEl = tr.querySelector('.sched-contact-wa');
  const wrap = tr.querySelector('.schedules-contact-quick');
  const pickBtn = tr.querySelector('.sched-pick-contact');
  if (pickBtn) {
    pickBtn.hidden = !contactPickerSupported();
    pickBtn.addEventListener('click', () => pickContactIntoInput(inp, callEl, waEl, wrap));
  }
  inp?.addEventListener('input', () => syncContactQuickActions(inp, callEl, waEl, wrap));
  syncContactQuickActions(inp, callEl, waEl, wrap);

  const venueTa = tr.querySelector('.schedules-input--venue');
  const venueBar = tr.querySelector('.schedules-venue-maps-bar--row');
  const vg = tr.querySelector('.sched-venue-google');
  const va = tr.querySelector('.sched-venue-apple');
  const syncRowVenueMaps = () => {
    const q = String(venueTa?.value || '').trim();
    const ok = q.length >= MIN_VENUE_MAP_CHARS;
    if (venueBar) venueBar.hidden = !ok;
    if (ok && vg && va) {
      vg.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
      va.href = `https://maps.apple.com/?q=${encodeURIComponent(q)}`;
    }
  };
  
  if (venueTa) {
    venueTa.addEventListener('input', () => {
      syncRowVenueMaps();
      debouncedVenueAutocomplete(venueTa, venueTa.value);
    });

    // Hide autocomplete when input loses focus
    venueTa.addEventListener('blur', () => {
      setTimeout(() => {
        if (activeVenueInput === venueTa) {
          hideVenueAutocomplete();
        }
      }, 200);
    });

    // Handle keyboard navigation
    venueTa.addEventListener('keydown', (e) => {
      const dropdown = document.getElementById('venueAutocompleteDropdown');
      if (!dropdown || dropdown.hidden) return;

      const items = dropdown.querySelectorAll('.venue-autocomplete-item');
      let currentIndex = -1;
      
      items.forEach((item, index) => {
        if (item.classList.contains('selected')) {
          currentIndex = index;
        }
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : 0;
        selectAutocompleteItem(items, nextIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : items.length - 1;
        selectAutocompleteItem(items, nextIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0 && items[currentIndex]) {
          items[currentIndex].click();
        }
      } else if (e.key === 'Escape') {
        hideVenueAutocomplete();
      }
    });
  }
  
  syncRowVenueMaps();

  tr.querySelector('.sched-save')?.addEventListener('click', () => saveRow(tr));
  tr.querySelector('.sched-delete')?.addEventListener('click', () => deleteRow(tr));
  return tr;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

async function saveRow(tr) {
  const id = tr.dataset.id;
  if (!id) return;
  const eventDate = tr.querySelector('.schedules-input--date')?.value?.trim();
  const eventType = tr.querySelector('.schedules-input--type')?.value?.trim() || '';
  const customerName = tr.querySelector('.schedules-input--name')?.value?.trim();
  const venueLocation = tr.querySelector('.schedules-input--venue')?.value?.trim() ?? '';
  const contact = tr.querySelector('.schedules-input--contact')?.value?.trim();
  if (!eventDate || !eventType || !customerName || !contact) {
    showError('Date, event type, customer name, and contact are required.');
    return;
  }
  showError('');
  try {
    await updateDoc(doc(db, COLLECTION, id), {
      eventDate,
      eventType,
      customerName,
      venueLocation,
      contact,
      updatedAt: serverTimestamp()
    });
    await loadSchedules();
  } catch (e) {
    console.error(e);
    showError('Could not save. Check connection and Firestore rules for eventSchedules.');
  }
}

async function deleteRow(tr) {
  const id = tr.dataset.id;
  if (!id || !confirm('Remove this schedule from the list?')) return;
  showError('');
  try {
    await deleteDoc(doc(db, COLLECTION, id));
    await loadSchedules();
  } catch (e) {
    console.error(e);
    showError('Could not delete.');
  }
}

function renderTables() {
  const todayIso = localDateISO();
  const { upcoming, completed } = splitLists(todayIso);

  if (countUpcoming) countUpcoming.textContent = String(upcoming.length);
  if (countCompleted) countCompleted.textContent = String(completed.length);

  if (tbodyUpcoming) {
    tbodyUpcoming.innerHTML = '';
    upcoming.forEach((item) => tbodyUpcoming.appendChild(renderRow(item, todayIso, true)));
  }
  if (tbodyCompleted) {
    tbodyCompleted.innerHTML = '';
    completed.forEach((item) => tbodyCompleted.appendChild(renderRow(item, todayIso, false)));
  }

  const showUp = upcoming.length > 0;
  const showDone = completed.length > 0;
  if (emptyUpcoming) emptyUpcoming.hidden = showUp;
  if (tableUpcoming) tableUpcoming.hidden = !showUp;
  if (emptyCompleted) emptyCompleted.hidden = showDone;
  if (tableCompleted) tableCompleted.hidden = !showDone;
}

async function loadSchedules() {
  showError('');
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    allItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTables();
  } catch (e) {
    console.error(e);
    showError(
      'Could not load schedules. Deploy the latest Firestore rules (eventSchedules), then refresh.'
    );
  }
}

function setTab(which) {
  tabButtons.forEach((btn) => {
    const on = btn.dataset.tab === which;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const showUp = which === 'upcoming';
  if (panelUpcoming) {
    panelUpcoming.hidden = !showUp;
    panelUpcoming.classList.toggle('is-active', showUp);
  }
  if (panelCompleted) {
    panelCompleted.hidden = showUp;
    panelCompleted.classList.toggle('is-active', !showUp);
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTab(btn.dataset.tab || 'upcoming'));
});

if (contactInput && contactCallBtn && contactWaBtn) {
  contactInput.addEventListener('input', () =>
    syncContactQuickActions(contactInput, contactCallBtn, contactWaBtn, contactQuickWrap)
  );
}

const schedulePickContact = document.getElementById('schedulePickContact');
if (schedulePickContact) {
  schedulePickContact.addEventListener('click', () =>
    pickContactIntoInput(contactInput, contactCallBtn, contactWaBtn, contactQuickWrap)
  );
}

if (venueInput) {
  venueInput.addEventListener('input', () => {
    const value = venueInput.value;
    syncVenueMapLinks(
      value,
      scheduleVenueGoogle,
      scheduleVenueApple,
      scheduleVenueMapsWrap
    );
    debouncedVenueMapEmbed(value, scheduleVenueMapEmbed);
    debouncedVenueAutocomplete(venueInput, value);
  });

  // Hide autocomplete when input loses focus (with delay to allow clicks)
  venueInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (activeVenueInput === venueInput) {
        hideVenueAutocomplete();
      }
    }, 200);
  });

  // Handle keyboard navigation in autocomplete
  venueInput.addEventListener('keydown', (e) => {
    const dropdown = document.getElementById('venueAutocompleteDropdown');
    if (!dropdown || dropdown.hidden) return;

    const items = dropdown.querySelectorAll('.venue-autocomplete-item');
    let currentIndex = -1;
    
    // Find currently selected item
    items.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        currentIndex = index;
      }
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : 0;
      selectAutocompleteItem(items, nextIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : items.length - 1;
      selectAutocompleteItem(items, nextIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentIndex >= 0 && items[currentIndex]) {
        items[currentIndex].click();
      }
    } else if (e.key === 'Escape') {
      hideVenueAutocomplete();
    }
  });
}

function selectAutocompleteItem(items, index) {
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === index);
  });
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const eventDate = String(fd.get('eventDate') || '').trim();
    const eventType = String(fd.get('eventType') || '').trim();
    const customerName = String(fd.get('customerName') || '').trim();
    const venueLocation = String(fd.get('venueLocation') || '').trim();
    const contact = String(fd.get('contact') || '').trim();
    if (!eventDate || !eventType || !customerName || !contact) {
      showError('Please fill in event date, event type, customer name, and contact.');
      return;
    }
    showError('');
    try {
      await addDoc(collection(db, COLLECTION), {
        eventDate,
        eventType,
        customerName,
        venueLocation,
        contact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      form.reset();
      resetAddFormVenueMaps();
      if (dateInput) dateInput.value = localDateISO();
      syncContactQuickActions(contactInput, contactCallBtn, contactWaBtn, contactQuickWrap);
      await loadSchedules();
      const todayIso = localDateISO();
      if (eventDate >= todayIso) setTab('upcoming');
      else setTab('completed');
    } catch (err) {
      console.error(err);
      showError('Could not save schedule. Check connection and Firestore rules.');
    }
  });
}

if (refreshBtn) refreshBtn.addEventListener('click', () => loadSchedules());

if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

// Hide autocomplete when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('venueAutocompleteDropdown');
  if (!dropdown || dropdown.hidden) return;
  
  // Check if click is on a venue input or the dropdown
  const isVenueInput = e.target.matches('textarea[name="venueLocation"], .schedules-input--venue');
  const isDropdown = dropdown.contains(e.target);
  
  if (!isVenueInput && !isDropdown) {
    hideVenueAutocomplete();
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'admin-login.html';
    return;
  }
  if (dateInput && !dateInput.value) dateInput.value = localDateISO();
  syncContactPickerButtonVisibility();
  syncContactQuickActions(contactInput, contactCallBtn, contactWaBtn, contactQuickWrap);
  if (venueInput?.value) {
    syncVenueMapLinks(
      venueInput.value,
      scheduleVenueGoogle,
      scheduleVenueApple,
      scheduleVenueMapsWrap
    );
    debouncedVenueMapEmbed(venueInput.value, scheduleVenueMapEmbed);
  }
  loadSchedules();
});

setTab('upcoming');
