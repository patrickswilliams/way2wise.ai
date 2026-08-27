import { useState, useEffect, useCallback } from "react";

// ——— Design tokens: "supper club ballot" ———
const T = {
  paper: "#FBF7EF",
  ink: "#22301F",
  forest: "#2E4B34",
  marigold: "#E0A428",
  brick: "#B4482B",
  faint: "#8A9184",
  line: "#D8D2C4",
};

const AREAS = [
  {
    name: "Downtown LA",
    spots: [
      { id: "sincerely-yours", label: "Sincerely Yours", phone: "(213) 573-4548", site: "sincerelyyours.la" },
      { id: "perch", label: "Perch", phone: "(213) 802-1770", site: "perchla.com" },
      { id: "settecento", label: "Settecento DTLA", phone: "(213) 757-7765", site: "settecentodtla.com" },
    ],
  },
  {
    name: "Santa Monica",
    spots: [
      { id: "courtyard-kitchen", label: "The Courtyard Kitchen", phone: "(310) 587-2333", site: "courtyardkitchenla.com" },
      { id: "elephante", label: "Élephante", phone: "(424) 320-2384", site: "elephanterestaurants.com" },
    ],
  },
  {
    name: "Culver City",
    spots: [
      { id: "hatchet-hall", label: "Hatchet Hall", phone: "(310) 391-4222", site: "hatchethallla.com" },
      { id: "fathers-office", label: "Father's Office", phone: "(310) 736-2224", site: "fathersoffice.com" },
    ],
  },
];

const ALL_SPOTS = AREAS.flatMap((a) => a.spots);
const spotLabel = (id) => ALL_SPOTS.find((s) => s.id === id)?.label || id;

