import { useEffect, useRef, useState } from "react";
import type { PickupPoint } from "../api";
import { MapPicker } from "./MapPicker";
import { IconClose, IconLocker, IconParcel, IconPin } from "./Icons";

/** Oficiální ukázkový klíč z Packeta CodePen / dokumentace widgetu v6. */
export const PACKETA_DEMO_KEY = "197fd6840f332ccf";
const PACKETA_SRC = "https://widget.packeta.com/v6/www/js/library.js";
const BALIKOVNA_SRC = "https://b2c.cpost.cz/locations/?type=BALIKOVNY";

type PacketaPoint = {
  id?: string | number;
  name?: string;
  place?: string;
  street?: string;
  city?: string;
  zip?: string;
  pickupPointType?: string;
  carrierId?: string;
  carrierPickupPointId?: string;
  gps?: { lat?: number; lon?: number; lng?: number };
  latitude?: number;
  longitude?: number;
  url?: string;
  openingHours?: unknown;
};

declare global {
  interface Window {
    Packeta?: {
      Widget: {
        pick: (
          apiKey: string,
          cb: (point: PacketaPoint | null) => void,
          options?: Record<string, unknown>,
          el?: HTMLElement | null
        ) => void;
        close: () => void;
      };
    };
  }
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  if (existing) {
    if ((existing as HTMLScriptElement & { dataset: DOMStringMap }).dataset.ready === "1" || window.Packeta) {
      return Promise.resolve();
    }
    return new Promise((res, rej) => {
      existing.addEventListener("load", () => res());
      existing.addEventListener("error", () => rej(new Error("Skript se nenačetl.")));
    });
  }
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      s.dataset.ready = "1";
      res();
    };
    s.onerror = () => rej(new Error("Skript se nenačetl."));
    document.head.appendChild(s);
  });
}

function hoursOf(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw) {
    const o = raw as Record<string, unknown>;
    const compact = o.compactLong || o.compactShort || o.compact;
    if (typeof compact === "string") return compact;
    if (compact && typeof compact === "object") {
      return Object.entries(compact as Record<string, string>)
        .map(([d, h]) => `${d} ${h}`)
        .join(", ")
        .slice(0, 180);
    }
  }
  return "";
}

function fromPacketa(p: PacketaPoint, want: "zbox" | "branch"): PickupPoint {
  const street = [p.street, p.place].filter(Boolean).join(", ");
  const lat = Number(p.gps?.lat ?? p.latitude ?? 0);
  const lng = Number(p.gps?.lon ?? p.gps?.lng ?? p.longitude ?? 0);
  const typeHint = `${p.pickupPointType || ""} ${p.name || ""}`.toLowerCase();
  const isBox = typeHint.includes("zbox") || typeHint.includes("z-box") || typeHint.includes("box");
  return {
    id: -1,
    carrier: "zasilkovna",
    type: want === "zbox" || isBox ? "zbox" : "branch",
    name: p.name || "Zásilkovna",
    address: street || p.city || "",
    city: p.city || "",
    zip: String(p.zip || "").replace(/\s+/g, ""),
    lat,
    lng,
    opening_hours: hoursOf(p.openingHours),
    external_id: String(p.id || p.carrierPickupPointId || ""),
    source: "packeta",
  };
}

function pickBalikovnaPayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.payload && typeof o.payload === "object") return o.payload as Record<string, unknown>;
  if (o.point && typeof o.point === "object") return o.point as Record<string, unknown>;
  if (o.location && typeof o.location === "object") return o.location as Record<string, unknown>;
  return o;
}

function fromBalikovna(raw: unknown): PickupPoint | null {
  const o = pickBalikovnaPayload(raw);
  if (!o) return null;
  const id = o.id ?? o.zip ?? o.psc ?? o.branchId ?? o.n ?? o.code;
  const name = String(o.name ?? o.nazev ?? o.title ?? o.branchName ?? "");
  const address = String(o.address ?? o.adresa ?? o.street ?? o.ulice ?? "");
  const city = String(o.city ?? o.obec ?? o.mesto ?? "");
  const zip = String(o.zip ?? o.psc ?? o.zipCode ?? "").replace(/\s+/g, "");
  const lat = Number(o.lat ?? o.latitude ?? (o.gps as { lat?: number } | undefined)?.lat ?? 0);
  const lng = Number(o.lng ?? o.lon ?? o.longitude ?? (o.gps as { lon?: number; lng?: number } | undefined)?.lon ?? (o.gps as { lng?: number } | undefined)?.lng ?? 0);
  if (!name && !address && !zip && !id) return null;
  if (!name && !zip) return null;
  return {
    id: -1,
    carrier: "balikovna",
    type: "balikovna",
    name: name || `Balíkovna ${zip}`,
    address: address || city,
    city,
    zip,
    lat,
    lng,
    opening_hours: String(o.openingHours ?? o.opening_hours ?? o.hours ?? ""),
    external_id: String(id || zip || name),
    source: "balikovna",
  };
}

