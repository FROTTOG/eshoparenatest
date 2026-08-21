import { useCallback, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api";
import { useStore } from "../store";
import { IconCheck, IconSave } from "./Icons";

export type SaveState = "idle" | "busy" | "done" | "error";

/**
 * Jednotná odezva na ukládání v administraci.
 *
 * Dřív se po kliknutí na „Uložit“ nestalo nic viditelného. Tento hook proto
 * hlídá stav ukládání, sám zobrazí toast („Úprava uložena“) a tlačítko se
 * na chvíli přepne do stavu „Uloženo ✓“.
 */
export function useSaver(defaultMessage = "Úprava uložena.") {
  const { toast } = useStore();
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const run = useCallback(
    async (fn: () => Promise<unknown>, message?: string): Promise<boolean> => {
      window.clearTimeout(timer.current);
      setState("busy");
      setError("");
      try {
        await fn();
        setState("done");
        toast(message || defaultMessage);
        timer.current = window.setTimeout(() => setState("idle"), 2600);
        return true;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Uložení se nepodařilo. Zkuste to prosím znovu.";
        setState("error");
        setError(msg);
        toast(msg, "err");
        timer.current = window.setTimeout(() => setState("idle"), 5000);
        return false;
      }
    },
    [toast, defaultMessage]
  );

  return { state, error, run, busy: state === "busy" };
}

/**
 * Tlačítko „Uložit“ se stavem. Po kliknutí ukazuje „Ukládám…“, po úspěchu
 * „Uloženo“ se zaškrtnutím, při chybě červené upozornění vedle tlačítka.
 */
export function SaveButton({
  state,
  error,
  onClick,
  children = "Uložit",
  savedLabel = "Uloženo",
  type = "button",
  className = "btn-dark",
  hint,
}: {
  state: SaveState;
  error?: string;
  onClick?: () => void;
  children?: ReactNode;
  savedLabel?: string;
  type?: "button" | "submit";
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="save-row">
      <button
        type={type}
        className={`${className} save-btn is-${state}`}
        onClick={onClick}
        disabled={state === "busy"}
        aria-live="polite"
      >
        {state === "busy" ? (
          <>
            <span className="btn-spinner" aria-hidden="true" /> Ukládám…
          </>
        ) : state === "done" ? (
          <>
            <IconCheck size={16} /> {savedLabel}
          </>
        ) : (
          <>
            <IconSave size={16} /> {children}
          </>
        )}
      </button>
      {state === "done" && (
        <span className="save-ok" role="status">
          <IconCheck size={15} /> Změny jsou uložené a hned platí na webu.
        </span>
      )}
      {state === "error" && error && (
        <span className="save-err" role="alert">
          {error}
        </span>
      )}
      {state === "idle" && hint && <span className="save-hint">{hint}</span>}
    </div>
  );
}
