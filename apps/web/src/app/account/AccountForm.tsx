"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast/ToastProvider";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";

type NicknameCheckStatus = "idle" | "checking" | "available" | "taken";

export function AccountForm({
  initialNickname,
  initialBio,
  initialAvatarUrl,
  initialShowTripsOnProfile,
}: {
  initialNickname: string;
  initialBio: string;
  initialAvatarUrl: string | null;
  initialShowTripsOnProfile: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarPending, setAvatarPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(initialBio);
  const [showTripsOnProfile, setShowTripsOnProfile] = useState(initialShowTripsOnProfile);
  const [bioPending, setBioPending] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const [nickname, setNickname] = useState(initialNickname);
  const [nicknamePending, setNicknamePending] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<NicknameCheckStatus>("idle");
  const [checkedNickname, setCheckedNickname] = useState(initialNickname);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function onAvatarChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setAvatarPending(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: formData });
    setAvatarPending(false);
    if (!res.ok) {
      toast.show("프로필 사진을 저장하지 못했습니다.");
      return;
    }
    const data = await res.json();
    setAvatarUrl(data.avatarUrl);
    router.refresh();
  }

  async function onRemoveAvatar() {
    setAvatarPending(true);
    await fetch("/api/account/avatar", { method: "DELETE" });
    setAvatarPending(false);
    setAvatarUrl(null);
    router.refresh();
  }

  async function onSubmitBio(e: React.FormEvent) {
    e.preventDefault();
    setBioError(null);
    setBioPending(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, showTripsOnProfile }),
    });
    setBioPending(false);
    if (!res.ok) {
      setBioError("자기소개를 저장하지 못했습니다.");
      return;
    }
    toast.show("프로필을 저장했습니다.");
    router.refresh();
  }

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
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">프로필</h2>
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} nickname={initialNickname} size={56} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
              className="h-auto rounded-md px-3 py-1.5 text-xs"
            >
              사진 변경
            </Button>
            {avatarUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={onRemoveAvatar}
                disabled={avatarPending}
                className="h-auto rounded-md px-3 py-1.5 text-xs text-destructive hover:text-destructive"
              >
                삭제
              </Button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onAvatarChange(e.target.files)}
            />
          </div>
        </div>

        <form onSubmit={onSubmitBio} className="flex flex-col gap-2">
          <textarea
            maxLength={300}
            rows={3}
            placeholder="자기소개를 입력해보세요."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={showTripsOnProfile}
              onChange={(e) => setShowTripsOnProfile(e.target.checked)}
              className="rounded border-neutral-300"
            />
            다른 사람에게 내 여행 목록 보이기
          </label>
          {bioError ? <p className="text-sm text-red-600">{bioError}</p> : null}
          <Button
            type="submit"
            disabled={bioPending}
            className="h-auto self-start rounded-md px-3 py-2 text-sm font-semibold"
          >
            {bioPending ? "저장 중..." : "저장"}
          </Button>
        </form>
      </div>

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
        {nicknameError ? <p className="text-sm text-red-600">{nicknameError}</p> : null}
        <Button
          type="submit"
          disabled={nicknamePending}
          className="h-auto self-start rounded-md px-3 py-2 text-sm font-semibold"
        >
          {nicknamePending ? "저장 중..." : "저장"}
        </Button>
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
        <Button
          type="submit"
          disabled={passwordPending}
          className="h-auto self-start rounded-md px-3 py-2 text-sm font-semibold"
        >
          {passwordPending ? "변경 중..." : "변경"}
        </Button>
      </form>
    </div>
  );
}
