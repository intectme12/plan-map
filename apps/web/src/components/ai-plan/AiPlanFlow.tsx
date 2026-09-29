"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Lightbulb,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTripDays, dayColor, formatDayLabel, assignDayIndexes } from "@/app/trips/[tripId]/days";
import { formatTripDuration } from "@/lib/formatTripDuration";

type GeocodeCandidate = {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  placeUrl: string | null;
  category: string | null;
  phone: string | null;
};

type ExtractedPlace = {
  name: string;
  category: string | null;
  areaHint: string | null;
  note: string | null;
  dayIndex: number | null;
  reason: string | null;
  estimatedStayMin: number | null;
  estimatedCostWon: number | null;
};

type CandidateItem = {
  id: string;
  name: string;
  category: string | null;
  note: string | null;
  reason: string | null;
  estimatedStayMin: number | null;
  estimatedCostWon: number | null;
  dayIndex: number;
  candidates: GeocodeCandidate[];
  selectedIndex: number; // candidates 배열 인덱스, 좌표를 못 찾았으면 -1
  checked: boolean;
};

type Stage = "idle" | "loading" | "error" | "results";
type LoadingPhase = "extract" | "geocode" | "group";
type CommitStatus = "pending" | "success" | "error";

type AiPlanFlowProps =
  | {
      mode: "existing";
      tripId: string;
      tripName: string;
      tripStartDate: string | Date;
      tripEndDate: string | Date;
      personnel: number;
    }
  | { mode: "new" };

const STEP_DEFS: { key: LoadingPhase; label: string }[] = [
  { key: "extract", label: "텍스트 분석 중" },
  { key: "geocode", label: "장소 확인 중" },
  { key: "group", label: "일정 구성 중" },
];

const STYLE_OPTIONS = ["맛집", "휴양", "액티비티", "문화/역사", "쇼핑"];
const TRANSPORT_OPTIONS = [
  { value: "자차", label: "자차" },
  { value: "대중교통", label: "대중교통" },
  { value: "도보", label: "도보 위주" },
  { value: "렌터카", label: "렌터카" },
];

const EXAMPLE_PROMPTS = [
  {
    label: "부산 여행 후기 예시",
    text:
      "1일차엔 해운대에서 회 먹고 광안리 카페거리 구경했어요. 2일차엔 감천문화마을 갔다가 " +
      "자갈치시장에서 점심 먹고 태종대 산책, 저녁엔 서면에서 돼지국밥 먹었습니다.",
  },
  {
    label: "제주 일정 메모 예시",
    text:
      "1일차: 협재해수욕장 → 한림공원 → 애월 카페거리. 2일차: 성산일출봉 일출 보고 우도 배 타고 " +
      "들어가서 땅콩아이스크림 먹고, 저녁엔 흑돼지 맛집에서 마무리.",
  },
];

// 이 폼 안에서 반복되는 입력칸/라벨 스타일 — TripCreateForm.tsx와 동일한 톤(h-11, rounded-xl,
// 포커스 시 파란 테두리)으로 맞춰서 다른 모달들과 일관성을 유지한다.
const inputBase =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15";
const inputBorder = (invalid: boolean) => (invalid ? "border-red-400" : "border-slate-200");
const labelClass = "flex items-center gap-1 text-sm font-semibold text-slate-900";

function RequiredDot() {
  return (
    <>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-600" />
      <span className="sr-only">(필수)</span>
    </>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-red-600">
      {message}
    </p>
  );
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#0F172A]">
      {icon}
      {label}
    </span>
  );
}

function formatStayMin(min: number) {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

// N개를 concurrency 제한 안에서 병렬 처리 — 최대 30개짜리 지오코딩 요청을 한 번에 다 쏘지 않기 위함
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
  return results;
}

