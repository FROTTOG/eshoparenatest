import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type Cart, type Settings, type User } from "./api";

type Toast = { id: number; text: string; kind?: "ok" | "err" };

type Store = {
  user: User | null;
  cart: Cart | null;
  setCart: (c: Cart) => void;
  settings: Settings;
  ready: boolean;
  toasts: Toast[];
  refresh: () => Promise<void>;
  toast: (text: string, kind?: "ok" | "err") => void;
  login: (email: string, password: string) => Promise<void>;
  register: (p: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [me, cartData, set] = await Promise.all([
        api<{ user: User | null }>("/auth/me"),
        api<Cart>("/cart"),
        api<Settings>("/settings"),
      ]);
      setUser(me.user);
      setCart(cartData);
      setSettings(set);
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
      toast("V košíku.");
    },
    [toast]
  );

  const value = useMemo(
    () => ({ user, cart, setCart, settings, ready, toasts, refresh, toast, login, register, logout, addToCart }),
    [user, cart, settings, ready, toasts, refresh, toast, login, register, logout, addToCart]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}


