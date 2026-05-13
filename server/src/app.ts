import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { runMigrations } from './config/migrate';
import { startAiWorker } from './services/aiWorker';
import { startAgents, stopAgents, getAgentsHealth } from './server/agents';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import projectRoutes from './routes/projectRoutes';
import bidRoutes from './routes/bidRoutes';
import adminRoutes from './routes/adminRoutes';
import catalogRoutes from './routes/catalogRoutes';
import webhookRoutes from './routes/webhookRoutes';
import locationRoutes from './routes/locationRoutes';
import feedbackRoutes from './routes/feedbackRoutes';

interface ServerConfig {
  port: number;
  corsOrigins: string[];
}

const serverConfig: ServerConfig = {
  port: config.port || 3000,
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://projexlight.com',
    'https://dev.projexlight.com',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ],
};

const app: Application = express();

// Middleware
app.use(helmet());
const corsOptions: CorsOptions = { origin: serverConfig.corsOrigins, credentials: true };
app.use(cors(corsOptions));
app.use(morgan(config.logFormat));
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Workflow agents health (TK-2711)
app.get('/api/health/agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const h = await getAgentsHealth();
    res.json({ status: 'ok', ...h });
  } catch (error: any) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/feedback', feedbackRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Run migrations then start server + AI worker + workflow agents
runMigrations()
  .then(() => {
    const server = app.listen(serverConfig.port, (): void => {
      console.log(`Server running on port ${serverConfig.port}`);
      startAiWorker();
      startAgents();
    });
    const shutdown = async (signal: string) => {
      console.log(`[shutdown] ${signal} received — draining agents...`);
      await stopAgents();
      server.close(() => process.exit(0));
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Migration failed, starting server anyway:', err.message);
    app.listen(serverConfig.port, (): void => {
      console.log(`Server running on port ${serverConfig.port} (migrations failed)`);
      startAiWorker();
      startAgents();
    });
  });

export default app;
