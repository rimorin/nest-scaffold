import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  cookieSecret: process.env.COOKIE_SECRET || 'cookie-secret',
  cookieDomain: process.env.COOKIE_DOMAIN,
  allowedOrigins: process.env.ALLOWED_ORIGINS,
}));
