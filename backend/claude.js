// claude.js — one place that knows how to talk to the Anthropic API.
// The API key lives only here, on the server. The frontend never sees it.

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
// This is a real, currently-available model. If Anthropic releases a
// newer one later, you can swap the string here — nowhere else needs to change.
const MODEL = "claude-sonnet-5";

export async function callClaude({ imageBase64, imageMediaType, textPrompt, useWebSearch }) {
  const userContent = [];
  if (imageBase64) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    });
  }
  userContent.push({ type: "text", text: textPrompt });

  const body = {
    model: MODEL,
    // Generous budget: with web search running, the model can burn a good
    // chunk of tokens on search calls before it ever writes the final
    // answer. Too small a budget here silently truncates that answer.
    max_tokens: 8192,
    messages: [{ role: "user", content: userContent }],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (data.stop_reason && data.stop_reason !== "end_turn") {
    console.warn(`Claude response stopped early (${data.stop_reason}) — answer may be truncated.`);
  }
  return data.content || [];
}

// Combines all "text" content blocks into one string.
export function getResponseText(contentBlocks) {
  return contentBlocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// Pulls JSON out of a block of text, preferring the LAST { } or [ ] pair
// (the final answer usually comes after any reasoning/search summary text).
// Pass expectArray for endpoints whose answer is a JSON array — otherwise
// the object-matching attempts (tried first) can grab just the last
// element of the array, since that's valid JSON all on its own.
export function extractJSON(rawText, { expectArray = false } = {}) {
  const text = rawText.replace(/```json/g, "").replace(/```/g, "");

  function tryRange(openChar, closeChar, useFirst) {
    const s = useFirst ? text.indexOf(openChar) : text.lastIndexOf(openChar);
    const e = text.lastIndexOf(closeChar);
    if (s === -1 || e === -1 || e < s) return null;
    try {
      return JSON.parse(text.slice(s, e + 1));
    } catch {
      return null;
    }
  }

  const objectAttempts = [() => tryRange("{", "}", false), () => tryRange("{", "}", true)];
  const arrayAttempts = [() => tryRange("[", "]", false), () => tryRange("[", "]", true)];
  const attempts = expectArray ? [...arrayAttempts, ...objectAttempts] : [...objectAttempts, ...arrayAttempts];

  for (const attempt of attempts) {
    const result = attempt();
    if (result !== null) return result;
  }
  return null;
}
