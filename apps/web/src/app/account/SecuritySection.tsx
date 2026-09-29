"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast/ToastProvider";
import { SettingsCard } from "./SettingsCard";

// 서버 changePasswordSchema의 규칙(8자 이상)과 맞춘다 — 서버가 검사하지 않는 조건은 안내하지 않는다
const PASSWORD_MIN_LENGTH = 8;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-900">
        {label} <span className="text-blue-600">*</span>
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-12 pl-3.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 aria-invalid:border-red-400"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
          aria-pressed={visible}
          className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// 비밀번호 변경. 소셜 로그인으로만 가입한 계정은 비밀번호 자체가 없어서(이메일 가입 계정 = credential)
// 폼 대신 안내만 보여준다 — 예전엔 폼을 보여줘서 제출하면 "현재 비밀번호가 올바르지 않습니다"가 떴다.
export function SecuritySection({
  hasPassword,
  socialProviderLabel,
}: {
  hasPassword: boolean;
  socialProviderLabel: string;
}) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPassword) {
    return (
      <SettingsCard title="비밀번호 변경" description="계정 보안을 위해 비밀번호를 관리할 수 있어요.">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
          <p>
            {socialProviderLabel || "소셜"} 계정으로 로그인해서 Triply 비밀번호가 없어요. 로그인 보안은{" "}
            {socialProviderLabel || "해당 서비스"} 계정 설정에서 관리해주세요.
          </p>
        </div>
      </SettingsCard>
    );
  }

  const lengthOk = newPassword.length >= PASSWORD_MIN_LENGTH;
  const matchOk = confirmPassword.length > 0 && confirmPassword === newPassword;
  const canSubmit = currentPassword.length > 0 && lengthOk && matchOk && !pending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "비밀번호를 변경하지 못했어요. 다시 시도해주세요.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.show("비밀번호를 변경했어요.");
  }

  const rules = [{ ok: lengthOk, text: `${PASSWORD_MIN_LENGTH}자 이상` }];

  return (
    <SettingsCard title="비밀번호 변경" description="보안을 위해 주기적으로 비밀번호를 변경해주세요.">
      <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
        <PasswordField
          id="current-password"
          label="현재 비밀번호"
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v);
            setError(null);
          }}
          autoComplete="current-password"
        />
        <div>
          <PasswordField
            id="new-password"
            label="새 비밀번호"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setError(null);
            }}
            autoComplete="new-password"
            describedBy="new-password-rules"
          />
          <ul id="new-password-rules" className="mt-2 flex flex-col gap-1 rounded-xl bg-slate-50 px-3.5 py-2.5">
            {rules.map((r) => (
              <li
                key={r.text}
                className={`flex items-center gap-1.5 text-xs ${r.ok ? "text-emerald-600" : "text-slate-500"}`}
              >
                <Check className={`h-3.5 w-3.5 ${r.ok ? "" : "opacity-30"}`} />
                {r.text}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <PasswordField
            id="confirm-password"
            label="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(v) => {
              setConfirmPassword(v);
              setError(null);
            }}
            autoComplete="new-password"
            invalid={confirmPassword.length > 0 && !matchOk}
            describedBy="confirm-password-message"
          />
          {confirmPassword.length > 0 ? (
            <p
              id="confirm-password-message"
              className={`mt-1.5 text-xs ${matchOk ? "text-emerald-600" : "text-red-600"}`}
            >
              {matchOk ? "새 비밀번호와 일치해요." : "새 비밀번호와 일치하지 않아요."}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          aria-busy={pending}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto sm:self-end"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </SettingsCard>
  );
}
