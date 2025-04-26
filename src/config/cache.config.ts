import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  ttl: parseInt(process.env.CACHE_TTL || '5000', 10),
  max: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10),
  isGlobal: true,
}));
