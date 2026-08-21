import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Cart, type Product, type Settings, type ShippingMethod, type User } from "./api";

const WISH_KEY = "kavka-wishlist";
const RECENT_KEY = "kavka-recent";
const RECENT_MAX = 10;

export type WishItem = {
  id: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  compare_price: number | null;
  stock: number;
  category_name?: string;
};

type Toast = { id: number; text: string; kind?: "ok" | "err"; to?: string; toLabel?: string };

type Store = {
  user: User | null;
  cart: Cart | null;
  setCart: (c: Cart) => void;
  settings: Settings;
  shipping: ShippingMethod[];
  ready: boolean;
  toasts: Toast[];
  wishlist: WishItem[];
  recent: WishItem[];
  addRecent: (p: WishItem | Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">) => void;
  refresh: () => Promise<void>;
  toast: (text: string, kind?: "ok" | "err", extra?: { to?: string; toLabel?: string }) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (p: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  isWished: (id: number) => boolean;
  toggleWish: (p: WishItem | Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">) => void;
};

const Ctx = createContext<Store | null>(null);

function readWish(): WishItem[] {
  try {
    const raw = localStorage.getItem(WISH_KEY);
    const parsed = raw ? (JSON.parse(raw) as WishItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === "number") : [];
  } catch {
    return [];
  }
}

function readRecent(): WishItem[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as WishItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === "number").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function snapshot(p: WishItem | Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">): WishItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    image: p.image || "",
    price: p.price,
    compare_price: p.compare_price ?? null,
    stock: p.stock,
    category_name: p.category_name,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [shipping, setShipping] = useState<ShippingMethod[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [wishlist, setWishlist] = useState<WishItem[]>([]);
  const [recent, setRecent] = useState<WishItem[]>([]);

  useEffect(() => {
    setWishlist(readWish());
    setRecent(readRecent());
  }, []);

  const persistWish = useCallback((next: WishItem[]) => {
    setWishlist(next);
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }, []);

  const addRecent = useCallback((p: WishItem | Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">) => {
    setRecent((prev) => {
      const snap = snapshot(p);
      const next = [snap, ...prev.filter((x) => x.id !== snap.id)].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const toast = useCallback((text: string, kind: "ok" | "err" = "ok", extra?: { to?: string; toLabel?: string }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind, ...extra }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [me, cartData, set, ship] = await Promise.all([
        api<{ user: User | null }>("/auth/me"),
        api<Cart>("/cart"),
        api<Settings>("/settings"),
        api<ShippingMethod[]>("/shipping").catch(() => [] as ShippingMethod[]),
      ]);
      setUser(me.user);
      setCart(cartData);
      setSettings(set);
      setShipping(ship);
    } catch (e) {
      console.error(e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setUser(r.user);
      setCart(await api<Cart>("/cart"));
      toast("Vítejte zpátky.");
    },
    [toast]
  );

  const register = useCallback(
    async (p: { email: string; password: string; name: string; phone?: string }) => {
      const r = await api<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(p) });
      setUser(r.user);
      setCart(await api<Cart>("/cart"));
      toast("Účet je připravený.");
    },
    [toast]
  );

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCart(await api<Cart>("/cart"));
    toast("Odhlášeno.");
  }, [toast]);

  const addToCart = useCallback(
    async (productId: number, quantity = 1) => {
      const next = await api<Cart>("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      setCart(next);
      toast("V košíku.", "ok", { to: "/kosik", toLabel: "Otevřít košík" });
    },
    [toast]
  );

  const isWished = useCallback((id: number) => wishlist.some((w) => w.id === id), [wishlist]);

  const toggleWish = useCallback(
    (p: WishItem | Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">) => {
      const exists = wishlist.some((w) => w.id === p.id);
      if (exists) {
        persistWish(wishlist.filter((w) => w.id !== p.id));
        toast("Odebráno z oblíbených.");
      } else {
        persistWish([snapshot(p), ...wishlist.filter((w) => w.id !== p.id)]);
        toast("Uloženo do oblíbených.", "ok", { to: "/oblibene", toLabel: "Zobrazit" });
      }
    },
    [wishlist, persistWish, toast]
  );

  const value = useMemo(
    () => ({
      user,
      cart,
      setCart,
      settings,
      shipping,
      ready,
      toasts,
      wishlist,
      recent,
      addRecent,
      refresh,
      toast,
      login,
      register,
      logout,
      addToCart,
      isWished,
      toggleWish,
    }),
    [user, cart, settings, shipping, ready, toasts, wishlist, recent, addRecent, refresh, toast, login, register, logout, addToCart, isWished, toggleWish]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}
