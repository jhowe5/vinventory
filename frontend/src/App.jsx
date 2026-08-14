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
  cream: "#FBF8F1",
  ink: "#221016",
  inkSoft: "#5B4B4F",
  wine: "#7A1F3D",
  wineDark: "#4E1327",
  wineLight: "#9A3358",
  lime: "#CFE01F",
  gold: "#B5862F",
  clay: "#B9A184",
  line: "#DCD2BA",
};

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
`;

const GLOBAL_CSS = `
* { box-sizing: border-box; }

.btn-primary {
  background: linear-gradient(180deg, #8A2547, ${COLORS.wineDark});
  color: ${COLORS.cream};
  border: none;
  border-radius: 10px;
  padding: 12px 22px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(34,16,22,0.18), 0 6px 16px rgba(122,31,61,0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(34,16,22,0.2), 0 10px 20px rgba(122,31,61,0.32);
  filter: brightness(1.05);
}
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.55; cursor: default; box-shadow: none; }

.btn-ghost {
  background: transparent;
  border: 1.5px solid ${COLORS.wine};
  color: ${COLORS.wine};
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.btn-ghost:hover { background: ${COLORS.wine}; color: ${COLORS.cream}; }

.field {
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.field:focus {
  outline: none;
  border-color: ${COLORS.wine} !important;
  box-shadow: 0 0 0 3px rgba(122,31,61,0.14);
  background: #fff !important;
}

.card-surface {
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}
.card-surface:hover {
  box-shadow: 0 6px 20px rgba(34,16,22,0.08);
}

.dropzone {
  position: relative;
  border: 1.5px dashed ${COLORS.clay};
  border-radius: 18px;
  background: ${COLORS.cream};
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.dropzone:hover, .dropzone.dragover {
  border-color: ${COLORS.wine};
  background: #fff;
  box-shadow: 0 8px 24px rgba(122,31,61,0.1);
}
.dropzone.dragover { border-style: solid; }

.link-underline {
  background: none; border: none; color: ${COLORS.wine};
  font-size: 14px; text-decoration: underline; cursor: pointer; padding: 0;
  font-family: 'Inter', sans-serif;
}

.btn-ghost.danger { border-color: ${COLORS.wineDark}; color: ${COLORS.wineDark}; }
.btn-ghost.danger:hover { background: ${COLORS.wineDark}; color: ${COLORS.cream}; }
.btn-ghost.small { padding: 6px 12px; font-size: 12px; border-radius: 7px; }

.chip {
  padding: 6px 14px; border-radius: 999px; border: 1.5px solid ${COLORS.wine};
  background: transparent; color: ${COLORS.wine};
  font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.chip:hover { box-shadow: 0 2px 8px rgba(122,31,61,0.15); }
.chip.active { background: ${COLORS.wine}; color: ${COLORS.cream}; }

.empty-state {
  border: 1.5px dashed ${COLORS.clay};
  border-radius: 16px;
  padding: 30px 20px;
  text-align: center;
  color: ${COLORS.inkSoft};
  font-size: 14px;
  background: rgba(255,255,255,0.35);
}

input[type="checkbox"] { accent-color: ${COLORS.wine}; width: 16px; height: 16px; cursor: pointer; }

::placeholder { color: ${COLORS.clay}; }
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
      display: "inline-block", background: bg, color: COLORS.cream,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 0.5,
      padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", whiteSpace: "nowrap",
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
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 20% 0%, ${COLORS.paperDim}, ${COLORS.paper} 60%)`, color: COLORS.ink, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <style>{FONT_IMPORT + GLOBAL_CSS}</style>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <BottleIcon filled size={30} />
        </div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 32, color: COLORS.wine, margin: "0 0 4px", textAlign: "center" }}>
          Cellar
        </h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: COLORS.inkSoft, textAlign: "center", margin: "0 0 28px" }}>
          every bottle, every note
        </p>
        <form onSubmit={handleSubmit} className="card-surface" style={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 22, boxShadow: "0 4px 16px rgba(34,16,22,0.06)" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Email</label>
            <input className="field" type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Password</label>
            <input className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            {mode === "signup" && <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>At least 8 characters.</div>}
          </div>
          {error && <p style={{ color: COLORS.wineDark, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary" style={{ width: "100%" }}>
            {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
          className="link-underline"
          style={{ marginTop: 14, width: "100%", textAlign: "center" }}
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
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsStatus, setSuggestionsStatus] = useState("idle");

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
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 15% 0%, ${COLORS.paperDim}, ${COLORS.paper} 55%)`, color: COLORS.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{FONT_IMPORT + GLOBAL_CSS}</style>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} email={email} onLogout={onLogout} />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 64px" }}>
        {loadError && (
          <div style={{ background: "#FDF2F0", border: `1px solid ${COLORS.wine}`, color: COLORS.wineDark, padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
            Couldn't reach the server: {loadError}
          </div>
        )}
        {!loaded ? (
          <p style={{ color: COLORS.inkSoft, fontSize: 14, textAlign: "center", padding: "40px 0" }}>Loading your cellar…</p>
        ) : (
          <>
            {activeTab === "scan" && <ScanTab onAdd={addBottle} />}
            {activeTab === "cellar" && (
              <CellarTab bottles={bottles} onUpdate={updateBottle} onDelete={deleteBottle} />
            )}
            {activeTab === "ratings" && <RatingsTab bottles={bottles} onUpdate={updateBottle} />}
            {activeTab === "suggestions" && (
              <SuggestionsTab
                bottles={bottles}
                suggestions={suggestions}
                setSuggestions={setSuggestions}
                status={suggestionsStatus}
                setStatus={setSuggestionsStatus}
              />
            )}
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
    <header style={{ background: COLORS.paper, boxShadow: `0 1px 0 ${COLORS.line}, 0 4px 12px rgba(34,16,22,0.04)`, position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BottleIcon filled size={24} />
            <div>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 28, letterSpacing: -0.5, margin: 0, color: COLORS.wine, lineHeight: 1 }}>
                Cellar
              </h1>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.inkSoft, margin: "3px 0 0" }}>
                every bottle, every note
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 4 }}>{email}</div>
            <button onClick={onLogout} className="link-underline" style={{ fontSize: 12 }}>
              Log out
            </button>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 4, marginTop: 18 }}>
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
                transition: "color 0.15s ease, border-color 0.15s ease",
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFile(file) {
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

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function resetPhoto() {
    setImagePreview(null);
    setImageBase64(null);
    setStatus("idle");
    setDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        photo: `data:${imageMediaType};base64,${imageBase64}`,
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
        onChange={(e) => handleFile(e.target.files[0])}
        style={{ display: "none" }}
      />

      {!imagePreview && (
        <div
          className={`dropzone${dragOver ? " dragover" : ""}`}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <CameraIcon />
          </div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 17, color: COLORS.ink }}>
            Snap or drop a label photo
          </div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
            We'll read the producer, vintage and region for you
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="card-surface" style={{
          position: "relative", borderRadius: 14, overflow: "hidden",
          border: `1px solid ${COLORS.line}`, boxShadow: "0 4px 16px rgba(34,16,22,0.08)", marginBottom: 16,
          background: COLORS.paperDim, display: "flex", justifyContent: "center",
        }}>
          <img src={imagePreview} alt="Bottle preview" style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain", display: "block" }} />
          <button
            onClick={resetPhoto}
            className="btn-ghost"
            style={{ position: "absolute", top: 10, right: 10, background: COLORS.cream, fontSize: 12, padding: "6px 12px" }}
          >
            Change photo
          </button>
        </div>
      )}

      {imageBase64 && status !== "done" && status !== "save-error" && (
        <button onClick={identifyWine} disabled={status === "reading"} className="btn-primary">
          {status === "reading" ? "Reading label…" : "Identify this wine"}
        </button>
      )}
      {status === "error" && (
        <p style={{ color: COLORS.wineDark, fontSize: 14 }}>
          Couldn't read that label clearly. Try a clearer, closer photo, or add the bottle manually below.
        </p>
      )}
      {(status === "done" || status === "save-error") && draft && (
        <div className="card-surface" style={{ marginTop: 20, background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18 }}>
          <SectionTitle small>Review before saving</SectionTitle>
          <DraftForm draft={draft} setDraft={setDraft} instaLoading={instaStatus === "looking"} />
          {status === "save-error" && (
            <p style={{ color: COLORS.wineDark, fontSize: 13, marginTop: 8 }}>Save failed — check your connection and try again.</p>
          )}
          <button onClick={saveDraft} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
            {saving ? "Saving…" : "Add to cellar"}
          </button>
        </div>
      )}
      {!imageBase64 && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.inkSoft, fontSize: 12, margin: "0 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
            or
            <div style={{ flex: 1, height: 1, background: COLORS.line }} />
          </div>
          <button
            onClick={() => setDraft({ producer: "", wineName: "", vintage: "", varietal: "", region: "", natural: false, tastingNotes: "", priceRange: "", instagramHandle: "", quantity: 1, status: "in-cellar" })}
            className="btn-ghost"
          >
            Enter a bottle manually
          </button>
          {draft && !imageBase64 && (
            <div className="card-surface" style={{ marginTop: 16, background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18, textAlign: "left" }}>
              <DraftForm draft={draft} setDraft={setDraft} />
              <button onClick={saveDraft} disabled={saving} className="btn-primary" style={{ marginTop: 12 }}>
                {saving ? "Saving…" : "Add to cellar"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
            stroke={COLORS.wine} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.4" stroke={COLORS.wine} strokeWidth="1.4" />
    </svg>
  );
}

function DraftForm({ draft, setDraft, instaLoading }) {
  const field = (key, label, placeholder = "") => (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      <input
        className="field"
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
          className="field"
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
          className="field"
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
        className="field"
        placeholder="Search producer, wine, region…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...inputStyle, marginBottom: 10 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All"], ["natural", "Natural"], ["in-cellar", "In cellar"], ["drunk", "Drunk"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`chip${filter === id ? " active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <BottleIcon size={22} />
          </div>
          No bottles match yet. Scan one to get started.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visible.map((b) => (
          <BottleCard key={b.id} bottle={b} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function BottleThumbnail({ src }) {
  const boxStyle = {
    width: 52, height: 72, borderRadius: 8, flexShrink: 0, overflow: "hidden",
    background: COLORS.paperDim, border: `1px solid ${COLORS.line}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  if (!src) {
    return (
      <div style={boxStyle}>
        <BottleIcon size={20} />
      </div>
    );
  }
  return (
    <div style={boxStyle}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

function BottleCard({ bottle, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-surface" style={{
      background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14,
      padding: 16, boxShadow: "0 2px 8px rgba(34,16,22,0.05)",
    }}>
      <div style={{ display: "flex", gap: 12 }}>
        <BottleThumbnail src={bottle.photo} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 18 }}>
                {bottle.wineName || "Unnamed wine"}
              </div>
              <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
                {bottle.producer} {bottle.vintage ? `· ${bottle.vintage}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {bottle.natural && <TagBadge tone="gold">Natural</TagBadge>}
              <TagBadge tone="wine">{bottle.status === "drunk" ? "Drunk" : "In cellar"}</TagBadge>
            </div>
          </div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft, marginTop: 6 }}>
            {[bottle.varietal, bottle.region].filter(Boolean).join(" · ")}
          </div>
          <button onClick={() => setOpen(!open)} className="link-underline" style={{ marginTop: 10, fontSize: 13 }}>
            {open ? "Hide details ↑" : "Details ↓"}
          </button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, fontSize: 14, borderTop: `1px solid ${COLORS.line}`, paddingTop: 10 }}>
          {bottle.tastingNotes && <p style={{ margin: "0 0 8px" }}>{bottle.tastingNotes}</p>}
          {bottle.priceRange && <p style={{ margin: "0 0 8px", color: COLORS.inkSoft }}>Typical price: {bottle.priceRange}</p>}
          {bottle.instagramHandle && (
            <p style={{ margin: "0 0 8px" }}>
              <a href={`https://instagram.com/${bottle.instagramHandle}`} target="_blank" rel="noreferrer" style={{ color: COLORS.wine }}>
                @{bottle.instagramHandle} on Instagram ↗
              </a>
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {bottle.status !== "drunk" && (
              <button onClick={() => onUpdate(bottle.id, { status: "drunk" })} className="btn-ghost small">
                Mark as drunk
              </button>
            )}
            <button onClick={() => onDelete(bottle.id)} className="btn-ghost small danger">
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
        <div className="empty-state">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <BottleRating value={0} readOnly />
          </div>
          Nothing to rate yet — mark a bottle "drunk" from the Cellar tab first.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {drunk.map((b) => (
          <div key={b.id} className="card-surface" style={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(34,16,22,0.05)" }}>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 17 }}>
              {b.wineName || "Unnamed wine"}
            </div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 10 }}>
              {b.producer} {b.vintage ? `· ${b.vintage}` : ""}
            </div>
            <BottleRating value={b.rating || 0} onChange={(n) => onUpdate(b.id, { rating: n })} />
            <textarea
              className="field"
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

function SuggestionsTab({ bottles, suggestions, setSuggestions, status, setStatus }) {
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
      <button onClick={getSuggestions} disabled={status === "loading"} className="btn-primary">
        {status === "loading" ? "Thinking…" : "Get suggestions"}
      </button>
      {status === "error" && <p style={{ color: COLORS.wineDark, fontSize: 14, marginTop: 10 }}>Couldn't fetch suggestions — try again.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {suggestions.map((s, i) => (
          <div key={i} className="card-surface" style={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16, boxShadow: "0 2px 8px rgba(34,16,22,0.05)" }}>
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
  width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${COLORS.line}`, fontSize: 14, fontFamily: "'Inter', sans-serif",
  background: "#fff", color: COLORS.ink,
};
