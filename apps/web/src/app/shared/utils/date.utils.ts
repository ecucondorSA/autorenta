export const formatDateRange = (from: string, to: string): string => {
  const start = new Date(from);
  const end = new Date(to);
  return `${start.toLocaleDateString('es-AR')} - ${end.toLocaleDateString('es-AR')}`;
};
