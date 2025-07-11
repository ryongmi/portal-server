import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';


import { ServiceEntity } from './entities/service.entity.js';

import { ServiceRepository } from './service.repositoty.js';

import { ServiceController } from './service.controller.js';
import { ServiceTcpController } from './service-tcp.controller.js';
import { ServiceManager } from './service.manager.js';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceEntity])],
  controllers: [ServiceController, ServiceTcpController],
  providers: [
    ServiceManager,
    ServiceRepository,
  ],
  exports: [ServiceManager], // 다른 모듈에서 서비스를 사용할 수 있도록 exports에 추가
})
export class ServiceModule {}
