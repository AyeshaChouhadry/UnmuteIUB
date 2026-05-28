const API = 'http://localhost:3000/posts';
const adminTbody = document.getElementById('adminTbody');
const statsRow = document.getElementById('statsRow');
const loadingEl = document.getElementById('adminLoading');
const errorEl = document.getElementById('adminError');

// Edit form elements
const editSection = document.getElementById('editSection');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editAuthor = document.getElementById('editAuthor');
const editCategory = document.getElementById('editCategory');
const editTitle = document.getElementById('editTitle');
const editBody = document.getElementById('editBody');
const editDate = document.getElementById('editDate');
const cancelEditBtn = document.getElementById('cancelEdit');

// ========== FETCH & RENDER ==========
async function fetchPosts() {
  try {
    showLoading(true);
    const res = await fetch(API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
    renderTable(posts);
    renderStats(posts);
    hideError();
  } catch (err) {
    showError('Could not load posts. Is JSON Server running?');
  } finally {
    showLoading(false);
  }
}

function renderTable(posts) {
  adminTbody.innerHTML = posts.map(post => `
    <tr>
      <td>${post.id}</td>
      <td>${escapeHTML(post.title)}</td>
      <td><span class="badge bg-warning text-dark">${post.category}</span></td>
      <td>${escapeHTML(post.author)}</td>
      <td>${post.date}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${post.id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${post.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  // Attach event listeners to new buttons
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => loadPostIntoForm(btn.dataset.id))
  );
  document.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deletePost(btn.dataset.id))
  );
}

// ========== STATS ==========
function renderStats(posts) {
  const total = posts.length;
  const categoryCounts = {};
  posts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });
  const mostCommon = Object.entries(categoryCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';
  const avgTitleLength = total > 0 ? Math.round(posts.reduce((sum, p) => sum + p.title.length, 0) / total) : 0;

  statsRow.innerHTML = `
    <div class="col-md-4">
      <div class="card text-white bg-primary p-3">
        <h5>Total Posts</h5>
        <p class="display-6">${total}</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card text-white bg-success p-3">
        <h5>Top Category</h5>
        <p class="display-6">${mostCommon}</p>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card text-white bg-info p-3">
        <h5>Avg Title Length</h5>
        <p class="display-6">${avgTitleLength}</p>
      </div>
    </div>
  `;
}

// ========== DELETE ==========
async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await fetchPosts();
  } catch (err) {
    alert('Delete error');
    console.error(err);
  }
}

// ========== EDIT ==========
async function loadPostIntoForm(id) {
  try {
    const res = await fetch(`${API}/${id}`);
    if (!res.ok) throw new Error('Fetch failed');
    const post = await res.json();
    editId.value = post.id;
    editAuthor.value = post.author;
    editCategory.value = post.category;
    editTitle.value = post.title;
    editBody.value = post.body;
    editDate.value = post.date;
    editSection.classList.remove('d-none');
  } catch (err) {
    alert('Could not load post for editing');
  }
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!editForm.checkValidity()) {
    editForm.classList.add('was-validated');
    return;
  }
  const updatedPost = {
    title: editTitle.value.trim(),
    category: editCategory.value,
    body: editBody.value.trim(),
    author: editAuthor.value.trim(),
    date: editDate.value
  };
  try {
    const res = await fetch(`${API}/${editId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPost)
    });
    if (!res.ok) throw new Error('Update failed');
    editSection.classList.add('d-none');
    editForm.classList.remove('was-validated');
    await fetchPosts();
  } catch (err) {
    alert('Update failed');
  }
});

cancelEditBtn.addEventListener('click', () => {
  editSection.classList.add('d-none');
  editForm.classList.remove('was-validated');
});

// ========== HELPERS ==========
function showLoading(show) {
  loadingEl.classList.toggle('d-none', !show);
}
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove('d-none');
}
function hideError() {
  errorEl.classList.add('d-none');
}
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initial load
fetchPosts();