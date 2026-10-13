"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Cloudflare Turnstile 봇 확인 위젯 — 회원가입 화면에서 사용(서버 검증은 lib/turnstile.ts).
// NEXT_PUBLIC_TURNSTILE_SITE_KEY가 없으면 아무것도 그리지 않는다(서버도 TURNSTILE_SECRET_KEY가 없으면 검증을 건너뜀 —
// 둘은 함께 설정해야 한다).
// 토큰은 한 번만 검증할 수 있고 5분 뒤 만료되므로, 제출이 실패하면 부모가 resetKey를 올려 새 토큰을 받게 한다.

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileWidget({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string | null) => void;
  resetKey?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  function render() {
    const api = window.turnstile;
    if (!api || !containerRef.current || widgetIdRef.current || !TURNSTILE_SITE_KEY) return;
    widgetIdRef.current = api.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      size: "flexible", // 입력칸 폭에 맞춰 늘어남(기본은 300px 고정)
      callback: (token: string) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
  }

  // 화면을 떠나면 위젯 제거
  useEffect(() => {
    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  // 부모가 resetKey를 올리면(제출 실패 등) 새 토큰을 받도록 초기화
  useEffect(() => {
    if (resetKey === 0 || !widgetIdRef.current) return;
    onTokenRef.current(null);
    window.turnstile?.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      {/* onReady는 스크립트가 이미 로드된 뒤 다시 이 화면에 들어와도 매번 호출된다 */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={render}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
}
