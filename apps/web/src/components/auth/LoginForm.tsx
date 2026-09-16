"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OAuthButtons } from "@/components/OAuthButtons";

// /login 풀페이지와 홈 우측 상단 로그인 팝업이 같은 폼 로직을 쓰도록 분리한 컴포넌트.
// 성공 후 어디로 이동할지는 호출하는 쪽(풀페이지는 라우팅, 팝업은 그 자리에서 새로고침)이 다르므로 onSuccess로 위임한다.
export function LoginForm({ onSuccess, registerHref = "/register" }: { onSuccess: () => void; registerHref?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "로그인에 실패했습니다.");
      return;
    }
    onSuccess();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending} className="h-auto rounded-md px-3 py-2 text-sm font-semibold">
          {pending ? "로그인 중..." : "로그인"}
        </Button>
      </form>
      <OAuthButtons />
      <p className="text-sm text-neutral-500">
        계정이 없으신가요?{" "}
        <Link href={registerHref} className="font-semibold text-blue-600">
          회원가입
        </Link>
      </p>
    </div>
  );
}
