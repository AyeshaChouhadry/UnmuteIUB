const API = 'http://localhost:3000/posts';

// DOM elements
const postList = document.getElementById("postList");
const filterCategory = document.getElementById("filterCategory");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const createPostForm = document.getElementById("createPostForm");

// Inputs
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const dateInput = document.getElementById("date");

// Current filter value
let currentCategory = "";

// ========== FETCH & RENDER ==========
async function fetchPosts(category = "") {
    try {
        showLoading(true);
        let url = API;
        
        // Use URLSearchParams for clean query string building (Week 8 recommendation)
        if (category) {
            const params = new URLSearchParams({ category });
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const posts = await response.json();
        renderPosts(posts);
        hideError();
    } catch (err) {
        showError('Failed to load posts. Is JSON Server running?');
        console.error(err);
    } finally {
        showLoading(false);
    }
}

function renderPosts(posts) {
    if (posts.length === 0) {
        postList.innerHTML = '<p class="text-muted">No posts found.</p>';
        return;
    }
    postList.innerHTML = posts.map(post => `
        <div class="col">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <span class="badge bg-warning text-dark mb-2">${escapeHTML(post.category)}</span>
                    <h5 class="card-title">${escapeHTML(post.title)}</h5>
                    <p class="card-text">${escapeHTML(post.body)}</p>
                    <footer class="blockquote-footer mt-2">
                        ${escapeHTML(post.author)} &middot; ${post.date}
                    </footer>
                </div>
            </div>
        </div>
    `).join('');
}

// Simple XSS protection
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== LOADING & ERROR STATES ==========
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

// ========== FILTER ==========
filterCategory.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    fetchPosts(currentCategory);
});

// ========== CREATE POST ==========
createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();  // Prevent default form submission

    // Show validation styles
    createPostForm.classList.add('was-validated');

    if (!createPostForm.checkValidity()) return;

    const newPost = {
        title: titleInput.value.trim(),
        category: categoryInput.value.trim(),
        body: bodyInput.value.trim(),
        author: authorInput.value.trim(),
        date: dateInput.value
    };

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
        });

        if (!res.ok) throw new Error('Failed to create post');

        // Clear form and validation
        createPostForm.reset();
        createPostForm.classList.remove('was-validated');

        // Refresh the list with current filter
        await fetchPosts(currentCategory);
    } catch (err) {
        alert('Could not create post. Check console.');
        console.error(err);
    }
});

// Initial load
fetchPosts();

// ========== SPLASH SCREEN & SCROLL ==========
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    if (splash && app) {   // Safety check in case elements are missing
      splash.classList.add('hidden');
      app.style.display = 'block';
    }
  }, 2000);
});

// The scroll button might not exist if user is on admin.html,
// so only attach listener if the element is present.
const scrollBtn = document.getElementById('scrollToForm');
if (scrollBtn) {
  scrollBtn.addEventListener('click', () => {
    const createSection = document.getElementById('createSection');
    if (createSection) {
      createSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}