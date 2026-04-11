import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth } from './admin-shared.js';

const signOutBtn = document.getElementById('adminDashboardSignOut');

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('admin-login.html');
  }
});

if (signOutBtn) {
  signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });
}
