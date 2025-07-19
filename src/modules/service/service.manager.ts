import { Injectable, Logger, HttpException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { FindOptionsWhere, In, EntityManager, Not } from 'typeorm';
import { firstValueFrom } from 'rxjs';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import { ServiceException } from '@krgeobuk/service/exception';
import type { Role } from '@krgeobuk/shared/role';
import type {
  ServiceSearchQuery,
  ServiceSearchResult,
  CreateService,
  UpdateService,
  ServiceFilter,
  ServiceDetail,
} from '@krgeobuk/service/interfaces';
import { ServiceVisibleRoleTcpPatterns } from '@krgeobuk/service-visible-role/tcp/patterns';
import { RoleTcpPatterns } from '@krgeobuk/role/tcp/patterns';

import { ServiceEntity } from './entities/service.entity.js';
import { ServiceRepository } from './service.repository.js';

@Injectable()
export class ServiceManager {
  private readonly logger = new Logger(ServiceManager.name);

  constructor(
    private readonly serviceRepo: ServiceRepository,
    @Inject('AUTHZ_SERVICE') private readonly authzClient: ClientProxy
  ) {}

  // ==================== PUBLIC METHODS ====================

  /**
   * ID로 서비스 조회 (null 반환)
   */
  async findById(serviceId: string): Promise<ServiceEntity | null> {
    return await this.serviceRepo.findOneById(serviceId);
  }

  /**
   * ID로 서비스 조회 (실패 시 예외)
   */
  async findByIdOrFail(serviceId: string): Promise<ServiceEntity> {
    const service = await this.serviceRepo.findOneById(serviceId);

    if (!service) {
      this.logger.warn('서비스를 찾을 수 없음', { serviceId });
      throw ServiceException.serviceNotFound();
    }

    return service;
  }

  async findByIds(serviceIds: string[]): Promise<ServiceEntity[]> {
    if (serviceIds.length === 0) return [];

    return this.serviceRepo.find({
      where: { id: In(serviceIds) },
      order: { name: 'DESC' },
    });
  }

  /**
   * AND 조건으로 서비스 조회
   */
  async findByAnd(filter: ServiceFilter = {}): Promise<ServiceEntity[]> {
    try {
      const where: FindOptionsWhere<ServiceEntity> = {};

      if (filter.name) where.name = filter.name;
      if (filter.description) where.description = filter.description;
      if (filter.baseUrl) where.baseUrl = filter.baseUrl;
      if (filter.isVisible !== undefined) where.isVisible = filter.isVisible;
      if (filter.isVisibleByRole !== undefined) where.isVisibleByRole = filter.isVisibleByRole;
      if (filter.displayName) where.displayName = filter.displayName;

      // 필터 없으면 전체 조회
      if (Object.keys(where).length === 0) {
        return this.serviceRepo.find();
      }

      const services = await this.serviceRepo.find({ where });

      this.logger.debug('서비스 AND 조건 조회 성공', {
        filterCount: Object.keys(where).length,
        resultCount: services.length,
      });

      return services;
    } catch (error: unknown) {
      this.logger.error('서비스 AND 조건 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter,
      });

      throw ServiceException.serviceFetchError();
    }
  }

  /**
   * OR 조건으로 서비스 조회
   */
  async findByOr(filter: ServiceFilter = {}): Promise<ServiceEntity[]> {
    try {
      const { name, description, baseUrl, isVisible, isVisibleByRole, displayName } = filter;

      const where: FindOptionsWhere<ServiceEntity>[] = [];

      if (name) where.push({ name });
      if (description) where.push({ description });
      if (baseUrl) where.push({ baseUrl });
      if (isVisible !== undefined) where.push({ isVisible });
      if (isVisibleByRole !== undefined) where.push({ isVisibleByRole });
      if (displayName) where.push({ displayName });

      // 필터 없으면 전체 조회
      if (where.length === 0) {
        return this.serviceRepo.find();
      }

      const services = await this.serviceRepo.find({ where });

      this.logger.debug('서비스 OR 조건 조회 성공', {
        filterCount: where.length,
        resultCount: services.length,
      });

      return services;
    } catch (error: unknown) {
      this.logger.error('서비스 OR 조건 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter,
      });

      throw ServiceException.serviceFetchError();
    }
  }

  // ==================== 복합 조회 메서드 ====================

  /**
   * 서비스 목록 검색
   */
  async searchServices(query: ServiceSearchQuery): Promise<PaginatedResult<ServiceSearchResult>> {
    try {
      const services = await this.serviceRepo.searchServices(query);

      if (services.items.length === 0) {
        return { items: [], pageInfo: services.pageInfo };
      }

      const serviceIds = services.items.map((service) => service.id!);

      try {
        // authz-server에서 각 서비스의 가시성 역할 수 조회
        const visibleRoleCounts = await this.getVisibleRoleCountsByServiceIds(serviceIds);
        const items = this.buildServiceSearchResults(services.items, visibleRoleCounts);

        this.logger.debug('서비스 검색 성공', {
          page: query.page,
          limit: query.limit,
          totalCount: services.pageInfo.totalItems,
          serviceCount: items.length,
        });

        return {
          items,
          pageInfo: services.pageInfo,
        };
      } catch (error: unknown) {
        this.logger.warn('TCP 서비스 통신 실패, 대체 데이터 사용', {
          error: error instanceof Error ? error.message : 'Unknown error',
          serviceCount: services.items.length,
        });

        const items = this.buildFallbackServiceSearchResults(services.items);
        return {
          items,
          pageInfo: services.pageInfo,
        };
      }
    } catch (error: unknown) {
      this.logger.error('서비스 검색 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });

      throw ServiceException.serviceSearchError();
    }
  }

  /**
   * 서비스 상세 조회
   */
  async getServiceById(serviceId: string): Promise<ServiceDetail> {
    try {
      const service = await this.findByIdOrFail(serviceId);

      try {
        // authz-server에서 해당 서비스의 가시성 역할 목록 조회
        const visibleRoles = await this.getVisibleRolesByServiceId(serviceId);

        const serviceDetail: ServiceDetail = {
          id: service.id,
          name: service.name,
          description: service.description!,
          baseUrl: service.baseUrl!,
          isVisible: service.isVisible!,
          isVisibleByRole: service.isVisibleByRole!,
          displayName: service.displayName!,
          iconUrl: service.iconUrl!,
          visibleRoles,
        };

        this.logger.debug('서비스 상세 조회 성공', {
          serviceId,
          serviceName: service.name,
          visibleRoleCount: visibleRoles.length,
        });

        return serviceDetail;
      } catch (error: unknown) {
        this.logger.warn('외부 데이터로 서비스 정보 보강 실패, 기본 정보 반환', {
          error: error instanceof Error ? error.message : 'Unknown error',
          serviceId,
          serviceName: service.name,
        });

        // 폴백 처리: 기본 서비스 정보만 반환
        return {
          id: service.id,
          name: service.name,
          description: service.description!,
          baseUrl: service.baseUrl!,
          isVisible: service.isVisible!,
          isVisibleByRole: service.isVisibleByRole!,
          displayName: service.displayName!,
          iconUrl: service.iconUrl!,
          visibleRoles: [],
        };
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스 상세 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });

      throw ServiceException.serviceFetchError();
    }
  }

  // ==================== 변경 메서드 ====================

  /**
   * 서비스 생성
   */
  async createService(dto: CreateService, transactionManager?: EntityManager): Promise<void> {
    try {
      // 중복 이름 체크
      const existingService = await this.serviceRepo.findOne({
        where: { name: dto.name },
      });

      if (existingService) {
        this.logger.warn('서비스 생성 실패: 중복 이름', {
          name: dto.name,
        });
        throw ServiceException.serviceAlreadyExists();
      }

      const serviceEntity = new ServiceEntity();
      Object.assign(serviceEntity, dto);

      const result = await this.serviceRepo.saveEntity(serviceEntity, transactionManager);

      this.logger.log('서비스 생성 성공', {
        serviceId: result.id,
        name: dto.name,
        displayName: dto.displayName,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스 생성 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: dto.name,
        displayName: dto.displayName,
      });

      throw ServiceException.serviceCreateError();
    }
  }

  /**
   * 서비스 수정
   */
  async updateService(
    serviceId: string,
    dto: UpdateService,
    transactionManager?: EntityManager
  ): Promise<void> {
    try {
      const service = await this.serviceRepo.findOneById(serviceId);

      if (!service) {
        this.logger.warn('서비스 수정 실패: 서비스를 찾을 수 없음', { serviceId });
        throw ServiceException.serviceNotFound();
      }

      // 이름 변경 시 중복 체크
      if (dto.name && dto.name !== service.name) {
        const existingService = await this.serviceRepo.findOne({
          where: {
            name: dto.name,
            id: Not(serviceId), // 현재 서비스 제외
          },
        });

        if (existingService) {
          this.logger.warn('서비스 수정 실패: 중복 이름', {
            serviceId,
            oldName: service.name,
            newName: dto.name,
          });
          throw ServiceException.serviceAlreadyExists();
        }
      }

      Object.assign(service, dto);

      await this.serviceRepo.saveEntity(service, transactionManager);

      this.logger.log('서비스 수정 성공', {
        serviceId,
        oldName: service.name,
        newName: dto.name,
        updatedFields: Object.keys(dto),
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스 수정 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
        updatedFields: Object.keys(dto),
      });

      throw ServiceException.serviceUpdateError();
    }
  }

  /**
   * 서비스 삭제 (소프트 삭제)
   */
  async deleteService(serviceId: string): Promise<void> {
    try {
      // 서비스 존재 여부 확인
      const service = await this.findByIdOrFail(serviceId);

      // 서비스에 할당된 가시성 역할이 있는지 확인 (관계 검증)
      const hasVisibleRoles = await this.hasVisibleRolesForService(serviceId);
      if (hasVisibleRoles) {
        this.logger.warn('서비스 삭제 실패: 서비스에 할당된 가시성 역할이 있음', {
          serviceId,
          serviceName: service.name,
        });
        throw ServiceException.serviceDeleteError();
      }

      await this.serviceRepo.softDelete(serviceId);

      this.logger.log('서비스 삭제 성공', {
        serviceId,
        serviceName: service.name,
        deletionType: 'soft',
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('서비스 삭제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });

      throw ServiceException.serviceDeleteError();
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * 서비스에 할당된 가시성 역할 존재 확인 (성능 최적화)
   */
  private async hasVisibleRolesForService(serviceId: string): Promise<boolean> {
    try {
      const hasRole = await firstValueFrom(
        this.authzClient.send<boolean>(ServiceVisibleRoleTcpPatterns.EXISTS, { serviceId })
      );
      return hasRole;
    } catch (error: unknown) {
      this.logger.warn('서비스의 가시성 역할 존재 확인 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });
      // 폴백 처리: 안전하게 false 반환 (삭제 허용)
      return false;
    }
  }

  /**
   * authz-server에서 서비스별 가시성 역할 수 조회
   */
  private async getVisibleRoleCountsByServiceIds(
    serviceIds: string[]
  ): Promise<Record<string, number>> {
    try {
      // authz-server의 service-visible-role TCP API 호출
      return await firstValueFrom(
        this.authzClient.send<Record<string, number>>(
          ServiceVisibleRoleTcpPatterns.FIND_ROLE_COUNTS_BATCH,
          {
            serviceIds,
          }
        )
      );
    } catch (error: unknown) {
      this.logger.warn('authz-server에서 가시성 역할 수 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceIds,
      });

      // 폴백 처리: 빈 객체 반환
      return {};
    }
  }

  /**
   * authz-server에서 서비스의 가시성 역할 목록 조회
   */
  private async getVisibleRolesByServiceId(serviceId: string): Promise<Role[]> {
    try {
      // authz-server에서 해당 서비스의 가시성 역할 조회
      const roleIds = await firstValueFrom(
        this.authzClient.send<string[]>(ServiceVisibleRoleTcpPatterns.FIND_ROLES_BY_SERVICE, {
          serviceId,
        })
      );

      if (roleIds.length === 0) {
        return [];
      }

      // 역할 정보 조회
      return await firstValueFrom(
        this.authzClient.send<Role[]>(RoleTcpPatterns.FIND_BY_IDS, { roleIds })
      );
    } catch (error: unknown) {
      this.logger.warn('authz-server에서 가시성 역할 조회 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceId,
      });

      // 폴백 처리: 빈 배열 반환
      return [];
    }
  }

  /**
   * 서비스 검색 결과 빌드 (외부 데이터 포함)
   */
  private buildServiceSearchResults(
    services: Partial<ServiceEntity>[],
    visibleRoleCounts: Record<string, number>
  ): ServiceSearchResult[] {
    return services.map((service) => {
      const visibleRoleCount = visibleRoleCounts[service.id!] || 0;

      return {
        id: service.id!,
        name: service.name!,
        baseUrl: service.baseUrl!,
        isVisible: service.isVisible!,
        isVisibleByRole: service.isVisibleByRole!,
        displayName: service.displayName!,
        visibleRoleCount,
      };
    });
  }

  /**
   * 서비스 검색 결과 빌드 (폴백용, 외부 데이터 없음)
   */
  private buildFallbackServiceSearchResults(
    services: Partial<ServiceEntity>[]
  ): ServiceSearchResult[] {
    return services.map((service) => ({
      id: service.id!,
      name: service.name!,
      baseUrl: service.baseUrl!,
      isVisible: service.isVisible!,
      isVisibleByRole: service.isVisibleByRole!,
      displayName: service.displayName!,
      visibleRoleCount: 0, // 외부 데이터 없으므로 0
    }));
  }
}
