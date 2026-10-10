import 'dotenv/config';
import { Container } from './container/Container.js';

export async function bootstrap() {
  const container = new Container();

  const shutdown = async () => {
    await container.server.stop();
    await container.databaseConnection.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await container.server.start();

  return container;
}

if (process.argv[1] && process.argv[1].endsWith('src/index.js')) {
  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
