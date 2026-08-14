// api.js — every call to our own backend goes through here.
// The backend URL comes from an env var so it's easy to point at
// localhost while developing and at Railway once deployed.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
  return localStorage.getItem("cellar_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // Token missing/expired — clear it so the app drops back to the login screen.
      localStorage.removeItem("cellar_token");
      localStorage.removeItem("cellar_email");
    }
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  signup: (email, password) => request("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getBottles: () => request("/api/bottles"),
  addBottle: (bottle) => request("/api/bottles", { method: "POST", body: JSON.stringify(bottle) }),
  updateBottle: (id, changes) => request(`/api/bottles/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  deleteBottle: (id) => request(`/api/bottles/${id}`, { method: "DELETE" }),
  identify: (imageBase64, imageMediaType) =>
    request("/api/identify", { method: "POST", body: JSON.stringify({ imageBase64, imageMediaType }) }),
  lookupInstagram: (producer, region) =>
    request("/api/instagram", { method: "POST", body: JSON.stringify({ producer, region }) }),
  lookupBottleImage: (producer, wineName, vintage) =>
    request("/api/bottle-image", { method: "POST", body: JSON.stringify({ producer, wineName, vintage }) }),
  getSuggestions: (likedWines) =>
    request("/api/suggestions", { method: "POST", body: JSON.stringify({ likedWines }) }),
};
