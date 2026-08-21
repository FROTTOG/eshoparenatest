import { NavLink } from "react-router-dom";
import { useStore } from "../store";
import { IconCart, IconHome, IconMenu, IconSearch, IconShop } from "./Icons";

/**
 * Pevné spodní menu v mobilním stylu (Domů / Katalog / Hledat / Košík / Menu).
 * Pět rovnoměrně rozložených položek,
 * aktivní v barvě značky, odznak počtu věcí v košíku.
 */
export function BottomNav({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const { cart } = useStore();
  const count = cart?.count || 0;

  return (
    <nav className="bottom-nav" aria-label="Rychlá navigace">
      <NavLink to="/" end className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
        <IconHome size={23} />
        <span>Domů</span>
      </NavLink>
      <NavLink to="/katalog" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
        <IconShop size={23} />
        <span>Katalog</span>
      </NavLink>
      <button type="button" className="bn-item bn-search" onClick={onSearch} aria-label="Hledat">
        <span className="bn-search-ring">
          <IconSearch size={22} />
        </span>
        <span>Hledat</span>
      </button>
      <NavLink to="/kosik" className={({ isActive }) => `bn-item${isActive ? " active" : ""}`}>
        <span className="bn-icon-wrap">
          <IconCart size={23} />
          {count > 0 && (
            <span className="bn-badge" key={count}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
        <span>Košík</span>
      </NavLink>
      <button type="button" className="bn-item" onClick={onMenu} aria-label="Otevřít menu">
        <IconMenu size={23} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
