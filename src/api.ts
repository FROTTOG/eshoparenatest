export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (!isForm && opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    ...opts,
    headers,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error || "Požadavek selhal.";
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "admin";
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  stock: number;
  low_stock: number;
  category_id: number | null;
  image: string;
  weight: number;
  active: number;
  featured: number;
  category_name?: string;
  category_slug?: string;
  rating?: number | null;
  review_count?: number;
  images?: string[];
  reviews?: Review[];
};

export type Review = {
  id: number;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
  user_name: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
};

export type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  stock: number;
  sku: string;
};

export type Cart = {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  coupon: { code: string; description?: string; type: string; value: number } | null;
  coupon_error: string | null;
  count: number;
};

export type ShippingMethod = {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  free_over: number | null;
  kind: string;
  eta: string;
};

export type PaymentMethod = {
  id: number;
  code: string;
  name: string;
  description: string;
  fee: number;
  allowed_shipping: string;
};

export type PickupPoint = {
  id: number;
  carrier: string;
  type: "zbox" | "branch" | "balikovna" | string;
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  opening_hours: string;
  distance?: number;
  external_id?: string;
  source?: "local" | "packeta" | "balikovna";
};

export type AresResult = {
  ok: boolean;
  ico?: string;
  company_name?: string;
  dic?: string;
  street?: string;
  city?: string;
  zip?: string;
  error?: string;
};

export type Order = {
  id: number;
  number: string;
  user_id: number | null;
  email: string;
  name: string;
  phone: string;
  billing_name: string;
  billing_street: string;
  billing_city: string;
  billing_zip: string;
  billing_country: string;
  is_company: number | boolean;
  company_name: string;
  ico: string;
  dic: string;
  different_shipping: number | boolean;
  shipping_recipient: string;
  shipping_code: string;
  shipping_name: string;
  shipping_price: number;
  payment_code: string;
  payment_name: string;
  payment_fee: number;
  payment_status: string;
  status: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  pickup_point_id: number | null;
  pickup: PickupPoint | null;
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  note: string;
  agree_terms?: number;
  agree_gdpr?: number;
  created_at: string;
  tracking_number?: string;
  tracking_carrier?: string;
  tracking_url?: string;
  items: { id: number; product_id: number; name: string; sku: string; price: number; quantity: number }[];
};

export type Settings = Record<string, string>;

export type Page = {
  id: number;
  title: string;
  slug: string;
  blocks_json: string;
  in_nav: number;
  nav_label: string;
  nav_order: number;
  published: number;
  is_system: number;
  meta_title: string;
  meta_description: string;
  noindex: number;
  hide_crumbs: number;
  page_max_width: string;
  created_at: string;
  updated_at: string;
};
