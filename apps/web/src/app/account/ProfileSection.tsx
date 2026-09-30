"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpRight, Camera, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UserProfileTrigger } from "@/components/UserProfileTrigger";
import { useToast } from "@/components/toast/ToastProvider";
import { BIO_MAX_LENGTH, NICKNAME_MAX_LENGTH } from "@/lib/validation";
import { SettingsCard } from "./SettingsCard";

// 서버(lib/upload.ts의 saveImageFile)와 같은 기준 — 서버 모듈은 fs를 써서 클라이언트에서 import하지 않고 값만 맞춘다
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type NicknameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 aria-invalid:border-red-400";

// 닉네임(PATCH /api/account)과 자기소개(PATCH /api/account/profile)는 API가 따로지만, 화면에선
// 하나의 [변경사항 저장]으로 묶고 바뀐 항목만 보낸다. 사진은 고른 뒤 미리보기 → [적용] 시 바로 업로드.
export function ProfileSection({
  initialNickname,
  initialBio,
  initialAvatarUrl,
}: {
  initialNickname: string;
  initialBio: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();

  // ── 사진 ──
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 미리보기용 object URL은 바뀌거나 사라질 때 해제
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  function onPickFile(file: File | undefined) {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    setAvatarError(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError("JPG, PNG, WEBP, GIF 이미지만 올릴 수 있어요.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("8MB 이하의 이미지만 올릴 수 있어요.");
      return;
    }
    setPreview({ file, url: URL.createObjectURL(file) });
  }

  async function onApplyAvatar() {
    if (!preview) return;
    setAvatarPending(true);
    setAvatarError(null);
    const formData = new FormData();
    formData.append("file", preview.file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: formData }).catch(() => null);
    setAvatarPending(false);
    if (!res?.ok) {
      // 실패하면 기존 사진을 그대로 두고 미리보기만 유지(다시 적용하거나 취소 가능)
      const body = await res?.json().catch(() => null);
      setAvatarError(typeof body?.error === "string" ? body.error : "사진을 저장하지 못했어요. 다시 시도해주세요.");
      return;
    }
    const data = await res.json();
    setAvatarUrl(data.avatarUrl);
    setPreview(null);
    toast.show("프로필 사진을 변경했어요.");
    router.refresh();
  }

  async function onResetAvatar() {
    setAvatarPending(true);
    setAvatarError(null);
    const res = await fetch("/api/account/avatar", { method: "DELETE" }).catch(() => null);
    setAvatarPending(false);
    if (!res?.ok) {
      setAvatarError("기본 이미지로 바꾸지 못했어요. 다시 시도해주세요.");
      return;
    }
    setAvatarUrl(null);
    toast.show("기본 프로필 이미지로 바꿨어요.");
    router.refresh();
  }

  // ── 닉네임 · 자기소개 ──
  const [saved, setSaved] = useState({ nickname: initialNickname, bio: initialBio });
  const [nickname, setNickname] = useState(initialNickname);
  const [bio, setBio] = useState(initialBio);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>("idle");
  const [checkedNickname, setCheckedNickname] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const trimmedNickname = nickname.trim();
  const nicknameChanged = trimmedNickname !== saved.nickname;
  const bioChanged = bio !== saved.bio;
  const nicknameVerified = !nicknameChanged || (nicknameStatus === "available" && checkedNickname === trimmedNickname);
  const canSave = (nicknameChanged || bioChanged) && trimmedNickname.length > 0 && nicknameVerified && !saving;

  function onNicknameInput(value: string) {
    setNickname(value);
    setFormError(null);
    // 입력이 바뀌면 이전 중복 확인 결과는 무효
    if (value.trim() !== checkedNickname) setNicknameStatus("idle");
  }

  async function onCheckNickname() {
    if (!trimmedNickname || !nicknameChanged) return;
    setNicknameStatus("checking");
    const res = await fetch(`/api/account/nickname-check?nickname=${encodeURIComponent(trimmedNickname)}`).catch(
      () => null
    );
    if (!res) return setNicknameStatus("error");
    if (res.status === 400) return setNicknameStatus("invalid");
    if (!res.ok) return setNicknameStatus("error");
    const data = await res.json();
    setCheckedNickname(trimmedNickname);
    setNicknameStatus(data.available ? "available" : "taken");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setFormError(null);

    if (nicknameChanged) {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmedNickname }),
      }).catch(() => null);
      if (!res?.ok) {
        setSaving(false);
        const body = await res?.json().catch(() => null);
        // 확인 뒤 그사이 누가 먼저 가져간 경우(서버 최종 검증 409)도 여기로 온다
        if (res?.status === 409) setNicknameStatus("taken");
        setFormError(typeof body?.error === "string" ? body.error : "닉네임을 저장하지 못했어요.");
        return;
      }
      setSaved((prev) => ({ ...prev, nickname: trimmedNickname }));
      setNickname(trimmedNickname);
    }

    if (bioChanged) {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      }).catch(() => null);
      if (!res?.ok) {
        setSaving(false);
        setFormError(
          nicknameChanged ? "닉네임은 저장했지만 자기소개를 저장하지 못했어요." : "자기소개를 저장하지 못했어요."
        );
        router.refresh();
        return;
      }
      setSaved((prev) => ({ ...prev, bio }));
    }

    setSaving(false);
    setNicknameStatus("idle");
    toast.show("프로필을 저장했어요.");
    router.refresh();
  }

  const nicknameMessage =
    nicknameStatus === "available"
      ? { tone: "ok", icon: CheckCircle2, text: "사용 가능한 닉네임이에요." }
      : nicknameStatus === "taken"
        ? { tone: "error", icon: XCircle, text: "이미 사용 중인 닉네임이에요." }
        : nicknameStatus === "invalid"
          ? { tone: "error", icon: AlertCircle, text: `닉네임은 1~${NICKNAME_MAX_LENGTH}자로 입력해주세요.` }
          : nicknameStatus === "error"
            ? { tone: "error", icon: AlertCircle, text: "중복 확인에 실패했어요. 다시 시도해주세요." }
            : nicknameChanged && trimmedNickname
              ? { tone: "info", icon: AlertCircle, text: "닉네임을 바꾸려면 중복 확인을 해주세요." }
              : null;

  const shownAvatar = preview?.url ?? avatarUrl;

  return (
    <SettingsCard
      title="프로필 정보"
      description="다른 회원에게 보여지는 정보를 관리할 수 있어요."
      action={
        // 다른 회원에게 보이는 모습을 페이지 이동 없이 팝업으로 확인
        <UserProfileTrigger
          nickname={saved.nickname}
          className="flex h-9 flex-none items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          내 프로필 보기 <ArrowUpRight className="h-3.5 w-3.5" />
        </UserProfileTrigger>
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* 사진 */}
        <div className="flex flex-row items-center gap-4 lg:w-40 lg:flex-none lg:flex-col lg:items-center">
          <div className="relative">
            <div className={preview ? "rounded-full ring-3 ring-blue-200" : ""}>
              {/* Avatar는 url 문자열만 받아서 미리보기(object URL)도 그대로 넘긴다 */}
              <Avatar url={shownAvatar} nickname={saved.nickname} size={112} />
            </div>
            {avatarPending ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" aria-label="사진 저장 중" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
              aria-label="프로필 사진 선택"
              className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:items-center">
            {preview ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onApplyAvatar}
                  disabled={avatarPending}
                  className="h-11 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  사진 적용
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={avatarPending}
                  className="h-11 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 lg:justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarPending}
                  className="h-11 rounded-lg border border-blue-200 bg-blue-50 px-3.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  사진 변경
                </button>
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={onResetAvatar}
                    disabled={avatarPending}
                    className="h-11 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    기본 이미지로
                  </button>
                ) : null}
              </div>
            )}
            <p className="text-xs text-slate-400 lg:text-center">
              {preview ? "미리보기예요. 적용해야 저장돼요." : "JPG·PNG·WEBP·GIF, 최대 8MB"}
            </p>
            {avatarError ? (
              <p role="alert" className="text-xs text-red-600 lg:text-center">
                {avatarError}
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
        </div>

        {/* 닉네임 · 자기소개 */}
        <form onSubmit={onSave} className="flex min-w-0 flex-1 flex-col gap-5" noValidate>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="account-nickname" className="text-sm font-semibold text-slate-900">
                닉네임 <span className="text-blue-600">*</span>
              </label>
              <span className="text-xs text-slate-400 tabular-nums">
                {nickname.length} / {NICKNAME_MAX_LENGTH}
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                id="account-nickname"
                value={nickname}
                maxLength={NICKNAME_MAX_LENGTH}
                onChange={(e) => onNicknameInput(e.target.value)}
                aria-invalid={nicknameMessage?.tone === "error"}
                aria-describedby="account-nickname-message"
                className={`${inputClass} h-11 min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={onCheckNickname}
                disabled={!nicknameChanged || !trimmedNickname || nicknameStatus === "checking"}
                className="flex h-11 flex-none items-center gap-1 rounded-xl border border-blue-600 px-3.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
              >
                {nicknameStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                중복확인
              </button>
            </div>
            <p
              id="account-nickname-message"
              aria-live="polite"
              className={`mt-1.5 flex items-center gap-1 text-xs ${
                nicknameMessage?.tone === "ok"
                  ? "text-emerald-600"
                  : nicknameMessage?.tone === "error"
                    ? "text-red-600"
                    : "text-slate-500"
              }`}
            >
              {nicknameMessage ? (
                <>
                  <nicknameMessage.icon className="h-3.5 w-3.5 flex-none" /> {nicknameMessage.text}
                </>
              ) : (
                `최대 ${NICKNAME_MAX_LENGTH}자까지 입력할 수 있어요.`
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="account-bio" className="text-sm font-semibold text-slate-900">
                자기소개
              </label>
              <span className="text-xs text-slate-400 tabular-nums">
                {bio.length} / {BIO_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="account-bio"
              rows={4}
              maxLength={BIO_MAX_LENGTH}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setFormError(null);
              }}
              placeholder="예) 바다와 맛집을 좋아하는 여행러예요. 주말마다 근교 여행을 다녀요."
              className={`${inputClass} mt-2 resize-y py-2.5 leading-relaxed`}
            />
          </div>

          {formError ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              aria-busy={saving}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>
      </div>
    </SettingsCard>
  );
}
