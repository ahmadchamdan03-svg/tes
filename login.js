// ============================================
// KONFIGURASI SUPABASE (sama dengan app.js)
// ============================================
const SUPABASE_URL = 'https://ibvttbwpnwjkwqmtrpzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidnR0Yndwbndqa3dxbXRycHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODYxMDYsImV4cCI6MjEwNDk2MjEwNn0.daZoQYogXHlUn4nDf3V3CLu3udXhPdsLq6kAcTbG5Ag';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// UTIL
// ============================================
function showMessage(msg, isError = true) {
  const el = document.getElementById('login-message');
  el.textContent = msg;
  el.className = 'login-message ' + (isError ? 'error' : 'success');
  el.style.display = 'block';
}

function clearMessage() {
  const el = document.getElementById('login-message');
  el.textContent = '';
  el.style.display = 'none';
}

// ============================================
// CEK SESSION — kalau sudah login, langsung ke index
// ============================================
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    window.location.href = 'index.html';
  }
})();

// ============================================
// TOGGLE LOGIN / REGISTER
// ============================================
let mode = 'login'; // 'login' | 'register'

document.getElementById('switch-link').addEventListener('click', (e) => {
  e.preventDefault();
  clearMessage();

  const formLogin    = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const switchText   = document.getElementById('switch-text');
  const switchLink   = document.getElementById('switch-link');

  if (mode === 'login') {
    mode = 'register';
    formLogin.style.display = 'none';
    formRegister.style.display = 'flex';
    switchText.textContent = 'Sudah punya akun?';
    switchLink.textContent = 'Masuk';
  } else {
    mode = 'login';
    formLogin.style.display = 'flex';
    formRegister.style.display = 'none';
    switchText.textContent = 'Belum punya akun?';
    switchLink.textContent = 'Daftar';
  }
});

// ============================================
// SUBMIT LOGIN
// ============================================
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;

    showMessage('Login berhasil! Mengalihkan...', false);
    setTimeout(() => { window.location.href = 'index.html'; }, 600);
  } catch (err) {
    console.error(err);
    showMessage('Login gagal: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
});

// ============================================
// SUBMIT REGISTER
// ============================================
document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();

  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;

  if (password !== password2) {
    showMessage('Password tidak sama!');
    return;
  }
  if (password.length < 6) {
    showMessage('Password minimal 6 karakter!');
    return;
  }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Mendaftar...';

  try {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;

    // Kalau Supabase butuh konfirmasi email
    if (data.user && !data.session) {
      showMessage('Registrasi berhasil! Cek email untuk konfirmasi.', false);
    } else {
      showMessage('Registrasi berhasil! Mengalihkan...', false);
      setTimeout(() => { window.location.href = 'index.html'; }, 800);
    }
  } catch (err) {
    console.error(err);
    showMessage('Registrasi gagal: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Daftar';
  }
});
