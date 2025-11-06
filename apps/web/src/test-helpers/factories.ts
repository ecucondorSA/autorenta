export const VALID_UUID = '00000000-0000-0000-0000-000000000000';

export const randomUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return VALID_UUID;
};
