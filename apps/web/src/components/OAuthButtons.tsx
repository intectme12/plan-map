"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const PROVIDERS = [
  { id: "kakao", label: "카카오로 계속하기", className: "bg-[#FEE500] text-black hover:bg-[#FDD800]" },
  {
    id: "google",
    label: "Google로 계속하기",
    className: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
  },
  { id: "naver", label: "네이버로 계속하기", className: "bg-[#03C75A] text-white hover:bg-[#02b350]" },
] as const;

// 로그인/회원가입 페이지가 공유하는 OAuth 버튼 3개. 콘솔에서 아직 키를 발급하지 않은
// 제공자를 눌러도(=lib/betterAuth.ts에서 그 제공자가 아예 등록 안 됨) 에러 메시지만
// 보여주고 페이지가 깨지지 않는다 — 다른 외부 API 키 미설정 패턴과 동일.
export function OAuthButtons() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<(typeof PROVIDERS)[number]["id"] | null>(null);

  async function onClick(provider: (typeof PROVIDERS)[number]["id"]) {
    setError(null);
    setPending(provider);
    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL: "/trips",
    });
    setPending(null);
    if (signInError) {
      setError(`${PROVIDERS.find((p) => p.id === provider)?.label ?? provider} 로그인을 사용할 수 없습니다.`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200" />
        또는
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={pending !== null}
          onClick={() => onClick(p.id)}
          className={`rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50 ${p.className}`}
        >
          {pending === p.id ? "이동 중..." : p.label}
        </button>
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
