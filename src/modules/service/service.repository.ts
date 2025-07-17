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
      `${serviceAlias}.id`,
      `${serviceAlias}.name`,
      `${serviceAlias}.description`,
      `${serviceAlias}.base_url`,
      `${serviceAlias}.is_visible`,
      `${serviceAlias}.is_visible_by_role`,
      `${serviceAlias}.display_name`,
      `${serviceAlias}.icon_url`,
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
