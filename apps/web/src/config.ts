const values = {
  apiUrl: import.meta.env.VITE_API_URL as string | undefined,
  issuer: import.meta.env.VITE_COGNITO_ISSUER as string | undefined,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined,
  domain: import.meta.env.VITE_COGNITO_DOMAIN as string | undefined,
};

export const config = Object.values(values).every(Boolean)
  ? values as Record<keyof typeof values, string>
  : null;
