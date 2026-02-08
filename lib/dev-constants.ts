// Development mode context for v0 preview
// In production, this is never used

export const DEV_PROJECT_ID = '00000000-0000-0000-0000-000000000010';
export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';

export const isDevMode = () => {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';
};

export const getDevProjectId = () => {
  return DEV_PROJECT_ID;
};
