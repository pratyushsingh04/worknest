import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

const smtpHost = process.env.SMTP_HOST?.trim();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET'),
  // WEB_ORIGIN wins; on Render the deployed web app is the default.
  clientOrigin:
    process.env.WEB_ORIGIN ?? (process.env.RENDER ? 'https://worknest-snowy-five.vercel.app' : (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')),
  isProd: process.env.NODE_ENV === 'production',
  // Email is optional: without SMTP settings, emails land in the admin outbox instead.
  smtp: smtpHost
    ? {
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      }
    : null,
  mailFrom: process.env.MAIL_FROM ?? 'WorkNest <no-reply@worknest.local>',
};
