import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const uri = cfg.get<string>('rabbitmq.uri')!;
        const exchange = cfg.get<string>('rabbitmq.exchange') ?? 'meta_user_exchange';
        return {
          uri,
          exchanges: [{ name: exchange, type: 'topic' }],
          connectionInitOptions: { wait: true, timeout: 10000 },
        };
      },
    }),
  ],
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class AppRabbitmqModule {}
