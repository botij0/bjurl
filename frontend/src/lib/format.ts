export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export const isExpired = (expiresAt: string | null | undefined): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
};
