export function Avatar({
  url,
  nickname,
  size = 40,
}: {
  url: string | null;
  nickname: string;
  size?: number;
}) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
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
      {nickname.slice(0, 1).toUpperCase()}
    </div>
  );
}
