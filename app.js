// ============================================
// KONFIGURASI SUPABASE — ganti sesuai project kamu
// ============================================
const SUPABASE_URL = 'https://ibvttbwpnwjkwqmtrpzv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidnR0Yndwbndqa3dxbXRycHp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODYxMDYsImV4cCI6MjEwNDk2MjEwNn0.daZoQYogXHlUn4nDf3V3CLu3udXhPdsLq6kAcTbG5Ag';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// STATE
// ============================================
const state = {
  kamarList: [],
  alamatList: [],
  siswaList: [],
  editingSiswaId: null,
  editingKamarId: null,
  editingAlamatId: null,
};

// ============================================
// UTIL
// ============================================
function toast(msg, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return '-'; }
}

// ============================================
// TABS
// ============================================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ============================================
// LOAD DATA
// ============================================
async function loadKamar() {
  const { data, error } = await db
    .from('kamar')
    .select('*')
    .order('nomor_kamar', { ascending: true });

  if (error) { toast('Gagal memuat kamar: ' + error.message, true); return; }
  state.kamarList = data || [];
  renderKamar();
  renderKamarOptions();
}

async function loadAlamat() {
  const { data, error } = await db
    .from('alamat')
    .select('*')
    .order('id', { ascending: true });

  if (error) { toast('Gagal memuat alamat: ' + error.message, true); return; }
  state.alamatList = data || [];
  renderAlamat();
  renderAlamatOptions();
}

async function loadSiswa() {
  const { data, error } = await db
    .from('siswa')
    .select(`
      nomor,
      nama,
      kelas,
      kamar_id,
      alamat_id,
      kamar:kamar_id ( nomor_kamar, nama_kamar ),
      alamat:alamat_id ( nama_alamat )
    `)
    .order('nomor', { ascending: true });

  if (error) { toast('Gagal memuat siswa: ' + error.message, true); return; }
  state.siswaList = data || [];
  renderSiswa();
}

