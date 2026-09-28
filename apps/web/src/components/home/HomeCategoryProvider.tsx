"use client";

import { createContext, useContext, useMemo, useState } from "react";

type HomeCategoryContextValue = {
  category: string | undefined;
  setCategory: (category: string | undefined) => void;
};

const HomeCategoryContext = createContext<HomeCategoryContextValue | null>(null);

// CategoryNav.tsx(카테고리 탭)와 RecommendedGrid.tsx(그 아래 여행지 그리드)는 DOM상 형제가
// 아니라 그리드 레이아웃 안팎에 따로 떨어져 있어서, 예전처럼 페이지 URL(?category=)로
// 이어주는 대신 이 Context로 선택된 카테고리만 공유한다 — 클릭해도 페이지 이동/스크롤 이동이
// 없다. 초기값은 서버가 searchParams로 내려준 값과 항상 같아서 첫 렌더는 SSR 결과와 일치한다.
export function HomeCategoryProvider({
  initialCategory,
  children,
}: {
  initialCategory?: string;
  children: React.ReactNode;
}) {
  const [category, setCategory] = useState(initialCategory);
  const value = useMemo(() => ({ category, setCategory }), [category]);

  return <HomeCategoryContext.Provider value={value}>{children}</HomeCategoryContext.Provider>;
}

export function useHomeCategory() {
  const ctx = useContext(HomeCategoryContext);
  if (!ctx) throw new Error("useHomeCategory는 HomeCategoryProvider 안에서만 쓸 수 있습니다.");
  return ctx;
}
