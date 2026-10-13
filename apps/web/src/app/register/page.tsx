"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OAuthButtons } from "@/components/OAuthButtons";
import { TurnstileWidget, TURNSTILE_SITE_KEY } from "@/components/TurnstileWidget";
import { NICKNAME_MAX_LENGTH } from "@/lib/validation";

type NicknameCheckStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>("idle");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  // 봇 확인(Turnstile) 토큰 — 사이트 키가 설정된 경우에만 필요. 한 번 쓰면 끝이라 제출이 실패하면 위젯을 초기화한다.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const needsTurnstile = Boolean(TURNSTILE_SITE_KEY);

  function onNicknameChange(value: string) {
    setNickname(value);
    if (value !== checkedNickname) setNicknameStatus("idle");
  }

  async function onCheckNickname() {
    if (!nickname.trim()) return;
    setNicknameStatus("checking");
    const res = await fetch(`/api/auth/nickname-check?nickname=${encodeURIComponent(nickname)}`);
    if (!res.ok) {
      setNicknameStatus("idle");
      return;
    }
    const data = await res.json();
    setCheckedNickname(nickname);
    setNicknameStatus(data.available ? "available" : "taken");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nickname, turnstileToken }),
    });
    setPending(false);
    if (!res.ok) {
      // 서버가 토큰을 이미 검증했을 수 있어(한 번만 검증 가능) 실패하면 항상 새 토큰을 받는다
      if (needsTurnstile) setTurnstileResetKey((k) => k + 1);
      const data = await res.json().catch(() => null);
      const message =
        typeof data?.error === "string"
          ? data.error
          : data?.error?.fieldErrors?.nickname?.[0] ??
            data?.error?.fieldErrors?.password?.[0] ??
            "회원가입에 실패했습니다.";
      setError(message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-xl font-bold">회원가입</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder={`닉네임 (최대 ${NICKNAME_MAX_LENGTH}자)`}
            maxLength={NICKNAME_MAX_LENGTH}
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onCheckNickname}
            disabled={nicknameStatus === "checking" || !nickname.trim()}
            className="h-auto shrink-0 rounded-md px-3 py-2 text-sm"
          >
            중복확인
          </Button>
        </div>
        {nicknameStatus === "available" ? (
          <p className="text-sm text-green-600">사용 가능한 닉네임입니다.</p>
        ) : null}
        {nicknameStatus === "taken" ? (
          <p className="text-sm text-red-600">이미 사용 중인 닉네임입니다.</p>
        ) : null}
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
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <TurnstileWidget onToken={setTurnstileToken} resetKey={turnstileResetKey} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          disabled={pending || (needsTurnstile && !turnstileToken)}
          className="h-auto rounded-md px-3 py-2 text-sm font-semibold"
        >
          {pending ? "가입 중..." : "가입하기"}
        </Button>
      </form>
      <OAuthButtons />
      <p className="text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-blue-600">
          로그인
        </Link>
      </p>
    </main>
  );
}
