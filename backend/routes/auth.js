// routes/auth.js — signup and login. Passwords are hashed with bcrypt
// before they ever touch the database; we never store or log the raw password.
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const authRouter = express.Router();

function makeToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!isValidEmail(email || "")) return res.status(400).json({ error: "Enter a valid email." });
  if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "An account with that email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    res.status(201).json({ token: makeToken(user.id), email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create account." });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Enter your email and password." });

  try {
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Incorrect email or password." });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect email or password." });

    res.json({ token: makeToken(user.id), email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});
