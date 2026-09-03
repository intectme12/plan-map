"use client";

import { useState } from "react";

export function ExpenseInput({
  tripId,
  placeId,
  initialAmount,
}: {
  tripId: string;
  placeId: string;
  initialAmount: number | null;
}) {
  const [value, setValue] = useState(initialAmount != null ? String(initialAmount) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    await fetch(`/api/trips/${tripId}/places/${placeId}/expense`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    setSaving(false);
  }

  return (
    <div className="ml-7 flex items-center gap-1 py-0.5 text-xs text-neutral-500">
      <span>💰</span>
      <input
        type="number"
        min={0}
        placeholder="지출 입력"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        disabled={saving}
        className="w-20 rounded border border-neutral-200 px-1.5 py-0.5 text-xs disabled:opacity-50"
      />
      원
    </div>
  );
}
