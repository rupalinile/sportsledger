import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import { corsOptions } from './config/cors';
import { apiRateLimiter } from './config/rateLimit';
import { env } from './config/env';
import { globalErrorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import routes from './routes';

const app: Application = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(apiRateLimiter);

app.use(env.API_PREFIX, routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