export default function DinnerVote() {
  const [name, setName] = useState("");
  const [choice, setChoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [votes, setVotes] = useState([]);
  const [tallyState, setTallyState] = useState("loading"); // loading | ready | error
  const [tallyNote, setTallyNote] = useState("");

  // ——— Load the live tally ———
  const loadTally = useCallback(async () => {
    setTallyState("loading");
    setTallyNote("");
    let keys = [];
    try {
      const listed = await window.storage.list("rsvp:", true);
      keys = listed?.keys || [];
    } catch (e) {
      // A missing prefix just means nobody has voted yet — that's not an error.
      keys = [];
    }

    if (keys.length === 0) {
      setVotes([]);
      setTallyState("ready");
      return;
    }

    const collected = [];
    let failures = 0;
    for (const key of keys) {
      try {
        const rec = await window.storage.get(key, true);
        if (rec?.value) {
          const v = JSON.parse(rec.value);
          if (v && v.choice) collected.push(v);
        }
      } catch (e) {
        failures += 1; // skip unreadable records, keep going
      }
    }

    if (collected.length === 0 && failures === keys.length) {
      // Everything failed — that's a real load problem.
      setTallyState("error");
      return;
    }

    setVotes(collected);
    if (failures > 0) setTallyNote(`${failures} vote${failures === 1 ? "" : "s"} couldn't be read and ${failures === 1 ? "was" : "were"} skipped.`);
    setTallyState("ready");
  }, []);

  useEffect(() => {
    loadTally();
  }, [loadTally]);

  // ——— Save an RSVP ———
  const saveRsvp = async () => {
    if (!choice) {
      setSaveError("Pick a restaurant first.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const voter = name.trim() || "Anonymous";
    const record = { name: voter, choice, at: Date.now() };
    const key = `rsvp:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const result = await window.storage.set(key, JSON.stringify(record), true);
      if (!result) throw new Error("no result");
      setSaved(true);
      loadTally();
    } catch (e) {
      setSaveError("Your vote didn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  // ——— Tally math ———
  const counts = {};
  votes.forEach((v) => {
    counts[v.choice] = counts[v.choice] || { count: 0, names: [] };
    counts[v.choice].count += 1;
    counts[v.choice].names.push(v.name);
  });
  const ranked = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  const maxCount = ranked.length ? ranked[0][1].count : 0;

  return (
    <div style={{ background: T.paper, minHeight: "100vh", color: T.ink, fontFamily: "'Public Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Public+Sans:wght@400;600;700&display=swap');
        .spot-row { transition: background 0.15s ease; }
        .spot-row:hover { background: rgba(46,75,52,0.06); }
        .spot-row:focus-visible { outline: 2px solid ${T.forest}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .spot-row { transition: none; } }
        .leader { flex: 1; border-bottom: 2px dotted ${T.line}; margin: 0 10px 5px; }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 64px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: T.faint, fontWeight: 600 }}>
            Tonight's ballot
          </div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: 40, margin: "6px 0 4px" }}>
            Dinner Vote
          </h1>
          <div style={{ fontSize: 14, color: T.faint }}>
            Seven spots, three neighborhoods, one table.
          </div>
        </div>

        {/* Name */}
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So we know who's coming"
            style={{
              display: "block", width: "100%", boxSizing: "border-box", marginTop: 6,
              padding: "10px 12px", fontSize: 15, border: `1.5px solid ${T.line}`,
              borderRadius: 8, background: "#fff", color: T.ink, fontFamily: "inherit",
            }}
          />
        </label>

        {/* Menu */}
        <div style={{ marginTop: 20, border: `1.5px solid ${T.line}`, borderRadius: 12, background: "#FFFDF8", padding: "8px 0" }}>
          {AREAS.map((area) => (
            <div key={area.name} style={{ padding: "10px 18px 4px" }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, fontWeight: 700, color: T.forest, borderBottom: `1.5px solid ${T.line}`, paddingBottom: 6, marginBottom: 4 }}>
                {area.name}
              </div>
              {area.spots.map((s) => {
                const active = choice === s.id;
                return (
                  <button
                    key={s.id}
                    className="spot-row"
                    onClick={() => { setChoice(s.id); setSaved(false); setSaveError(null); }}
                    style={{
                      display: "flex", alignItems: "flex-end", width: "100%", textAlign: "left",
                      background: active ? "rgba(224,164,40,0.16)" : "transparent",
                      border: "none", borderRadius: 8, padding: "10px 8px", cursor: "pointer",
                      color: T.ink, fontFamily: "inherit",
                    }}
                  >
                    <span style={{ width: 20, fontSize: 15, color: active ? T.brick : T.line }}>
                      {active ? "●" : "○"}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{s.label}</span>
                    <span className="leader" aria-hidden="true"></span>
                    <span style={{ fontSize: 12.5, color: T.faint, whiteSpace: "nowrap" }}>
                      {s.phone} · {s.site}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={saveRsvp}
          disabled={saving}
          style={{
            display: "block", width: "100%", marginTop: 18, padding: "13px 0",
            background: saving ? T.faint : T.forest, color: T.paper, fontWeight: 700,
            fontSize: 15, border: "none", borderRadius: 10, cursor: saving ? "wait" : "pointer",
            fontFamily: "inherit", letterSpacing: "0.02em",
          }}
        >
          {saving ? "Saving…" : "Save my RSVP"}
        </button>

        {saveError && (
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(180,72,43,0.1)", color: T.brick, fontSize: 14 }}>
            {saveError}{" "}
            <button onClick={saveRsvp} style={{ background: "none", border: "none", color: T.brick, fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              Retry
            </button>
          </div>
        )}
        {saved && (
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(46,75,52,0.1)", color: T.forest, fontSize: 14, fontWeight: 600 }}>
            RSVP saved — you're in for {spotLabel(choice)}.
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: T.faint, textAlign: "center" }}>
          Votes are shared: everyone using this widget can see names and picks.
        </div>

        {/* Live tally */}
        <div style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `2px solid ${T.ink}`, paddingBottom: 6 }}>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, fontWeight: 700, margin: 0 }}>Live tally</h2>
            <button
              onClick={loadTally}
              style={{ background: "none", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: T.forest, cursor: "pointer", fontFamily: "inherit" }}
            >
              Refresh
            </button>
          </div>

          {tallyState === "loading" && (
            <div style={{ padding: "18px 4px", fontSize: 14, color: T.faint }}>Counting votes…</div>
          )}

          {tallyState === "error" && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 8, background: "rgba(180,72,43,0.1)", color: T.brick, fontSize: 14 }}>
              The tally didn't load.{" "}
              <button onClick={loadTally} style={{ background: "none", border: "none", color: T.brick, fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                Try again
              </button>
            </div>
          )}

          {tallyState === "ready" && ranked.length === 0 && (
            <div style={{ padding: "18px 4px", fontSize: 14, color: T.faint }}>
              No votes yet — cast the first one above.
            </div>
          )}

          {tallyState === "ready" && ranked.length > 0 && (
            <div style={{ paddingTop: 12 }}>
              {ranked.map(([id, info]) => (
                <div key={id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{spotLabel(id)}</span>
                    <span style={{ fontWeight: 700, color: T.forest }}>
                      {info.count} vote{info.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div style={{ height: 10, background: "rgba(216,210,196,0.5)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(info.count / Math.max(maxCount, 1)) * 100}%`, background: info.count === maxCount ? T.marigold : T.forest, borderRadius: 6 }} />
                  </div>
                  <div style={{ fontSize: 12, color: T.faint, marginTop: 3 }}>{info.names.join(", ")}</div>
                </div>
              ))}
              {tallyNote && <div style={{ fontSize: 12, color: T.faint }}>{tallyNote}</div>}
              <div style={{ fontSize: 13, color: T.faint, marginTop: 6 }}>
                {votes.length} RSVP{votes.length === 1 ? "" : "s"} total
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
