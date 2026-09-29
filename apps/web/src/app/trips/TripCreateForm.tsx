"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Minus, Plane, Plus, Search, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { tripCategories } from "@/lib/validation";
import { formatTripDuration } from "@/lib/formatTripDuration";

type UserResult = { id: string; nickname: string; bio: string | null; avatarUrl: string | null };
// avatarUrl은 칩 표시용으로만 들고 있고, 생성 요청에는 기존대로 {name, userId}만 보낸다
type Participant = { key: string; name: string; userId?: string; avatarUrl?: string | null };
type FieldErrors = { name?: string; startDate?: string; endDate?: string };

// createTripSchema의 name.max(100)과 맞춘다
const NAME_MAX_LENGTH = 100;
const PERSONNEL_MIN = 1;
const PERSONNEL_MAX = 50;
const FORM_ID = "trip-create-form";

// 이 모달 안에서 반복되는 입력칸/라벨 스타일 — 높이 44px, 포커스 시 파란 테두리로 통일
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

export function TripCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [personnel, setPersonnel] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  // 검색어가 비어있으면 조회하지 않고, 렌더 쪽에서 이미 결과 목록을 숨기니 여기서 지울 필요는 없다
  useEffect(() => {
    if (!participantQuery.trim()) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(participantQuery)}`);
      const data: UserResult[] = res.ok ? await res.json() : [];
      setSearching(false);
      setParticipantResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [participantQuery]);

  function addParticipant(participant: { name: string; userId?: string; avatarUrl?: string | null }) {
    setParticipants((prev) => {
      if (participant.userId && prev.some((p) => p.userId === participant.userId)) return prev;
      return [...prev, { key: participant.userId ?? `guest-${Date.now()}-${prev.length}`, ...participant }];
    });
    setParticipantQuery("");
    setParticipantResults([]);
  }

  function removeParticipant(key: string) {
    setParticipants((prev) => prev.filter((p) => p.key !== key));
  }

  function onParticipantInputSubmit() {
    const trimmed = participantQuery.trim();
    if (!trimmed) return;
    // 검색 결과 중 정확히 일치하는 가입 회원이 있으면 그 회원으로, 없으면 미가입자(이름만)로 추가한다
    const exactMatch = participantResults.find((u) => u.nickname === trimmed);
    if (exactMatch) {
      addParticipant({ name: exactMatch.nickname, userId: exactMatch.id, avatarUrl: exactMatch.avatarUrl });
    } else {
      addParticipant({ name: trimmed });
    }
  }

  const addedUserIds = new Set(participants.filter((p) => p.userId).map((p) => p.userId));

  // 서버(createTripSchema)는 종료일<시작일을 막지 않아서, 여기서 한 번 걸러준다
  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "여행 제목을 입력해주세요.";
    if (!startDate) next.startDate = "시작일을 선택해주세요.";
    if (!endDate) next.endDate = "종료일을 선택해주세요.";
    else if (startDate && endDate < startDate) next.endDate = "종료일은 시작일과 같거나 이후여야 해요.";
    return next;
  }

  function resetForm() {
    setName("");
    setStartDate("");
    setEndDate("");
    setPersonnel(1);
    setTags([]);
    setParticipants([]);
    setParticipantQuery("");
    setFieldErrors({});
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (nextErrors.name) return nameRef.current?.focus();
    if (nextErrors.startDate) return startRef.current?.focus();
    if (nextErrors.endDate) return endRef.current?.focus();

    setPending(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        startDate,
        endDate,
        personnel,
        participants: participants.map(({ name, userId }) => ({ name, userId })),
        tags,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("여행을 만들지 못했습니다. 입력값을 확인해주세요.");
      return;
    }
    const trip = await res.json();
    setOpen(false);
    resetForm();
    router.push(`/trips/${trip.id}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 text-blue-600 transition-colors hover:border-blue-400 hover:bg-blue-50"
      >
        <Sparkles className="h-6 w-6" />
        <span className="text-sm font-semibold">새 여행 만들기</span>
        <span className="text-xs text-blue-400">AI가 추천하는 나만의 여행 코스</span>
      </button>
    );
  }

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const durationLabel = datesValid ? formatTripDuration(startDate, endDate) : "기간 미정";

  return (
    <Modal
      onClose={() => setOpen(false)}
      title="새 여행 만들기"
      description="특별한 여행을 계획해보세요. Triply가 도와드릴게요!"
      icon={<Plane className="h-5 w-5" />}
      maxWidth="3xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="h-11 rounded-xl border-slate-200 px-5 text-sm font-semibold text-slate-700"
          >
            취소
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pending}
            aria-busy={pending}
            className="h-11 min-w-[120px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 만드는 중...
              </>
            ) : (
              "여행 만들기"
            )}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {/* 여행 제목 */}
        <div>
          <label htmlFor="trip-name" className={labelClass}>
            여행 제목 <RequiredDot />
          </label>
          <div className="relative mt-2">
            <input
              id="trip-name"
              ref={nameRef}
              placeholder="여행 제목 (예: 강릉 1박 2일)"
              value={name}
              maxLength={NAME_MAX_LENGTH}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "trip-name-error" : undefined}
              className={`${inputBase} ${inputBorder(Boolean(fieldErrors.name))} pr-16`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-slate-400 tabular-nums">
              {name.length} / {NAME_MAX_LENGTH}
            </span>
          </div>
          <FieldError id="trip-name-error" message={fieldErrors.name} />
        </div>

        {/* 여행 날짜 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:gap-4">
          <div>
            <label htmlFor="trip-start" className={labelClass}>
              시작일 <RequiredDot />
            </label>
            <input
              id="trip-start"
              ref={startRef}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, startDate: undefined, endDate: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.startDate)}
              aria-describedby={fieldErrors.startDate ? "trip-start-error" : undefined}
              className={`${inputBase} ${inputBorder(Boolean(fieldErrors.startDate))} mt-2`}
            />
            <FieldError id="trip-start-error" message={fieldErrors.startDate} />
          </div>
          <div>
            <label htmlFor="trip-end" className={labelClass}>
              종료일 <RequiredDot />
            </label>
            <input
              id="trip-end"
              ref={endRef}
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.endDate)}
              aria-describedby={fieldErrors.endDate ? "trip-end-error" : undefined}
              className={`${inputBase} ${inputBorder(Boolean(fieldErrors.endDate))} mt-2`}
            />
            <FieldError id="trip-end-error" message={fieldErrors.endDate} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className={labelClass}>여행 기간</p>
            <div
              aria-live="polite"
              className={`mt-2 flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap sm:min-w-[132px] ${
                datesValid ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              {durationLabel}
            </div>
          </div>
        </div>

        {/* 여행 태그 — createTripSchema가 tripCategories만 받아서, 사용자 직접 입력 태그는 아직 없음 */}
        <div>
          <p className={labelClass}>여행 태그</p>
          <p className="mt-1 text-xs text-slate-500">홈 카테고리에 노출될 태그를 선택하세요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tripCategories.map((category) => {
              const active = tags.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setTags((prev) =>
                      prev.includes(category) ? prev.filter((t) => t !== category) : [...prev, category]
                    )
                  }
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-blue-600/20 focus-visible:outline-none ${
                    active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  #{category}
                  {active ? <X aria-hidden className="h-3.5 w-3.5" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* 함께할 사람 + 인원 */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="trip-participant" className={labelClass}>
              함께할 사람
            </label>
            <div className="flex items-center gap-2">
              <span id="trip-personnel-label" className="text-xs text-slate-500">
                인원
              </span>
              <div
                role="group"
                aria-labelledby="trip-personnel-label"
                className="flex h-8 items-center rounded-lg border border-slate-200"
              >
                <button
                  type="button"
                  aria-label="인원 줄이기"
                  disabled={personnel <= PERSONNEL_MIN}
                  onClick={() => setPersonnel((n) => Math.max(PERSONNEL_MIN, n - 1))}
                  className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span aria-live="polite" className="w-8 text-center text-sm font-semibold text-slate-900 tabular-nums">
                  {personnel}
                </span>
                <button
                  type="button"
                  aria-label="인원 늘리기"
                  disabled={personnel >= PERSONNEL_MAX}
                  onClick={() => setPersonnel((n) => Math.min(PERSONNEL_MAX, n + 1))}
                  className="flex h-full w-8 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="trip-participant"
                value={participantQuery}
                onChange={(e) => setParticipantQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    onParticipantInputSubmit();
                  }
                }}
                placeholder="닉네임 검색 또는 이름 입력 후 추가"
                autoComplete="off"
                className={`${inputBase} border-slate-200 pl-10`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onParticipantInputSubmit}
              disabled={!participantQuery.trim()}
              className="h-11 flex-none rounded-xl border-blue-600 px-5 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              추가
            </Button>
          </div>

          {participantQuery.trim() ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
              {searching ? (
                <p className="px-2.5 py-2 text-xs text-slate-400">검색 중...</p>
              ) : participantResults.length === 0 ? (
                <p className="px-2.5 py-2 text-xs text-slate-500">
                  일치하는 회원이 없어요. &quot;추가&quot;를 누르면 미가입자로 등록됩니다.
                </p>
              ) : (
                <ul className="flex max-h-44 flex-col overflow-y-auto">
                  {participantResults.map((u) => {
                    const added = addedUserIds.has(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => addParticipant({ name: u.nickname, userId: u.id, avatarUrl: u.avatarUrl })}
                          disabled={added}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-blue-50 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          <Avatar url={u.avatarUrl} nickname={u.nickname} size={28} />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{u.nickname}</span>
                          <span className="flex-none text-xs text-slate-400">{added ? "추가됨" : "추가"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {participants.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {participants.map((p) => (
                <li
                  key={p.key}
                  className={`flex h-9 items-center gap-2 rounded-full border py-1 pr-1.5 pl-1 text-sm ${
                    p.userId ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Avatar url={p.avatarUrl ?? null} nickname={p.name} size={28} />
                  <span className="font-medium text-slate-900">{p.name}</span>
                  {p.userId ? null : <span className="text-xs text-slate-400">미가입</span>}
                  <button
                    type="button"
                    onClick={() => removeParticipant(p.key)}
                    aria-label={`${p.name} 삭제`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
