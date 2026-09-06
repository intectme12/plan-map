"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";

type NicknameCheckStatus = "idle" | "checking" | "available" | "taken";

export function AccountForm({ initialNickname }: { initialNickname: string }) {
  const router = useRouter();
  const toast = useToast();

  const [nickname, setNickname] = useState(initialNickname);
  const [nicknamePending, setNicknamePending] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>("idle");
  const [checkedNickname, setCheckedNickname] = useState(initialNickname);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function onNicknameChange(value: string) {
    setNickname(value);
    if (value !== checkedNickname) setNicknameStatus("idle");
  }

  async function onCheckNickname() {
    if (!nickname.trim()) return;
    setNicknameStatus("checking");
    const res = await fetch(`/api/account/nickname-check?nickname=${encodeURIComponent(nickname)}`);
    if (!res.ok) {
      setNicknameStatus("idle");
      return;
    }
    const data = await res.json();
    setCheckedNickname(nickname);
    setNicknameStatus(data.available ? "available" : "taken");
  }

  async function onSubmitNickname(e: React.FormEvent) {
    e.preventDefault();
    setNicknameError(null);
    setNicknamePending(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    setNicknamePending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setNicknameError(
        typeof body?.error === "string" ? body.error : "닉네임을 저장하지 못했습니다."
      );
      return;
    }
    toast.show("닉네임을 변경했습니다.");
    router.refresh();
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordPending(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setPasswordError(
        typeof body?.error === "string" ? body.error : "비밀번호를 변경하지 못했습니다."
      );
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.show("비밀번호를 변경했습니다.");
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={onSubmitNickname}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <h2 className="text-sm font-semibold">닉네임 변경</h2>
        <div className="flex gap-2">
          <input
            required
            maxLength={50}
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onCheckNickname}
            disabled={nicknameStatus === "checking" || !nickname.trim()}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            중복확인
          </button>
        </div>
        {nicknameStatus === "available" ? (
          <p className="text-sm text-green-600">사용 가능한 닉네임입니다.</p>
        ) : null}
        {nicknameStatus === "taken" ? (
          <p className="text-sm text-red-600">이미 사용 중인 닉네임입니다.</p>
        ) : null}
        {nicknameError ? <p className="text-sm text-red-600">{nicknameError}</p> : null}
        <button
          type="submit"
          disabled={nicknamePending}
          className="self-start rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {nicknamePending ? "저장 중..." : "저장"}
        </button>
      </form>

      <form
        onSubmit={onSubmitPassword}
        className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
      >
        <h2 className="text-sm font-semibold">비밀번호 변경</h2>
        <input
          type="password"
          required
          placeholder="현재 비밀번호"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="새 비밀번호 (8자 이상)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
        <button
          type="submit"
          disabled={passwordPending}
          className="self-start rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {passwordPending ? "변경 중..." : "변경"}
        </button>
      </form>
    </div>
  );
}
