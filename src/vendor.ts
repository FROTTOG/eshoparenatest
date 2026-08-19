/**
 * Kontakt na dodavatele systému KAVKA.
 * Hodnoty jdou přepsat v administraci (Nastavení → vendor_person / vendor_web / vendor_phone).
 */
export const VENDOR_DEFAULTS = {
  person: "Jan Minařík",
  web: "https://jmweb.cz",
  phone: "+420 776 677 399",
};

export type VendorContact = {
  person: string;
  web: string;
  webLabel: string;
  phone: string;
  phoneHref: string;
};

export function vendorContact(settings: Record<string, string> = {}): VendorContact {
  const person = settings.vendor_person || VENDOR_DEFAULTS.person;
  const rawWeb = settings.vendor_web || VENDOR_DEFAULTS.web;
  const web = /^https?:\/\//i.test(rawWeb) ? rawWeb : `https://${rawWeb}`;
  const phone = settings.vendor_phone || VENDOR_DEFAULTS.phone;
  return {
    person,
    web,
    webLabel: web.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    phone,
    phoneHref: `tel:${phone.replace(/[^\d+]/g, "")}`,
  };
}