export function openPacketaPicker(opts: {
  type: "zbox" | "branch";
  apiKey?: string;
  onSelect: (p: PickupPoint) => void;
  onCancel?: () => void;
  onError?: (err: Error) => void;
}) {
  const key = (opts.apiKey || PACKETA_DEMO_KEY).replace(/\s+/g, "");
  void loadScript(PACKETA_SRC)
    .then(() => {
      if (!window.Packeta?.Widget) throw new Error("Widget Zásilkovny se nenačetl.");
      const vendors =
        opts.type === "zbox"
          ? [{ country: "cz", group: "zbox" }]
          : [{ country: "cz" }];
      window.Packeta.Widget.pick(
        key,
        (point) => {
          if (!point) {
            opts.onCancel?.();
            return;
          }
          opts.onSelect(fromPacketa(point, opts.type));
        },
        {
          language: "cs",
          country: "cz",
          vendors,
          appIdentity: "kavka-shop-1.0",
          view: "modal",
        }
      );
    })
    .catch((e: Error) => opts.onError?.(e));
}

export function BalikovnaPicker({
  onSelect,
  onClose,
  onFallback,
}: {
  onSelect: (p: PickupPoint) => void;
  onClose: () => void;
  onFallback: () => void;
}) {
  const [hint, setHint] = useState("Vyberte pobočku nebo box na mapě České pošty.");

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const origin = String(ev.origin || "");
      if (
        origin &&
        !origin.includes("cpost.cz") &&
        !origin.includes("postaonline.cz") &&
        !origin.includes("balikovna.cz") &&
        !origin.includes("ceskaposta.cz")
      ) {
        return;
      }
      const point = fromBalikovna(ev.data);
      if (!point) return;
      onSelect(point);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onSelect]);

  return (
    <div className="map-modal glass-scrim" onClick={onClose} role="dialog" aria-label="Mapa Balíkovny">
      <div className="map-box carrier-box" onClick={(e) => e.stopPropagation()}>
        <header className="carrier-head">
          <div>
            <div className="kicker">Česká pošta · živá mapa</div>
            <h3>Balíkovna</h3>
            <p>{hint}</p>
          </div>
          <div className="carrier-head-actions">
            <button type="button" className="chip" onClick={onFallback}>
              Záložní mapa
            </button>
            <button type="button" className="close-x" onClick={onClose} aria-label="Zavřít">
              <IconClose size={18} />
            </button>
          </div>
        </header>
        <iframe
          className="carrier-frame"
          title="Výdejní místa Balíkovny"
          src={BALIKOVNA_SRC}
          allow="geolocation"
          onLoad={() => setHint("Klikněte na místo a potvrďte „Vyzvednout zde“.")}
        />
      </div>
    </div>
  );
}

export function PickupChooser({
  type,
  selected,
  apiKey,
  onSelect,
  onClose,
}: {
  type: "zbox" | "branch" | "balikovna" | string;
  selected?: PickupPoint | null;
  apiKey?: string;
  onSelect: (p: PickupPoint) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"live" | "fallback">(type === "balikovna" ? "live" : "live");
  const [packetaErr, setPacketaErr] = useState("");

  useEffect(() => {
    if (type !== "zbox" && type !== "branch") return;
    if (mode !== "live") return;
    openPacketaPicker({
      type,
      apiKey,
      onSelect: (p) => {
        onSelect(p);
        onClose();
      },
      onCancel: onClose,
      onError: (e) => {
        setPacketaErr(e.message);
        setMode("fallback");
      },
    });
  }, [type, mode, apiKey, onSelect, onClose]);

  if (mode === "fallback") {
    return (
      <MapPicker
        type={type}
        selected={selected}
        onSelect={onSelect}
        onClose={onClose}
        banner={
          packetaErr
            ? `Živá mapa se neotevřela (${packetaErr}). Používáme záložní mapu KAVKA.`
            : "Záložní mapa z našeho skladu míst."
        }
      />
    );
  }

  if (type === "balikovna") {
    return (
      <BalikovnaPicker
        onSelect={(p) => {
          onSelect(p);
          onClose();
        }}
        onClose={onClose}
        onFallback={() => setMode("fallback")}
      />
    );
  }

  return (
    <div className="map-modal glass-scrim" onClick={onClose} role="dialog" aria-label="Mapa Zásilkovny">
      <div className="packeta-wait glass-card" onClick={(e) => e.stopPropagation()}>
        <IconWrapSoft type={type} />
        <h3>Otevíráme mapu Zásilkovny…</h3>
        <p>Oficiální widget Packety. Pokud se neukáže, přepneme vás na naši mapu.</p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <button type="button" className="btn-line" onClick={() => setMode("fallback")}>
            Otevřít záložní mapu
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}

function IconWrapSoft({ type }: { type: string }) {
  return (
    <span className="icon-wrap lg">
      {type === "zbox" ? <IconLocker /> : type === "balikovna" ? <IconParcel /> : <IconPin />}
    </span>
  );
}
