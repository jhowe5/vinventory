// server.js — the entry point. Wires up Express, connects to the
// database, and mounts the routes.
import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { bottlesRouter } from "./routes/bottles.js";
import { wineAiRouter } from "./routes/wineAi.js";
import { requireAuth } from "./middleware/auth.js";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set. Set it to a long random string before going live.");
}

const app = express();

app.use(cors()); // allows your Vercel frontend to call this backend
app.use(express.json({ limit: "15mb" })); // photos as base64 can be a few MB

app.get("/", (req, res) => res.send("Wine cellar backend is running."));

// Signup/login are public. Everything else requires a valid token,
// so a random visitor can't rack up API charges on your key or see
// someone else's bottles.
app.use("/api/auth", authRouter);
app.use("/api/bottles", requireAuth, bottlesRouter);
app.use("/api", requireAuth, wineAiRouter);

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to set up the database:", err);
    process.exit(1);
  });
