# Cellar — a natural-wine inventory app

Two parts, deployed separately:
- **backend/** — Node/Express server. Holds your Anthropic API key and talks to a Postgres database. Deploys to Railway.
- **frontend/** — React app (Vite). What you actually see and tap. Deploys to Vercel.

Follow these steps in order. Every step assumes you're starting from zero — take them one at a time.

## 1. Get the code onto GitHub

1. Go to github.com and create a new empty repository, e.g. `wine-cellar`.
2. On your computer, open a terminal in this folder (the one with this README) and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/wine-cellar.git
   git push -u origin main
   ```

## 2. Get an Anthropic API key

1. Go to console.anthropic.com and sign in (or create an account).
2. Go to **Billing** and add credits ($5 minimum is enough to start).
3. Go to **API Keys** and create a new key. Copy it somewhere safe — you'll paste it into Railway in step 3.

## 3. Deploy the backend to Railway

1. Go to railway.app and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo**, and pick your `wine-cellar` repo.
3. Railway will try to build the whole repo. Tell it to only look at the backend:
   - Open the new service's **Settings** tab.
   - Under **Root Directory**, enter `backend`.
4. Add a database: in your project, click **+ New → Database → Add PostgreSQL**. Railway automatically creates a `DATABASE_URL` variable and makes it available to your backend service — you don't need to copy anything.
5. Add your API key and a login secret: open the backend service's **Variables** tab and add:
   - `ANTHROPIC_API_KEY` = the key you copied in step 2.
   - `JWT_SECRET` = any long random string — this is what signs people's login sessions. You can generate one by running this on your own computer: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and pasting the result.
6. Railway will redeploy automatically. Once it's live, open the service's **Settings → Networking** and click **Generate Domain**. Copy that URL (something like `wine-cellar-backend-production.up.railway.app`) — you'll need it in step 4.
7. Visit that URL in your browser. You should see: `Wine cellar backend is running.`

## 4. Deploy the frontend to Vercel

1. Go to vercel.com and sign in with GitHub.
2. Click **Add New → Project**, and pick your `wine-cellar` repo.
3. Under **Root Directory**, choose `frontend`.
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = the Railway URL from step 3.6, with `https://` in front (e.g. `https://wine-cellar-backend-production.up.railway.app`)
5. Click **Deploy**.
6. Once it's done, Vercel gives you a URL like `wine-cellar.vercel.app` — open it. That's your app.

## 5. Try it

- Open the Vercel URL and create an account (any email + an 8+ character password — no email verification, this is just to keep people's cellars separate).
- Add a bottle from your phone (open the Vercel URL there — it works like any website).
- Take a photo of a label and tap "Identify this wine."
- Mark a bottle as drunk, rate it, then check the "For You" tab.
- Send the Vercel URL to anyone you want sharing this — each person who signs up gets their own private cellar, invisible to everyone else.

## Local development (optional)

If you want to run it on your own computer before deploying:

**Backend**
```
cd backend
cp .env.example .env      # then fill in ANTHROPIC_API_KEY and DATABASE_URL
npm install
npm start
```
You'll need a Postgres database running locally, or you can point `DATABASE_URL` at your Railway database (find it in Railway's Postgres service → Variables → `DATABASE_URL`).

**Frontend**
```
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:3001
npm install
npm run dev
```

## What each piece does

- `backend/server.js` — starts the server, connects everything
- `backend/db.js` — Postgres connection + creates the `bottles` table on startup
- `backend/claude.js` — the only file that calls the Anthropic API; your key lives only here
- `backend/routes/bottles.js` — add/list/update/delete bottles (scoped to the logged-in user)
- `backend/routes/wineAi.js` — identify a label, look up Instagram, get suggestions
- `backend/routes/auth.js` — signup/login, password hashing
- `backend/middleware/auth.js` — checks the login token on every protected request
- `frontend/src/App.jsx` — the whole UI, including the login/signup screen
- `frontend/src/api.js` — the only file that calls your backend

## Notes

- Each person who signs up gets their own private cellar — bottles are tied to their account and nobody else can see or edit them.
- Passwords are hashed (never stored in plain text) and login sessions last 30 days.
- If "Identify this wine" fails, it's almost always the photo — try closer, better-lit, less glare.
- Instagram handles come back blank for smaller producers with little online presence — that's expected, not a bug.
