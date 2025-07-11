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

  /**
   * 서비스 ID로 서비스 정보 조회
   */
  @MessagePattern('service.findById')
  async findServiceById(@Payload() data: { serviceId: string }): Promise<ServiceEntity | null> {
    this.logger.log(`TCP: Finding service by ID: ${data.serviceId}`);

    try {
      return await this.serviceManager.findById(data.serviceId);
    } catch (error) {
      this.logger.error(`TCP: Error finding service by ID ${data.serviceId}:`, error);
      throw error;
    }
  }

  /**
   * 서비스 ID로 상세 정보 조회 (가공된 데이터)
   */
  @MessagePattern('service.getDetailById')
  async getServiceDetailById(@Payload() data: { serviceId: string }): Promise<ServiceDetail | null> {
    this.logger.log(`TCP: Getting service detail by ID: ${data.serviceId}`);

    try {
      return await this.serviceManager.getServiceById(data.serviceId);
    } catch (error) {
      this.logger.error(`TCP: Error getting service detail by ID ${data.serviceId}:`, error);
      throw error;
    }
  }

  /**
   * 서비스명으로 서비스 조회
   */
  @MessagePattern('service.findByName')
  async findServiceByName(@Payload() data: { name: string }): Promise<ServiceEntity | null> {
    this.logger.log(`TCP: Finding service by name: ${data.name}`);

    try {
      const services = await this.serviceManager.findByAnd({ name: data.name });
      return services.length > 0 ? services[0] : null;
    } catch (error) {
      this.logger.error(`TCP: Error finding service by name ${data.name}:`, error);
      throw error;
    }
  }

  /**
   * 여러 서비스 ID로 서비스 목록 조회
   */
  @MessagePattern('service.findByIds')
  async findServicesByIds(@Payload() data: { serviceIds: string[] }): Promise<ServiceEntity[]> {
    this.logger.log(`TCP: Finding services by IDs: ${data.serviceIds.join(', ')}`);

    try {
      const services: ServiceEntity[] = [];
      for (const serviceId of data.serviceIds) {
        const service = await this.serviceManager.findById(serviceId);
        if (service) {
          services.push(service);
        }
      }
      return services;
    } catch (error) {
      this.logger.error(`TCP: Error finding services by IDs:`, error);
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

  /**
   * 서비스 존재 여부 확인
   */
  @MessagePattern('service.exists')
  async checkServiceExists(@Payload() data: { serviceId: string }): Promise<boolean> {
    this.logger.log(`TCP: Checking if service exists: ${data.serviceId}`);

    try {
      const service = await this.serviceManager.findById(data.serviceId);
      return !!service;
    } catch (error) {
      this.logger.error(`TCP: Error checking service existence ${data.serviceId}:`, error);
      return false;
    }
  }

  /**
   * 가시성이 true인 서비스 목록 조회
   */
  @MessagePattern('service.findVisible')
  async findVisibleServices(@Payload() _data?: unknown): Promise<ServiceEntity[]> {
    this.logger.log(`TCP: Finding visible services`);

    try {
      return await this.serviceManager.findByAnd({ isVisible: true });
    } catch (error) {
      this.logger.error(`TCP: Error finding visible services:`, error);
      throw error;
    }
  }

  /**
   * 역할별 가시성이 true인 서비스 목록 조회
   */
  @MessagePattern('service.findVisibleByRole')
  async findVisibleByRoleServices(@Payload() _data?: unknown): Promise<ServiceEntity[]> {
    this.logger.log(`TCP: Finding services visible by role`);

    try {
      return await this.serviceManager.findByAnd({ isVisibleByRole: true });
    } catch (error) {
      this.logger.error(`TCP: Error finding services visible by role:`, error);
      throw error;
    }
  }

  /**
   * 서비스 통계 조회 (총 서비스 수, 활성 서비스 수 등)
   */
  @MessagePattern('service.getStats')
  async getServiceStats(
    @Payload() _data?: unknown
  ): Promise<{ totalServices: number; visibleServices: number; activeServices: number }> {
    this.logger.log(`TCP: Getting service statistics`);

    try {
      const [allServices, visibleServices, activeServices] = await Promise.all([
        this.serviceManager.findByAnd({}), // 전체
        this.serviceManager.findByAnd({ isVisible: true }), // 가시성 true
        this.serviceManager.findByAnd({ isVisible: true, isVisibleByRole: true }), // 활성
      ]);

      return {
        totalServices: allServices.length,
        visibleServices: visibleServices.length,
        activeServices: activeServices.length,
      };
    } catch (error) {
      this.logger.error(`TCP: Error getting service statistics:`, error);
      throw error;
    }
  }

  /**
   * 서비스 헬스체크 상태 확인
   */
  @MessagePattern('service.checkHealth')
  async checkServiceHealth(
    @Payload() data: { serviceId: string }
  ): Promise<{ status: string; timestamp: Date }> {
    this.logger.log(`TCP: Checking health for service: ${data.serviceId}`);

    try {
      return await this.serviceManager.checkServiceHealth(data.serviceId);
    } catch (error) {
      this.logger.error(`TCP: Error checking service health ${data.serviceId}:`, error);
      return {
        status: 'error',
        timestamp: new Date(),
      };
    }
  }
}