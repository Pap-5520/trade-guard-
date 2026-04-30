import { useState, useEffect } from "react";

const TODAY = new Date().toISOString().split("T")[0];
const STORAGE_KEY = `trades:${TODAY}`;
const SETTINGS_KEY = "trader:settings";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { trades: [], date: TODAY };
  } catch { return { trades: [], date: TODAY }; }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { limit: 5 };
  } catch { return { limit: 5 }; }
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

const EMPTY_FORM = { instrument: "", entry: "", target: "", stop: "", rationale: "", result: "" };

export default function App() {
  const [data, setData] = useState(loadData);
  const [settings, setSettings] = useState(loadSettings);
  const [form, setForm] = useState(EMPTY_FORM);
  const [screen, setScreen] = useState("main");
  const [shake, setShake] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const trades = data.trades;
  const limit = settings.limit;
  const remaining = limit - trades.length;
  const isBlocked = remaining <= 0;

  useEffect(() => {
    if (isBlocked) setScreen("blocked");
  }, [isBlocked]);

  function handleLog() {
    const { instrument, entry, target, stop, rationale } = form;
    if (!instrument || !entry || !target || !stop || !rationale) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const newTrade = {
      ...form,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      id: Date.now(),
    };
    const newData = { ...data, trades: [...trades, newTrade] };
    setData(newData);
    saveData(newData);
    setForm(EMPTY_FORM);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1800);
    if (newData.trades.length >= limit) setScreen("blocked");
  }

  function handleReset() {
    const newData = { trades: [], date: TODAY };
    setData(newData);
    saveData(newData);
    setScreen("main");
  }

  function setLimit(val) {
    const n = Math.max(1, Math.min(20, Number(val)));
    const s = { ...settings, limit: n };
    setSettings(s);
    saveSettings(s);
  }

  const bullets = Array.from({ length: limit }, (_, i) => i < trades.length);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Courier New', monospace", color: "#e8e4d8", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 3rem" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea { outline: none; }
        .field { background: #111; border: 1px solid #2a2a2a; border-radius: 4px; padding: 10px 14px; color: #e8e4d8; font-family: 'Courier New', monospace; font-size: 14px; width: 100%; transition: border 0.2s; }
        .field:focus { border-color: #c8a84b; }
        .field::placeholder { color: #444; }
        .btn { cursor: pointer; border: none; border-radius: 4px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 1px; transition: all 0.15s; }
        .btn:active { transform: scale(0.97); }
        .shake { animation: shake 0.4s ease; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 480, padding: "1.5rem 1.5rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e1e1e", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>Trade Guard</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#c8a84b", fontFamily: "'Space Mono', monospace" }}>Discipline Terminal</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["main", "log", "settings"].map(s => (
              <button key={s} onClick={() => !isBlocked && setScreen(s)} className="btn"
                style={{ padding: "6px 10px", fontSize: 11, background: screen === s ? "#1e1e1e" : "transparent", color: screen === s ? "#c8a84b" : "#444", border: `1px solid ${screen === s ? "#2a2a2a" : "transparent"}`, letterSpacing: 1 }}>
                {s === "main" ? "NEW" : s === "log" ? "LOG" : "SET"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>Daily bullets</span>
            <span style={{ fontSize: 11, color: remaining > 0 ? "#c8a84b" : "#e24b4a", letterSpacing: 1 }}>
              {remaining > 0 ? `${remaining} remaining` : "LIMIT REACHED"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {bullets.map((used, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: used ? "#3a3a3a" : "#c8a84b", transition: "background 0.3s", boxShadow: !used ? "0 0 6px #c8a84b44" : "none" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "#333" }}>0</span>
            <span style={{ fontSize: 10, color: "#555" }}>{trades.length}/{limit} used today</span>
            <span style={{ fontSize: 10, color: "#333" }}>{limit}</span>
          </div>
        </div>
      </div>

      {screen === "blocked" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 480, padding: "0 1.5rem", textAlign: "center" }}>
          <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: "2.5rem 2rem", background: "#0d0d0d" }}>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>🚫</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e24b4a", marginBottom: "0.5rem", fontFamily: "'Space Mono', monospace" }}>TERMINAL LOCKED</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8, marginBottom: "2rem" }}>
              You've hit your {limit}-trade limit for today.<br />
              Your best days had 3 trades.<br />
              <span style={{ color: "#c8a84b" }}>Close the terminal. Come back tomorrow.</span>
            </div>
            <div style={{ fontSize: 11, color: "#333", letterSpacing: 1 }}>Trades today: {trades.length} · Charges saved vs 50+ trades: est. ₹1,000+</div>
            <div style={{ marginTop: "1.5rem", height: 1, background: "#1e1e1e" }} />
            <button onClick={() => setScreen("log")} className="btn" style={{ marginTop: "1.5rem", padding: "10px 24px", background: "transparent", color: "#444", fontSize: 12, border: "1px solid #222" }}>
              view today's log →
            </button>
            <div style={{ marginTop: "0.75rem" }}>
              <button onClick={handleReset} className="btn" style={{ padding: "6px 14px", background: "transparent", color: "#333", fontSize: 10, border: "none", letterSpacing: 1 }}>
                override reset (emergency only)
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "main" && (
        <div className={`fade-in ${shake ? "shake" : ""}`} style={{ width: "100%", maxWidth: 480, padding: "0 1.5rem" }}>
          {showSuccess && (
            <div style={{ background: "#0d1f0d", border: "1px solid #1a3a1a", borderRadius: 6, padding: "10px 14px", marginBottom: "1rem", fontSize: 13, color: "#5cb85c", textAlign: "center" }}>
              ✓ Trade {trades.length}/{limit} logged
            </div>
          )}
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
            Pre-trade checklist — fill all fields to proceed
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Instrument</div>
              <input className="field" placeholder="e.g. NIFTY 24500 CE" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["entry", "Entry", "₹ price"], ["target", "Target", "₹ target"], ["stop", "Stop loss", "₹ stop"]].map(([key, label, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <input className="field" placeholder={ph} type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Why this trade? (required)</div>
              <textarea className="field" placeholder="What's the setup? Why is this an A+ trade?" rows={3} value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} style={{ resize: "none" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Result (fill after exit)</div>
              <input className="field" placeholder="e.g. +₹2,400 / -₹800 / still open" value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} />
            </div>
            <button onClick={handleLog} className="btn" style={{ padding: "14px", background: "#c8a84b", color: "#0a0a0a", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
              Log trade {trades.length + 1} of {limit}
            </button>
            {remaining === 1 && (
              <div className="pulse" style={{ textAlign: "center", fontSize: 11, color: "#e24b4a", letterSpacing: 1 }}>
                ⚠ this is your last trade today
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "log" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 480, padding: "0 1.5rem" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
            Today's trade log — {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          {trades.length === 0 ? (
            <div style={{ textAlign: "center", color: "#333", fontSize: 13, padding: "2rem 0" }}>No trades logged yet today.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trades.map((t, i) => (
                <div key={t.id} style={{ border: "1px solid #1e1e1e", borderRadius: 6, padding: "1rem", background: "#0d0d0d" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#c8a84b", fontWeight: 700, fontSize: 14 }}>#{i + 1} · {t.instrument}</span>
                    <span style={{ color: "#444", fontSize: 11 }}>{t.time}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[["Entry", t.entry], ["Target", t.target], ["Stop", t.stop]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, color: "#444", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>₹{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6, borderTop: "1px solid #1a1a1a", paddingTop: 8 }}>{t.rationale}</div>
                  {t.result && (
                    <div style={{ marginTop: 6, fontSize: 12, color: t.result.startsWith("+") ? "#5cb85c" : t.result.startsWith("-") ? "#e24b4a" : "#888" }}>
                      → {t.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "settings" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 480, padding: "0 1.5rem" }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>Settings</div>
          <div style={{ border: "1px solid #1e1e1e", borderRadius: 6, padding: "1.5rem", background: "#0d0d0d" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 10, color: "#444", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Daily trade limit</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setLimit(limit - 1)} className="btn" style={{ width: 36, height: 36, background: "#1a1a1a", color: "#888", fontSize: 18, border: "1px solid #2a2a2a" }}>−</button>
                <div style={{ flex: 1, textAlign: "center", fontSize: 28, fontWeight: 700, color: "#c8a84b", fontFamily: "'Space Mono', monospace" }}>{limit}</div>
                <button onClick={() => setLimit(limit + 1)} className="btn" style={{ width: 36, height: 36, background: "#1a1a1a", color: "#888", fontSize: 18, border: "1px solid #2a2a2a" }}>+</button>
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: "#333", marginTop: 8 }}>Your data suggests 3–5 is optimal</div>
            </div>
            <div style={{ height: 1, background: "#1a1a1a", margin: "1.5rem 0" }} />
            <div style={{ fontSize: 11, color: "#333", lineHeight: 1.8 }}>
              Trades reset automatically each day.<br />
              All data is stored locally on this device.
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button onClick={handleReset} className="btn" style={{ padding: "8px 16px", background: "transparent", color: "#333", fontSize: 11, border: "1px solid #1e1e1e", letterSpacing: 1 }}>
                reset today's trades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
