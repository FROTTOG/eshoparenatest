import type { Product } from "../api";
import { useStore } from "../store";
import { IconHeart } from "./Icons";

export function WishButton({
  p,
  className = "",
}: {
  p: Pick<Product, "id" | "slug" | "name" | "image" | "price" | "compare_price" | "stock" | "category_name">;
  className?: string;
}) {
  const { isWished, toggleWish } = useStore();
  const on = isWished(p.id);
  return (
    <button
      type="button"
      className={`wish-btn ${on ? "on" : ""} ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
      title={on ? "V oblíbených" : "Do oblíbených"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWish(p);
      }}
    >
      <IconHeart size={18} />
    </button>
  );
}
