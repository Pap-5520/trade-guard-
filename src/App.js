import { useState, useEffect } from "react";

const TODAY = new Date().toISOString().split("T")[0];
const STORAGE_KEY = `trades:${TODAY}`;
const SETTINGS_KEY = "trader:settings";
const CHECKLIST_KEY = `checklist:${TODAY}`;

const DISCIPLINE_QUESTIONS = [
  { id: "plan",     q: "I followed my trading plan on every trade" },
  { id: "stops",    q: "I respected my stop losses without moving them" },
  { id: "setup",    q: "I only took A+ setups I had pre-planned" },
  { id: "sizing",   q: "I kept my position size within my risk limit" },
  { id: "revenge",  q: "I did not revenge trade after a loss" },
  { id: "fomo",     q: "I was not driven by FOMO or panic" },
  { id: "screen",   q: "I stepped away from the screen after my last trade" },
];

const EMPTY_CHECKLIST = {
  answers: Object.fromEntries(DISCIPLINE_QUESTIONS.map(q => [q.id, null])),
  notes: "",
  submittedAt: null,
};

function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : { trades: [], date: TODAY }; }
  catch { return { trades: [], date: TODAY }; }
}
function loadSettings() {
  try { const r = localStorage.getItem(SETTINGS_KEY); return r ? JSON.parse(r) : { limit: 5 }; }
  catch { return { limit: 5 }; }
}
function loadTodayChecklist() {
  try { const r = localStorage.getItem(CHECKLIST_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function loadHistory() {
  const days = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("trades:") && key !== STORAGE_KEY) {
      try {
        const d = JSON.parse(localStorage.getItem(key));
        if (d && d.trades && d.trades.length > 0) {
          const date = key.replace("trades:", "");
          const checklist = (() => { try { const r = localStorage.getItem(`checklist:${date}`); return r ? JSON.parse(r) : null; } catch { return null; } })();
          days.push({ ...d, checklist });
        }
      } catch {}
    }
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
function saveChecklist(c) { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(c)); }

const LOT_SIZES = { SENSEX: 20, NIFTY: 65 };
function getLotSize(instrument) {
  const u = (instrument || "").toUpperCase();
  if (u.includes("SENSEX")) return LOT_SIZES.SENSEX;
  if (u.includes("NIFTY")) return LOT_SIZES.NIFTY;
  return null;
}
const EMPTY_FORM = { instrument: "", entry: "", target: "", stop: "", rationale: "", result: "", lots: "" };
const EMPTY_CALC = { instrument: "", entry: "", target: "", stop: "", lots: "" };

const C = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e0ddd5", border2: "#ece9e2",
  text: "#1a1a1a", muted: "#888880", faint: "#b0aca0",
  gold: "#b8860b", goldLight: "#fdf6e3",
  red: "#c0392b", redLight: "#fdf0ee",
  green: "#27ae60", greenLight: "#eafaf1",
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
  const [checklist, setChecklist] = useState(() => loadTodayChecklist() || EMPTY_CHECKLIST);
  const [checklistDone, setChecklistDone] = useState(() => !!loadTodayChecklist()?.submittedAt);

  const trades = data.trades;
  const limit = settings.limit;
  const remaining = limit - trades.length;
  const isBlocked = remaining <= 0;

  useEffect(() => {
    if (isBlocked) {
      setScreen(checklistDone ? "blocked" : "checklist");
    }
  }, [isBlocked, checklistDone]);

  function handleLog() {
    const { instrument, entry, target, stop, rationale } = form;
    if (!instrument || !entry || !target || !stop || !rationale) {
      setShake(true); setTimeout(() => setShake(false), 500); return;
    }
    const newTrade = { ...form, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), id: Date.now() };
    const newData = { ...data, trades: [...trades, newTrade] };
    setData(newData); saveData(newData); setForm(EMPTY_FORM);
    setShowSuccess(true); setTimeout(() => setShowSuccess(false), 1800);
    if (newData.trades.length >= limit) setScreen(checklistDone ? "blocked" : "checklist");
  }

  function handleReset() {
    const newData = { trades: [], date: TODAY };
    setData(newData); saveData(newData); setScreen("main");
  }

  function setLimit(val) {
    const n = Math.max(1, Math.min(20, Number(val)));
    const s = { ...settings, limit: n }; setSettings(s); saveSettings(s);
  }

  function handleChecklistAnswer(id, val) {
    setChecklist(c => ({ ...c, answers: { ...c.answers, [id]: val } }));
  }

  function handleChecklistSubmit() {
    const submitted = { ...checklist, submittedAt: new Date().toISOString() };
    saveChecklist(submitted); setChecklist(submitted); setChecklistDone(true); setScreen("blocked");
  }

  function refreshHistory() { setHistory(loadHistory()); }

  const bullets = Array.from({ length: limit }, (_, i) => i < trades.length);
  const tabs = ["main", "calc", "log", "history", "settings"];

  const formLotSize = getLotSize(form.instrument);
  const formQty = form.lots && formLotSize ? Number(form.lots) * formLotSize : null;
  const formCapital = formQty && form.entry ? formQty * Number(form.entry) : null;
  const formRisk = formQty && form.entry && form.stop ? formQty * Math.abs(Number(form.entry) - Number(form.stop)) : null;
  const formReward = formQty && form.entry && form.target ? formQty * Math.abs(Number(form.target) - Number(form.entry)) : null;
  const formRR = formRisk && formReward ? (formReward / formRisk).toFixed(2) : null;

  const cLotSize = getLotSize(calc.instrument);
  const cQty = calc.lots && cLotSize ? Number(calc.lots) * cLotSize : calc.lots ? Number(calc.lots) : null;
  const cCapital = cQty && calc.entry ? cQty * Number(calc.entry) : null;
  const cRisk = cQty && calc.entry && calc.stop ? cQty * Math.abs(Number(calc.entry) - Number(calc.stop)) : null;
  const cReward = cQty && calc.entry && calc.target ? cQty * Math.abs(Number(calc.target) - Number(calc.entry)) : null;
  const cRR = cRisk && cReward ? (cReward / cRisk).toFixed(2) : null;

  const answeredCount = Object.values(checklist.answers).filter(v => v !== null).length;
  const yesCount = Object.values(checklist.answers).filter(v => v === true).length;
  const disciplineScore = checklistDone ? Math.round((yesCount / DISCIPLINE_QUESTIONS.length) * 100) : null;

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5px solid ${C.border}`, paddingBottom: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 10, color: C.faint, letterSpacing: 3, textTransform: "uppercase" }}>Trade Guard</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.gold, fontFamily: "'Space Mono', monospace" }}>Discipline Terminal</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {tabs.map(s => (
              <button key={s}
                onClick={() => { if (!isBlocked || s === "history" || s === "calc" || (s === "checklist" && isBlocked)) setScreen(s); }}
                className="btn"
                style={{ padding: "6px 8px", fontSize: 10, background: screen === s ? C.goldLight : "transparent", color: screen === s ? C.gold : C.faint, border: `1.5px solid ${screen === s ? C.gold : "transparent"}`, letterSpacing: 1 }}>
                {s === "main" ? "NEW" : s === "calc" ? "CALC" : s === "log" ? "LOG" : s === "history" ? "HIST" : "SET"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase" }}>Daily bullets</span>
            <span style={{ fontSize: 11, color: remaining > 0 ? C.gold : C.red, letterSpacing: 1, fontWeight: 700 }}>
              {remaining > 0 ? `${remaining} remaining` : "LIMIT REACHED"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {bullets.map((used, i) => <div key={i} style={{ flex: 1, height: 7, borderRadius: 3, background: used ? C.border : C.gold, transition: "background 0.3s" }} />)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: C.faint }}>0</span>
            <span style={{ fontSize: 10, color: C.muted }}>{trades.length}/{limit} used today</span>
            <span style={{ fontSize: 10, color: C.faint }}>{limit}</span>
          </div>
        </div>
      </div>

      {/* DISCIPLINE CHECKLIST */}
      {screen === "checklist" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: "hidden" }}>
            <div style={{ background: C.goldLight, padding: "1.25rem 1.5rem", borderBottom: `1.5px solid ${C.border}` }}>
              <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>End of day</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'Space Mono', monospace" }}>Discipline Check</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Answer honestly. This is for your growth, not judgment.</div>
            </div>
            <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: 0 }}>
              {DISCIPLINE_QUESTIONS.map((item, i) => {
                const ans = checklist.answers[item.id];
                return (
                  <div key={item.id} style={{ padding: "14px 0", borderBottom: i < DISCIPLINE_QUESTIONS.length - 1 ? `1px solid ${C.border2}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, flex: 1 }}>{item.q}</div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleChecklistAnswer(item.id, true)} className="btn"
                        style={{ padding: "5px 14px", fontSize: 11, background: ans === true ? C.green : C.bg, color: ans === true ? "#fff" : C.muted, border: `1.5px solid ${ans === true ? C.green : C.border}` }}>
                        Yes
                      </button>
                      <button onClick={() => handleChecklistAnswer(item.id, false)} className="btn"
                        style={{ padding: "5px 14px", fontSize: 11, background: ans === false ? C.red : C.bg, color: ans === false ? "#fff" : C.muted, border: `1.5px solid ${ans === false ? C.red : C.border}` }}>
                        No
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "0 1.5rem 1rem" }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Reflection / notes</div>
              <textarea className="field" placeholder="What went well? What would you do differently tomorrow?" rows={3}
                value={checklist.notes} onChange={e => setChecklist(c => ({ ...c, notes: e.target.value }))} style={{ resize: "none" }} />
            </div>
            <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, fontSize: 11, color: C.faint }}>{answeredCount}/{DISCIPLINE_QUESTIONS.length} answered</div>
              <button onClick={handleChecklistSubmit} className="btn"
                style={{ padding: "12px 24px", background: answeredCount === DISCIPLINE_QUESTIONS.length ? C.gold : C.border, color: answeredCount === DISCIPLINE_QUESTIONS.length ? "#fff" : C.faint, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>
                Submit & lock day →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCKED */}
      {screen === "blocked" && (
        <div className="fade-in" style={{ width: "100%", maxWidth: 500, padding: "0 1.5rem" }}>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "2rem", background: C.surface, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: "0.75rem" }}>🚫</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.red, marginBottom: "0.5rem", fontFamily: "'Space Mono', monospace" }}>TERMINAL LOCKED</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: "1.5rem" }}>
              You've hit your {limit}-trade limit for today.<br />
              <span style={{ color: C.gold, fontWeight: 700 }}>Come back tomorrow.</span>
            </div>
            {disciplineScore !== null && (
              <div style={{ background: disciplineScore >= 80 ? C.greenLight : disciplineScore >= 50 ? C.goldLight : C.redLight, border: `1.5px solid ${disciplineScore >= 80 ? "#a9dfbf" : disciplineScore >= 50 ? "#f0d080" : "#f0b0a0"}`, borderRadius: 8, padding: "12px 16px", marginBottom: "1.5rem" }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Today's discipline score</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: disciplineScore >= 80 ? C.green : disciplineScore >= 50 ? C.gold : C.red, fontFamily: "'Space Mono', monospace" }}>{disciplineScore}%</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{yesCount}/{DISCIPLINE_QUESTIONS.length} disciplines held</div>
              </div>
            )}
            <div style={{ fontSize: 11, color: C.faint, letterSpacing: 1, marginBottom: "1.5rem" }}>Trades today: {trades.length}</div>
            <div style={{ height: 1, background: C.border, marginBottom: "1.5rem" }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setScreen("log")} className="btn" style={{ padding: "9px 16px", background: C.bg, color: C.muted, fontSize: 11, border: `1.5px solid ${C.border}` }}>today's log</button>
              <button onClick={() => setScreen("history")} className="btn" style={{ padding: "9px 16px", background: C.bg, color: C.muted, fontSize: 11, border: `1.5px solid ${C.border}` }}>history</button>
              <button onClick={() => setScreen("calc")} className="btn" style={{ padding: "9px 16px", background: C.bg, color: C.muted, fontSize: 11, border: `1.5px solid ${C.border}` }}>calculator</button>
              {checklistDone && <button onClick={() => setScreen("checklist")} className="btn" style={{ padding: "9px 16px", background: C.goldLight, color: C.gold, fontSize: 11, border: `1.5px solid ${C.gold}` }}>view checklist</button>}
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
          <div style={{ fontSize: 10, color: C.faint, letterSpacing: 2, textTransform: "uppercase", marginBottom: "1rem" }}>Pre-trade checklist — fill all fields to proceed</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Instrument</div>
                <input className="field" placeholder="e.g. NIFTY 24500 CE" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Lots {formLotSize ? <span style={{ color: C.gold }}>/{formLotSize}</span> : ""}</div>
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
            {remaining === 1 && <div className="pulse" style={{ textAlign: "center", fontSize: 11, color: C.red, letterSpacing: 1, fontWeight: 700 }}>⚠ this is your last trade today</div>}
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
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Lots {cLotSize ? <span style={{ color: C.gold }}>/{cLotSize}</span> : ""}</div>
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
                  {cRR && <StatCell label="R:R ratio" value={`1 : ${cRR}`} highlight={Number(cRR) >= 2} bad={Number(cRR) < 1} big note={Number(cRR) >= 2 ? "Good setup" : Number(cRR) < 1 ? "Poor R:R" : "Acceptable"} />}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: C.faint, fontSize: 12, padding: "1.5rem 0", border: `1.5px dashed ${C.border}`, borderRadius: 8 }}>
                Fill instrument + lots + entry to see capital.<br />Add target & stop for R:R.
              </div>
            )}
            <button onClick={() => setCalc(EMPTY_CALC)} className="btn" style={{ padding: "8px", background: C.bg, color: C.muted, fontSize: 11, border: `1.5px solid ${C.border}`, letterSpacing: 1 }}>clear</button>
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
              {checklistDone && <ChecklistView checklist={checklist} />}
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
                const dayYes = day.checklist ? Object.values(day.checklist.answers).filter(v => v === true).length : null;
                const dayScore = dayYes !== null ? Math.round((dayYes / DISCIPLINE_QUESTIONS.length) * 100) : null;
                return (
                  <div key={day.date} className="day-card">
                    <div className="day-header" onClick={() => setExpandedDay(isOpen ? null : day.date)}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, display: "flex", gap: 10, alignItems: "center" }}>
                          <span>{day.trades.length} trade{day.trades.length !== 1 ? "s" : ""}</span>
                          {wins > 0 && <span style={{ color: C.green }}>+{wins}W</span>}
                          {losses > 0 && <span style={{ color: C.red }}>−{losses}L</span>}
                          {dayScore !== null && <span style={{ color: dayScore >= 80 ? C.green : dayScore >= 50 ? C.gold : C.red }}>Discipline {dayScore}%</span>}
                        </div>
                      </div>
                      <span style={{ color: C.faint, fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div style={{ borderTop: `1.5px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
                        {day.trades.map((t, i) => <TradeCard key={t.id} t={t} i={i} />)}
                        {day.checklist && <ChecklistView checklist={day.checklist} />}
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
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>Trades reset automatically each day.<br />All data is stored locally on this device.</div>
            <div style={{ marginTop: "1.5rem" }}>
              <button onClick={handleReset} className="btn" style={{ padding: "8px 16px", background: C.bg, color: C.red, fontSize: 11, border: `1.5px solid ${C.border}`, letterSpacing: 1 }}>reset today's trades</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistView({ checklist }) {
  const yesCount = Object.values(checklist.answers).filter(v => v === true).length;
  const score = Math.round((yesCount / DISCIPLINE_QUESTIONS.length) * 100);
  const scoreColor = score >= 80 ? "#27ae60" : score >= 50 ? "#b8860b" : "#c0392b";
  return (
    <div style={{ border: "1.5px solid #e0ddd5", borderRadius: 8, background: "#ffffff", overflow: "hidden", marginTop: 4 }}>
      <div style={{ background: "#fdf6e3", padding: "10px 16px", borderBottom: "1px solid #e0ddd5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: "#b8860b", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Discipline Checklist</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor, fontFamily: "'Space Mono', monospace" }}>{score}%</div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {DISCIPLINE_QUESTIONS.map((item, i) => {
          const ans = checklist.answers[item.id];
          return (
            <div key={item.id} style={{ padding: "10px 0", borderBottom: i < DISCIPLINE_QUESTIONS.length - 1 ? "1px solid #ece9e2" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 11, color: "#1a1a1a", flex: 1 }}>{item.q}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: ans === true ? "#27ae60" : ans === false ? "#c0392b" : "#b0aca0", flexShrink: 0 }}>
                {ans === true ? "✓ Yes" : ans === false ? "✗ No" : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {checklist.notes && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid #ece9e2", background: "#f5f4f0" }}>
          <div style={{ fontSize: 9, color: "#b0aca0", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Reflection</div>
          <div style={{ fontSize: 11, color: "#888880", lineHeight: 1.6 }}>{checklist.notes}</div>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, highlight, bad, good, big, note }) {
  const bg = highlight ? "#fdf6e3" : bad ? "#fdf0ee" : good ? "#eafaf1" : "#fff";
  const color = highlight ? "#b8860b" : bad ? "#c0392b" : good ? "#27ae60" : "#888880";
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0ddd5", borderRight: "1px solid #e0ddd5", background: bg }}>
      <div style={{ fontSize: 9, color: "#888880", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: big ? 16 : 13, fontWeight: 700, color, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      {note && <div style={{ fontSize: 9, color, marginTop: 2, letterSpacing: 1 }}>{note}</div>}
    </div>
  );
}

function TradeCard({ t, i }) {
  const lotSize = getLotSize(t.instrument);
  const qty = t.lots && lotSize ? Number(t.lots) * lotSize : null;
  const capital = qty && t.entry ? qty * Number(t.entry) : null;
  const risk = qty && t.entry && t.stop ? qty * Math.abs(Number(t.entry) - Number(t.stop)) : null;
  const reward = qty && t.entry && t.target ? qty * Math.abs(Number(t.target) - Number(t.entry)) : null;
  const rr = risk && reward ? (reward / risk).toFixed(2) : null;
  return (
    <div style={{ border: "1.5px solid #e0ddd5", borderRadius: 8, padding: "1rem", background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#b8860b", fontWeight: 700, fontSize: 14 }}>#{i + 1} · {t.instrument}</span>
        <span style={{ color: "#b0aca0", fontSize: 11 }}>{t.time}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[["Entry", t.entry], ["Target", t.target], ["Stop", t.stop]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: "#b0aca0", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: 13, color: "#888880" }}>₹{v}</div>
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
      <div style={{ fontSize: 11, color: "#888880", lineHeight: 1.6, borderTop: "1px solid #ece9e2", paddingTop: 8 }}>{t.rationale}</div>
      {t.result && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: t.result.startsWith("+") ? "#27ae60" : t.result.startsWith("-") ? "#c0392b" : "#888880" }}>
          → {t.result}
        </div>
      )}
    </div>
  );
}

function Tag({ children, gold, red, green, highlight }) {
  const bg = gold || highlight ? "#fdf6e3" : red ? "#fdf0ee" : green ? "#eafaf1" : "#f5f4f0";
  const color = gold || highlight ? "#b8860b" : red ? "#c0392b" : green ? "#27ae60" : "#888880";
  return <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: bg, color, fontWeight: 700, letterSpacing: 0.5 }}>{children}</span>;
}

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }); }
