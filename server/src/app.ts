import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth.routes';
import { usersRouter } from './modules/users.routes';
import { clientsRouter } from './modules/clients.routes';
import { companyRouter } from './modules/company.routes';
import { projectsRouter } from './modules/projects.routes';
import { tasksRouter } from './modules/tasks.routes';
import { attendanceRouter } from './modules/attendance.routes';
import { leavesRouter } from './modules/leaves.routes';
import { dashboardRouter } from './modules/dashboard.routes';
import { invitesRouter } from './modules/invites.routes';
import { adminRouter } from './modules/admin.routes';
import { platformRouter } from './modules/platform.routes';
import { teamsRouter } from './modules/teams.routes';
import { requestsRouter } from './modules/requests.routes';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!config.isProd) app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/company', companyRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/leaves', leavesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/invites', invitesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/platform', platformRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/requests', requestsRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
