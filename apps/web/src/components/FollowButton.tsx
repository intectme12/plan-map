"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/ToastProvider";

export function FollowButton({
  nickname,
  initialIsFollowing,
  className,
}: {
  nickname: string;
  initialIsFollowing: boolean;
  className?: string;
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
