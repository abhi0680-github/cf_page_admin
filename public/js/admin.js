// admin.js - simplified admin logic with client-side thumbnail
async function api(path, opts = {}) {
  const res = await fetch(path, Object.assign({ credentials: 'include' }, opts));
  if (!res.ok) {
    if (res.status === 401) { window.location.href = '/login.html'; throw new Error('unauthorized'); }
    const txt = await res.text().catch(()=>null);
    throw new Error(txt || 'api error');
  }
  return res;
}
async function loadArtworks() {
  try {
    const res = await api('/api/artworks');
    const data = await res.json();
    const tbody = document.querySelector('#artTable tbody');
    tbody.innerHTML = '';
    (data.items || []).forEach(art => {
      const tr = document.createElement('tr');
      const thumbUrl = art.thumbnail_path ? `/api/public-image?key=${encodeURIComponent(art.thumbnail_path)}` : (art.image_path ? `/api/public-image?key=${encodeURIComponent(art.image_path)}` : '');
      tr.innerHTML = `
        <td>${thumbUrl ? `<img src="${thumbUrl}" width="160">` : ''}</td>
        <td>${escapeHtml(art.title || '')}</td>
        <td>${escapeHtml(art.status || '')}</td>
        <td>${(art.price_cents ? (art.price_cents/100).toFixed(2) : '')}</td>
        <td>
          <button class="edit" data-id="${art.id}">Edit</button>
          <button class="del" data-id="${art.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    document.querySelectorAll('button.del').forEach(b => b.onclick = onDelete);
    document.querySelectorAll('button.edit').forEach(b => b.onclick = onEdit);
  } catch (e) { console.error(e); }
}
function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
const modal = document.getElementById('modal');
document.getElementById('addBtn').onclick = () => openModal();
document.getElementById('cancelBtn').onclick = () => modal.style.display = 'none';
document.getElementById('logoutBtn').onclick = async () => { await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); location.href = '/login.html'; };
function openModal(edit = null) {
  modal.style.display = 'flex';
  document.getElementById('modalTitle').textContent = edit ? 'Edit Artwork' : 'New Artwork';
  const form = document.getElementById('artForm');
  form.dataset.editId = edit ? edit.id : '';
  if (edit) { form.title.value = edit.title || ''; form.description.value = edit.description || ''; form.price_cents.value = edit.price_cents || ''; }
  else form.reset();
}
async function onDelete(e) {
  const id = e.currentTarget.dataset.id;
  if (!confirm('Delete artwork?')) return;
  const res = await fetch(`/api/artworks/${id}`, { method:'DELETE', credentials:'include' });
  if (res.ok) loadArtworks(); else alert('Delete failed');
}
document.getElementById('artForm').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData();
  fd.append('title', form.title.value);
  fd.append('description', form.description.value);
  fd.append('price_cents', form.price_cents.value);
  const fileInput = form.image;
  if (!fileInput.files || fileInput.files.length === 0) { alert('Select image'); return; }
  const file = fileInput.files[0];
  fd.append('image', file, file.name);
  try { const thumbBlob = await makeThumbnail(file, 800, 600); fd.append('thumbnail', thumbBlob, 'thumbnail.webp'); } catch (err) { console.warn('thumbnail failed', err); }
  document.querySelector('.modal-actions .primary').disabled = true;
  const res = await fetch('/api/artworks', { method:'POST', body: fd, credentials:'include' });
  document.querySelector('.modal-actions .primary').disabled = false;
  if (res.ok) { modal.style.display = 'none'; loadArtworks(); } else alert('Save failed');
};
function makeThumbnail(file, maxW = 800, maxH = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      const w = Math.round(width * ratio);
      const h = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); }, 'image/webp', 0.8);
    };
    img.onerror = e => reject(e);
    const fr = new FileReader();
    fr.onload = () => { img.src = fr.result; };
    fr.onerror = () => reject(new Error('file read error'));
    fr.readAsDataURL(file);
  });
}
loadArtworks();
