export function formatTripDuration(startDate: Date | string, endDate: Date | string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (nights <= 0) return "당일치기";
  return `${nights}박 ${nights + 1}일`;
}

export function formatDateRange(startDate: Date | string, endDate: Date | string) {
  const fmt = (d: Date | string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}
