"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";

export function FollowButton({
  nickname,
  initialIsFollowing,
  className,
  onChange,
}: {
  nickname: string;
  initialIsFollowing: boolean;
  className?: string;
  // 서버 컴포넌트 페이지는 router.refresh()로 팔로워 수가 갱신되지만, 클라이언트에서 fetch한
  // 데이터를 그리는 프로필 팝업은 이 콜백으로 직접 숫자를 맞춘다
  onChange?: (isFollowing: boolean) => void;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function onClick() {
    const next = !isFollowing;
    setPending(true);
    setIsFollowing(next);

    const res = await fetch(`/api/users/${encodeURIComponent(nickname)}/follow`, {
      method: next ? "POST" : "DELETE",
    });

    setPending(false);

    if (!res.ok) {
      setIsFollowing(!next);
      toast.show(next ? "팔로우할 수 없습니다." : "언팔로우할 수 없습니다.");
      return;
    }

    onChange?.(next);
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? "outline" : "default"}
      disabled={pending}
      onClick={onClick}
      className={className ?? "h-auto rounded-md px-3 py-1.5 text-xs"}
    >
      {isFollowing ? "팔로잉" : "팔로우"}
    </Button>
  );
}
