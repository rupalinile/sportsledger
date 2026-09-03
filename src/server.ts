import app from './app';
import { databasePool, verifyDatabaseConnection } from './config/database';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  try {
    await verifyDatabaseConnection();

    const server = app.listen(env.PORT, () => {
      console.log(`SportsLedger API server running on port ${env.PORT}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`${signal} received. Shutting down SportsLedger API server...`);

      server.close(async () => {
        try {
          await databasePool.end();

          console.log('HTTP server and database pool closed successfully.');
          process.exit(0);
        } catch (error) {
          console.error('Error while shutting down server:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start SportsLedger API server:', error);
    process.exit(1);
  }
};

void startServer();