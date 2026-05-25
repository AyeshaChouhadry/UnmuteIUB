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
