const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM elements
const splashScreen = document.getElementById('splash-screen');
const authPage = document.getElementById('auth-page');
const appMain = document.getElementById('app');
const dynamicContent = document.getElementById('dynamic-content');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authTitle = document.getElementById('auth-title');
const usernameField = document.getElementById('username-field');
const regUsername = document.getElementById('reg-username');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const switchToRegister = document.getElementById('switch-to-register');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const adminLinks = document.getElementById('admin-links');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.querySelectorAll('.nav-link');
const createPostBtn = document.getElementById('create-post-btn');
const createPostModal = document.getElementById('create-post-modal');
const closeModalBtn = document.getElementById('close-modal');
const createPostForm = document.getElementById('create-post-form');
const postCategory = document.getElementById('post-category');
const postTitle = document.getElementById('post-title');
const postBody = document.getElementById('post-body');

// Right sidebar lists
const trendingCategoriesList = document.getElementById('trending-categories-list');
const topPostsList = document.getElementById('top-posts-list');

let isRegistering = false;
let savedPostIds = new Set();

// ====== SPLASH ======
window.addEventListener('load', () => {
  setTimeout(() => {
    splashScreen.classList.add('hidden');
    splashScreen.addEventListener('transitionend', () => {
      splashScreen.style.display = 'none';
      checkAuthState();
    });
  }, 2200);
});

// ====== AUTH CHECK ======
function checkAuthState() {
  if (authToken) {
    fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthPage();
      } else {
        currentUser = data.user;
        showMainApp();
      }
    })
    .catch(() => showAuthPage());
  } else {
    showAuthPage();
  }
}

function showAuthPage() {
  authPage.style.display = 'flex';
  appMain.style.display = 'none';
}

function showMainApp() {
  authPage.style.display = 'none';
  appMain.style.display = 'flex';
  updateSidebarUserInfo();
  loadPage('home');
  loadRightSidebar();
}

function updateSidebarUserInfo() {
  if (!currentUser) return;
  userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
  userName.textContent = currentUser.username;
  userRole.textContent = currentUser.role;
  if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
    adminLinks.style.display = 'block';
  } else {
    adminLinks.style.display = 'none';
  }
}

// ====== LOGIN/REGISTER TOGGLE ======
switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  isRegistering = !isRegistering;
  if (isRegistering) {
    authTitle.textContent = 'Create Account';
    authSubmitBtn.textContent = 'Register';
    usernameField.style.display = 'block';
    toggleAuthMode.innerHTML = `Already have an account? <a href="#" id="switch-to-login">Login</a>`;
  } else {
    authTitle.textContent = 'Login to Unmute IUB';
    authSubmitBtn.textContent = 'Login';
    usernameField.style.display = 'none';
    toggleAuthMode.innerHTML = `Don't have an account? <a href="#" id="switch-to-register">Register</a>`;
  }
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'switch-to-login') {
    e.preventDefault();
    isRegistering = false;
    authTitle.textContent = 'Login to Unmute IUB';
    authSubmitBtn.textContent = 'Login';
    usernameField.style.display = 'none';
    toggleAuthMode.innerHTML = `Don't have an account? <a href="#" id="switch-to-register">Register</a>`;
  }
});

// Auth submit
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) return alert('Please fill all fields');

  if (isRegistering) {
    const username = regUsername.value.trim();
    if (!username) return alert('Username required');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (data.error) return alert(data.error);
      handleAuthSuccess(data);
    } catch (err) { alert('Registration failed'); }
  } else {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) return alert(data.error);
      handleAuthSuccess(data);
    } catch (err) { alert('Login failed'); }
  }
});

function handleAuthSuccess(data) {
  authToken = data.token;
  localStorage.setItem('authToken', authToken);
  currentUser = data.user;
  authForm.reset();
  showMainApp();
}

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  savedPostIds.clear();
  showAuthPage();
});

// ====== NAVIGATION ======
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    loadPage(link.dataset.page);
  });
});

