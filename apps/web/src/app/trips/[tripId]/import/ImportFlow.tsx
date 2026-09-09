"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KakaoMapCanvas } from "@/components/map/KakaoMapCanvas";
import { Button } from "@/components/ui/button";

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

type RawCandidate = {
  name: string;
  category: string | null;
  note: string | null;
  candidates: GeocodeCandidate[];
};

type CandidateItem = RawCandidate & {
  selectedIndex: number; // candidates 배열 인덱스, 좌표를 못 찾았으면 -1
  checked: boolean;
};

type Stage = "idle" | "loading" | "error" | "results";

function AnalysisPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-neutral-400">
      {children}
    </div>
  );
}

export function ImportFlow({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function onParse(e: React.FormEvent) {
    e.preventDefault();
    setStage("loading");
    setError(null);

    const res = await fetch(`/api/trips/${tripId}/ai-parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "텍스트를 분석하지 못했습니다.");
      setStage("error");
      return;
    }

    const data = await res.json();
    const raw: RawCandidate[] = data.candidates ?? [];

    if (raw.length === 0) {
      setError("텍스트에서 장소를 찾지 못했습니다. 다른 텍스트로 시도해보세요.");
      setStage("error");
      return;
    }

    setItems(
      raw.map((c) => ({
        ...c,
        selectedIndex: c.candidates.length > 0 ? 0 : -1,
        checked: c.candidates.length > 0,
      }))
    );
    setStage("results");
  }

  function toggleChecked(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function changeSelection(index: number, candidateIndex: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selectedIndex: candidateIndex } : item))
    );
  }

  async function onCommit() {
    const selected = items.filter((item) => item.checked && item.selectedIndex >= 0);
    if (selected.length === 0) return;

    setSubmitting(true);
    // 순서를 보존하기 위해 순차적으로 추가 (서버가 order를 마지막+1로 계산하므로 병렬 요청 시 order 충돌 위험)
    for (const item of selected) {
      const candidate = item.candidates[item.selectedIndex];
      await fetch(`/api/trips/${tripId}/places`, {
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
        }),
      });
    }
    setSubmitting(false);
    router.push(`/trips/${tripId}`);
    router.refresh();
  }

  const selectedCount = items.filter((item) => item.checked && item.selectedIndex >= 0).length;
  const mapPoints = items
    .filter((item) => item.selectedIndex >= 0)
    .map((item, i) => {
      const c = item.candidates[item.selectedIndex];
      return {
        id: `${item.name}-${i}`,
        name: item.name,
        lat: c.lat,
        lng: c.lng,
        category: item.category ?? c.category,
        address: c.address,
        roadAddress: c.roadAddress,
        phone: c.phone,
        placeUrl: c.placeUrl,
      };
    });

  return (
    <div className="flex h-full">
      {/* 사용자 입력칸 — 분석 후에도 그대로 남아있어 텍스트를 고쳐 다시 분석할 수 있다 */}
      <div className="flex w-[380px] flex-none flex-col gap-2 border-r border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-700">사용자 입력칸</h2>
        <form onSubmit={onParse} className="flex flex-1 flex-col gap-2">
          <textarea
            required
            disabled={stage === "loading"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="블로그 후기나 여행 텍스트를 붙여넣으세요"
            className="flex-1 resize-none rounded-md border border-neutral-300 p-3 text-sm disabled:opacity-50"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button
            type="submit"
            disabled={stage === "loading"}
            className="h-auto rounded-md px-3 py-2 text-sm font-semibold"
          >
            {stage === "loading" ? "분석 중..." : stage === "results" ? "다시 분석하기" : "텍스트 분석하기"}
          </Button>
        </form>
      </div>

      {/* AI 분석완료 칸 — 분석 결과(후보 목록 + 지도)가 여기 표시된다 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700">
          AI 분석완료
        </h2>

        {stage === "idle" ? (
          <AnalysisPlaceholder>
            왼쪽에 텍스트를 입력하고 &ldquo;텍스트 분석하기&rdquo;를 누르면
            <br />
            추출된 장소 후보가 여기 표시됩니다.
          </AnalysisPlaceholder>
        ) : stage === "loading" ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-neutral-100" />
            ))}
          </div>
        ) : stage === "error" ? (
          <AnalysisPlaceholder>텍스트를 분석하지 못했습니다. 왼쪽에서 다시 시도해주세요.</AnalysisPlaceholder>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="flex w-[380px] flex-none flex-col border-r border-neutral-200">
              <ol className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="rounded-md border border-neutral-200 p-2.5">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        disabled={item.selectedIndex < 0}
                        onChange={() => toggleChecked(index)}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        {item.category ? <p className="text-xs text-neutral-400">{item.category}</p> : null}

                        {item.candidates.length === 0 ? (
                          <p className="mt-1 text-xs text-neutral-400">
                            위치를 찾지 못했습니다 (카카오 키 미설정이거나 검색 결과 없음)
                          </p>
                        ) : item.candidates.length === 1 ? (
                          <p className="mt-1 truncate text-xs text-neutral-500">
                            {item.candidates[0].address ?? item.candidates[0].roadAddress}
                          </p>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              동명 장소 {item.candidates.length}곳 — 확인 필요
                            </span>
                            <select
                              value={item.selectedIndex}
                              onChange={(e) => changeSelection(index, Number(e.target.value))}
                              className="mt-1 w-full rounded border border-neutral-300 px-1.5 py-1 text-xs"
                            >
                              {item.candidates.map((c, ci) => (
                                <option key={ci} value={ci}>
                                  {c.address ?? c.roadAddress ?? c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="border-t border-neutral-200 p-3">
                <Button
                  onClick={onCommit}
                  disabled={submitting || selectedCount === 0}
                  className="h-auto w-full rounded-md px-3 py-2 text-sm font-semibold"
                >
                  {submitting ? "추가 중..." : `선택한 ${selectedCount}개 일정에 추가`}
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <KakaoMapCanvas points={mapPoints} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
