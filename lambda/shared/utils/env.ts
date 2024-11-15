export const getListFromEnvVariable = (envName: string) => {
  const data = process.env[envName] ?? '';
  return data.length ? data.split(',') : [];
};
