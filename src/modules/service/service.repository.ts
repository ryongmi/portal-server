import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { BaseRepository } from '@krgeobuk/core/repositories';
import { LimitType, SortOrderType, SortByBaseType } from '@krgeobuk/core/enum';
import type { PaginatedResult } from '@krgeobuk/core/interfaces';
import type { ServiceSearchQuery } from '@krgeobuk/service/interfaces';

import { ServiceEntity } from './entities/service.entity.js';

@Injectable()
export class ServiceRepository extends BaseRepository<ServiceEntity> {
  constructor(private dataSource: DataSource) {
    super(ServiceEntity, dataSource);
  }

  /**
   * 서비스 검색 (페이지네이션, 필터링)
   */
  async searchServices(
    query: ServiceSearchQuery
  ): Promise<PaginatedResult<Partial<ServiceEntity>>> {
    const {
      name,
      isVisible,
      page = 1,
      limit = LimitType.FIFTEEN,
      sortOrder = SortOrderType.DESC,
      sortBy = SortByBaseType.CREATED_AT,
    } = query;

    const skip = (page - 1) * limit;
    const serviceAlias = 'service';

    const qb = this.createQueryBuilder(serviceAlias).select([
      `${serviceAlias}.id AS id`,
      `${serviceAlias}.name AS name`,
      `${serviceAlias}.description AS description`,
      `${serviceAlias}.base_url AS baseUrl`,
      `${serviceAlias}.is_visible AS isVisible`,
      `${serviceAlias}.is_visible_by_role AS isVisibleByRole`,
      `${serviceAlias}.display_name AS displayName`,
      `${serviceAlias}.icon_url AS iconUrl`,
    ]);

    // 필터링 조건 추가
    if (name) {
      qb.andWhere(`${serviceAlias}.name LIKE :name`, { name: `%${name}%` });
    }
    if (typeof isVisible === 'boolean') {
      qb.andWhere(`${serviceAlias}.is_visible = :isVisible`, { isVisible });
    }

    // 정렬 및 페이지네이션
    qb.orderBy(`${serviceAlias}.${sortBy}`, sortOrder);

    qb.offset(skip).limit(limit);

    const [items, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

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
