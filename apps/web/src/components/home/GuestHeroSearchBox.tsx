"use client";

import { Search } from "lucide-react";
import { useLoginPopup } from "@/components/auth/LoginPopupContext";

// /trips 자체가 로그인 필요라, 게스트 상태에서 검색을 제출하면 실제 이동 대신 로그인 팝업을 띄운다.
export function GuestHeroSearchBox() {
  const { openPopup } = useLoginPopup();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        openPopup();
      }}
      className="mt-8 flex w-full max-w-xl"
    >
      <div className="flex w-full items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-lg">
        <Search className="h-5 w-5 flex-none text-neutral-400" />
        <input
          name="q"
          placeholder="어디로 여행을 떠나고 싶으세요?"
          className="min-w-0 flex-1 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          aria-label="검색"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
