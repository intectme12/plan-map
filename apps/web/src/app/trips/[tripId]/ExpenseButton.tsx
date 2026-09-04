"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { expenseCategories } from "@/lib/validation";

type Expense = { id: string; amount: number; category: string };

export function ExpenseButton({
  tripId,
  placeId,
  expenses,
}: {
  tripId: string;
  placeId: string;
  expenses: Expense[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof expenseCategories)[number]>("음식");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;

    setSaving(true);
    await fetch(`/api/trips/${tripId}/places/${placeId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, amount: value }),
    });
    setSaving(false);
    setAmount("");
    router.refresh();
  }

  async function removeExpense(expenseId: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/trips/${tripId}/places/${placeId}/expenses/${expenseId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <div className="ml-7 py-0.5 text-xs text-neutral-500" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <span>
          💰 {total > 0 ? `${total.toLocaleString()}원` : "지출 없음"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="rounded border border-neutral-200 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-50"
        >
          비용 {open ? "닫기" : "입력"}
        </button>
      </div>

      {open ? (
        <div className="mt-1.5 flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          {expenses.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {expenses.map((exp) => (
                <li key={exp.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                      {exp.category}
                    </span>
                    <span className="tabular-nums">{exp.amount.toLocaleString()}원</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => removeExpense(exp.id, e)}
                    className="text-[10px] text-neutral-400 hover:text-red-600"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <form onSubmit={addExpense} className="flex items-center gap-1">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof expenseCategories)[number])}
              className="rounded border border-neutral-300 bg-white px-1 py-1 text-[11px]"
            >
              {expenseCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-[11px]"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              추가
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
