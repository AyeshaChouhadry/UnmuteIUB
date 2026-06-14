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
    if (posts.length === 0) {
        adminTbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">No posts available.</td>
            </tr>
        `;
        return;
    }

    adminTbody.innerHTML = posts.map(post => `
        <tr>
            <td>${escapeHTML(post.id)}</td>
            <td class="fw-semibold">${escapeHTML(post.title)}</td>
            <td><span class="badge badge-iub px-2 py-2">${escapeHTML(post.category)}</span></td>
            <td>${escapeHTML(post.author)}</td>
            <td>${escapeHTML(post.date)}</td>
            <td>
                <div class="action-group">
                    <button class="btn btn-sm btn-outline-iub edit-btn" data-id="${escapeHTML(post.id)}">
                        <i class="fas fa-pen me-1"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${escapeHTML(post.id)}">
                        <i class="fas fa-trash me-1"></i>Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ========== STATS ==========
function renderStats(posts) {
    const total = posts.length;
    const categoryCounts = {};

    posts.forEach(post => {
        categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const avgTitleLength = total > 0 ? Math.round(posts.reduce((sum, post) => sum + post.title.length, 0) / total) : 0;
    const latestDate = total > 0 ? posts.map(post => post.date).sort().reverse()[0] : 'N/A';

    statsRow.innerHTML = `
        <div class="col-md-4">
            <div class="stat-card">
                <h3>Total Posts</h3>
                <p>${total}</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card">
                <h3>Top Category</h3>
                <p>${escapeHTML(topCategory)}</p>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card">
                <h3>Latest Date</h3>
                <p>${escapeHTML(latestDate)}</p>
                <small class="text-muted">Average title length: ${avgTitleLength}</small>
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
        showError('Delete failed. Please try again.');
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
        editSection.scrollIntoView({ behavior: 'smooth' });
        hideError();
    } catch (err) {
        showError('Could not load post for editing.');
    }
}

// One listener handles Edit/Delete buttons added by renderTable.
adminTbody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
        loadPostIntoForm(editBtn.getAttribute('data-id'));
    } else if (deleteBtn) {
        deletePost(deleteBtn.getAttribute('data-id'));
    }
});

// ========== UPDATE POST ==========
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editForm.classList.add('was-validated');

    if (!editForm.checkValidity()) return;

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
        showError('Update failed. Please check JSON Server and try again.');
    }
});

cancelEditBtn.addEventListener('click', () => {
    editSection.classList.add('d-none');
    editForm.classList.remove('was-validated');
});

// ========== HELPER FUNCTIONS ==========
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

fetchPosts();
