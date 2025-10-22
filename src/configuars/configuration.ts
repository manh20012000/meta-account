export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX ?? 'api',

  

  // ƯU TIÊN URL, fallback host/port
  redis: {
    url: process.env.REDIS_URL,
  },

  rabbitmq: {
    uri: process.env.RABBITMQ_URI!,
    exchange: process.env.AUTH_RABBITMQ_EXCHANGE ?? 'meta_auth_exchange',
  },
  
  contextPath: process.env.CONTEXT_PATH ?? 'http://localhost:8888',
  
});
