import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Account } from "./pages/Account";
import { Login, Register } from "./pages/Auth";
import { CartPage } from "./pages/Cart";
import { Catalog } from "./pages/Catalog";
import { Checkout } from "./pages/Checkout";
import { Home } from "./pages/Home";
import { OrderPage, Track } from "./pages/Order";
import { ProductPage } from "./pages/Product";
import { About, Privacy, Returns, ShippingInfo, Terms } from "./pages/Static";
import { BlogList, BlogPost } from "./pages/Blog";
import { DynamicPage } from "./pages/DynamicPage";
import { WishlistPage } from "./pages/Wishlist";

const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));

function NotFound() {
  return (
    <div className="wrap empty">
      <h1 className="serif">404</h1>
      <p>Tuhle stránku nemáme. Možná vylétla s kavkou.</p>
      <Link className="btn" to="/katalog">
        Do katalogu
      </Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="wrap empty">Otevíráme administraci…</div>}>
            <Admin />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="ukazka" element={<Navigate to="/" replace />} />
        <Route path="demo" element={<Navigate to="/" replace />} />
        <Route path="eshop-ukazka" element={<Navigate to="/" replace />} />
        <Route path="katalog" element={<Catalog />} />
        <Route path="katalog/:slug" element={<Catalog />} />
        <Route path="produkt/:slug" element={<ProductPage />} />
        <Route path="magazin" element={<BlogList />} />
        <Route path="magazin/:slug" element={<BlogPost />} />
        <Route path="kosik" element={<CartPage />} />
        <Route path="oblibene" element={<WishlistPage />} />
        <Route path="pokladna" element={<Checkout />} />
        <Route path="prihlaseni" element={<Login />} />
        <Route path="registrace" element={<Register />} />
        <Route path="ucet/*" element={<Account />} />
        <Route path="objednavka/:number" element={<OrderPage />} />
        <Route path="sledovani" element={<Track />} />
        <Route path="o-nas" element={<About />} />
        <Route path="doprava-a-platba" element={<ShippingInfo />} />
        <Route path="obchodni-podminky" element={<Terms />} />
        <Route path="ochrana-udaju" element={<Privacy />} />
        <Route path="reklamace" element={<Returns />} />
        <Route path="stranka/:slug" element={<DynamicPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
