// routes/bottles.js — CRUD for the inventory, scoped to the logged-in user.
// requireAuth (mounted in server.js) guarantees req.userId is set before
// any of these handlers run.
import express from "express";
import { pool } from "../db.js";

export const bottlesRouter = express.Router();

function rowToBottle(row) {
  return {
    id: row.id,
    producer: row.producer,
    wineName: row.wine_name,
    vintage: row.vintage,
    varietal: row.varietal,
    region: row.region,
    natural: row.natural,
    tastingNotes: row.tasting_notes,
    priceRange: row.price_range,
    instagramHandle: row.instagram_handle,
    quantity: row.quantity,
    status: row.status,
    rating: row.rating,
    ratingNotes: row.rating_notes,
    dateAdded: row.date_added,
  };
}

// GET /api/bottles — only this user's bottles
bottlesRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM bottles WHERE user_id = $1 ORDER BY date_added DESC",
      [req.userId]
    );
    res.json(result.rows.map(rowToBottle));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load bottles." });
  }
});

// POST /api/bottles — add a new bottle for this user
bottlesRouter.post("/", async (req, res) => {
  const b = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bottles
        (user_id, producer, wine_name, vintage, varietal, region, natural, tasting_notes, price_range, instagram_handle, quantity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.userId,
        b.producer || "", b.wineName || "", b.vintage || "", b.varietal || "", b.region || "",
        !!b.natural, b.tastingNotes || "", b.priceRange || "", b.instagramHandle || "",
        b.quantity || 1, b.status || "in-cellar",
      ]
    );
    res.status(201).json(rowToBottle(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save that bottle." });
  }
});

// PATCH /api/bottles/:id — update any subset of fields (only if it's yours)
bottlesRouter.patch("/:id", async (req, res) => {
  const fieldMap = {
    producer: "producer", wineName: "wine_name", vintage: "vintage", varietal: "varietal",
    region: "region", natural: "natural", tastingNotes: "tasting_notes", priceRange: "price_range",
    instagramHandle: "instagram_handle", quantity: "quantity", status: "status",
    rating: "rating", ratingNotes: "rating_notes",
  };
  const updates = [];
  const values = [];
  let i = 1;
  for (const [key, column] of Object.entries(fieldMap)) {
    if (key in req.body) {
      updates.push(`${column} = $${i}`);
      values.push(req.body[key]);
      i++;
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: "No fields to update." });
  values.push(req.params.id, req.userId);
  try {
    const result = await pool.query(
      `UPDATE bottles SET ${updates.join(", ")} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Bottle not found." });
    res.json(rowToBottle(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update that bottle." });
  }
});

// DELETE /api/bottles/:id — only if it's yours
bottlesRouter.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM bottles WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Bottle not found." });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not remove that bottle." });
  }
});
