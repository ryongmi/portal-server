import { Injectable } from '@nestjs/common';

import { FindOptionsWhere } from 'typeorm';

import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import { ServiceException } from '@krgeobuk/service/exception';
import type {
  ServiceSearchQuery,
  ServiceSearchResult,
  CreateService,
  UpdateService,
  ServiceFilter,
  ServiceDetail,
} from '@krgeobuk/service/interfaces';

import { ServiceEntity } from './entities/service.entity.js';
import { ServiceRepository } from './service.repositoty.js';

@Injectable()
export class ServiceManager {
  constructor(private readonly serviceRepo: ServiceRepository) {}

  /**
   * 서비스 목록 검색
   */
  async searchServices(query: ServiceSearchQuery): Promise<PaginatedResult<ServiceSearchResult>> {
    try {
      return await this.serviceRepo.search(query);
    } catch (_error: unknown) {
      throw ServiceException.serviceSearchError();
    }
  }

  /**
   * ID로 서비스 조회 (null 반환)
   */
  async findById(id: string): Promise<ServiceEntity | null> {
    return this.serviceRepo.findOneById(id);
  }

  /**
   * ID로 서비스 조회 (실패 시 예외)
   */
  async findByIdOrFail(id: string): Promise<ServiceEntity> {
    const service = await this.serviceRepo.findOneById(id);

    if (!service) {
      throw ServiceException.serviceNotFound();
    }

    return service;
  }

  /**
   * 여러 서비스 ID로 조회
   */
  // async findByServiceIds(serviceIds: string[]): Promise<ServiceEntity[]> {
  //   return this.serviceRepo.find({ where: { id: In(serviceIds) } });
  // }

  /**
   * AND 조건으로 서비스 조회
   */
  async findByAnd(filter: ServiceFilter = {}): Promise<ServiceEntity[]> {
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

    return this.serviceRepo.find({ where });
  }

  /**
   * OR 조건으로 서비스 조회
   */
  async findByOr(filter: ServiceFilter = {}): Promise<ServiceEntity[]> {
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

    return this.serviceRepo.find({ where });
  }

  async getServiceById(id: string): Promise<ServiceDetail> {
    return await this.findByIdOrFail(id);
  }

  /**
   * 서비스 생성
   */
  async createService(attrs: CreateService): Promise<ServiceEntity> {
    try {
      // 중복 이름 체크
      const existingService = await this.serviceRepo.findOne({
        where: { name: attrs.name },
      });

      if (existingService) {
        throw ServiceException.serviceAlreadyExists();
      }

      const serviceEntity = new ServiceEntity();
      Object.assign(serviceEntity, attrs);

      return await this.serviceRepo.saveEntity(serviceEntity);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('SERVICE_')) {
        throw error;
      }
      throw ServiceException.serviceCreateError();
    }
  }

  /**
   * 서비스 수정
   */
  async updateService(id: string, attrs: UpdateService): Promise<void> {
    try {
      const service = await this.serviceRepo.findOneById(id);

      if (!service) {
        throw ServiceException.serviceNotFound();
      }

      // 이름 변경 시 중복 체크
      if (attrs.name && attrs.name !== service.name) {
        const existingService = await this.serviceRepo.findOne({
          where: { name: attrs.name },
        });

        if (existingService) {
          throw ServiceException.serviceAlreadyExists();
        }
      }

      Object.assign(service, attrs);

      await this.serviceRepo.saveEntity(service);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('SERVICE_')) {
        throw error;
      }
      throw ServiceException.serviceUpdateError();
    }
  }

  /**
   * 서비스 삭제 (소프트 삭제)
   */
  async deleteService(id: string): Promise<void> {
    try {
      const service = await this.serviceRepo.findOneById(id);

      if (!service) {
        throw ServiceException.serviceNotFound();
      }

      await this.serviceRepo.softDelete(id);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('SERVICE_')) {
        throw error;
      }
      throw ServiceException.serviceDeleteError();
    }
  }

  /**
   * 서비스 헬스체크
   */
  async checkServiceHealth(id: string): Promise<{ status: string; timestamp: Date }> {
    try {
      const service = await this.findByIdOrFail(id);

      // 실제 헬스체크 로직 (예: HTTP 요청)
      if (service.baseUrl) {
        try {
          // 간단한 헬스체크 시뮬레이션
          // 실제로는 axios 등을 사용해서 service.baseUrl + '/health' 호출
          return {
            status: 'healthy',
            timestamp: new Date(),
          };
        } catch {
          return {
            status: 'unhealthy',
            timestamp: new Date(),
          };
        }
      }

      return {
        status: 'unknown',
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('SERVICE_')) {
        throw error;
      }
      throw ServiceException.serviceHealthCheckError();
    }
  }
}
