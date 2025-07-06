import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';

import { SerializerInterceptor } from '@krgeobuk/core/interceptors';
// import { SerializerInterceptor } from './interceptors/index.js';
import { winstonConfig } from '@krgeobuk/core/logger';

import { RedisModule, DatabaseModule } from '@database';
import { AppConfigModule } from '@config';

@Module({
  imports: [WinstonModule.forRoot(winstonConfig),],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializerInterceptor,
    },
  ], // Reflector는 자동 주입됨
})
export class AppModule {}
