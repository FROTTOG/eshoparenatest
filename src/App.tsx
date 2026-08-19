import { Link, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Account } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { Login, Register } from "./pages/Auth";
import { CartPage } from "./pages/Cart";
import { Catalog } from "./pages/Catalog";
import { Checkout } from "./pages/Checkout";
import { Home } from "./pages/Home";
import { OrderPage, Track } from "./pages/Order";
import { ProductPage } from "./pages/Product";
import { About, Privacy, Returns, ShippingInfo, Terms } from "./pages/Static";
import { WishlistPage } from "./pages/Wishlist";

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
      <Route path="/admin/*" element={<Admin />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="katalog" element={<Catalog />} />
        <Route path="katalog/:slug" element={<Catalog />} />
        <Route path="produkt/:slug" element={<ProductPage />} />
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
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
