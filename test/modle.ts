// // notifi/src/configuars/messaging/rabbitmq.module.ts
// import { Module, OnModuleInit } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { RabbitMQModule, AmqpConnection } from '@golevelup/nestjs-rabbitmq';

// @Module({
//   imports: [
//     ConfigModule,
//     RabbitMQModule.forRootAsync(RabbitMQModule, {
//       inject: [ConfigService],
//       useFactory: (cfg: ConfigService) => {
//         const uri = cfg.get<string>('rabbitmq.uri')!;
//         const exchange = cfg.get<string>('rabbitmq.exchange') ?? 'meta_user_exchange';
//         return {
//           uri,
//           exchanges: [{ name: exchange, type: 'topic', options: { durable: true } }],
//           connectionInitOptions: { wait: true, timeout: 10000 },
//           channels: { default: { prefetchCount: 20, default: true } },
//         };
//       },
//     }),
//   ],
// })
// export class AppRabbitmqModule implements OnModuleInit {
//   constructor(private readonly amqp: AmqpConnection, private readonly cfg: ConfigService) {}

//   async onModuleInit() {
//     const ch = await this.amqp.managedChannel.get();
//     const MAIN_EX = this.cfg.get<string>('rabbitmq.exchange') ?? 'meta_user_exchange';

//     // Khai báo MỖI NHIỆM VỤ một spec
//     const specs = [
//       {
//         routing: 'user.fcm.set',
//         queue:   'user.fcm.set.q',
//         retryEx: 'user.fcm.set.retry.x',
//         retryQ:  'user.fcm.set.retry.q',
//         ttl:     10_000,
//       },
//       {
//         routing: 'notify.email.send',
//         queue:   'notify.email.send.q',
//         retryEx: 'notify.email.send.retry.x',
//         retryQ:  'notify.email.send.retry.q',
//         ttl:     30_000,
//       },
//       {
//         routing: 'notify.push.broadcast',
//         queue:   'notify.push.broadcast.q',
//         retryEx: 'notify.push.broadcast.retry.x',
//         retryQ:  'notify.push.broadcast.retry.q',
//         ttl:     15_000,
//       },
//       // … thêm nhiệm vụ khác tại đây
//     ];

//     for (const s of specs) {
//       await ch.assertExchange(s.retryEx, 'direct', { durable: true });

//       await ch.assertQueue(s.retryQ, {
//         durable: true,
//         arguments: {
//           'x-message-ttl': s.ttl,
//           'x-dead-letter-exchange': MAIN_EX,
//           'x-dead-letter-routing-key': s.routing,
//         },
//       });
//       await ch.bindQueue(s.retryQ, s.retryEx, 'retry');

//       await ch.assertQueue(s.queue, {
//         durable: true,
//         arguments: {
//           'x-dead-letter-exchange': s.retryEx,
//           'x-dead-letter-routing-key': 'retry',
//         },
//       });
//       await ch.bindQueue(s.queue, MAIN_EX, s.routing);
//     }
//   }
// }
