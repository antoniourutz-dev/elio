export const formatAdminDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('eu-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

export const formatPercentage = (value: number): string => `% ${Math.max(0, Math.round(value))}`;
export const formatMeters = (value: number): string => `${Math.max(0, Math.round(value))} m`;
export const formatMeterProgress = (currentMeters: number, totalMeters: number): string =>
  `${Math.max(0, Math.round(currentMeters))}/${Math.max(0, Math.round(totalMeters))} m`;
