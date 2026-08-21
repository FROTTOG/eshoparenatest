export type Bindings = {
  DB: D1Database;
  MEDIA?: R2Bucket;
  AUTH_SECRET?: string;
  STORE_NAME?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  /** Volitelná vazba Analytics Engine ([[analytics_engine_datasets]]). */
  METRICS?: { writeDataPoint: (row: { indexes?: [string]; doubles?: number[]; blobs?: string[] }) => void };
};

export type AppUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "admin";
  /** Cenová skupina zákazníka: "retail" (běžná) nebo "b2b" (velkoobchod). */
  customer_group: "retail" | "b2b";
};

export type Variables = {
  user: AppUser | null;
  cartId: string;
};
