import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** Synthetic email for Email/Password auth (Firebase has no phone+password provider). */
export function phoneToEmail(phoneDigits10) {
  return `${phoneDigits10}@invoice.sampradayam.events`;
}

export function normalizePhoneDigits(input) {
  const d = String(input || '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}
