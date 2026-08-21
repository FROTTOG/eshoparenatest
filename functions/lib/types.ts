export type Bindings = {
  DB: D1Database;
  MEDIA?: R2Bucket;
  AUTH_SECRET?: string;
  STORE_NAME?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
};

export type AppUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "customer" | "admin";
};

export type Variables = {
  user: AppUser | null;
  cartId: string;
};
