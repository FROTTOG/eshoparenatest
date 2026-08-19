import { useEffect, useMemo, useState } from "react";
import { api, type PickupPoint } from "../api";
import { pointTypeLabel } from "../format";

const CZ: [number, number][] = [
  [50.323, 12.09],
  [50.45, 12.28],
  [50.62, 12.9],
  [50.78, 13.85],
  [50.9, 14.28],
  [51.055, 14.316],
  [50.96, 14.72],
  [50.83, 15.35],
  [50.76, 15.55],
  [50.52, 16.15],
  [50.32, 16.45],
  [50.24, 16.95],
  [50.2, 17.55],
  [50.05, 17.88],
  [49.91, 18.36],
  [49.82, 18.859],
  [49.58, 18.78],
  [49.39, 18.55],
  [49.05, 18.0],
  [48.82, 17.2],
  [48.617, 16.95],
  [48.552, 16.88],
  [48.68, 16.15],
  [48.82, 15.55],
  [48.9, 14.35],
  [48.78, 13.95],
  [49.12, 13.25],
  [49.38, 12.78],
  [49.62, 12.52],
  [49.88, 12.35],
  [50.15, 12.2],
];

const B = { minLat: 48.52, maxLat: 51.1, minLng: 12.02, maxLng: 18.92 };
const W = 800;
const H = 520;

function xy(lat: number, lng: number) {
  return {
    x: ((lng - B.minLng) / (B.maxLng - B.minLng)) * W,
    y: ((B.maxLat - lat) / (B.maxLat - B.minLat)) * H,
  };
}

function typeColor(t: string) {
  if (t === "zbox") return "#b54a2c";
  if (t === "balikovna") return "#c4a574";
  return "#24352c";
}

export function MapPicker({
  type,
  selected,
  onSelect,
  onClose,
}: {
  type?: string;
  selected?: PickupPoint | null;
  onSelect: (p: PickupPoint) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(type || "");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFilter(type || "");
  }, [type]);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (filter) qs.set("type", filter);
      void api<PickupPoint[]>(`/pickup-points?${qs}`).then(setPoints);
    }, 120);
    return () => clearTimeout(t);
  }, [q, filter]);

  const path = useMemo(() => CZ.map(([la, ln], i) => `${i ? "L" : "M"} ${xy(la, ln).x.toFixed(1)} ${xy(la, ln).y.toFixed(1)}`).join(" ") + " Z", []);

  async function nearest() {
    setBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 })
      );
      const qs = new URLSearchParams({
        lat: String(pos.coords.latitude),
        lng: String(pos.coords.longitude),
      });
      if (filter) qs.set("type", filter);
      const rows = await api<PickupPoint[]>(`/pickup-points?${qs}`);
      setPoints(rows);
    } catch {
      alert("Polohu se nepodařilo zjistit. Povolte ji v prohlížeči, nebo hledejte město ručně.");
    } finally {
      setBusy(false);
    }
  }

  const locked = Boolean(type);

  return (
    <div className="map-modal" onClick={onClose} role="dialog" aria-label="Výběr výdejního místa">
      <div className="map-box" onClick={(e) => e.stopPropagation()}>
        <div className="map-side">
          <header>
            <h3>Výdejní místo</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Město, ulice, PSČ…"
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}
            />
            <div className="map-filters">
              {[
                ["", "Vše"],
                ["zbox", "Z-BOX"],
                ["branch", "Zásilkovna"],
                ["balikovna", "Balíkovna"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={`chip ${filter === id ? "on" : ""}`}
                  disabled={locked && id !== (type || "") && id !== ""}
                  onClick={() => !locked && setFilter(id)}
                >
                  {label}
                </button>
              ))}
              <button className="chip" onClick={() => void nearest()} disabled={busy}>
                {busy ? "Hledám…" : "Nejbližší"}
              </button>
            </div>
          </header>
          <div className="plist">
            {points.map((p) => (
              <button
                key={p.id}
                className={`pitem ${selected?.id === p.id ? "on" : ""}`}
                onMouseEnter={() => setHover(p.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(p)}
              >
                <b>{p.name}</b>
                <span>
                  {pointTypeLabel(p.type)} · {p.address}, {p.zip} {p.city}
                  {p.distance != null ? ` · ${p.distance.toFixed(1)} km` : ""}
                </span>
              </button>
            ))}
            {!points.length && <p className="empty">Nic jsme nenašli. Zkuste jiné město.</p>}
          </div>
        </div>
        <div className="map-canvas">
          <button className="close-x" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa České republiky">
            <rect width={W} height={H} fill="#d7e2cc" />
            <path d={path} fill="#f4efe6" stroke="#2c3d32" strokeWidth="2.2" />
            {points.map((p) => {
              const { x, y } = xy(p.lat, p.lng);
              const on = selected?.id === p.id || hover === p.id;
              return (
                <g key={p.id} className="pin" onClick={() => onSelect(p)} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
                  <circle cx={x} cy={y} r={on ? 8 : 5} fill={typeColor(p.type)} stroke="#fff" strokeWidth="1.5" />
                  {on && (
                    <g>
                      <rect x={x + 10} y={y - 22} width={Math.min(220, p.name.length * 7 + 16)} height="20" rx="6" fill="#1c1915" />
                      <text x={x + 18} y={y - 8} fill="#f4efe6">
                        {p.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="map-legend">
            <span><i style={{ background: "#b54a2c", display: "inline-block", width: 8, height: 8, borderRadius: 99 }} /> Z-BOX</span>
            <span><i style={{ background: "#24352c", display: "inline-block", width: 8, height: 8, borderRadius: 99 }} /> Zásilkovna</span>
            <span><i style={{ background: "#c4a574", display: "inline-block", width: 8, height: 8, borderRadius: 99 }} /> Balíkovna</span>
          </div>
        </div>
      </div>
    </div>
  );
}
