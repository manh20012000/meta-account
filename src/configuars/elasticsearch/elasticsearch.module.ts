// src/config/elasticsearch.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

import { UserElasticsearchchService } from './user-search.service';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const node = cfg.get<string>('elasticsearch.node'); // ví dụ: https://<host>:9200
        const username = cfg.get<string>('elasticsearch.username');
        const password = cfg.get<string>('elasticsearch.password');
        if (!node) throw new Error('Missing es.node');

        return {
          node,
          auth: username && password ? { username, password } : undefined,
          // tls: { rejectUnauthorized: false },
        };
      },
    }),
  ],
  providers: [UserElasticsearchchService],
  exports: [UserElasticsearchchService],
})
export class ElasticsModule {}
