import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Serialize } from '@krgeobuk/core/decorators';
import {
  SwaggerApiTags,
  SwaggerApiBody,
  SwaggerApiOperation,
  SwaggerApiBearerAuth,
  SwaggerApiParam,
  SwaggerApiOkResponse,
  SwaggerApiPaginatedResponse,
  SwaggerApiErrorResponse,
} from '@krgeobuk/swagger/decorators';
import { AccessTokenGuard } from '@krgeobuk/jwt/guards';
import { RequireRole } from '@krgeobuk/authorization/decorators';
import { GLOBAL_ROLES } from '@krgeobuk/core/constants';
import { ServiceResponse } from '@krgeobuk/service/response';
import { ServiceError } from '@krgeobuk/service/exception';
import {
  ServiceSearchQueryDto,
  ServiceDetailDto,
  ServicePaginatedSearchResultDto,
  CreateServiceDto,
  UpdateServiceDto,
} from '@krgeobuk/service/dtos';

import { ServiceManager } from './service.manager.js';

@SwaggerApiTags({ tags: ['services'] })
@SwaggerApiBearerAuth()
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceManager: ServiceManager) {}

  @Get()
  @HttpCode(ServiceResponse.SEARCH_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 목록 조회',
    description: '서비스 목록을 검색 조건에 따라 조회합니다.',
  })
  @SwaggerApiPaginatedResponse({
    status: ServiceResponse.SEARCH_SUCCESS.statusCode,
    description: ServiceResponse.SEARCH_SUCCESS.message,
    dto: ServicePaginatedSearchResultDto,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_SEARCH_ERROR.statusCode,
    description: ServiceError.SERVICE_SEARCH_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @RequireRole(GLOBAL_ROLES.ADMIN)
  @Serialize({
    dto: ServicePaginatedSearchResultDto,
    ...ServiceResponse.SEARCH_SUCCESS,
  })
  async searchServices(
    @Query() query: ServiceSearchQueryDto
  ): Promise<ServicePaginatedSearchResultDto> {
    return await this.serviceManager.searchServices(query);
  }

  @Get(':id')
  @HttpCode(ServiceResponse.FETCH_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 상세 조회',
    description: 'ID로 특정 서비스를 조회합니다.',
  })
  @SwaggerApiParam({
    name: 'id',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceResponse.FETCH_SUCCESS.statusCode,
    description: ServiceResponse.FETCH_SUCCESS.message,
    dto: ServiceDetailDto,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_NOT_FOUND.statusCode,
    description: ServiceError.SERVICE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_FETCH_ERROR.statusCode,
    description: ServiceError.SERVICE_FETCH_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @RequireRole(GLOBAL_ROLES.ADMIN)
  @Serialize({
    dto: ServiceDetailDto,
    ...ServiceResponse.FETCH_SUCCESS,
  })
  async getServiceById(@Param('id') id: string): Promise<ServiceDetailDto> {
    return this.serviceManager.getServiceById(id);
  }

  @Post()
  @HttpCode(ServiceResponse.CREATE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 생성',
    description: '새로운 서비스를 생성합니다.',
  })
  @SwaggerApiBody({
    dto: CreateServiceDto,
    description: '서비스 생성 데이터',
  })
  @SwaggerApiOkResponse({
    status: ServiceResponse.CREATE_SUCCESS.statusCode,
    description: ServiceResponse.CREATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_CREATE_ERROR.statusCode,
    description: ServiceError.SERVICE_CREATE_ERROR.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_ALREADY_EXISTS.statusCode,
    description: ServiceError.SERVICE_ALREADY_EXISTS.message,
  })
  @UseGuards(AccessTokenGuard)
  @RequireRole(GLOBAL_ROLES.SUPER_ADMIN)
  @Serialize({
    ...ServiceResponse.CREATE_SUCCESS,
  })
  async createService(@Body() dto: CreateServiceDto): Promise<void> {
    await this.serviceManager.createService(dto);
  }

  @Patch(':id')
  @HttpCode(ServiceResponse.UPDATE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 수정',
    description: '기존 서비스를 수정합니다.',
  })
  @SwaggerApiParam({
    name: 'id',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiBody({
    dto: UpdateServiceDto,
    description: '서비스 수정 데이터',
  })
  @SwaggerApiOkResponse({
    status: ServiceResponse.UPDATE_SUCCESS.statusCode,
    description: ServiceResponse.UPDATE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_NOT_FOUND.statusCode,
    description: ServiceError.SERVICE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_UPDATE_ERROR.statusCode,
    description: ServiceError.SERVICE_UPDATE_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @RequireRole(GLOBAL_ROLES.SUPER_ADMIN)
  @Serialize({
    ...ServiceResponse.UPDATE_SUCCESS,
  })
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<void> {
    await this.serviceManager.updateService(id, dto);
  }

  @Delete(':id')
  @HttpCode(ServiceResponse.DELETE_SUCCESS.statusCode)
  @SwaggerApiOperation({
    summary: '서비스 삭제',
    description: '서비스를 소프트 삭제합니다.',
  })
  @SwaggerApiParam({
    name: 'id',
    type: String,
    description: '서비스 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @SwaggerApiOkResponse({
    status: ServiceResponse.DELETE_SUCCESS.statusCode,
    description: ServiceResponse.DELETE_SUCCESS.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_NOT_FOUND.statusCode,
    description: ServiceError.SERVICE_NOT_FOUND.message,
  })
  @SwaggerApiErrorResponse({
    status: ServiceError.SERVICE_DELETE_ERROR.statusCode,
    description: ServiceError.SERVICE_DELETE_ERROR.message,
  })
  @UseGuards(AccessTokenGuard)
  @RequireRole(GLOBAL_ROLES.SUPER_ADMIN)
  @Serialize({
    ...ServiceResponse.DELETE_SUCCESS,
  })
  async deleteService(@Param('id') id: string): Promise<void> {
    await this.serviceManager.deleteService(id);
  }
}
