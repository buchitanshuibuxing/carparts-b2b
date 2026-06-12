import { registerAs } from '@nestjs/config';
export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'carparts-b2b-secret-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
