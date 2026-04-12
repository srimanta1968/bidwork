import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import { runMigrations } from './config/migrate';

interface ServerConfig {
  port: number;
  corsOrigins: string[];
}

const serverConfig: ServerConfig = {
  port: config.port || 3000,
  corsOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://projexlight.com',
    'https://dev.projexlight.com',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
  ],
};

const app: Application = express();

// Middleware
app.use(helmet());

const corsOptions: CorsOptions = {
  origin: serverConfig.corsOrigins,
  credentials: true,
};
app.use(cors(corsOptions));

app.use(morgan(config.logFormat));
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Run migrations then start server
runMigrations()
  .then(() => {
    app.listen(serverConfig.port, (): void => {
      console.log(`Server running on port ${serverConfig.port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to run migrations, starting server anyway:', err.message);
    app.listen(serverConfig.port, (): void => {
      console.log(`Server running on port ${serverConfig.port} (migrations failed)`);
    });
  });

export default app;
