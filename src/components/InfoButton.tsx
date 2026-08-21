import { useState, type ReactNode } from "react";

/** Small, keyboard accessible inline help used throughout administration. */
export function InfoButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info-help">
      <button
        type="button"
        className="info-help-button"
        aria-label={`Informace: ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open && <span className="info-help-popover" role="status"><b>{title}</b><span>{children}</span></span>}
    </span>
  );
}
