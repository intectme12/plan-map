"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, Share2, Users } from "lucide-react";
import { Modal } from "@/components/Modal";
import { TripShareManager } from "./TripShareManager";
import { VISIBILITY_META, VISIBILITY_ORDER, toVisibility, type TripVisibility } from "./visibility";

const sectionTitle = "flex items-center gap-1.5 text-sm font-semibold text-slate-900";

// 공유 팝업 — 공개 범위(서버 visibility) · 공유 링크 · 회원 초대(TripShare)를 한곳에서 관리한다.
// 모든 변경은 누르는 즉시 서버에 반영되므로 별도 "저장" 없이 하단엔 "완료"만 둔다.
// 예전엔 팝업을 여는 순간 공개 범위를 무조건 "링크 공유"로 바꿔 비공개 여행이 링크로 열리거나
// 전체 공개 여행이 둘러보기에서 빠졌다 — 이제 공개 범위는 여기서 사용자가 직접 고른다.
export function ShareLinkModal({
  tripId,
  tripName,
  visibility: initialVisibility,
  onClose,
}: {
  tripId: string;
  tripName: string;
  visibility: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<TripVisibility>(toVisibility(initialVisibility));
  const [savingVisibility, setSavingVisibility] = useState<TripVisibility | null>(null);
  const [visibilityStatus, setVisibilityStatus] = useState<"saved" | "error" | null>(null);
  const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(null);
  const [shareCount, setShareCount] = useState<number | null>(null);

  // 공유 링크는 여행 id 기반(별도 토큰 없음) — 지금 접속한 도메인을 그대로 써서 운영에서도 그 도메인이 나온다
  const url = `${window.location.origin}/trips/shared/${tripId}`;
  const displayUrl = `${window.location.host}/trips/shared/${tripId.slice(0, 6)}…`;

  async function onSelectVisibility(next: TripVisibility) {
    if (next === visibility || savingVisibility) return;
    const prev = visibility;
    setVisibility(next);
    setSavingVisibility(next);
    setVisibilityStatus(null);
    const res = await fetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    setSavingVisibility(null);
    if (!res?.ok) {
      setVisibility(prev);
      setVisibilityStatus("error");
      return;
    }
    setVisibilityStatus("saved");
    setTimeout(() => setVisibilityStatus((s) => (s === "saved" ? null : s)), 1500);
    router.refresh();
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      // 클립보드 권한이 막힌 환경 — 성공한 척하지 않고 직접 복사할 수 있게 안내
      setCopyStatus("failed");
    }
    setTimeout(() => setCopyStatus((s) => (s === "copied" ? null : s)), 1800);
  }

  const meta = VISIBILITY_META[visibility];
  const linkUsable = visibility !== "PRIVATE";
  const summaryWho =
    shareCount === null ? "" : shareCount > 0 ? ` · 초대한 ${shareCount}명` : linkUsable ? "" : " · 아직 초대한 회원 없음";

  return (
    <Modal
      onClose={onClose}
      title="여행계획 공유"
      description={`${tripName} 여행을 함께 보고 계획해보세요.`}
      icon={<Share2 className="h-5 w-5" />}
      maxWidth="lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-11 min-w-[96px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          완료
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* 지금 누가 볼 수 있는지 한 줄 요약 — 링크 공유와 회원 초대를 헷갈리지 않도록 함께 표시 */}
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
          <meta.icon className="h-4 w-4 flex-none text-blue-600" />
          <span>
            <span className="font-semibold text-slate-900">{meta.label}</span> · {meta.description}
            {summaryWho}
          </span>
        </p>

        <section aria-labelledby="share-access-title">
          <div className="flex items-center justify-between">
            <h3 id="share-access-title" className={sectionTitle}>
              접근 권한
            </h3>
            <span aria-live="polite" className="text-xs">
              {savingVisibility ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> 저장 중
                </span>
              ) : visibilityStatus === "saved" ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Check className="h-3 w-3" /> 저장됨
                </span>
              ) : visibilityStatus === "error" ? (
                <span className="text-red-600">변경하지 못했어요. 다시 시도해주세요.</span>
              ) : null}
            </span>
          </div>
          <div role="radiogroup" aria-labelledby="share-access-title" className="mt-2.5 flex flex-col gap-2">
            {VISIBILITY_ORDER.map((value) => {
              const item = VISIBILITY_META[value];
              const selected = value === visibility;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectVisibility(value)}
                  disabled={savingVisibility !== null}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-wait ${
                    selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg ${
                      selected ? "bg-white text-blue-600" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-900"}`}>
                      {item.label}
                    </span>
                    <span className="block text-xs text-slate-500">{item.description}</span>
                  </span>
                  <span
                    className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${
                      selected ? "bg-blue-600 text-white" : "border border-slate-300"
                    }`}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="share-link-title">
          <h3 id="share-link-title" className={sectionTitle}>
            링크로 공유
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {linkUsable
              ? "링크를 받은 Triply 회원이 로그인하면 여행계획을 볼 수 있어요."
              : "지금은 비공개라 링크를 보내도 초대한 회원만 열 수 있어요."}
          </p>
          <div
            className={`mt-2.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3.5 ${
              linkUsable ? "" : "opacity-60"
            }`}
          >
            <span title={url} className="min-w-0 flex-1 truncate text-sm text-slate-600">
              {displayUrl}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className={`flex h-9 flex-none items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                copyStatus === "copied" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {copyStatus === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copyStatus === "copied" ? "복사 완료" : "링크 복사"}
            </button>
          </div>
          {copyStatus === "failed" ? (
            <div role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              자동 복사가 막혀 있어요. 아래 주소를 직접 복사해주세요.
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                aria-label="공유 링크 주소"
                className="mt-1.5 block w-full rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-slate-700"
              />
            </div>
          ) : null}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600"
          >
            <ExternalLink className="h-3.5 w-3.5" /> 새 탭에서 미리보기
          </a>
        </section>

        <section aria-labelledby="share-people-title">
          <h3 id="share-people-title" className={sectionTitle}>
            <Users className="h-4 w-4 text-slate-400" /> 함께할 사람
          </h3>
          <p className="mt-1 mb-2.5 text-xs text-slate-500">
            초대한 회원은 공개 범위와 상관없이 이 여행을 보고 함께 편집할 수 있어요.
          </p>
          <TripShareManager tripId={tripId} onSharesChange={setShareCount} />
        </section>
      </div>
    </Modal>
  );
}
