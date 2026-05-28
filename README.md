# Unmute IUB – Student Knowledge Sharing Platform

**Student Name: Ayesha Chouhadry
**Roll Number: F24BDOCS1M01060

## Description
A simple web app where IUB students can share tips about scholarships, teachers, assignments, and events.  
It consists of:
- **User panel** (`index.html`) – view posts, filter by category, create new posts.
- **Admin panel** (`admin.html`) – manage all posts (edit/delete) with summary statistics.

## Tech Stack
- HTML5, CSS3
- Bootstrap 5 (for responsive layout and components)
- Plain JavaScript 
- JSON Server as mock REST API

## How to Install & Run
1. Install JSON Server globally:  
   `npm install -g json-server`
2. Place all project files in one folder.
3. Open a terminal in that folder and run:  
   `npx json-server --watch db.json`
4. Open `index.html` in a browser (or with Live Server).  
5. To access the admin panel, open `admin.html`.

## Features (from Rubric)
- ✅ Fetch and display posts (GET)
- ✅ Filter posts by category
- ✅ Create new post via form (POST) with 5 input fields + inline validation
- ✅ Admin panel: list all posts, edit (PUT), delete (DELETE) with confirmation
- ✅ Loading spinner & error message when server is down
- ✅ 3 summary statistics on admin page
- ✅ All HTTP methods: GET, POST, PUT, DELETE
- ✅ Async/await + try/catch with response.ok checks
- ✅ Semantic HTML and Bootstrap styling

## Screenshots