async function loadPage(page) {
  dynamicContent.innerHTML = '<p>Loading...</p>';
  switch(page) {
    case 'home': await loadFeed('home'); break;
    case 'trending': await loadFeed('trending'); break;
    case 'saved': await loadFeed('saved'); break;
    case 'profile': dynamicContent.innerHTML = `<h2>👤 Profile</h2><p>Welcome, ${currentUser?.username}!</p>`; break;
    case 'dashboard': await loadAdminDashboard(); break;
    case 'reported': dynamicContent.innerHTML = '<h2>🚩 Reported Posts</h2><p>No reports to show.</p>'; break;
    case 'users': await loadUserManagement(); break;
    default: dynamicContent.innerHTML = '<h2>Page not found</h2>';
  }
}

// ====== LOAD FEED (home/trending/saved) ======
async function loadFeed(type) {
  let url = `${API_BASE}/posts`;
  if (type === 'trending') url = `${API_BASE}/posts/trending`;
  else if (type === 'saved') url = `${API_BASE}/posts/saved`;

  const headers = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const res = await fetch(url, { headers });
    const posts = await res.json();
    if (posts.error) return dynamicContent.innerHTML = '<p>Error loading posts.</p>';

    // Build saved set for current user
    if (authToken && currentUser) {
      await refreshSavedSet();
    }

    let html = `<h2>${type === 'trending' ? '🔥 Trending' : type === 'saved' ? '🔖 Saved' : '📰 Latest'} Posts</h2>`;
    if (posts.length === 0) {
      html += '<p>No posts to show.</p>';
      dynamicContent.innerHTML = html;
      return;
    }

    posts.forEach(post => {
      const isSaved = savedPostIds.has(post.id);
      html += `
        <article class="post-card" data-post-id="${post.id}">
          <div class="post-header">
            <span class="post-author">${post.author_name}</span>
            <span class="post-category">${post.category}</span>
            <span>${new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <h3 class="post-title">${post.title || ''}</h3>
          <p class="post-body">${post.body}</p>
          <div class="post-actions">
            <button class="btn-vote up"><i class="far fa-thumbs-up"></i> ${post.upvotes || 0}</button>
            <button class="btn-vote down"><i class="far fa-thumbs-down"></i> ${post.downvotes || 0}</button>
            <span class="comment-toggle"><i class="far fa-comment"></i> ${post.comments_count || 0}</span>
            <button class="btn-save ${isSaved ? 'saved' : ''}"><i class="far fa-bookmark"></i></button>
          </div>
          <div class="comments-section" style="display:none;"></div>
        </article>
      `;
    });
    dynamicContent.innerHTML = html;
    attachPostEvents();
  } catch (err) {
    dynamicContent.innerHTML = '<p>Failed to load posts.</p>';
  }
}

// Refresh saved set
async function refreshSavedSet() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API_BASE}/posts/saved`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const savedPosts = await res.json();
    if (!savedPosts.error) {
      savedPostIds = new Set(savedPosts.map(p => p.id));
    }
  } catch (e) {}
}

// ====== ATTACH POST EVENTS (vote, save, comment) ======
function attachPostEvents() {
  document.querySelectorAll('.btn-vote').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!authToken) return alert('Login to vote');
      const postId = btn.closest('.post-card').dataset.postId;
      const voteType = btn.classList.contains('up') ? 'up' : 'down';
      try {
        const res = await fetch(`${API_BASE}/posts/${postId}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ voteType })
        });
        const data = await res.json();
        if (data.error) alert(data.error);
        else {
          // Refresh feed to update counts
          const currentPage = document.querySelector('.nav-link.active').dataset.page;
          loadPage(currentPage);
        }
      } catch (err) { console.error(err); }
    });
  });

  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!authToken) return alert('Login to save posts');
      const postId = btn.closest('.post-card').dataset.postId;
      try {
        const res = await fetch(`${API_BASE}/posts/${postId}/save`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        if (data.saved) {
          btn.classList.add('saved');
          savedPostIds.add(postId);
        } else {
          btn.classList.remove('saved');
          savedPostIds.delete(postId);
        }
      } catch (err) { console.error(err); }
    });
  });

  document.querySelectorAll('.comment-toggle').forEach(toggle => {
    toggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const postCard = toggle.closest('.post-card');
      const postId = postCard.dataset.postId;
      const commentsSection = postCard.querySelector('.comments-section');
      if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';
        await loadComments(postId, commentsSection);
      } else {
        commentsSection.style.display = 'none';
      }
    });
  });
}

