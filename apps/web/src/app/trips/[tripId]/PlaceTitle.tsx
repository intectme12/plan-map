// 타임라인 장소 카드의 이름 + 카테고리 칩 한 줄(편집용 PlaceList, 공유용 SharedPlaceList 공통).
// 카테고리 칩을 이름 오른쪽에 붙이고, 카카오 원본 분류("여행 > 관광,명소 > 해수욕장,해변")처럼
// 길어도 이름을 밀어내지 않도록 칩 폭을 제한해 말줄임 처리한다(전체 값은 title로 확인).
export function PlaceTitle({ name, category }: { name: string; category: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 truncate text-sm font-semibold text-neutral-900">{name}</span>
      {category ? (
        <span
          title={category}
          className="max-w-[60%] flex-none truncate rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500"
        >
          {category}
        </span>
      ) : null}
    </span>
  );
}
