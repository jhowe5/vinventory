// routes/wineAi.js — the three AI-powered endpoints: identify a label,
// look up a producer's Instagram, and suggest new wines.
import express from "express";
import { callClaude, getResponseText, extractJSON } from "../claude.js";

export const wineAiRouter = express.Router();

// POST /api/identify — { imageBase64, imageMediaType } -> wine details
wineAiRouter.post("/identify", async (req, res) => {
  const { imageBase64, imageMediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "No image provided." });
  try {
    const prompt = `You are a wine expert. Look closely at this photo of a wine bottle label.
Identify the producer/winery, the wine's name or cuvée, the vintage (or "NV" if non-vintage), the grape variety if visible or inferable, and the region/appellation.
Then use web search to learn more about this specific wine: brief tasting notes, whether it is a natural / low-intervention wine, and a typical price range.
Respond with ONLY a JSON object as the very last part of your reply, no markdown fences, in exactly this shape:
{"producer":"","wineName":"","vintage":"","varietal":"","region":"","natural":true,"tastingNotes":"","priceRange":""}
If a field can't be determined, use an empty string.`;
    const blocks = await callClaude({ imageBase64, imageMediaType, textPrompt: prompt, useWebSearch: true });
    const text = getResponseText(blocks);
    const parsed = extractJSON(text);
    if (!parsed) {
      console.error("Could not parse /identify response. Raw text was:\n", text);
      return res.status(502).json({ error: "Could not read that label. Try a clearer photo." });
    }
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Identify request failed." });
  }
});

// POST /api/instagram — { producer, region } -> { instagramHandle }
wineAiRouter.post("/instagram", async (req, res) => {
  const { producer, region } = req.body;
  if (!producer) return res.status(400).json({ error: "No producer name provided." });
  try {
    const prompt = `Search the web for the official Instagram handle of the wine producer/winery "${producer}"${region ? ` (based in ${region})` : ""}.
Only answer if you're confident it's their real account — leave it blank rather than guess.
Respond with ONLY a JSON object, no markdown fences: {"instagramHandle":""} (handle without the @, empty string if not found or not confident).`;
    const blocks = await callClaude({ textPrompt: prompt, useWebSearch: true });
    const text = getResponseText(blocks);
    const parsed = extractJSON(text);
    if (!parsed) console.error("Could not parse /instagram response. Raw text was:\n", text);
    const handle = (parsed && parsed.instagramHandle ? parsed.instagramHandle : "").replace(/^@/, "").trim();
    res.json({ instagramHandle: handle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Instagram lookup failed." });
  }
});

// POST /api/bottle-image — { producer, wineName, vintage } -> { photoUrl }
wineAiRouter.post("/bottle-image", async (req, res) => {
  const { producer, wineName, vintage } = req.body;
  if (!producer && !wineName) return res.status(400).json({ error: "No producer or wine name provided." });
  try {
    const label = [wineName, producer && `by ${producer}`, vintage].filter(Boolean).join(" ");
    const prompt = `Search the web for a product photo of this wine bottle: ${label}.
Check multiple sources before giving up: the producer's own website, wine retailers (Wine-Searcher, Total Wine, K&L Wines, Astor Wines, etc.), and wine databases/apps (Vivino, CellarTracker). Producers often reuse the same bottle photo across vintages, so it's fine if the exact vintage shown differs as long as the producer and wine name match.
Find a URL that will work as an <img> src — a direct image link (ending in jpg/png/webp, or a CDN/product-image URL even without a file extension). A link to a product page that merely contains a photo does not count.
Leave it blank only if you genuinely can't find any usable photo after checking multiple sources — don't give up after just one search.
Respond with ONLY a JSON object, no markdown fences: {"photoUrl":""} (empty string if truly not found).`;
    const blocks = await callClaude({ textPrompt: prompt, useWebSearch: true });
    const text = getResponseText(blocks);
    const parsed = extractJSON(text);
    if (!parsed) console.error("Could not parse /bottle-image response. Raw text was:\n", text);
    const url = parsed && typeof parsed.photoUrl === "string" ? parsed.photoUrl.trim() : "";
    res.json({ photoUrl: /^https?:\/\//i.test(url) ? url : "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Bottle image lookup failed." });
  }
});

// POST /api/suggestions — { likedWines: [{wineName, producer, varietal, region, rating}] } -> suggestions[]
wineAiRouter.post("/suggestions", async (req, res) => {
  const likedWines = req.body.likedWines || [];
  try {
    const likedList = likedWines
      .map((b) => `${b.wineName} by ${b.producer} (${b.varietal || "unknown grape"}, ${b.region || "unknown region"}), rated ${b.rating}/5`)
      .join("; ");
    const prompt = `Here are wines this person rated highly: ${likedList || "no ratings yet — they are just starting to explore natural wine"}.
Use web search to suggest 5 wines they'd likely enjoy. Prioritize natural / low-intervention producers, but you can include a couple of excellent conventional wines too if genuinely similar in style.
Do not write any explanatory text, analysis, or commentary outside the JSON — go straight from searching to the answer.
Respond with ONLY a JSON array, no markdown fences, no prose before or after it, in exactly this shape:
[{"wineName":"","producer":"","region":"","varietal":"","natural":true,"reason":""}]`;
    const blocks = await callClaude({ textPrompt: prompt, useWebSearch: true });
    const text = getResponseText(blocks);
    const parsed = extractJSON(text, { expectArray: true });
    if (!Array.isArray(parsed)) {
      console.error("Could not parse /suggestions response. Raw text was:\n", text);
    }
    res.json(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Suggestions request failed." });
  }
});
