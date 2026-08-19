import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { czk, spayd } from "../format";
import type { Settings } from "../api";

export function PayQr({
  amount,
  vs,
  message,
  settings,
}: {
  amount: number;
  vs: string;
  message: string;
  settings: Settings;
}) {
  const [src, setSrc] = useState("");
  const iban = settings.iban || "";
  const payload = iban ? spayd(iban, amount, vs, message) : "";

  useEffect(() => {
    if (!payload) return;
    void QRCode.toDataURL(payload, { width: 336, margin: 1, color: { dark: "#1c1915", light: "#ffffff" } }).then(setSrc);
  }, [payload]);

  if (!iban) {
    return <p>Správce ještě nevyplnil číslo účtu v nastavení obchodu.</p>;
  }

  return (
    <div className="qr-box">
      {src ? <img src={src} alt="QR platba" /> : <div />}
      <div>
        <b>QR platba (SPD)</b>
        <p style={{ margin: "6px 0" }}>
          Částka <strong>{czk(amount)}</strong>
          <br />
          {settings.bank_name} · {settings.bank_account}
          <br />
          IBAN {iban}
          <br />
          Variabilní symbol: {vs.replace(/\D/g, "").slice(0, 10) || "—"}
          <br />
          Zpráva: {message}
        </p>
        <p className="ok" style={{ margin: 0 }}>
          Po připsání platby správce objednávku označí jako zaplacenou. E-maily neposíláme — vše běží jen na Cloudflare.
        </p>
      </div>
    </div>
  );
}
