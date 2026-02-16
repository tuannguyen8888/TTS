export function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString("vi-VN");
}

export function formatAmount(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value || "0") : value;
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

