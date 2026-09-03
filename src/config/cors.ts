import { CorsOptions } from 'cors';
import { env } from './env';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string): boolean =>
  allowedOrigins.includes('*') || allowedOrigins.includes(origin);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, env.CORS_ALLOW_NO_ORIGIN);
      return;
    }

    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: env.CORS_CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
