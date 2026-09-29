"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, KeyRound, Loader2, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useToast } from "@/components/toast/ToastProvider";
import { ProfileSection } from "./ProfileSection";
import { SecuritySection } from "./SecuritySection";
import { SettingsCard } from "./SettingsCard";

export type SettingsTab = "profile" | "account" | "security" | "privacy";

type AccountUser = {
  email: string;
  nickname: string;
  bio: string;
  avatarUrl: string | null;
  showTripsOnProfile: boolean;
};

// 실제 기능이 있는 메뉴만 둔다(계정 탈퇴·이메일 변경은 API가 없어 아직 없음)
const MENU: { tab: SettingsTab; label: string; description: string; icon: typeof UserRound }[] = [
  { tab: "profile", label: "프로필", description: "사진·닉네임·자기소개", icon: UserRound },
  { tab: "account", label: "계정 정보", description: "이메일·로그인 방식", icon: Mail },
  { tab: "security", label: "보안", description: "비밀번호 변경", icon: ShieldCheck },
  { tab: "privacy", label: "개인정보", description: "여행 목록 공개", icon: Eye },
];

const PROVIDER_LABELS: Record<string, string> = {
  credential: "이메일",
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
};

// 카카오/네이버는 이메일 동의 없이 가입하면 로그인용 가짜 주소(…@oauth.local)가 들어가 있어 그대로 보여주지 않는다
function isPlaceholderEmail(email: string) {
  return email.endsWith("@oauth.local");
}

export function AccountSettings({
  initialTab,
  user,
  providers,
}: {
  initialTab: SettingsTab;
  user: AccountUser;
  providers: string[];
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  function selectTab(next: SettingsTab) {
    setTab(next);
    // 새로고침·링크 공유 후에도 같은 메뉴가 열리도록 주소에만 반영(페이지 이동 없음)
    const url = new URL(window.location.href);
    if (next === "profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">계정 설정</h1>
      <p className="mt-1 text-sm text-slate-500">프로필과 계정 정보를 관리하고 개인정보 설정을 변경하세요.</p>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        {/* PC: 왼쪽 세로 메뉴 / 모바일(md 미만): 상단 가로 탭 */}
        <nav aria-label="설정 메뉴" className="md:w-[210px] md:flex-none">
          <ul className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 md:flex md:flex-col md:gap-0.5">
            {MENU.map((item) => {
              const active = tab === item.tab;
              return (
                <li key={item.tab}>
                  <button
                    type="button"
                    onClick={() => selectTab(item.tab)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors md:flex-row md:gap-3 md:px-3 md:text-left ${
                      active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className="h-5 w-5 flex-none md:h-4 md:w-4" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold md:text-sm">{item.label}</span>
                      <span className={`hidden text-xs md:block ${active ? "text-blue-500" : "text-slate-400"}`}>
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 탭을 바꿔도 작성 중인 입력(프로필·비밀번호)이 사라지지 않도록 언마운트하지 않고 숨기기만 한다 */}
        <div className="min-w-0 flex-1">
          <div hidden={tab !== "profile"}>
            <ProfileSection initialNickname={user.nickname} initialBio={user.bio} initialAvatarUrl={user.avatarUrl} />
          </div>
          <div hidden={tab !== "account"}>
            <AccountInfoSection email={user.email} providers={providers} />
          </div>
          <div hidden={tab !== "security"}>
            <SecuritySection
              hasPassword={providers.includes("credential")}
              socialProviderLabel={providers
                .filter((p) => p !== "credential")
                .map((p) => PROVIDER_LABELS[p] ?? p)
                .join("·")}
            />
          </div>
          <div hidden={tab !== "privacy"}>
            <PrivacySection initialShowTripsOnProfile={user.showTripsOnProfile} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountInfoSection({ email, providers }: { email: string; providers: string[] }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <SettingsCard title="계정 정보" description="로그인에 사용하는 계정 정보를 확인할 수 있어요.">
      <dl className="flex flex-col divide-y divide-slate-100">
        <div className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:gap-4">
          <dt className="w-28 flex-none text-sm font-semibold text-slate-900">이메일</dt>
          <dd className="min-w-0 flex-1">
            <p className="break-all text-sm text-slate-700">
              {isPlaceholderEmail(email) ? "등록된 이메일 없음" : email}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {isPlaceholderEmail(email)
                ? "소셜 로그인 시 이메일 제공에 동의하지 않아 이메일 정보가 없어요."
                : "이메일은 로그인 아이디로 쓰여 변경할 수 없어요."}
            </p>
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:gap-4">
          <dt className="w-28 flex-none text-sm font-semibold text-slate-900">로그인 방식</dt>
          <dd className="flex flex-wrap gap-1.5">
            {providers.length === 0 ? (
              <span className="text-sm text-slate-400">정보 없음</span>
            ) : (
              providers.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {p === "credential" ? <KeyRound className="h-3 w-3" /> : null}
                  {PROVIDER_LABELS[p] ?? p}
                </span>
              ))
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">로그아웃</p>
          <p className="text-xs text-slate-500">이 기기에서 Triply 로그인을 종료해요.</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          로그아웃
        </button>
      </div>
    </SettingsCard>
  );
}

// 여행 목록 공개: 서버에서 실제로 막는 범위는 "내 프로필 페이지의 여행 목록"과 "회원검색 추천 목록 노출".
// 각 여행을 누가 볼 수 있는지(공유 팝업의 공개 범위)와는 별개라 그 차이를 문구로 분명히 한다.
function PrivacySection({ initialShowTripsOnProfile }: { initialShowTripsOnProfile: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(initialShowTripsOnProfile);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !on;
    setOn(next);
    setPending(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showTripsOnProfile: next }),
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      setOn(!next);
      toast.show("설정을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }
    toast.show(next ? "여행 목록을 공개했어요." : "여행 목록을 비공개로 바꿨어요.");
    router.refresh();
  }

  return (
    <SettingsCard title="개인정보" description="다른 회원에게 보여줄 정보를 정할 수 있어요.">
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4">
        <div className="min-w-0 flex-1">
          <p id="privacy-trips-label" className="text-sm font-semibold text-slate-900">
            여행 목록 공개
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {on
              ? "다른 회원이 내 프로필에서 여행계획 목록을 볼 수 있고, 회원검색 추천 목록에도 나와요."
              : "다른 회원이 내 프로필에서 여행계획 목록을 볼 수 없고, 회원검색 추천 목록에도 나오지 않아요."}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            각 여행을 누가 볼 수 있는지는 여행 화면의 공유 버튼에서 따로 정해요.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="privacy-trips-label"
          onClick={toggle}
          disabled={pending}
          className={`relative mt-0.5 h-7 w-12 flex-none rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-blue-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </SettingsCard>
  );
}
