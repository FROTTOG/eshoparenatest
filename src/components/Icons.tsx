import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function I({ size = 22, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconSearch(p: P) {
  return (
    <I {...p}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M20 20l-3.4-3.4" />
    </I>
  );
}
export function IconUser(p: P) {
  return (
    <I {...p}>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5 19c1.5-3.4 4-5 7-5s5.5 1.6 7 5" />
    </I>
  );
}
export function IconCart(p: P) {
  return (
    <I {...p}>
      <path d="M4 6h2.2l1.5 10h9.8l1.6-7H8" />
      <circle cx="10" cy="19" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.15" fill="currentColor" stroke="none" />
    </I>
  );
}
export function IconMenu(p: P) {
  return (
    <I {...p}>
      <path d="M4 7h16M4 12h16M4 17h12" />
    </I>
  );
}
export function IconClose(p: P) {
  return (
    <I {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </I>
  );
}
export function IconPin(p: P) {
  return (
    <I {...p}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.2" />
    </I>
  );
}
export function IconBox(p: P) {
  return (
    <I {...p}>
      <path d="M3.5 8 12 4l8.5 4L12 12 3.5 8z" />
      <path d="M3.5 8v8L12 20V12" />
      <path d="M20.5 8v8L12 20" />
    </I>
  );
}
export function IconTruck(p: P) {
  return (
    <I {...p}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4.2L21 13.2V16h-7" />
      <circle cx="7" cy="17.5" r="1.4" />
      <circle cx="17" cy="17.5" r="1.4" />
    </I>
  );
}
export function IconShop(p: P) {
  return (
    <I {...p}>
      <path d="M4 10h16v9H4z" />
      <path d="M4 10 6.2 5h11.6L20 10" />
      <path d="M9 19v-5h6v5" />
    </I>
  );
}
export function IconLeaf(p: P) {
  return (
    <I {...p}>
      <path d="M5 19c8-1 13-7 14-14-7 1-13 6-14 14z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </I>
  );
}
export function IconSpark(p: P) {
  return (
    <I {...p}>
      <path d="M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3z" />
    </I>
  );
}
export function IconShield(p: P) {
  return (
    <I {...p}>
      <path d="M12 3.5 19 6v6.2c0 4.2-2.8 7.2-7 8.3-4.2-1.1-7-4.1-7-8.3V6l7-2.5z" />
      <path d="M9 12.2 11 14l4-4.2" />
    </I>
  );
}
export function IconClock(p: P) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.4l3 1.8" />
    </I>
  );
}
export function IconCard(p: P) {
  return (
    <I {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </I>
  );
}
export function IconQr(p: P) {
  return (
    <I {...p}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3h-3zM19 14v2M14 19h2M18 18h2v2" />
    </I>
  );
}
export function IconMail(p: P) {
  return (
    <I {...p}>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M4 8l8 6 8-6" />
    </I>
  );
}
export function IconPhone(p: P) {
  return (
    <I {...p}>
      <path d="M8 4.5h3l1 4-2 1.2a11 11 0 0 0 5.3 5.3L16.5 13l4 1v3c0 .8-.7 1.6-1.6 1.5C10.4 17.8 6.2 13.6 5.5 6.1 5.4 5.2 6.2 4.5 7 4.5H8z" />
    </I>
  );
}
export function IconHeart(p: P) {
  return (
    <I {...p}>
      <path d="M12 19.4S4.8 14.6 4.8 9.8A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7.2 1.8c0 4.8-7.2 9.6-7.2 9.6z" />
    </I>
  );
}
export function IconArrow(p: P) {
  return (
    <I {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </I>
  );
}
export function IconCheck(p: P) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2 11 14.6 15.6 9.6" />
    </I>
  );
}
export function IconGift(p: P) {
  return (
    <I {...p}>
      <rect x="4" y="11" width="16" height="8.5" rx="1.4" />
      <path d="M4 11h16V9.2A1.7 1.7 0 0 0 18.3 7.5H5.7A1.7 1.7 0 0 0 4 9.2V11z" />
      <path d="M12 7.5v12" />
      <path d="M12 7.5c0-2-1.4-3.4-3.2-3.4S6 6 7.4 7.5H12" />
      <path d="M12 7.5c0-2 1.4-3.4 3.2-3.4S18 6 16.6 7.5H12" />
    </I>
  );
}
export function IconHome(p: P) {
  return (
    <I {...p}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.8V19h11v-8.2" />
    </I>
  );
}
export function IconStar(p: P) {
  return (
    <I {...p}>
      <path d="M12 4.4l2 5.8h6.1l-4.9 3.6 1.9 5.8L12 16.8 6.9 19.6l1.9-5.8-4.9-3.6H10l2-5.8z" />
    </I>
  );
}
export function IconAdmin(p: P) {
  return (
    <I {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a7.7 7.7 0 0 0 .1-1.5 7.7 7.7 0 0 0-.1-1.5l2-1.5-1.9-3.3-2.3.7a7.4 7.4 0 0 0-2.6-1.5L13 3h-2l-.6 2.4a7.4 7.4 0 0 0-2.6 1.5l-2.3-.7L2.6 9.5l2 1.5a7.7 7.7 0 0 0-.1 1.5 7.7 7.7 0 0 0 .1 1.5l-2 1.5 1.9 3.3 2.3-.7a7.4 7.4 0 0 0 2.6 1.5L11 21h2l.6-2.4a7.4 7.4 0 0 0 2.6-1.5l2.3.7 1.9-3.3-2-1.5z" />
    </I>
  );
}
export function IconCash(p: P) {
  return (
    <I {...p}>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M7 9.2h.01M17 14.8h.01" />
    </I>
  );
}
export function IconParcel(p: P) {
  return (
    <I {...p}>
      <path d="M4 8.2 12 4.4 20 8.2v7.6L12 19.6 4 15.8z" />
      <path d="M12 12.2V19.6M12 12.2 4.4 8.6M12 12.2l7.6-3.6" />
    </I>
  );
}
export function IconLocker(p: P) {
  return (
    <I {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M5 9h14M5 14.5h14M12 9v5.5" />
      <circle cx="12" cy="17.6" r=".7" fill="currentColor" stroke="none" />
    </I>
  );
}

export function IconBuilding(p: P) {
  return (
    <I {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </I>
  );
}

export function IconFileText(p: P) {
  return (
    <I {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </I>
  );
}

export function IconScale(p: P) {
  return (
    <I {...p}>
      <path d="M12 3v18M6 7l6-2 6 2M6 7v6c0 1.7-1.3 3-3 3M18 7v6c0 1.7 1.3 3 3 3" />
      <path d="M3 16h6M15 16h6" />
    </I>
  );
}

export function IconLock(p: P) {
  return (
    <I {...p}>
      <rect x="4" y="11" width="16" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </I>
  );
}

export function IconCookie(p: P) {
  return (
    <I {...p}>
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01M7.5 13.5v.01M12 12v.01M11 16v.01M15.5 14.5v.01" />
    </I>
  );
}

export function IconPrinter(p: P) {
  return (
    <I {...p}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </I>
  );
}

export function IconWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`icon-wrap ${className}`.trim()}>{children}</span>;
}
