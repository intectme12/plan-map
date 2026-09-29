"use client";

import { useState } from "react";

// 이미지 주소가 있어도 로딩에 실패하면(삭제된 업로드 파일, 만료된 외부 프로필 URL 등)
// 깨진 이미지 아이콘 대신 닉네임 첫 글자로 바꿔 보여준다. 실패한 주소를 기억해 두므로
// 다른 주소로 바뀌면 자동으로 다시 시도한다.
export function Avatar({
  url,
  nickname,
  size = 40,
}: {
  url: string | null;
  nickname: string;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url && url !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        onError={() => setFailedUrl(url)}
        // 서버 렌더링된 <img>는 hydration 전에 이미 실패해 onError를 놓칠 수 있어 마운트 시 한 번 더 확인
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) setFailedUrl(url);
        }}
        style={{ width: size, height: size }}
        className="flex-none rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex flex-none items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-500"
    >
      {(nickname || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
