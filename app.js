const API = 'http://localhost:3000/posts';

// DOM elements
const postList = document.getElementById('postList');
const filterCategory = document.getElementById('filterCategory');
const searchInput = document.getElementById('searchInput');
const sortPosts = document.getElementById('sortPosts');
const resultCount = document.getElementById('resultCount');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const createPostForm = document.getElementById('createPostForm');

// Inputs
const authorInput = document.getElementById('author');
const categoryInput = document.getElementById('category');
const titleInput = document.getElementById('title');
const bodyInput = document.getElementById('body');
const dateInput = document.getElementById('date');

let currentCategory = '';
let currentSearch = '';
let currentPosts = [];

// ========== FETCH & RENDER ==========
async function fetchPosts(category = '') {
    try {
        showLoading(true);
        let url = API;

        if (category) {
            const params = new URLSearchParams({ category });
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        currentPosts = await response.json();
        renderPosts(getVisiblePosts());
        hideError();
    } catch (err) {
        showError('Failed to load posts. Is JSON Server running?');
    } finally {
        showLoading(false);
    }
}

function getVisiblePosts() {
    const searchText = currentSearch.toLowerCase();
    let posts = [...currentPosts];

    if (searchText) {
        posts = posts.filter(post => {
            const combinedText = `${post.title} ${post.body} ${post.author} ${post.category}`.toLowerCase();
            return combinedText.includes(searchText);
        });
    }

    if (sortPosts.value === 'oldest') {
        posts.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortPosts.value === 'title') {
        posts.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return posts;
}

function renderPosts(posts) {
    updateResultCount(posts.length);

    if (posts.length === 0) {
        postList.innerHTML = `
            <div class="col">
                <div class="empty-state">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p class="mb-0">No posts found. Try another category or search word.</p>
                </div>
            </div>
        `;
        return;
    }

    postList.innerHTML = posts.map(post => `
        <div class="col">
            <article class="card post-card h-100">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span class="badge badge-iub px-3 py-2">${escapeHTML(post.category)}</span>
                        <small class="post-meta">${escapeHTML(post.date)}</small>
                    </div>
                    <h3 class="h5 fw-bold mb-2">${escapeHTML(post.title)}</h3>
                    <p class="card-text mb-3">${escapeHTML(post.body)}</p>
                    <p class="post-meta mb-0">
                        <i class="fas fa-user me-1"></i>${escapeHTML(post.author)}
                    </p>
                </div>
            </article>
        </div>
    `).join('');
}

function updateResultCount(total) {
    resultCount.textContent = total === 1 ? '1 post' : `${total} posts`;
}

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

// ========== FILTER, SEARCH & SORT ==========
filterCategory.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    fetchPosts(currentCategory);
});

searchInput.addEventListener('input', debounce((e) => {
    currentSearch = e.target.value.trim();
    renderPosts(getVisiblePosts());
}, 300));

sortPosts.addEventListener('change', () => {
    renderPosts(getVisiblePosts());
});

function debounce(callback, delay) {
    let timerId;
    return function (...args) {
        clearTimeout(timerId);
        timerId = setTimeout(() => callback(...args), delay);
    };
}

// ========== CREATE POST ==========
createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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

        createPostForm.reset();
        createPostForm.classList.remove('was-validated');
        await fetchPosts(currentCategory);
    } catch (err) {
        showError('Could not create post. Please check JSON Server and try again.');
    }
});

// ========== SPLASH SCREEN & SCROLL ==========
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        const app = document.getElementById('app');

        if (splash && app) {
            splash.classList.add('hidden');
            app.style.display = 'block';
        }
    }, 900);
});

function scrollToCreateForm() {
    const createSection = document.getElementById('createSection');
    if (createSection) {
        createSection.scrollIntoView({ behavior: 'smooth' });
    }
}

const scrollBtn = document.getElementById('scrollToForm');
const mobileCreateBtn = document.getElementById('mobileCreateBtn');

if (scrollBtn) scrollBtn.addEventListener('click', scrollToCreateForm);
if (mobileCreateBtn) mobileCreateBtn.addEventListener('click', scrollToCreateForm);

// Initial load
fetchPosts();
