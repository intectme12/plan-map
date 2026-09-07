"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { expenseCategories } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Expense = { id: string; amount: number; category: string; memo: string | null };

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
  const [memo, setMemo] = useState("");
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
      body: JSON.stringify({ category, amount: value, memo: memo.trim() || undefined }),
    });
    setSaving(false);
    setMemo("");
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
      <div className="flex items-center justify-end gap-2">
        <span>
          💰 {total > 0 ? `${total.toLocaleString()}원` : "지출 없음"}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="h-auto rounded border-neutral-200 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-500"
        >
          비용 {open ? "닫기" : "입력"}
        </Button>
      </div>

      {open ? (
        <div className="mt-1.5 flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          {expenses.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {expenses.map((exp) => (
                <li key={exp.id} className="flex items-center gap-1 text-[11px]">
                  <span className="w-16 flex-none truncate rounded-full bg-white px-1.5 py-0.5 text-center font-semibold text-neutral-600">
                    {exp.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-500">{exp.memo ?? ""}</span>
                  <span className="w-24 flex-none whitespace-nowrap text-right tabular-nums">
                    {exp.amount.toLocaleString()}원
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => removeExpense(exp.id, e)}
                    className="h-auto w-10 flex-none justify-center rounded p-0 text-center text-[11px] text-neutral-400 hover:bg-transparent hover:text-destructive"
                  >
                    삭제
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <form onSubmit={addExpense} className="flex items-center gap-1">
            <Select
              value={category}
              onValueChange={(v: string) => setCategory(v as (typeof expenseCategories)[number])}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-16 flex-none justify-center gap-0.5 bg-background px-1 text-center text-[11px] [&_svg]:size-3"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c} value={c} className="text-[11px]">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="무엇에 지출했나요?"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="h-7 w-full min-w-0 flex-1 bg-background px-1.5 text-[11px]"
            />
            <Input
              type="number"
              min={1}
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-7 w-24 min-w-0 flex-none bg-background px-1.5 text-right text-[11px]"
            />
            <Button
              type="submit"
              disabled={saving}
              className="h-7 w-10 flex-none px-0 text-[11px] font-semibold"
            >
              추가
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
