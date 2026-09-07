"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

type UserResult = { id: string; nickname: string; bio: string | null; avatarUrl: string | null };
type Participant = { key: string; name: string; userId?: string };

export function TripCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [personnel, setPersonnel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantResults, setParticipantResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);

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

  function addParticipant(participant: { name: string; userId?: string }) {
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
      addParticipant({ name: exactMatch.nickname, userId: exactMatch.id });
    } else {
      addParticipant({ name: trimmed });
    }
  }

  const addedUserIds = new Set(participants.filter((p) => p.userId).map((p) => p.userId));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError("여행을 만들지 못했습니다. 입력값을 확인해주세요.");
      return;
    }
    const trip = await res.json();
    setOpen(false);
    setName("");
    setStartDate("");
    setEndDate("");
    setPersonnel(1);
    setParticipants([]);
    setParticipantQuery("");
    router.push(`/trips/${trip.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
      >
        새 여행 만들기
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4"
    >
      <input
        required
        placeholder="여행 제목 (ex. 강릉 1박 2일)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="date"
          required
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          required
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        type="number"
        min={1}
        max={50}
        value={personnel}
        onChange={(e) => setPersonnel(Number(e.target.value))}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-neutral-500">함께할 사람</p>
        <div className="flex gap-1.5">
          <input
            value={participantQuery}
            onChange={(e) => setParticipantQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onParticipantInputSubmit();
              }
            }}
            placeholder="닉네임 검색 또는 이름 입력 후 추가"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={onParticipantInputSubmit}
            disabled={!participantQuery.trim()}
            className="flex-none rounded-md border border-neutral-300 px-2 py-1.5 text-xs disabled:opacity-50"
          >
            추가
          </button>
        </div>

        {participantQuery.trim() ? (
          <div className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-50 p-1.5">
            {searching ? (
              <p className="px-1 text-xs text-neutral-400">검색 중...</p>
            ) : participantResults.length === 0 ? (
              <p className="px-1 text-xs text-neutral-400">
                일치하는 회원이 없습니다. &quot;추가&quot;를 누르면 미가입자로 등록됩니다.
              </p>
            ) : (
              <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {participantResults.map((u) => (
                  <li key={u.id} className="flex items-center gap-2 rounded-md bg-white px-2 py-1">
                    <Avatar url={u.avatarUrl} nickname={u.nickname} size={18} />
                    <span className="min-w-0 flex-1 truncate text-xs">{u.nickname}</span>
                    <button
                      type="button"
                      onClick={() => addParticipant({ name: u.nickname, userId: u.id })}
                      disabled={addedUserIds.has(u.id)}
                      className="flex-none rounded-md border border-neutral-300 px-2 py-0.5 text-[11px] disabled:opacity-50"
                    >
                      {addedUserIds.has(u.id) ? "추가됨" : "추가"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {participants.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {participants.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs"
              >
                <span>{p.name}</span>
                {!p.userId ? <span className="text-neutral-400">(미가입)</span> : null}
                <button
                  type="button"
                  onClick={() => removeParticipant(p.key)}
                  className="text-neutral-400 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "만드는 중..." : "만들기"}
        </button>
      </div>
    </form>
  );
}
