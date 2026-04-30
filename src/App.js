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

function loadHistory() {
  const days = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("trades:") && key !== STORAGE_KEY) {
      try {
        const d = JSON.parse(localStorage.getItem(key));
        if (d && d.trades && d.trades.length > 0) days.push(d);
      } catch {}
    }
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

const LOT_SIZES = { SENSEX: 20, NIFTY: 65 };

function getLotSize(instrument) {
  const upper = (instrument || "").toUpperCase();
  if (upper.includes("SENSEX")) return LOT_SIZES.SENSEX;
  if (upper.includes("NIFTY")) return LOT_SIZES.NIFTY;
  return null;
}

const EMPTY_FORM = { instrument: "", entry: "", target: "", stop: "", rationale: "", result: "", lots: "" };
const EMPTY_CALC = { instrument: "", entry: "", target: "", stop: "", lots: "" };

const C = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  border: "#e0ddd5",
  border2: "#ece9e2",
  text: "#1a1a1a",
  muted: "#888880",
  faint: "#b0aca0",
  gold: "#b8860b",
  goldLight: "#fdf6e3",
  red: "#c0392b",
  redLight: "#fdf0ee",
  green: "#27ae60",
  greenLight: "#eafaf1",
};

export default function App() {
  const [data, setData] = useState(loadData);
  const [settings, setSettings] = useState(loadSettings);
  const [form, setForm] = useState(EMPTY_FORM);
  const [screen, setScreen] = useState("main");
  const [shake, setShake] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [history, setHistory] = useState(loadHistory);
  const [expandedDay, setExpandedDay] = useState(null);
  const [calc, setCalc] = useState(EMPTY_CALC);

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

  function refreshHistory() { setHistory(loadHistory()); }

  const bullets = Array.from({ length: limit }, (_, i) => i < trades.length);
  const tabs = ["main", "calc", "log", "history", "settings"];

  // live calc for form
  const formLotSize = getLotSize(form.instrument);
  const formQty = form.lots && formLotSize ? Number(form.lots) * formLotSize : null;
  const formCapital = formQty && form.entry ? formQty * Number(form.entry) : null;
  const formRisk = formQty && form.entry && form.stop ? formQty * Math.abs(Number(form.entry) - Number(form.stop)) : null;
  const formReward = formQty && form.entry && form.target ? formQty * Math.abs(Number(form.target) - Number(form.entry)) : null;
  const formRR = formRisk && formReward ? (formReward / formRisk).toFixed(2) : null;

  // standalone calculator
  const cLotSize = getLotSize(calc.instrument);
  const cQty = calc.lots && cLotSize ? Number(calc.lots) * cLotSize : calc.lots ? Number(calc.lots) : null;
  const cCapital = cQty && calc.entry ? cQty * Number(calc.entry) : null;
  const cRisk = cQty && calc.entry && calc.stop ? cQty * Math.abs(Number(calc.entry) - Number(calc.stop)) : null;
  const cReward = cQty && calc.entry && calc.target ? cQty * Math.abs(Number(calc.target) - Number(calc.entry)) : null;
  const cRR = cRisk && cReward ? (cReward / cRisk).toFixed(2) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Courier New', monospace", color: C.text, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 3rem" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea { outline: none; }
        .field { background: ${C.surface}; border: 1.5px solid ${C.border}; border-radius: 6px; padding: 10px 14px; color: ${C.text}; font-family: 'Courier New', monospace; font-size: 14px; width: 100%; transition: border 0.2s; }
        .field:focus { border-color: ${C.gold}; }
        .field::placeholder { color: ${C.faint}; }
        .btn { cursor: pointer; border: none; border-radius: 6px; font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 1px; transition: all 0.15s; }
        .btn:active { transform: scale(0.97); }
        .shake { animation: shake 0.4s ease; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .day-card { border: 1.5px solid ${C.border}; border-radius: 8px; background: ${C.surface}; overflow: hidden; }
        .day-header { padding: 12px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        .day-header:hover { background: ${C.bg}; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 500, padding: "1.5rem 1.5rem 0" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5px solid ${C.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 3, textTransform: "uppercase" }}>Trade Guard</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, fontFamily: "'Space Mono', monospace" }}>Discipline Terminal</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {tabs.map(s => (
              <button key={s} onClick={() => { if (!isBlocked || s === "history" || s === "calc") setScreen(s); }} className="btn"
                style={{ padding: "6px 8px", fontSize: 10, background: screen === s ? C.goldLight : "transparent", color: screen === s ? C.gold : C.faint, border: `1.5px solid ${screen === s ? C.gold : "transparent"}`, letterSpacing: 1 }}>
                {s === "main" ? "NEW" : s === "calc" ? "CALC" : s === "log" ? "LOG" : s === "history" ? "HIST" : "SET"}
              </button>
            ))}
          </div>
        </div>

        {/* Bullet bar */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase" }}>Daily bullets</span>
            <span style={{ fontSize: 11, color: remaining > 0 ? C.gold : C.red, letterSpacing: 1, fontWeight: 700 }}>
              {remaining > 0 ? `${remaining} remaining` : "LIMIT REACHED"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {bullets.map((used, i) => (
              <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: used ? C.border : C.gold, transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: C.faint }}>0</span>
            <span style={{ fontSize: 10, color: C.muted }}>{trades.length}/{limit} used today</span>
            <span style={{ fontSize: 10, color: C.faint }}>{limit}</span>
          </div>
        </div>
      </div>

      {/* BLOCKED */}
      {screen === "blocked" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem", textAlign: "center" }}>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "2.5rem 2rem", background: C.surface }}>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>🚫</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.red, marginBottom: "0.5rem", fontFamily: "'Space Mono', monospace" }}>TERMINAL LOCKED</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: "2rem" }}>
              You've hit your {limit}-trade limit for today.<br />
              Your best days had 3 trades.<br />
              <span style={{ color: C.gold, fontWeight: 700 }}>Close the terminal. Come back tomorrow.</span>
            </div>
            <div style={{ fontSize: 11, color: C.faint, letterSpacing: 1 }}>Trades today: {trades.length} · Charges saved vs 50+ trades: est. ₹1,000+</div>
            <div style={{ marginTop: "1.5rem", height: 1, background: C.border }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: "1.5rem", flexWrap: "wrap" }}>
              <button onClick={() => setScreen("log")} className="btn" style={{ padding: "10px 18px", background: C.bg, color: C.muted, fontSize: 12, border: `1.5px solid ${C.border}` }}>today's log →</button>
              <button onClick={() => setScreen("history")} className="btn" style={{ padding: "10px 18px", background: C.bg, color: C.muted, fontSize: 12, border: `1.5px solid ${C.border}` }}>history →</button>
              <button onClick={() => setScreen("calc")} className="btn" style={{ padding: "10px 18px", background: C.bg, color: C.muted, fontSize: 12, border: `1.5px solid ${C.border}` }}>calculator →</button>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <button onClick={handleReset} className="btn" style={{ padding: "6px 14px", background: "transparent", color: C.faint, fontSize: 10, border: "none", letterSpacing: 1 }}>
                override reset (emergency only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TRADE */}
      {screen === "main" && (
        <div className={`fade-in ${shake ? "shake" : ""}`} style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          {showSuccess && (
            <div style={{ background: C.greenLight, border: `1.5px solid #a9dfbf`, borderRadius: 6, padding: "10px 14px", marginBottom: "1rem", fontSize: 13, color: C.green, textAlign: "center", fontWeight: 700 }}>
              ✓ Trade {trades.length}/{limit} logged
            </div>
          )}
          <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
            Pre-trade checklist — fill all fields to proceed
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Instrument</div>
                <input className="field" placeholder="e.g. NIFTY 24500 CE" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Lots {formLotSize ? <span style={{ color: C.gold }}>/{formLotSize}</span> : ""}
                </div>
                <input className="field" placeholder="# lots" type="number" min="1" value={form.lots} onChange={e => setForm(f => ({ ...f, lots: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["entry", "Entry", "₹ price"], ["target", "Target", "₹ target"], ["stop", "Stop loss", "₹ stop"]].map(([key, label, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <input className="field" placeholder={ph} type="number" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>

            {/* Live capital panel */}
            {(formCapital || formRisk || formReward) && (
              <div style={{ borderRadius: 8, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ background: C.goldLight, padding: "8px 14px", fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Capital breakdown</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  {formQty && <StatCell label="Qty" value={`${formQty} shares`} />}
                  {formCapital && <StatCell label="Capital used" value={fmt(formCapital)} highlight />}
                  {formRisk && <StatCell label="Max risk" value={fmt(formRisk)} bad />}
                  {formReward && <StatCell label="Max reward" value={fmt(formReward)} good />}
                  {formRR && <StatCell label="R:R ratio" value={`1 : ${formRR}`} highlight={Number(formRR) >= 2} bad={Number(formRR) < 1} />}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Why this trade? (required)</div>
              <textarea className="field" placeholder="What's the setup? Why is this an A+ trade?" rows={3} value={form.rationale} onChange={e => setForm(f => ({ ...f, rationale: e.target.value }))} style={{ resize: "none" }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Result (fill after exit)</div>
              <input className="field" placeholder="e.g. +₹2,400 / -₹800 / still open" value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} />
            </div>
            <button onClick={handleLog} className="btn" style={{ padding: "14px", background: C.gold, color: "#fff", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>
              Log trade {trades.length + 1} of {limit}
            </button>
            {remaining === 1 && (
              <div className="pulse" style={{ textAlign: "center", fontSize: 11, color: C.red, letterSpacing: 1, fontWeight: 700 }}>
                ⚠ this is your last trade today
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALCULATOR */}
      {screen === "calc" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>Capital Calculator</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Instrument</div>
                <input className="field" placeholder="e.g. NIFTY 24500 CE" value={calc.instrument} onChange={e => setCalc(f => ({ ...f, instrument: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  Lots {cLotSize ? <span style={{ color: C.gold }}>/{cLotSize}</span> : ""}
                </div>
                <input className="field" placeholder="# lots" type="number" min="1" value={calc.lots} onChange={e => setCalc(f => ({ ...f, lots: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["entry", "Entry", "₹ price"], ["target", "Target", "₹ target"], ["stop", "Stop loss", "₹ stop"]].map(([key, label, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <input className="field" placeholder={ph} type="number" value={calc[key]} onChange={e => setCalc(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>

            {(cCapital || cRisk || cReward) ? (
              <div style={{ borderRadius: 8, border: `1.5px solid ${C.border}`, overflow: "hidden", marginTop: 4 }}>
                <div style={{ background: C.goldLight, padding: "10px 16px", fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Results</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  {cLotSize && cQty && <StatCell label="Lot size" value={`${cLotSize} qty/lot`} />}
                  {cQty && <StatCell label="Total qty" value={`${cQty} shares`} />}
                  {cCapital && <StatCell label="Capital used" value={fmt(cCapital)} highlight big />}
                  {cRisk && <StatCell label="Max risk" value={fmt(cRisk)} bad big />}
                  {cReward && <StatCell label="Max reward" value={fmt(cReward)} good big />}
                  {cRR && (
                    <StatCell
                      label="R:R ratio"
                      value={`1 : ${cRR}`}
                      highlight={Number(cRR) >= 2}
                      bad={Number(cRR) < 1}
                      big
                      note={Number(cRR) >= 2 ? "Good setup" : Number(cRR) < 1 ? "Poor R:R" : "Acceptable"}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: C.faint, fontSize: 12, padding: "1.5rem 0", border: `1.5px dashed ${C.border}`, borderRadius: 8 }}>
                Fill instrument + lots + entry to see capital.<br />Add target & stop for R:R.
              </div>
            )}

            <button onClick={() => setCalc(EMPTY_CALC)} className="btn" style={{ padding: "8px", background: C.bg, color: C.muted, fontSize: 11, border: `1.5px solid ${C.border}`, letterSpacing: 1 }}>
              clear
            </button>
          </div>
        </div>
      )}

      {/* TODAY'S LOG */}
      {screen === "log" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>
            Today · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          {trades.length === 0 ? (
            <div style={{ textAlign: "center", color: C.faint, fontSize: 13, padding: "2rem 0" }}>No trades logged yet today.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trades.map((t, i) => <TradeCard key={t.id} t={t} i={i} />)}
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {screen === "history" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase" }}>Previous days</div>
            <button onClick={refreshHistory} className="btn" style={{ padding: "4px 10px", fontSize: 10, background: C.bg, color: C.muted, border: `1.5px solid ${C.border}`, letterSpacing: 1 }}>↻ refresh</button>
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: C.faint, fontSize: 13, padding: "2rem 0" }}>No previous days found.<br />Past trades will appear here.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(day => {
                const label = new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
                const isOpen = expandedDay === day.date;
                const wins = day.trades.filter(t => t.result && t.result.startsWith("+")).length;
                const losses = day.trades.filter(t => t.result && t.result.startsWith("-")).length;
                return (
                  <div key={day.date} className="day-card">
                    <div className="day-header" onClick={() => setExpandedDay(isOpen ? null : day.date)}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {day.trades.length} trade{day.trades.length !== 1 ? "s" : ""}
                          {wins > 0 && <span style={{ color: C.green, marginLeft: 8 }}>+{wins}W</span>}
                          {losses > 0 && <span style={{ color: C.red, marginLeft: 6 }}>−{losses}L</span>}
                        </div>
                      </div>
                      <span style={{ color: C.faint, fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: `1.5px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
                        {day.trades.map((t, i) => <TradeCard key={t.id} t={t} i={i} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS */}
      {screen === "settings" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>Settings</div>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "1.5rem", background: C.surface }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Daily trade limit</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setLimit(limit - 1)} className="btn" style={{ width: 38, height: 38, background: C.bg, color: C.muted, fontSize: 20, border: `1.5px solid ${C.border}` }}>−</button>
                <div style={{ flex: 1, textAlign: "center", fontSize: 32, fontWeight: 700, color: C.gold, fontFamily: "'Space Mono', monospace" }}>{limit}</div>
                <button onClick={() => setLimit(limit + 1)} className="btn" style={{ width: 38, height: 38, background: C.bg, color: C.muted, fontSize: 20, border: `1.5px solid ${C.border}` }}>+</button>
              </div>
              <div style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8 }}>Your data suggests 3–5 is optimal</div>
            </div>
            <div style={{ height: 1, background: C.border, margin: "1.5rem 0" }} />
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
              Trades reset automatically each day.<br />
              All data is stored locally on this device.
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <button onClick={handleReset} className="btn" style={{ padding: "8px 16px", background: C.bg, color: C.red, fontSize: 11, border: `1.5px solid ${C.border}`, letterSpacing: 1 }}>
                reset today's trades
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, highlight, bad, good, big, note }) {
  const C = { gold: "#b8860b", goldLight: "#fdf6e3", red: "#c0392b", redLight: "#fdf0ee", green: "#27ae60", greenLight: "#eafaf1", border: "#e0ddd5", muted: "#888880", text: "#1a1a1a" };
  const bg = highlight ? C.goldLight : bad ? C.redLight : good ? C.greenLight : "#fff";
  const color = highlight ? C.gold : bad ? C.red : good ? C.green : C.muted;
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, background: bg }}>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: big ? 16 : 13, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      {note && <div style={{ fontSize: 9, color, marginTop: 2, letterSpacing: 1 }}>{note}</div>}
    </div>
  );
}

function TradeCard({ t, i }) {
  const C = { surface: "#ffffff", border: "#e0ddd5", border2: "#ece9e2", text: "#1a1a1a", muted: "#888880", faint: "#b0aca0", gold: "#b8860b", goldLight: "#fdf6e3", red: "#c0392b", green: "#27ae60", bg: "#f5f4f0" };
  const lotSize = getLotSize(t.instrument);
  const qty = t.lots && lotSize ? Number(t.lots) * lotSize : null;
  const capital = qty && t.entry ? qty * Number(t.entry) : null;
  const risk = qty && t.entry && t.stop ? qty * Math.abs(Number(t.entry) - Number(t.stop)) : null;
  const reward = qty && t.entry && t.target ? qty * Math.abs(Number(t.target) - Number(t.entry)) : null;
  const rr = risk && reward ? (reward / risk).toFixed(2) : null;

  return (
    <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "1rem", background: C.surface }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: C.gold, fontWeight: 700, fontSize: 14 }}>#{i + 1} · {t.instrument}</span>
        <span style={{ color: C.faint, fontSize: 11 }}>{t.time}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[["Entry", t.entry], ["Target", t.target], ["Stop", t.stop]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: C.faint, letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: 13, color: C.muted }}>₹{v}</div>
          </div>
        ))}
      </div>
      {(t.lots || capital) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {t.lots && <Tag>{t.lots} lot{t.lots > 1 ? "s" : ""}{qty ? ` = ${qty} qty` : ""}</Tag>}
          {capital && <Tag gold>Capital: {fmt(capital)}</Tag>}
          {risk && <Tag red>Risk: {fmt(risk)}</Tag>}
          {reward && <Tag green>Reward: {fmt(reward)}</Tag>}
          {rr && <Tag highlight={Number(rr) >= 2}>R:R 1:{rr}</Tag>}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, borderTop: `1px solid ${C.border2}`, paddingTop: 8 }}>{t.rationale}</div>
      {t.result && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: t.result.startsWith("+") ? C.green : t.result.startsWith("-") ? C.red : C.muted }}>
          → {t.result}
        </div>
      )}
    </div>
  );
}

function Tag({ children, gold, red, green, highlight }) {
  const bg = gold || highlight ? "#fdf6e3" : red ? "#fdf0ee" : green ? "#eafaf1" : "#f5f4f0";
  const color = gold || highlight ? "#b8860b" : red ? "#c0392b" : green ? "#27ae60" : "#888880";
  return (
    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: bg, color, fontWeight: 700, letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
