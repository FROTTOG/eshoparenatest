import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, type Cart as C } from "../api";
import { useStore } from "../store";

const SEEN = "kavka-exit-popup";

export function ExitIntent() {
  const { cart, setCart, toast, settings, user } = useStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [busy, setBusy] = useState(false);
  const code = settings.exit_coupon || "STAY5";

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN)) return;
    if (!cart?.items.length) return;

    const onLeave = (e: MouseEvent) => {
      if (e.clientY > 12) return;
      if (sessionStorage.getItem(SEEN)) return;
      if (window.location.pathname.startsWith("/admin")) return;
      if (window.location.pathname.startsWith("/pokladna")) return;
      sessionStorage.setItem(SEEN, "1");
      setOpen(true);
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [cart?.items.length]);

  async function apply(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setCart(await api<C>("/cart/coupon", { method: "POST", body: JSON.stringify({ code }) }));
      if (email) {
        await api("/cart/abandon", { method: "POST", body: JSON.stringify({ email }) }).catch(() => null);
      }
      toast(`Kupón ${code} je v košíku — 5 % sleva.`);
      setOpen(false);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Kupón nešel použít.", "err");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="map-modal glass-scrim exit-intent" role="dialog" aria-modal="true" aria-label="Sleva 5 %">
      <div className="exit-card glass-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-x" onClick={() => setOpen(false)} aria-label="Zavřít">
          ✕
        </button>
        <p className="kicker">Ještě chvilku</p>
        <h2 className="serif">Nechte si 5 % na cestu ven</h2>
        <p>
          V košíku máte zboží. Kód <b>{code}</b> vám z nákupu sundá pět procent — platí hned, bez minima.
        </p>
        <form onSubmit={apply} className="form" style={{ padding: 0, border: 0, background: "transparent" }}>
          <label>
            E-mail (volitelně pošleme i připomínku košíku)
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@email.cz" />
          </label>
          <button className="btn" disabled={busy} type="submit">
            {busy ? "Přidávám slevu…" : `Použít ${code} (−5 %)`}
          </button>
        </form>
        <button type="button" className="linkish" onClick={() => setOpen(false)} style={{ marginTop: 8 }}>
          Ne, děkuji
        </button>
      </div>
    </div>
  );
}
