import {
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth, normalizePhoneDigits, phoneToEmail } from './invoice-shared.js';

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace('admin-dashboard.html');
  }
});

const form = document.getElementById('invoiceLoginForm');
const errEl = document.getElementById('invoiceLoginError');

function showError(msg) {
  if (errEl) {
    errEl.textContent = msg;
    errEl.hidden = !msg;
  }
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    const phone = normalizePhoneDigits(document.getElementById('adminPhone')?.value);
    const password = document.getElementById('adminPassword')?.value || '';

    if (phone.length !== 10) {
      showError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      showError('Enter your password.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Signing in…';
    }

    try {
      const email = phoneToEmail(phone);
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        const expected = phoneToEmail(phone);
        showError(`Wrong phone or password. In Firebase → Authentication → Users, add a user whose email is exactly: ${expected}`);
      } else if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid') {
        showError('Invalid Firebase API key — check public/js/firebase-config.js matches this project.');
      } else {
        showError(`Sign-in failed (${code || 'unknown'}). Check phone, password, and Firebase config.`);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    }
  });
}
