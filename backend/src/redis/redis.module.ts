import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config/configuration';

export const REDIS = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const c = config().redis;
        return new Redis({ host: c.host, port: c.port });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