// ============================================
// RENDER: KAMAR
// ============================================
function renderKamar() {
  const tbody = document.getElementById('tbody-kamar');
  if (!state.kamarList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada kamar</td></tr>`;
    return;
  }
  tbody.innerHTML = state.kamarList.map((k, i) => {
    const terisi = state.siswaList.filter(s => s.kamar_id === k.id).length;
    const penuh = terisi >= k.kapasitas;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(k.nomor_kamar)}</strong></td>
        <td>${escapeHtml(k.nama_kamar || '-')}</td>
        <td>${k.kapasitas}</td>
        <td><span class="badge ${penuh ? 'badge-full' : ''}">${terisi} / ${k.kapasitas}</span></td>
        <td>
          <button class="btn-edit" onclick="editKamar(${k.id})">Edit</button>
          <button class="btn-danger" onclick="hapusKamar(${k.id})">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// RENDER: ALAMAT
// ============================================
function renderAlamat() {
  const tbody = document.getElementById('tbody-alamat');
  if (!state.alamatList.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Belum ada alamat</td></tr>`;
    return;
  }
  tbody.innerHTML = state.alamatList.map((a, i) => {
    const jumlah = state.siswaList.filter(s => s.alamat_id === a.id).length;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${a.id}</td>
        <td>${escapeHtml(a.nama_alamat || '-')}</td>
        <td>${formatDate(a.created_at)}</td>
        <td><span class="badge">${jumlah} siswa</span></td>
        <td>
          <button class="btn-edit" onclick="editAlamat(${a.id})">Edit</button>
          <button class="btn-danger" onclick="hapusAlamat(${a.id})">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// RENDER: SISWA
// ============================================
function renderSiswa() {
  const tbody = document.getElementById('tbody-siswa');
  const keyword = document.getElementById('search').value.toLowerCase().trim();
  const filterKamar = document.getElementById('filter-kamar').value;
  const filterAlamat = document.getElementById('filter-alamat').value;

  let list = state.siswaList;
  if (keyword) list = list.filter(s => s.nama.toLowerCase().includes(keyword));
  if (filterKamar) list = list.filter(s => String(s.kamar_id) === filterKamar);
  if (filterAlamat) list = list.filter(s => String(s.alamat_id) === filterAlamat);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Tidak ada data siswa</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((s, i) => {
    const kamar = s.kamar ? `${s.kamar.nomor_kamar} - ${s.kamar.nama_kamar ?? ''}` : '-';
    const alamat = s.alamat?.nama_alamat || '-';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(s.nama)}</td>
        <td>${escapeHtml(s.kelas)}</td>
        <td>${escapeHtml(kamar)}</td>
        <td>${escapeHtml(alamat)}</td>
        <td>
          <button class="btn-edit" onclick="editSiswa(${s.nomor})">Edit</button>
          <button class="btn-danger" onclick="hapusSiswa(${s.nomor})">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// RENDER: DROPDOWN OPTIONS
// ============================================
function renderKamarOptions() {
  const options = state.kamarList
    .map(k => `<option value="${k.id}">${escapeHtml(k.nomor_kamar)} - ${escapeHtml(k.nama_kamar || '')}</option>`)
    .join('');

  const selSiswa = document.getElementById('kamar_id');
  const selFilter = document.getElementById('filter-kamar');

  const v1 = selSiswa.value, v2 = selFilter.value;
  selSiswa.innerHTML = `<option value="">-- Pilih Kamar --</option>` + options;
  selFilter.innerHTML = `<option value="">Semua Kamar</option>` + options;
  selSiswa.value = v1;
  selFilter.value = v2;
}

function renderAlamatOptions() {
  const options = state.alamatList
    .map(a => `<option value="${a.id}">${escapeHtml(a.nama_alamat || '-')}</option>`)
    .join('');

  const selSiswa = document.getElementById('alamat_id');
  const selFilter = document.getElementById('filter-alamat');

  const v1 = selSiswa.value, v2 = selFilter.value;
  selSiswa.innerHTML = `<option value="">-- Pilih Alamat --</option>` + options;
  selFilter.innerHTML = `<option value="">Semua Alamat</option>` + options;
  selSiswa.value = v1;
  selFilter.value = v2;
}

// ============================================
// CRUD: KAMAR
// ============================================
document.getElementById('form-kamar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nomor_kamar: document.getElementById('nomor_kamar').value.trim(),
    nama_kamar: document.getElementById('nama_kamar').value.trim(),
    kapasitas: parseInt(document.getElementById('kapasitas').value, 10),
  };

  let error;
  if (state.editingKamarId) {
    ({ error } = await db.from('kamar').update(payload).eq('id', state.editingKamarId));
  } else {
    ({ error } = await db.from('kamar').insert(payload));
  }

  if (error) { toast('Gagal: ' + error.message, true); return; }
  toast(state.editingKamarId ? 'Kamar diperbarui' : 'Kamar ditambahkan');
  resetFormKamar();
  await loadKamar();
  await loadSiswa();
});

function editKamar(id) {
  const k = state.kamarList.find(x => x.id === id);
  if (!k) return;
  document.getElementById('nomor_kamar').value = k.nomor_kamar;
  document.getElementById('nama_kamar').value = k.nama_kamar || '';
  document.getElementById('kapasitas').value = k.kapasitas;
  state.editingKamarId = id;
  document.getElementById('title-form-kamar').textContent = '✏️ Edit Kamar';
  document.getElementById('btn-submit-kamar').textContent = 'Update';
  document.getElementById('btn-cancel-kamar').style.display = 'block';
  document.getElementById('nomor_kamar').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormKamar() {
  document.getElementById('form-kamar').reset();
  document.getElementById('kapasitas').value = 4;
  state.editingKamarId = null;
  document.getElementById('title-form-kamar').textContent = '➕ Tambah Kamar';
  document.getElementById('btn-submit-kamar').textContent = 'Simpan';
  document.getElementById('btn-cancel-kamar').style.display = 'none';
}

document.getElementById('btn-cancel-kamar').addEventListener('click', resetFormKamar);

async function hapusKamar(id) {
  if (!confirm('Yakin hapus kamar ini? Siswa akan kehilangan relasi kamar.')) return;
  const { error } = await db.from('kamar').delete().eq('id', id);
  if (error) { toast('Gagal hapus: ' + error.message, true); return; }
  toast('Kamar dihapus');
  await loadKamar();
  await loadSiswa();
}

// ============================================
// CRUD: ALAMAT
// ============================================
document.getElementById('form-alamat').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    nama_alamat: document.getElementById('nama_alamat').value.trim(),
  };

  let error;
  if (state.editingAlamatId) {
    ({ error } = await db.from('alamat').update(payload).eq('id', state.editingAlamatId));
  } else {
    ({ error } = await db.from('alamat').insert(payload));
  }

  if (error) { toast('Gagal: ' + error.message, true); return; }
  toast(state.editingAlamatId ? 'Alamat diperbarui' : 'Alamat ditambahkan');
  resetFormAlamat();
  await loadAlamat();
  await loadSiswa();
});

function editAlamat(id) {
  const a = state.alamatList.find(x => x.id === id);
  if (!a) return;
  document.getElementById('nama_alamat').value = a.nama_alamat || '';
  state.editingAlamatId = id;
  document.getElementById('title-form-alamat').textContent = '✏️ Edit Alamat';
  document.getElementById('btn-submit-alamat').textContent = 'Update';
  document.getElementById('btn-cancel-alamat').style.display = 'block';
  document.getElementById('nama_alamat').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormAlamat() {
  document.getElementById('form-alamat').reset();
  state.editingAlamatId = null;
  document.getElementById('title-form-alamat').textContent = '➕ Tambah Alamat';
  document.getElementById('btn-submit-alamat').textContent = 'Simpan';
  document.getElementById('btn-cancel-alamat').style.display = 'none';
}

document.getElementById('btn-cancel-alamat').addEventListener('click', resetFormAlamat);

async function hapusAlamat(id) {
  if (!confirm('Yakin hapus alamat ini? Siswa akan kehilangan relasi alamat.')) return;
  const { error } = await db.from('alamat').delete().eq('id', id);
  if (error) { toast('Gagal hapus: ' + error.message, true); return; }
  toast('Alamat dihapus');
  await loadAlamat();
  await loadSiswa();
}

// ============================================
// CRUD: SISWA
// ============================================
document.getElementById('form-siswa').addEventListener('submit', async (e) => {
  e.preventDefault();
  const kamarVal = document.getElementById('kamar_id').value;
  const alamatVal = document.getElementById('alamat_id').value;

  const payload = {
    nama: document.getElementById('nama').value.trim(),
    kelas: document.getElementById('kelas').value.trim(),
    kamar_id: kamarVal ? parseInt(kamarVal, 10) : null,
    alamat_id: alamatVal ? parseInt(alamatVal, 10) : null,
  };

  let error;
  if (state.editingSiswaId) {
    ({ error } = await db.from('siswa').update(payload).eq('nomor', state.editingSiswaId));
  } else {
    ({ error } = await db.from('siswa').insert(payload));
  }

  if (error) { toast('Gagal: ' + error.message, true); return; }
  toast(state.editingSiswaId ? 'Siswa diperbarui' : 'Siswa ditambahkan');
  resetFormSiswa();
  await loadSiswa();
  await loadKamar();
  await loadAlamat();
});

function editSiswa(nomor) {
  const s = state.siswaList.find(x => x.nomor === nomor);
  if (!s) return;
  document.getElementById('nama').value = s.nama;
  document.getElementById('kelas').value = s.kelas;
  document.getElementById('kamar_id').value = s.kamar_id || '';
  document.getElementById('alamat_id').value = s.alamat_id || '';
  state.editingSiswaId = nomor;
  document.getElementById('title-form-siswa').textContent = '✏️ Edit Siswa';
  document.getElementById('btn-submit-siswa').textContent = 'Update';
  document.getElementById('btn-cancel-siswa').style.display = 'block';
  document.getElementById('nama').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormSiswa() {
  document.getElementById('form-siswa').reset();
  state.editingSiswaId = null;
  document.getElementById('title-form-siswa').textContent = '➕ Tambah Siswa';
  document.getElementById('btn-submit-siswa').textContent = 'Simpan';
  document.getElementById('btn-cancel-siswa').style.display = 'none';
}

document.getElementById('btn-cancel-siswa').addEventListener('click', resetFormSiswa);

async function hapusSiswa(nomor) {
  if (!confirm('Yakin hapus siswa ini?')) return;
  const { error } = await db.from('siswa').delete().eq('nomor', nomor);
  if (error) { toast('Gagal hapus: ' + error.message, true); return; }
  toast('Siswa dihapus');
  await loadSiswa();
  await loadKamar();
  await loadAlamat();
}
// ============================================
// STORAGE: UPLOAD & DELETE FOTO
// ============================================
async function uploadFoto(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `siswa/${filename}`;

  const { error } = await db.storage
    .from('foto-siswa')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = db.storage.from('foto-siswa').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

async function hapusFotoStorage(path) {
  if (!path) return;
  await db.storage.from('foto-siswa').remove([path]);
}

// ============================================
// FILTER EVENT
// ============================================
document.getElementById('search').addEventListener('input', renderSiswa);
document.getElementById('filter-kamar').addEventListener('change', renderSiswa);
document.getElementById('filter-alamat').addEventListener('change', renderSiswa);

// ============================================
// EXPOSE FUNCTION KE WINDOW (untuk onclick)
// ============================================
window.editKamar = editKamar;
window.hapusKamar = hapusKamar;
window.editAlamat = editAlamat;
window.hapusAlamat = hapusAlamat;
window.editSiswa = editSiswa;
window.hapusSiswa = hapusSiswa;

// ============================================
// INIT
// ============================================
(async function init() {
  await loadKamar();
  await loadAlamat();
  await loadSiswa();
})();
