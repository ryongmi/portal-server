import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import { LimitType, SortOrderType, SortByBaseType } from '@krgeobuk/core/enum';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { ServiceSearchQuery, ServiceSearchResult } from '@krgeobuk/service/interfaces';

import { ServiceEntity } from './entities/service.entity.js';

@Injectable()
export class ServiceRepository extends BaseRepository<ServiceEntity> {
  constructor(private dataSource: DataSource) {
    super(ServiceEntity, dataSource);
  }

  /**
   * 서비스 검색 (페이지네이션, 필터링)
   */
  async search(query: ServiceSearchQuery): Promise<PaginatedResult<ServiceSearchResult>> {
    const {
      name,
      description,
      isVisible,
      isVisibleByRole,
      page = 1,
      limit = LimitType.FIFTEEN,
      sortOrder = SortOrderType.DESC,
      sortBy = SortByBaseType.CREATED_AT,
    } = query;

    const skip = (page - 1) * limit;
    const serviceAlias = 'service';
    const qb = this.createQueryBuilder(serviceAlias);

    // 필터링 조건 추가
    if (name) {
      qb.andWhere(`${serviceAlias}.name LIKE :name`, { name: `%${name}%` });
    }
    if (description) {
      qb.andWhere(`${serviceAlias}.description LIKE :description`, {
        description: `%${description}%`,
      });
    }
    if (typeof isVisible === 'boolean') {
      qb.andWhere(`${serviceAlias}.isVisible = :isVisible`, { isVisible });
    }
    if (typeof isVisibleByRole === 'boolean') {
      qb.andWhere(`${serviceAlias}.isVisibleByRole = :isVisibleByRole`, { isVisibleByRole });
    }

    // 정렬 및 페이지네이션
    qb.orderBy(`${serviceAlias}.${sortBy}`, sortOrder).offset(skip).limit(limit);

    const [rows, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

    const items = rows.map((row) => ({
      id: row[`${serviceAlias}_id`],
      name: row[`${serviceAlias}_name`],
      description: row[`${serviceAlias}_description`],
      baseUrl: row[`${serviceAlias}_base_url`],
      isVisible: row[`${serviceAlias}_is_visible`],
      isVisibleByRole: row[`${serviceAlias}_is_visible_by_role`],
      displayName: row[`${serviceAlias}_display_name`],
      iconUrl: row[`${serviceAlias}_icon_url`],
      createdAt: row[`${serviceAlias}_created_at`],
      updatedAt: row[`${serviceAlias}_updated_at`],
      deletedAt: row[`${serviceAlias}_deleted_at`],
    }));

    const totalPages = Math.ceil(total / limit);
    const pageInfo = {
      page,
      limit,
      totalItems: total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };

    return {
      items,
      pageInfo,
    };
  }
}
