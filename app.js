const API = 'http://localhost:300/posts';

//DOM elements
const postList = document.getElementById("postList");
const filterCategory = document.getElementById("filterCategory");
const loadingE1 = document.getElementById("loading");
const errorE1 = document.getElementById("error");
const createPostForm = document.getElementById("createPostForm");

//Inputs
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const dateInput = document.getElementById("date");

//Current filter value
let currentCategory = "";

//Fetch & Render
async function fetchPosts(category = ""){
    try{
        showLoading(true);
        let url = API;
        if(category) url += `?category=${encodeURIComponent(category)}`;

        const response = await fetch(url);
        if(!response.ok) {
            throw new Error(`HTTP error ! status:${response.status}`);
        }
        const posts = await response.json();
        hideError();
    }
     catch (err) {
    showError('Failed to load posts. Is JSON Server running?');
    console.error(err);
  } finally {
    showLoading(false);
  }
}


//Render posts function
function renderPosts(posts) {
  if(posts.length == 0){
    postList.innerHTML = '<p class="text-muted">No posts found.</p>';
    return;
  }
  postList.innerHTML = posts.map(post=> `
    <div class="col">
    <div class="card h-100 shadow-sm">  
    <div class="card-body">
    <span class="badge bg-warning text-dark mb-2">${post.category}</span>
    <h5 class="card-title">${escapeHTML(post.title)}</h5>
    <p class="card-text">${escapeHTML(post.body)}</p>
    <footer class="blackquote-footer mt-2">
    ${escapeHTML(post.author)} $middot; ${post.date}
         </footer>
        </div>
       </div>
     </div>
     `).join('');
}

//Simple XSS protection
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ======= Loading /Error ======
function showLoading(show){
  loadingE1.classList.toggle ('d-none', !show);
}
function showError(msg){
  errorE1.textContent = msg;
  errorE1.classList.remove('d-none');
}
function hideError(){
  errorE1.classList.add('d-none');
}

// Filter
filterCategory,addEventListener('change',(e)=> {
  currentCategory = e.target.value;
  fetchPosts(currentCategory);
});

// Create Post
createPostForm.addEventListener('submit' , async (e)=> {
   e.preventDefault();

   //clear previous validation styles
   createPostForm.classList.add('was-validated');

   if (!createPostForm.checkValidity()) retutrn;

   const newPost = {
    title : titleInput.value.trim(),
    category : categoryInput.value.trim(),
    body : bodyInput.value.trim(),
    author : authorInput.value.trim(),
    date : dateInput.value
   };

    try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    });

   if (!reponse.ok) throw new Error('Failed to create post');

   //Clear Form
   createPostForm.reset();
   createPostForm.classList.remove('was-validated');

   //Refresh List
   await fetchPosts(currentCategory);
   }catch (err){
    alert('Could not create post. Check console.');
    console.error(err)
   }
});

//Initial Load
fetchPosts();
