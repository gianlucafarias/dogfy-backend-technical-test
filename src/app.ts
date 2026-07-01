import Fastify from 'fastify';

type BuildAppOptions = {
  logger?: boolean;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}
