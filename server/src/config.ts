export const config = {
  port: Number(process.env.PORT) || 3001,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  publicAppUrl: (process.env.PUBLIC_APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(
    /\/$/,
    '',
  ),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  resendApiKey: process.env.RESEND_API_KEY?.trim() || '',
  emailFrom: process.env.EMAIL_FROM?.trim() || 'Gruiz <onboarding@resend.dev>',
};
