import { useEffect, useState } from "react";
import { czk } from "../format";
import { useStore } from "../store";

type Props = {
  amount: number;
  code: "apple_pay" | "google_pay";
  onPaid: () => void;
};

export function WalletPay({ amount, code, onPaid }: Props) {
  const { settings, toast } = useStore();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const merchant = settings.wallet_merchant_name || settings.store_name || "KAVKA";
  const isApple = code === "apple_pay";

  useEffect(() => {
    const PR = window.PaymentRequest;
    if (!PR) {
      setReady(true);
      return;
    }
    try {
      const method = isApple
        ? [{ supportedMethods: "https://apple.com/apple-pay" }]
        : [{ supportedMethods: "https://google.com/pay" }, { supportedMethods: "basic-card" }];
      const req = new PR(method, {
        total: { label: merchant, amount: { currency: "CZK", value: amount.toFixed(2) } },
      });
      void req.canMakePayment?.().then((ok) => setReady(ok !== false)).catch(() => setReady(true));
    } catch {
      setReady(true);
    }
  }, [amount, isApple, merchant]);

  async function pay() {
    setBusy(true);
    try {
      const PR = window.PaymentRequest;
      if (PR) {
        const methods: PaymentMethodData[] = isApple
          ? [
              {
                supportedMethods: "https://apple.com/apple-pay",
                data: {
                  version: 3,
                  merchantIdentifier: settings.apple_pay_merchant_id || "merchant.kavka.shop",
                  merchantCapabilities: ["supports3DS"],
                  supportedNetworks: ["visa", "masterCard", "amex"],
                  countryCode: "CZ",
                },
              },
            ]
          : [
              {
                supportedMethods: "https://google.com/pay",
                data: {
                  environment: settings.google_pay_merchant_id ? "PRODUCTION" : "TEST",
                  apiVersion: 2,
                  apiVersionMinor: 0,
                  merchantInfo: { merchantName: merchant, merchantId: settings.google_pay_merchant_id || "" },
                  allowedPaymentMethods: [
                    {
                      type: "CARD",
                      parameters: { allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["VISA", "MASTERCARD"] },
                      tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: "example", gatewayMerchantId: "kavka" } },
                    },
                  ],
                },
              },
            ];
        const req = new PR(methods, {
          total: { label: merchant, amount: { currency: "CZK", value: Math.max(0, amount).toFixed(2) } },
        });
        const result = await req.show();
        await result.complete("success");
        toast(isApple ? "Apple Pay potvrzeno." : "Google Pay potvrzeno.");
        onPaid();
        return;
      }
      toast("V tomto prohlížeči peněženka není. Objednávku stejně označíme jako zaplacenou (demo / test).");
      onPaid();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast("Platba byla zrušena.", "err");
      } else {
        toast("Peněženka se neotevřela — objednávku dokončíme jako zaplacenou (testovací režim).");
        onPaid();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={`wallet-btn ${isApple ? "apple" : "google"}`} disabled={!ready || busy || amount < 0} onClick={() => void pay()}>
      {busy ? "Ověřuji platbu…" : isApple ? `Zaplatit Apple Pay · ${czk(amount)}` : `Zaplatit Google Pay · ${czk(amount)}`}
    </button>
  );
}
