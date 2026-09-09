// Web Badging API — 설치된 PWA/일부 브라우저의 앱 아이콘(또는 작업표시줄)에 카카오톡처럼
// 안읽은 개수를 숫자로 띄운다. 지원 안 하는 브라우저(Firefox/Safari 등)에서는 조용히 무시됨.
type NavigatorWithBadge = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function isAppBadgeSupported() {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export function setAppBadgeCount(count: number) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as NavigatorWithBadge;
  if (count > 0) {
    nav.setAppBadge?.(count).catch(() => {});
  } else {
    nav.clearAppBadge?.().catch(() => {});
  }
}
