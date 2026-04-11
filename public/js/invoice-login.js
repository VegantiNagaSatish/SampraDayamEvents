import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth, normalizePhoneDigits, phoneToEmail } from './invoice-shared.js';

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
      window.location.href = 'invoice-admin.html';
    } catch (err) {
      console.error(err);
      showError('Could not sign in. Check phone, password, and Firebase config.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    }
  });
}
