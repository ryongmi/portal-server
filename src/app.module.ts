import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { WinstonModule } from 'nest-winston';

import { SerializerInterceptor } from '@krgeobuk/core/interceptors';
import { winstonConfig } from '@krgeobuk/core/logger';

import { RedisModule, DatabaseModule } from '@database/index.js';
import { AppConfigModule } from '@config/index.js';
import { SharedClientsModule } from '@common/clients/shared-clients.module.js';
import { JwtModule } from '@common/jwt/jwt.module.js';
import { ServiceModule } from '@modules/service/index.js';

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    AppConfigModule,
    // TCP 연결 모듈
    SharedClientsModule,
    // JWT ACCESS TOKEN PUBLIC KEY
    JwtModule,
    DatabaseModule,
    RedisModule,
    ServiceModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializerInterceptor,
    },
  ], // Reflector는 자동 주입됨
})
export class AppModule {}
