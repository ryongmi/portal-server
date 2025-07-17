import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import type { ServiceDetail, ServiceFilter } from '@krgeobuk/service/interfaces';

import { ServiceManager } from './service.manager.js';
import { ServiceEntity } from './entities/service.entity.js';

/**
 * Service 도메인 TCP 마이크로서비스 컨트롤러
 * 다른 서비스들이 portal-server의 서비스 정보에 접근할 때 사용
 */
@Controller()
export class ServiceTcpController {
  private readonly logger = new Logger(ServiceTcpController.name);

  constructor(private readonly serviceManager: ServiceManager) {}

  // ==================== 조회 메서드 ====================

  /**
   * 서비스 ID로 서비스 정보 조회
   */
  @MessagePattern('service.findById')
  async findServiceById(@Payload() data: { serviceId: string }): Promise<ServiceEntity | null> {
    this.logger.debug('TCP 서비스 조회 요청', {
      serviceId: data.serviceId,
    });

    try {
      const service = await this.serviceManager.findById(data.serviceId);

      this.logger.debug('TCP 서비스 조회 완료', {
        serviceId: data.serviceId,
        found: !!service,
      });

      return service;
    } catch (error: unknown) {
      this.logger.error('TCP 서비스 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 서비스 ID로 상세 정보 조회 (가공된 데이터)
   */
  @MessagePattern('service.getDetailById')
  async getServiceDetailById(@Payload() data: { serviceId: string }): Promise<ServiceDetail | null> {
    this.logger.debug('TCP 서비스 상세 조회 요청', {
      serviceId: data.serviceId,
    });

    try {
      const detail = await this.serviceManager.getServiceById(data.serviceId);

      this.logger.debug('TCP 서비스 상세 조회 완료', {
        serviceId: data.serviceId,
      });

      return detail;
    } catch (error: unknown) {
      this.logger.error('TCP 서비스 상세 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 서비스명으로 서비스 조회
   */
  @MessagePattern('service.findByName')
  async findServiceByName(@Payload() data: { name: string }): Promise<ServiceEntity | null> {
    this.logger.debug('TCP 서비스 이름 조회 요청', {
      name: data.name,
    });

    try {
      const services = await this.serviceManager.findByAnd({ name: data.name });
      const service = services.length > 0 ? services[0] : null;

      this.logger.debug('TCP 서비스 이름 조회 완료', {
        name: data.name,
        found: !!service,
      });

      return service;
    } catch (error: unknown) {
      this.logger.error('TCP 서비스 이름 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: data.name,
      });
      throw error;
    }
  }

  /**
   * 여러 서비스 ID로 서비스 목록 조회 (최적화된 배치 처리)
   */
  @MessagePattern('service.findByIds')
  async findServicesByIds(@Payload() data: { serviceIds: string[] }): Promise<ServiceEntity[]> {
    this.logger.debug('TCP 서비스 배치 조회 요청', {
      serviceCount: data.serviceIds.length,
    });

    try {
      // N+1 쿼리 문제 해결: 단일 쿼리로 모든 서비스 조회
      const services = await this.serviceManager.findByServiceIds(data.serviceIds);

      this.logger.debug('TCP 서비스 배치 조회 성공', {
        requestedCount: data.serviceIds.length,
        foundCount: services.length,
      });

      return services;
    } catch (error: unknown) {
      this.logger.error('TCP 서비스 배치 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: data.serviceIds.length,
      });
      throw error;
    }
  }

  /**
   * 필터 조건으로 서비스 목록 조회
   */
  @MessagePattern('service.findByFilter')
  async findServicesByFilter(@Payload() data: { filter: ServiceFilter }): Promise<ServiceEntity[]> {
    this.logger.log(`TCP: Finding services by filter:`, data.filter);

    try {
      return await this.serviceManager.findByAnd(data.filter);
    } catch (error) {
      this.logger.error(`TCP: Error finding services by filter:`, error);
      throw error;
    }
  }

  // ==================== 존재 확인 ====================

  /**
   * 서비스 존재 여부 확인
   */
  @MessagePattern('service.exists')
  async checkServiceExists(@Payload() data: { serviceId: string }): Promise<boolean> {
    this.logger.debug('TCP 서비스 존재 확인 요청', {
      serviceId: data.serviceId,
    });

    try {
      const service = await this.serviceManager.findById(data.serviceId);
      const exists = !!service;

      this.logger.debug('TCP 서비스 존재 확인 완료', {
        serviceId: data.serviceId,
        exists,
      });

      return exists;
    } catch (error: unknown) {
      this.logger.error('TCP 서비스 존재 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      return false;
    }
  }

  /**
   * 가시성이 true인 서비스 목록 조회
   */
  @MessagePattern('service.findVisible')
  async findVisibleServices(@Payload() _data?: unknown): Promise<ServiceEntity[]> {
    this.logger.debug('TCP 가시성 서비스 조회 요청');

    try {
      const services = await this.serviceManager.findByAnd({ isVisible: true });

      this.logger.debug('TCP 가시성 서비스 조회 완료', {
        count: services.length,
      });

      return services;
    } catch (error: unknown) {
      this.logger.error('TCP 가시성 서비스 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 역할별 가시성이 true인 서비스 목록 조회
   */
  @MessagePattern('service.findVisibleByRole')
  async findVisibleByRoleServices(@Payload() _data?: unknown): Promise<ServiceEntity[]> {
    this.logger.debug('TCP 역할별 가시성 서비스 조회 요청');

    try {
      const services = await this.serviceManager.findByAnd({ isVisibleByRole: true });

      this.logger.debug('TCP 역할별 가시성 서비스 조회 완료', {
        count: services.length,
      });

      return services;
    } catch (error: unknown) {
      this.logger.error('TCP 역할별 가시성 서비스 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}