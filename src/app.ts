import express, { type Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import envConfig from './app/config';
import { appRoute } from './app/routes';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';

const app: Application = express();

// CORS Configuration
const corsOptions = {
  origin: envConfig.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// MiddleWare Setup
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

//  Main Endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Server is running!',
    timeStamp: new Date().toISOString(),
  });
});

// Health heck Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// API Routes
app.use('/api/v1/practice-server', appRoute);

//  Error Handling Middleware
app.use(notFound);
app.use(globalErrorHandler);

export default app;
