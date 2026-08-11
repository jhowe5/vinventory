import React, { useState, useEffect, useRef } from "react";
import { api } from "./api.js";

/* ============================================================
   CELLAR — a natural-wine-forward inventory app
   Frontend talks only to our own backend (see api.js). The
   backend holds the real Anthropic API key and the database.
   ============================================================ */

const COLORS = {
  paper: "#EFE9DA",
  paperDim: "#E4DCC8",
  ink: "#221016",
  inkSoft: "#5B4B4F",
  wine: "#7A1F3D",
  wineDark: "#4E1327",
  lime: "#CFE01F",
  gold: "#C9A227",
  line: "#D8CEB6",
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function BottleIcon({ filled, size = 22 }) {
  const color = filled ? COLORS.wine : "transparent";
  const stroke = filled ? COLORS.wine : COLORS.inkSoft;
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 20 32">
      <rect x="8" y="0" width="4" height="7" rx="1" fill={color} stroke={stroke} strokeWidth="1.2" />
      <path d="M8 7 L6 12 L6 30 Q6 31 7 31 L13 31 Q14 31 14 30 L14 12 L12 7 Z"
            fill={color} stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

function BottleRating({ value, onChange, readOnly }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(n)}
          style={{ background: "none", border: "none", cursor: readOnly ? "default" : "pointer", padding: 0 }}
          aria-label={`Rate ${n} of 5`}
        >
          <BottleIcon filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

function TagBadge({ children, tone = "wine" }) {
  const bg = tone === "wine" ? COLORS.wine : COLORS.gold;
  return (
    <span style={{
      display: "inline-block", background: bg, color: COLORS.paper,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 0.5,
      padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem("cellar_email"));

  function handleLoggedIn(userEmail) {
    setEmail(userEmail);
  }

  function handleLogout() {
    localStorage.removeItem("cellar_token");
    localStorage.removeItem("cellar_email");
    setEmail(null);
  }

  if (!email) {
    return <AuthScreen onLoggedIn={handleLoggedIn} />;
  }

  return <CellarApp email={email} onLogout={handleLogout} />;
}

function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = mode === "login"
        ? await api.login(emailInput, password)
        : await api.signup(emailInput, password);
      localStorage.setItem("cellar_token", result.token);
      localStorage.setItem("cellar_email", result.email);
      onLoggedIn(result.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, color: COLORS.ink, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 32, color: COLORS.wine, margin: "0 0 4px", textAlign: "center" }}>
          Cellar
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.inkSoft, textAlign: "center", margin: "0 0 28px" }}>
          natural wine, inclusive of all
        </p>
        <form onSubmit={handleSubmit} style={{ background: COLORS.paperDim, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            {mode === "signup" && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>At least 8 characters.</div>}
          </div>
          {error && <p style={{ color: COLORS.wineDark, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ ...primaryButtonStyle, width: "100%" }}>
            {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
          style={{ background: "none", border: "none", color: COLORS.wine, fontSize: 13, marginTop: 14, cursor: "pointer", width: "100%", textAlign: "center", textDecoration: "underline" }}
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

function CellarApp({ email, onLogout }) {
  const [bottles, setBottles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("scan");
  const [loadError, setLoadError] = useState(null);

  async function refreshBottles() {
    try {
      const data = await api.getBottles();
      setBottles(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    refreshBottles();
  }, []);

  async function addBottle(bottle) {
    const saved = await api.addBottle(bottle);
    setBottles((prev) => [saved, ...prev]);
  }

  async function updateBottle(id, changes) {
    // Update locally right away so the UI feels instant, then confirm with the server.
    setBottles((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
    try {
      await api.updateBottle(id, changes);
    } catch {
      refreshBottles(); // fall back to the real state if the save failed
    }
  }

  async function deleteBottle(id) {
    setBottles((prev) => prev.filter((b) => b.id !== id));
    try {
      await api.deleteBottle(id);
    } catch {
      refreshBottles();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, color: COLORS.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} email={email} onLogout={onLogout} />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 64px" }}>
        {loadError && (
          <div style={{ background: "#fff3f3", border: `1px solid ${COLORS.wine}`, color: COLORS.wineDark, padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            Couldn't reach the server: {loadError}
          </div>
        )}
        {!loaded ? (
          <p style={{ color: COLORS.inkSoft }}>Loading your cellar…</p>
        ) : (
          <>
            {activeTab === "scan" && <ScanTab onAdd={addBottle} />}
            {activeTab === "cellar" && (
              <CellarTab bottles={bottles} onUpdate={updateBottle} onDelete={deleteBottle} />
            )}
            {activeTab === "ratings" && <RatingsTab bottles={bottles} onUpdate={updateBottle} />}
            {activeTab === "suggestions" && <SuggestionsTab bottles={bottles} />}
          </>
        )}
      </main>
    </div>
  );
}

function Header({ activeTab, setActiveTab, email, onLogout }) {
  const tabs = [
    { id: "scan", label: "Scan" },
    { id: "cellar", label: "Cellar" },
    { id: "ratings", label: "Ratings" },
    { id: "suggestions", label: "For You" },
  ];
  return (
    <header style={{ borderBottom: `1px solid ${COLORS.line}`, background: COLORS.paper, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 30, letterSpacing: -0.5, margin: 0, color: COLORS.wine }}>
              Cellar
            </h1>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.inkSoft, margin: "2px 0 16px" }}>
              natural wine, inclusive of all
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 4 }}>{email}</div>
            <button onClick={onLogout} style={{ background: "none", border: "none", color: COLORS.wine, fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>
              Log out
            </button>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                flex: 1, padding: "10px 4px", border: "none", background: "none",
                fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                color: activeTab === t.id ? COLORS.wine : COLORS.inkSoft,
                borderBottom: activeTab === t.id ? `2px solid ${COLORS.wine}` : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function ScanTab({ onAdd }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | reading | done | error
  const [instaStatus, setInstaStatus] = useState("idle"); // idle | looking
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageMediaType(file.type);
    setStatus("idle");
    setDraft(null);
    try {
      const b64 = await fileToBase64(file);
      setImageBase64(b64);
    } catch {
      setStatus("error");
    }
  }

  async function identifyWine() {
    setStatus("reading");
    try {
      const parsed = await api.identify(imageBase64, imageMediaType);
      const nextDraft = {
        producer: parsed.producer || "",
        wineName: parsed.wineName || "",
        vintage: parsed.vintage || "",
        varietal: parsed.varietal || "",
        region: parsed.region || "",
        natural: !!parsed.natural,
        tastingNotes: parsed.tastingNotes || "",
        priceRange: parsed.priceRange || "",
        instagramHandle: "",
        quantity: 1,
        status: "in-cellar",
      };
      setDraft(nextDraft);
      setStatus("done");

      if (nextDraft.producer) {
        setInstaStatus("looking");
        try {
          const { instagramHandle } = await api.lookupInstagram(nextDraft.producer, nextDraft.region);
          setDraft((d) => (d ? { ...d, instagramHandle } : d));
        } catch {
          // Instagram lookup failing shouldn't block the rest of the save.
        } finally {
          setInstaStatus("idle");
        }
      }
    } catch {
      setStatus("error");
    }
  }

  async function saveDraft() {
    setSaving(true);
    try {
      await onAdd(draft);
      setDraft(null);
      setImagePreview(null);
      setImageBase64(null);
      setStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      // leave the draft in place so nothing is lost; error shows below
      setStatus("save-error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <SectionTitle>Add a bottle</SectionTitle>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "block", marginBottom: 16, fontSize: 14 }}
      />
      {imagePreview && (
        <img src={imagePreview} alt="Bottle preview" style={{ width: "100%", maxWidth: 280, borderRadius: 8, marginBottom: 16, border: `1px solid ${COLORS.line}` }} />
      )}
      {imageBase64 && status !== "done" && status !== "save-error" && (
        <button onClick={identifyWine} disabled={status === "reading"} style={primaryButtonStyle}>
          {status === "reading" ? "Reading label…" : "Identify this wine"}
        </button>
      )}
      {status === "error" && (
        <p style={{ color: COLORS.wineDark, fontSize: 14 }}>
          Couldn't read that label clearly. Try a clearer, closer photo, or add the bottle manually below.
        </p>
      )}
      {(status === "done" || status === "save-error") && draft && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle small>Review before saving</SectionTitle>
          <DraftForm draft={draft} setDraft={setDraft} instaLoading={instaStatus === "looking"} />
          {status === "save-error" && (
            <p style={{ color: COLORS.wineDark, fontSize: 13, marginTop: 8 }}>Save failed — check your connection and try again.</p>
          )}
          <button onClick={saveDraft} disabled={saving} style={{ ...primaryButtonStyle, marginTop: 12 }}>
            {saving ? "Saving…" : "Add to cellar"}
          </button>
        </div>
      )}
      {!imageBase64 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setDraft({ producer: "", wineName: "", vintage: "", varietal: "", region: "", natural: false, tastingNotes: "", priceRange: "", instagramHandle: "", quantity: 1, status: "in-cellar" })}
            style={{ background: "none", border: "none", color: COLORS.wine, fontSize: 14, textDecoration: "underline", cursor: "pointer" }}
          >
            Or enter a bottle manually
          </button>
          {draft && !imageBase64 && (
            <div style={{ marginTop: 16 }}>
              <DraftForm draft={draft} setDraft={setDraft} />
              <button onClick={saveDraft} disabled={saving} style={{ ...primaryButtonStyle, marginTop: 12 }}>
                {saving ? "Saving…" : "Add to cellar"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraftForm({ draft, setDraft, instaLoading }) {
  const field = (key, label, placeholder = "") => (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        style={inputStyle}
      />
    </div>
  );
  return (
    <div>
      {field("producer", "Producer / winery")}
      {field("wineName", "Wine name / cuvée")}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>{field("vintage", "Vintage", "e.g. 2021 or NV")}</div>
        <div style={{ flex: 1 }}>{field("varietal", "Varietal")}</div>
      </div>
      {field("region", "Region")}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Producer's Instagram (handle, no @)</label>
        <input
          value={draft.instagramHandle || ""}
          placeholder={instaLoading ? "Looking it up…" : "e.g. domaine_example"}
          onChange={(e) => setDraft({ ...draft, instagramHandle: e.target.value.replace(/^@/, "") })}
          style={inputStyle}
        />
        {instaLoading && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>Searching for their Instagram…</div>}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Tasting notes</label>
        <textarea
          value={draft.tastingNotes}
          onChange={(e) => setDraft({ ...draft, tastingNotes: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginTop: 8 }}>
        <input
          type="checkbox"
          checked={draft.natural}
          onChange={(e) => setDraft({ ...draft, natural: e.target.checked })}
        />
        Natural / low-intervention wine
      </label>
    </div>
  );
}

function CellarTab({ bottles, onUpdate, onDelete }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const visible = bottles.filter((b) => {
    if (filter === "natural" && !b.natural) return false;
    if (filter === "in-cellar" && b.status !== "in-cellar") return false;
    if (filter === "drunk" && b.status !== "drunk") return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${b.producer} ${b.wineName} ${b.region} ${b.varietal}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <SectionTitle>Your cellar · {bottles.length} bottle{bottles.length === 1 ? "" : "s"}</SectionTitle>
      <input
        placeholder="Search producer, wine, region…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All"], ["natural", "Natural"], ["in-cellar", "In cellar"], ["drunk", "Drunk"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            style={{
              padding: "5px 12px", borderRadius: 999, border: `1px solid ${COLORS.wine}`,
              background: filter === id ? COLORS.wine : "transparent",
              color: filter === id ? COLORS.paper : COLORS.wine,
              fontSize: 13, cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <p style={{ color: COLORS.inkSoft, fontSize: 14 }}>No bottles match yet. Scan one to get started.</p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((b) => (
          <BottleCard key={b.id} bottle={b} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function BottleCard({ bottle, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: COLORS.paperDim, border: `1px solid ${COLORS.line}`, borderRadius: 10,
      padding: 14, transform: `rotate(${bottle.id ? (bottle.id.charCodeAt(0) % 3 - 1) * 0.15 : 0}deg)`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 18 }}>
            {bottle.wineName || "Unnamed wine"}
          </div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
            {bottle.producer} {bottle.vintage ? `· ${bottle.vintage}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {bottle.natural && <TagBadge tone="gold">Natural</TagBadge>}
          <TagBadge tone="wine">{bottle.status === "drunk" ? "Drunk" : "In cellar"}</TagBadge>
        </div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 6 }}>
        {[bottle.varietal, bottle.region].filter(Boolean).join(" · ")}
      </div>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: COLORS.wine, fontSize: 13, marginTop: 8, cursor: "pointer", padding: 0 }}>
        {open ? "Hide details" : "Details"}
      </button>
      {open && (
        <div style={{ marginTop: 10, fontSize: 14 }}>
          {bottle.tastingNotes && <p style={{ margin: "0 0 8px" }}>{bottle.tastingNotes}</p>}
          {bottle.priceRange && <p style={{ margin: "0 0 8px", color: COLORS.inkSoft }}>Typical price: {bottle.priceRange}</p>}
          {bottle.instagramHandle && (
            <p style={{ margin: "0 0 8px" }}>
              <a href={`https://instagram.com/${bottle.instagramHandle}`} target="_blank" rel="noreferrer" style={{ color: COLORS.wine }}>
                @{bottle.instagramHandle} on Instagram ↗
              </a>
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bottle.status !== "drunk" && (
              <button onClick={() => onUpdate(bottle.id, { status: "drunk" })} style={smallButtonStyle}>
                Mark as drunk
              </button>
            )}
            <button onClick={() => onDelete(bottle.id)} style={{ ...smallButtonStyle, color: COLORS.wineDark, borderColor: COLORS.wineDark }}>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RatingsTab({ bottles, onUpdate }) {
  const drunk = bottles.filter((b) => b.status === "drunk");
  return (
    <div>
      <SectionTitle>Ratings · {drunk.length} drunk</SectionTitle>
      {drunk.length === 0 && (
        <p style={{ color: COLORS.inkSoft, fontSize: 14 }}>
          Nothing to rate yet — mark a bottle "drunk" from the Cellar tab first.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {drunk.map((b) => (
          <div key={b.id} style={{ background: COLORS.paperDim, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 17 }}>
              {b.wineName || "Unnamed wine"}
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 10 }}>
              {b.producer} {b.vintage ? `· ${b.vintage}` : ""}
            </div>
            <BottleRating value={b.rating || 0} onChange={(n) => onUpdate(b.id, { rating: n })} />
            <textarea
              placeholder="Notes on this bottle…"
              value={b.ratingNotes || ""}
              onChange={(e) => onUpdate(b.id, { ratingNotes: e.target.value })}
              rows={2}
              style={{ ...inputStyle, marginTop: 10, resize: "vertical" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionsTab({ bottles }) {
  const [status, setStatus] = useState("idle");
  const [suggestions, setSuggestions] = useState([]);
  const rated = bottles.filter((b) => b.rating >= 4);

  async function getSuggestions() {
    setStatus("loading");
    try {
      const result = await api.getSuggestions(rated);
      setSuggestions(result);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <SectionTitle>For you</SectionTitle>
      {rated.length === 0 && (
        <p style={{ color: COLORS.inkSoft, fontSize: 14, marginBottom: 12 }}>
          Rate a few bottles 4 or 5 to get suggestions tuned to your taste — or get general natural wine picks now.
        </p>
      )}
      <button onClick={getSuggestions} disabled={status === "loading"} style={primaryButtonStyle}>
        {status === "loading" ? "Thinking…" : "Get suggestions"}
      </button>
      {status === "error" && <p style={{ color: COLORS.wineDark, fontSize: 14, marginTop: 10 }}>Couldn't fetch suggestions — try again.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {suggestions.map((s, i) => (
          <div key={i} style={{ background: COLORS.paperDim, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 17 }}>
                {s.wineName}
              </div>
              {s.natural && <TagBadge tone="gold">Natural</TagBadge>}
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 6 }}>
              {s.producer} {[s.varietal, s.region].filter(Boolean).length ? `· ${[s.varietal, s.region].filter(Boolean).join(" · ")}` : ""}
            </div>
            <div style={{ fontSize: 14 }}>{s.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children, small }) {
  return (
    <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: small ? 16 : 20, margin: "0 0 12px", color: COLORS.ink }}>
      {children}
    </h2>
  );
}

const labelStyle = { display: "block", fontSize: 12, color: COLORS.inkSoft, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" };
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 6,
  border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "'Inter', sans-serif",
  background: "#fff", color: COLORS.ink,
};
const primaryButtonStyle = {
  background: COLORS.wine, color: COLORS.paper, border: "none", borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const smallButtonStyle = {
  background: "none", border: `1px solid ${COLORS.wine}`, color: COLORS.wine,
  borderRadius: 6, padding: "5px 10px", fontSize: 13, cursor: "pointer",
};
