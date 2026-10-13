"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FeatureToggle({
  featureKey,
  label,
  disabled,
  locked,
}: {
  featureKey: string;
  label: string;
  disabled: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !disabled;
    let reason: string | undefined;
    if (next) {
      // 차단은 사용자에게 바로 영향이 가므로 한 번 더 확인하고, 운영 기록용 사유를 받는다(선택)
      const input = prompt(`'${label}' 기능을 차단합니다. 사유를 남겨주세요(선택).`);
      if (input === null) return;
      reason = input.trim() || undefined;
    } else if (!confirm(`'${label}' 기능을 다시 켭니다.`)) {
      return;
    }

    setPending(true);
    setError(null);
    const res = await fetch("/api/admin/features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: featureKey, disabled: next, reason }),
    });
    setPending(false);
    if (!res.ok) {
      setError("변경하지 못했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <button
        disabled={pending || locked}
        onClick={toggle}
        className={`rounded-md border px-2 py-1 text-xs disabled:opacity-40 ${
          disabled ? "border-neutral-300" : "border-red-300 text-red-600"
        }`}
      >
        {disabled ? "다시 켜기" : "차단하기"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