export function AiPlanFlow(props: AiPlanFlowProps) {
  const router = useRouter();

  // "새 여행 만들기" 모드 전용 입력 — 기존 여행 모드는 여행지/기간/인원이 이미 정해져 있어 읽기전용 칩으로만 보여준다
  const [destination, setDestination] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newPersonnel, setNewPersonnel] = useState(1);
  const [newFieldErrors, setNewFieldErrors] = useState<{
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // 양쪽 모드 공통 — AI 프롬프트에 참고 컨텍스트로만 쓰이는 선택 입력값
  const [budgetWon, setBudgetWon] = useState("");
  const [style, setStyle] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [text, setText] = useState("");

  const [stage, setStage] = useState<Stage>("idle");
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("extract");
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [resultDays, setResultDays] = useState<Date[]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [commitStatus, setCommitStatus] = useState<Record<string, CommitStatus>>({});
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const createdTripIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function validateNewFields() {
    const next: typeof newFieldErrors = {};
    if (!destination.trim()) next.destination = "여행지를 입력해주세요.";
    if (!newStartDate) next.startDate = "시작일을 선택해주세요.";
    if (!newEndDate) next.endDate = "종료일을 선택해주세요.";
    else if (newStartDate && newEndDate < newStartDate) next.endDate = "종료일은 시작일과 같거나 이후여야 해요.";
    return next;
  }

  async function onParse(e?: React.FormEvent) {
    e?.preventDefault();
    if (stage === "loading") return;

    let parseUrl: string;
    let parseBody: Record<string, unknown>;
    let computedDays: Date[];

    const context = {
      budgetWon: budgetWon ? Number(budgetWon) : undefined,
      style: style ?? undefined,
      transport: transport ?? undefined,
    };

    if (props.mode === "new") {
      const fieldErrors = validateNewFields();
      setNewFieldErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) return;

      computedDays = getTripDays(newStartDate, newEndDate);
      parseUrl = "/api/ai/parse-trip-text";
      parseBody = {
        text,
        destination: destination.trim(),
        dayCount: computedDays.length,
        personnel: newPersonnel,
        ...context,
      };
    } else {
      computedDays = getTripDays(props.tripStartDate, props.tripEndDate);
      parseUrl = `/api/trips/${props.tripId}/ai-parse`;
      parseBody = { text, ...context };
    }

    setStage("loading");
    setLoadingPhase("extract");
    setGeocodeProgress({ done: 0, total: 0 });
    setError(null);
    setCommitMessage(null);
    setCommitStatus({});
    createdTripIdRef.current = null;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(parseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "텍스트를 분석하지 못했습니다.");
        setStage("error");
        return;
      }

      const data = await res.json();
      const places: ExtractedPlace[] = data.places ?? [];
      if (places.length === 0) {
        setError("텍스트에서 장소를 찾지 못했습니다. 다른 텍스트로 시도해보세요.");
        setStage("error");
        return;
      }

      setLoadingPhase("geocode");
      setGeocodeProgress({ done: 0, total: places.length });

      const geocoded = await mapWithConcurrency(places, 5, async (place) => {
        const q = place.areaHint ? `${place.areaHint} ${place.name}` : place.name;
        let candidates: GeocodeCandidate[] = [];
        try {
          const r = await fetch(`/api/places/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          if (r.ok) {
            const body = await r.json().catch(() => null);
            candidates = Array.isArray(body?.candidates) ? body.candidates : [];
          }
        } catch {
          // 취소되었거나 네트워크 오류 — 이 장소만 "위치 확인 안 됨"으로 남는다
        }
        setGeocodeProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        return candidates;
      });

      setLoadingPhase("group");
      const finalDayIndexes = assignDayIndexes(
        places.map((p) => p.dayIndex),
        computedDays.length
      );

      const nextItems: CandidateItem[] = places.map((place, i) => ({
        id: `${place.name}-${i}`,
        name: place.name,
        category: place.category,
        note: place.note,
        reason: place.reason,
        estimatedStayMin: place.estimatedStayMin,
        estimatedCostWon: place.estimatedCostWon,
        dayIndex: finalDayIndexes[i],
        candidates: geocoded[i],
        selectedIndex: geocoded[i].length > 0 ? 0 : -1,
        checked: geocoded[i].length > 0,
      }));

      setItems(nextItems);
      setResultDays(computedDays);
      setStage("results");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStage("idle");
        return;
      }
      setError("텍스트를 분석하지 못했습니다.");
      setStage("error");
    } finally {
      abortRef.current = null;
    }
  }

  function onCancelLoading() {
    abortRef.current?.abort();
  }

  function toggleChecked(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  }

  function changeSelection(id: string, candidateIndex: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selectedIndex: candidateIndex } : it)));
  }

  const selectedCount = items.filter((it) => it.checked && it.selectedIndex >= 0).length;
  const totalEstimatedCost = items.reduce((sum, it) => sum + (it.estimatedCostWon ?? 0), 0);
  const hasAnyEstimatedCost = items.some((it) => it.estimatedCostWon != null);

  const dayGroups = useMemo(() => {
    const groups: CandidateItem[][] = Array.from({ length: resultDays.length || 1 }, () => []);
    items.forEach((it) => {
      (groups[it.dayIndex] ?? groups[0])?.push(it);
    });
    return groups;
  }, [items, resultDays.length]);

  const mapPoints = useMemo(
    () =>
      dayGroups.flatMap((group, dayIdx) =>
        group
          .filter((it) => it.selectedIndex >= 0)
          .map((it, i) => {
            const c = it.candidates[it.selectedIndex];
            return {
              id: it.id,
              name: it.name,
              lat: c.lat,
              lng: c.lng,
              category: it.category ?? c.category,
              address: c.address,
              roadAddress: c.roadAddress,
              phone: c.phone,
              placeUrl: c.placeUrl,
              label: i + 1,
              markerColor: dayColor(dayIdx),
            };
          })
      ),
    [dayGroups]
  );

  async function ensureTargetTripId(): Promise<string | null> {
    if (props.mode === "existing") return props.tripId;
    if (createdTripIdRef.current) return createdTripIdRef.current;

    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: destination.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        personnel: newPersonnel,
      }),
    });
    if (!res.ok) return null;
    const trip = await res.json();
    createdTripIdRef.current = trip.id;
    return trip.id;
  }

  async function performCommit() {
    setConfirmOpen(false);
    setSubmitting(true);
    setCommitMessage(null);

    const tripId = await ensureTargetTripId();
    if (!tripId) {
      setSubmitting(false);
      setCommitMessage("여행을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 이미 성공적으로 저장된 항목은 재시도 시 건너뛴다 — 중복 저장 방지
    const toCommit = items.filter(
      (it) => it.checked && it.selectedIndex >= 0 && commitStatus[it.id] !== "success"
    );

    let succeeded = 0;
    let failed = 0;
    // 순서를 보존하기 위해 순차적으로 추가(서버가 order를 마지막+1로 계산하므로 병렬 요청 시 order 충돌 위험)
    for (const item of toCommit) {
      setCommitStatus((prev) => ({ ...prev, [item.id]: "pending" }));
      const candidate = item.candidates[item.selectedIndex];
      const res = await fetch(`/api/trips/${tripId}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          category: item.category ?? undefined,
          lat: candidate.lat,
          lng: candidate.lng,
          address: candidate.address ?? undefined,
          roadAddress: candidate.roadAddress ?? undefined,
          placeUrl: candidate.placeUrl ?? undefined,
          phone: candidate.phone ?? undefined,
          scheduledAt: resultDays[item.dayIndex]?.toISOString(),
        }),
      });
      if (res.ok) {
        succeeded += 1;
        setCommitStatus((prev) => ({ ...prev, [item.id]: "success" }));
      } else {
        failed += 1;
        setCommitStatus((prev) => ({ ...prev, [item.id]: "error" }));
      }
    }

    setSubmitting(false);

    if (failed === 0) {
      router.push(`/trips/${tripId}`);
      router.refresh();
      return;
    }
    setCommitMessage(
      `${succeeded}개 저장 완료, ${failed}개 저장하지 못했습니다. 아래 버튼으로 실패한 항목만 다시 시도할 수 있어요.`
    );
  }

  const currentStepIndex = STEP_DEFS.findIndex((s) => s.key === loadingPhase);
  const canSubmitText = text.trim().length >= 10;

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      {confirmOpen ? (
        <Modal
          onClose={() => setConfirmOpen(false)}
          title="여행계획에 추가"
          description={
            props.mode === "existing"
              ? `${props.tripName} 여행에 ${selectedCount}개 장소를 추가합니다.`
              : `'${destination.trim()}' 새 여행을 만들고 ${selectedCount}개 장소를 추가합니다.`
          }
          icon={<Sparkles className="h-5 w-5" />}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="h-10 rounded-xl border-slate-200 px-4 text-sm font-semibold text-slate-700"
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={performCommit}
                disabled={submitting}
                className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {submitting ? "추가 중..." : "추가하기"}
              </Button>
            </>
          }
        >
          <ul className="flex flex-col gap-1.5 text-sm text-slate-600">
            {dayGroups.map((group, dayIdx) => {
              const count = group.filter((it) => it.checked && it.selectedIndex >= 0).length;
              if (count === 0) return null;
              return (
                <li key={dayIdx} className="flex items-center gap-2">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: dayColor(dayIdx) }} />
                  {dayIdx + 1}일차 · {count}곳
                </li>
              );
            })}
          </ul>
        </Modal>
      ) : null}

      {/* 왼쪽 입력 패널 — 분석 후에도 그대로 남아있어 텍스트/옵션을 고쳐 다시 생성할 수 있다 */}
      <div className="flex w-full flex-none flex-col gap-4 overflow-y-auto border-b border-[#E2E8F0] bg-white p-4 lg:h-full lg:w-[40%] lg:max-w-md lg:border-r lg:border-b-0 lg:p-6">
        {props.mode === "existing" ? (
          <div className="flex flex-wrap gap-2">
            <InfoChip icon={<MapPin className="h-3.5 w-3.5" />} label={props.tripName} />
            <InfoChip
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label={formatTripDuration(props.tripStartDate, props.tripEndDate)}
            />
            <InfoChip icon={<Users className="h-3.5 w-3.5" />} label={`${props.personnel}명`} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="ai-destination" className={labelClass}>
                여행지 <RequiredDot />
              </label>
              <input
                id="ai-destination"
                value={destination}
                disabled={stage === "loading"}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (newFieldErrors.destination) setNewFieldErrors((p) => ({ ...p, destination: undefined }));
                }}
                placeholder="예: 부산, 제주도"
                maxLength={100}
                aria-invalid={Boolean(newFieldErrors.destination)}
                aria-describedby={newFieldErrors.destination ? "ai-destination-error" : undefined}
                className={`${inputBase} ${inputBorder(Boolean(newFieldErrors.destination))} mt-2 disabled:opacity-50`}
              />
              <FieldError id="ai-destination-error" message={newFieldErrors.destination} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ai-start" className={labelClass}>
                  시작일 <RequiredDot />
                </label>
                <input
                  id="ai-start"
                  type="date"
                  value={newStartDate}
                  disabled={stage === "loading"}
                  onChange={(e) => {
                    setNewStartDate(e.target.value);
                    setNewFieldErrors((p) => ({ ...p, startDate: undefined, endDate: undefined }));
                  }}
                  aria-invalid={Boolean(newFieldErrors.startDate)}
                  aria-describedby={newFieldErrors.startDate ? "ai-start-error" : undefined}
                  className={`${inputBase} ${inputBorder(Boolean(newFieldErrors.startDate))} mt-2 disabled:opacity-50`}
                />
                <FieldError id="ai-start-error" message={newFieldErrors.startDate} />
              </div>
              <div>
                <label htmlFor="ai-end" className={labelClass}>
                  종료일 <RequiredDot />
                </label>
                <input
                  id="ai-end"
                  type="date"
                  value={newEndDate}
                  min={newStartDate || undefined}
                  disabled={stage === "loading"}
                  onChange={(e) => {
                    setNewEndDate(e.target.value);
                    setNewFieldErrors((p) => ({ ...p, endDate: undefined }));
                  }}
                  aria-invalid={Boolean(newFieldErrors.endDate)}
                  aria-describedby={newFieldErrors.endDate ? "ai-end-error" : undefined}
                  className={`${inputBase} ${inputBorder(Boolean(newFieldErrors.endDate))} mt-2 disabled:opacity-50`}
                />
                <FieldError id="ai-end-error" message={newFieldErrors.endDate} />
              </div>
            </div>
            {newStartDate && newEndDate && newEndDate >= newStartDate ? (
              <p className="-mt-2 text-xs font-semibold text-blue-600">
                {formatTripDuration(newStartDate, newEndDate)}
              </p>
            ) : null}

            <div className="flex items-center justify-between">
              <p className={labelClass}>인원</p>
              <div role="group" aria-label="인원" className="flex h-8 items-center rounded-lg border border-slate-200">
                <button
                  type="button"
                  aria-label="인원 줄이기"
                  disabled={newPersonnel <= 1 || stage === "loading"}
                  onClick={() => setNewPersonnel((n) => Math.max(1, n - 1))}
                  className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span aria-live="polite" className="w-8 text-center text-sm font-semibold text-slate-900 tabular-nums">
                  {newPersonnel}
                </span>
                <button
                  type="button"
                  aria-label="인원 늘리기"
                  disabled={newPersonnel >= 50 || stage === "loading"}
                  onClick={() => setNewPersonnel((n) => Math.min(50, n + 1))}
                  className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4">
          <p className="text-xs font-semibold text-[#64748B]">선택 정보 (입력하면 AI 추천 품질이 좋아져요)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ai-budget" className={labelClass}>
                예산
              </label>
              <input
                id="ai-budget"
                type="number"
                min={0}
                step={10000}
                value={budgetWon}
                disabled={stage === "loading"}
                onChange={(e) => setBudgetWon(e.target.value)}
                placeholder="예: 500000"
                className={`${inputBase} ${inputBorder(false)} mt-2 disabled:opacity-50`}
              />
            </div>
            <div>
              <label htmlFor="ai-transport" className={labelClass}>
                교통수단
              </label>
              <Select value={transport ?? undefined} onValueChange={setTransport} disabled={stage === "loading"}>
                <SelectTrigger id="ai-transport" className="mt-2 h-11 w-full rounded-xl border-slate-200 px-3.5 text-sm">
                  <SelectValue placeholder="선택 안 함" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <p className={labelClass}>여행 스타일</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((s) => {
                const active = style === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={stage === "loading"}
                    aria-pressed={active}
                    onClick={() => setStyle(active ? null : s)}
                    className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
                      active
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={onParse} className="flex flex-1 flex-col gap-2 border-t border-[#E2E8F0] pt-4">
          <div className="flex items-center justify-between">
            <label htmlFor="ai-text" className={labelClass}>
              여행 텍스트 <RequiredDot />
            </label>
            <span className="text-xs text-slate-400 tabular-nums">{text.length} / 5000</span>
          </div>
          <textarea
            id="ai-text"
            required
            disabled={stage === "loading"}
            value={text}
            maxLength={5000}
            onChange={(e) => setText(e.target.value)}
            placeholder="블로그 후기나 여행 일정을 자유롭게 붙여넣으세요"
            className={`min-h-[160px] flex-1 resize-none rounded-xl border ${inputBorder(
              text.length > 0 && !canSubmitText
            )} bg-white p-3.5 text-sm outline-none transition-colors focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 disabled:opacity-50`}
          />
          {text.length > 0 && !canSubmitText ? (
            <p role="alert" className="text-xs text-red-600">
              최소 10자 이상 입력해주세요.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setText(ex.text)}
                disabled={stage === "loading"}
                className="h-7 rounded-full border border-dashed border-slate-300 px-3 text-xs text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>

          {stage === "error" && error ? (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={stage === "loading" || !canSubmitText}
            className="h-11 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {stage === "loading" ? "분석 중..." : stage === "results" ? "다시 분석하기" : "AI 여행계획 생성하기"}
          </Button>
        </form>
      </div>

      {/* 오른쪽 분석 결과 패널 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {stage === "idle" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">왼쪽에 여행 텍스트를 입력해보세요</p>
            <p className="max-w-sm text-sm text-[#64748B]">
              블로그 후기, 저장해둔 메모, 대화 내용 등 무엇이든 좋아요. AI가 장소를 찾아 날짜별 일정으로 정리해드려요.
            </p>
          </div>
        ) : stage === "loading" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6" role="status" aria-live="polite">
            <div className="flex flex-col gap-3">
              {STEP_DEFS.map((step, i) => {
                const state = i < currentStepIndex ? "done" : i === currentStepIndex ? "active" : "pending";
                const label =
                  step.key === "geocode" && geocodeProgress.total > 0
                    ? `장소 확인 중 (${geocodeProgress.done}/${geocodeProgress.total})`
                    : step.label;
                return (
                  <div key={step.key} className="flex items-center gap-2.5 text-sm">
                    {state === "done" ? (
                      <CheckCircle2 className="h-4.5 w-4.5 flex-none text-green-600" />
                    ) : state === "active" ? (
                      <Loader2 className="h-4.5 w-4.5 flex-none animate-spin text-blue-600" />
                    ) : (
                      <Circle className="h-4.5 w-4.5 flex-none text-slate-300" />
                    )}
                    <span className={state === "pending" ? "text-slate-400" : "font-medium text-[#0F172A]"}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onCancelLoading}
              className="h-9 rounded-xl border-slate-200 px-4 text-sm"
            >
              취소
            </Button>
          </div>
        ) : stage === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[#0F172A]">분석하지 못했습니다</p>
            <p className="max-w-sm text-sm text-[#64748B]">{error}</p>
            <Button
              type="button"
              onClick={() => onParse()}
              className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-none flex-wrap items-center gap-x-5 gap-y-1 border-b border-[#E2E8F0] bg-white px-4 py-3 text-sm">
              <span className="font-semibold text-[#0F172A]">장소 {items.length}곳</span>
              <span className="text-[#64748B]">{resultDays.length}일 일정</span>
              {hasAnyEstimatedCost ? (
                <span className="text-[#64748B]">
                  예상 비용 합계 약 {totalEstimatedCost.toLocaleString()}원{" "}
                  <span className="text-xs text-slate-400">(참고용, 1인 기준)</span>
                </span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => onParse()}
                className="ml-auto h-8 rounded-lg px-3 text-xs"
              >
                다시 생성
              </Button>
            </div>

            {commitMessage ? (
              <p role="alert" className="flex-none bg-red-50 px-4 py-2 text-xs text-red-600">
                {commitMessage}
              </p>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="flex min-h-0 w-full flex-none flex-col border-b border-[#E2E8F0] lg:w-[380px] lg:border-r lg:border-b-0">
                <ol className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                  {dayGroups.map((group, dayIdx) =>
                    group.length === 0 ? null : (
                      <li key={dayIdx} className="flex flex-col gap-2">
                        <p
                          className="flex items-center gap-1.5 px-1 text-xs font-bold"
                          style={{ color: dayColor(dayIdx) }}
                        >
                          <span className="h-2 w-2 flex-none rounded-full" style={{ background: dayColor(dayIdx) }} />
                          {formatDayLabel(resultDays[dayIdx] ?? new Date(), dayIdx + 1)}
                        </p>
                        <ul className="flex flex-col gap-2">
                          {group.map((item) => (
                            <li
                              key={item.id}
                              className={`rounded-xl border p-3 ${
                                item.selectedIndex < 0 ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  disabled={item.selectedIndex < 0}
                                  onChange={() => toggleChecked(item.id)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-sm font-semibold text-[#0F172A]">{item.name}</p>
                                    {commitStatus[item.id] === "success" ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 flex-none text-green-600" />
                                    ) : commitStatus[item.id] === "error" ? (
                                      <AlertTriangle className="h-3.5 w-3.5 flex-none text-red-600" />
                                    ) : null}
                                  </div>
                                  {item.category ? <p className="text-xs text-[#64748B]">{item.category}</p> : null}

                                  {item.candidates.length === 0 ? (
                                    <p className="mt-1 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                                      <AlertTriangle className="h-3 w-3" /> 위치 확인 안 됨 — 카카오 키 미설정이거나
                                      검색 결과 없음
                                    </p>
                                  ) : item.candidates.length === 1 ? (
                                    <p className="mt-1 truncate text-xs text-[#64748B]">
                                      {item.candidates[0].address ?? item.candidates[0].roadAddress}
                                    </p>
                                  ) : (
                                    <div className="mt-1">
                                      <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                        동명 장소 {item.candidates.length}곳 — 확인 필요
                                      </span>
                                      <select
                                        value={item.selectedIndex}
                                        onChange={(e) => changeSelection(item.id, Number(e.target.value))}
                                        className="mt-1 w-full rounded border border-slate-300 px-1.5 py-1 text-xs"
                                      >
                                        {item.candidates.map((c, ci) => (
                                          <option key={ci} value={ci}>
                                            {c.address ?? c.roadAddress ?? c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {item.reason ? (
                                    <p className="mt-1.5 flex items-start gap-1 text-xs text-[#64748B]">
                                      <Lightbulb className="mt-0.5 h-3 w-3 flex-none text-amber-500" />
                                      {item.reason}
                                    </p>
                                  ) : null}

                                  {item.estimatedStayMin != null || item.estimatedCostWon != null ? (
                                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#64748B]">
                                      {item.estimatedStayMin != null ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3 w-3" />약 {formatStayMin(item.estimatedStayMin)}
                                        </span>
                                      ) : null}
                                      {item.estimatedCostWon != null ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Wallet className="h-3 w-3" />약{" "}
                                          {item.estimatedCostWon.toLocaleString()}원(추정)
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {item.note ? <p className="mt-1 text-[11px] text-slate-400">{item.note}</p> : null}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  )}
                </ol>

                <div className="flex-none border-t border-[#E2E8F0] p-3">
                  <Button
                    type="button"
                    onClick={() => (commitMessage ? performCommit() : setConfirmOpen(true))}
                    disabled={submitting || selectedCount === 0}
                    className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    {submitting
                      ? "추가 중..."
                      : commitMessage
                        ? `실패한 항목 다시 시도 (${selectedCount}개 선택됨)`
                        : `선택한 ${selectedCount}개 일정에 추가`}
                  </Button>
                </div>
              </div>

              <div className="h-64 flex-1 lg:h-auto">
                <KakaoMapCanvas points={mapPoints} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
