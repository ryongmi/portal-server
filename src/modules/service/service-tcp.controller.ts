import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { TcpOperationResponse, TcpSearchResponse } from '@krgeobuk/core/interfaces';
import type {
  ServiceSearchQuery,
  ServiceSearchResult,
  ServiceDetail,
  CreateService,
  UpdateService,
} from '@krgeobuk/service/interfaces';
import { ServiceTcpPatterns, TcpServiceId } from '@krgeobuk/service/tcp';
import { Service } from '@krgeobuk/shared/service';

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
   * 서비스 목록 검색 및 페이지네이션
   */
  @MessagePattern(ServiceTcpPatterns.SEARCH)
  async searchServices(
    @Payload() query: ServiceSearchQuery
  ): Promise<TcpSearchResponse<ServiceSearchResult>> {
    this.logger.debug('TCP service search request', {
      hasNameFilter: !!query.name,
      hasIsVisibleFilter: !!query.isVisible,
    });

    try {
      const result = await this.serviceManager.searchServices(query);
      this.logger.log('TCP service search completed', {
        resultCount: result.items.length,
        totalItems: result.pageInfo.totalItems,
      });
      return result;
    } catch (error: unknown) {
      this.logger.error('TCP service search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      throw error;
    }
  }

  /**
   * 서비스 ID로 상세 정보 조회
   */
  @MessagePattern(ServiceTcpPatterns.FIND_BY_ID)
  async findById(@Payload() data: TcpServiceId): Promise<Service | null> {
    this.logger.debug(`TCP service detail request: ${data.serviceId}`);

    try {
      const service = await this.serviceManager.findById(data.serviceId);
      this.logger.debug(`TCP service detail response: ${service?.name || 'not found'}`);
      return service;
    } catch (error: unknown) {
      this.logger.error('TCP service detail failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 여러 서비스 ID로 서비스 목록 조회
   */
  @MessagePattern(ServiceTcpPatterns.FIND_BY_IDS)
  async findByIds(@Payload() data: { serviceIds: string[] }): Promise<Service[]> {
    this.logger.debug(`TCP service findByIds request: ${data.serviceIds.length}`);

    try {
      const services = await this.serviceManager.findByIds(data.serviceIds);
      this.logger.debug(`TCP service findByIds response: ${services.length || 'not found'}`);
      return services;
    } catch (error: unknown) {
      this.logger.error('TCP service findByIds failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceCount: data.serviceIds.length,
      });
      throw error;
    }
  }

  /**
   * 새로운 서비스 생성
   */
  @MessagePattern(ServiceTcpPatterns.CREATE)
  async create(@Payload() data: CreateService): Promise<TcpOperationResponse> {
    this.logger.log('TCP service creation requested', {
      name: data.name,
      displayName: data.displayName,
    });

    try {
      await this.serviceManager.createService(data);
      this.logger.log('TCP service creation completed', {
        name: data.name,
        displayName: data.displayName,
      });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceName: data.name,
        displayName: data.displayName,
      });
      throw error;
    }
  }

  /**
   * 서비스 정보 수정
   */
  @MessagePattern(ServiceTcpPatterns.UPDATE)
  async update(
    @Payload() data: { serviceId: string; updateData: UpdateService }
  ): Promise<TcpOperationResponse> {
    this.logger.log('TCP service update requested', { serviceId: data.serviceId });

    try {
      await this.serviceManager.updateService(data.serviceId, data.updateData);
      this.logger.log('TCP service update completed', { serviceId: data.serviceId });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 서비스 삭제 (소프트 삭제)
   */
  @MessagePattern(ServiceTcpPatterns.DELETE)
  async delete(@Payload() data: TcpServiceId): Promise<TcpOperationResponse> {
    this.logger.log('TCP service deletion requested', { serviceId: data.serviceId });

    try {
      await this.serviceManager.deleteService(data.serviceId);
      this.logger.log('TCP service deletion completed', { serviceId: data.serviceId });
      return { success: true };
    } catch (error: unknown) {
      this.logger.error('TCP service deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      throw error;
    }
  }

  /**
   * 서비스 존재 여부 확인
   */
  @MessagePattern(ServiceTcpPatterns.EXISTS)
  async exists(@Payload() data: TcpServiceId): Promise<boolean> {
    this.logger.debug(`TCP service existence check: ${data.serviceId}`);

    try {
      const service = await this.serviceManager.findById(data.serviceId);
      const exists = !!service;
      this.logger.debug(`TCP service exists: ${exists}`);
      return exists;
    } catch (error: unknown) {
      this.logger.error('TCP service existence check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId: data.serviceId,
      });
      return false;
    }
  }
}