// ====== COMMENTS ======
async function loadComments(postId, container) {
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
    const comments = await res.json();
    let html = '<h4>Comments</h4>';
    if (comments.length === 0) html += '<p>No comments yet.</p>';
    comments.forEach(comment => {
      html += `<div class="comment"><strong>${comment.author_name}</strong>: ${comment.body}</div>`;
    });
    html += `
      <div class="comment-form">
        <textarea class="comment-textarea" id="comment-input-${postId}" placeholder="Write a comment..."></textarea>
        <button class="comment-submit" onclick="addComment('${postId}')">Post</button>
      </div>
    `;
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = '<p>Failed to load comments.</p>';
  }
}

window.addComment = async function(postId) {
  if (!authToken) return alert('Login to comment');
  const input = document.getElementById(`comment-input-${postId}`);
  const body = input.value.trim();
  if (!body) return;
  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ body })
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      const commentsSection = document.querySelector(`.post-card[data-post-id="${postId}"] .comments-section`);
      await loadComments(postId, commentsSection);
    }
  } catch (err) { console.error(err); }
};

// ====== CREATE POST MODAL ======
createPostBtn.addEventListener('click', () => {
  if (!authToken) return alert('Login to post');
  createPostModal.classList.add('show');
  postCategory.selectedIndex = 0;
  postTitle.value = '';
  postBody.value = '';
});

closeModalBtn.addEventListener('click', () => createPostModal.classList.remove('show'));
window.addEventListener('click', (e) => {
  if (e.target === createPostModal) createPostModal.classList.remove('show');
});

createPostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = postCategory.value;
  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!category || !body) return alert('Category and content required.');
  try {
    const res = await fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ title: title || undefined, body, category })
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    createPostModal.classList.remove('show');
    loadPage('home');
  } catch (err) { alert('Failed to create post'); }
});

// ====== RIGHT SIDEBAR ======
async function loadRightSidebar() {
  try {
    const [catRes, topRes] = await Promise.all([
      fetch(`${API_BASE}/stats/trending-categories`),
      fetch(`${API_BASE}/stats/top-posts`)
    ]);
    const categories = await catRes.json();
    const topPosts = await topRes.json();

    // Categories
    trendingCategoriesList.innerHTML = '';
    if (categories.length === 0) trendingCategoriesList.innerHTML = '<li>No data</li>';
    else {
      categories.forEach(cat => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#">${cat.category}</a> <span>${cat.count}</span>`;
        trendingCategoriesList.appendChild(li);
      });
    }

    // Top posts
    topPostsList.innerHTML = '';
    if (topPosts.length === 0) topPostsList.innerHTML = '<li>No posts yet</li>';
    else {
      topPosts.forEach(post => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" onclick="goToPost('${post.id}')">${post.title || 'Untitled'}</a> <span>${post.upvotes} 👍</span>`;
        topPostsList.appendChild(li);
      });
    }
  } catch (err) {
    console.error('Right sidebar error:', err);
  }
}

// Helper to navigate to a post (optional)
window.goToPost = function(postId) {
  alert('Post ID: ' + postId);
};

// ====== ADMIN STUFF ======
async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const stats = await res.json();
    if (stats.error) return dynamicContent.innerHTML = `<p>${stats.error}</p>`;
    dynamicContent.innerHTML = `
      <h2>📊 Admin Dashboard</h2>
      <div class="dashboard-grid">
        <div class="dashboard-card"><h3>${stats.totalUsers}</h3><p>Total Users</p></div>
        <div class="dashboard-card"><h3>${stats.totalPosts}</h3><p>Total Posts</p></div>
        <div class="dashboard-card"><h3>${stats.totalComments}</h3><p>Total Comments</p></div>
        <div class="dashboard-card"><h3>${stats.pendingReports || 0}</h3><p>Pending Reports</p></div>
      </div>
    `;
  } catch (err) { dynamicContent.innerHTML = '<p>Failed to load stats.</p>'; }
}

async function loadUserManagement() {
  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const users = await res.json();
    if (users.error) return dynamicContent.innerHTML = `<p>${users.error}</p>`;
    let html = '<h2>👥 Manage Users</h2><ul class="user-list">';
    users.forEach(u => {
      html += `<li>${u.username} (${u.email}) - ${u.role}</li>`;
    });
    html += '</ul>';
    dynamicContent.innerHTML = html;
  } catch (err) { dynamicContent.innerHTML = '<p>Failed to load users.</p>'; }
}