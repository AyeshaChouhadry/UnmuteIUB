const API_URL = 'http://localhost:3000/posts';

async function getPosts() {
    try{
        const response = await fetch(API_URL);
        if (!response.ok){
            throw new Error(`Server error : ${response.status}`);
        }

       const posts = await response.json();
       console.log('Fetched posts:', posts);
    }
    catch(error){
        console.error('Could not fetch posts :', error.message);
    }
    
}

getPosts();