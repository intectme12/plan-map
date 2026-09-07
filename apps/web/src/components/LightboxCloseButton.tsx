// PhotoLightbox/AvatarLightbox처럼 어두운 배경 위 전체화면 뷰어에서 쓰는 닫기 버튼.
// 밝은 배경의 Modal 헤더 닫기 버튼과는 스타일이 달라 별도 컴포넌트로 둔다.
export function LightboxCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      aria-label="닫기"
      className="absolute right-4 top-4 text-2xl text-white/80 hover:text-white"
    >
      ✕
    </button>
  );
}
