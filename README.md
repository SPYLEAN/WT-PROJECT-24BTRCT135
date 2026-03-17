# Startup Idea Validator Dashboard (Full Stack)

This is a complete full-stack web application designed for startup ideation, validation, and analytics. It features a complete SQLite + Node/Express backend natively synced to a Glassmorphism Vanilla JS frontend.

## 🚀 Setup & Run Instructions

**1. Install Dependencies**
Open your terminal in the root folder (`c:\Users\tanvi\OneDrive\Documents\blind date`) and run:
```bash
npm install
```
This installs `express`, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`, `cors`, and `dotenv`.

**2. Start the Server**
Run the following command to start your Node.js backend:
```bash
npm start
```
The server will run on `http://localhost:3000`. 
*(Note: A `.env` file is already generated with the JWT_SECRET and PORT variables).*

**3. Open the App**
Open the `index.html` file in your web browser. Now, the dashboard is fully communicating with the live backend!

## 🗄️ Database Design (SQLite)
Powered by `better-sqlite3`, requiring zero external installation. The `database.db` file auto-generates on first run.

- **`users` Table:**
    - `id` (PK)
    - `username` (Unique)
    - `email` (Unique)
    - `password` (Bcrypt Hashed)

- **`ideas` Table:**
    - Metadata: `id` (PK), `user_id` (FK), `title`, `description`, `problem_statement`, `tags`, `category`
    - Scoring: `difficulty_score`, `market_potential`, `upvotes` (default 0)
    - Analytics: `view_count` (increments on view), `popularity_score` (dynamically calculated on creation and upvotes)
    - System: `visibility` (active/hidden/archived), `expiry_duration`, `expires_at`, `created_at`, `updated_at`

## 🔐 Auth API Endpoints
- `POST /api/auth/register`: Create a new user. Expects `username`, `email`, `password`.
- `POST /api/auth/login`: Authenticate standard username and token creation. Expects `email`, `password`.
- `POST /api/auth/logout`: End session (mostly handled Client-Side through JWT removal).

## 💡 Ideas CRUD Endpoints
- `GET /api/ideas`: (Public) Fetch all active, non-expired ideas.
- `GET /api/ideas/trending`: (Public) Fetch top 10 ideas sorted exclusively by Popularity Score.
- `GET /api/ideas/archived`: (Public) Fetch all expired ideas.
- `GET /api/ideas/my`: (Protected) Fetch all ideas associated with the JWT's User ID.
- `GET /api/ideas/:id`: (Public) Fetch single idea and auto-increment its `view_count`.
- `POST /api/ideas`: (Protected) Create new idea. Auto-calculates `expires_at` logic based on sent `expiry_duration`.
- `PUT /api/ideas/:id`: (Protected Owner-Only) Edit an idea.
- `DELETE /api/ideas/:id`: (Protected Owner-Only) Permanently purge an idea.
- `PATCH /api/ideas/:id/visibility`: (Protected Owner-Only) Flips visibility flag for soft-hiding.
- `POST /api/ideas/:id/upvote`: (Protected) Increment upvote count by 1 and bump Popularity Score.

## ⏰ Background Jobs
The Node.js server executes a routine `setInterval` function every 5 minutes enforcing real-time Expiry validation. If an idea passes its calculated `expires_at` timestamp, its visibility is permanently converted to `archived`, filtering it appropriately onto the Archives view.
