# CLAUDE.md - Portal Server

이 파일은 portal-server 작업 시 Claude Code의 가이드라인을 제공합니다.

## 서비스 개요

portal-server는 krgeobuk 생태계의 서비스 관리 서버로, 마이크로서비스 등록/관리와 TCP 마이크로서비스 통신을 담당합니다.

### 현재 상태
- **HTTP API 서버** (포트 8200) - REST API 제공
- **TCP 마이크로서비스** (포트 8210) - 서비스 간 서비스 정보 조회
- **서비스 관리** - 마이크로서비스 등록, 수정, 삭제 (소프트 삭제)
- **RBAC 연동** - authz-server TCP로 권한/역할 조회
- **폴백 처리** - 외부 서비스 장애 시 기본 데이터 반환

## 핵심 명령어

### 개발
- `npm run start:debug` - nodemon으로 개발 서버 시작
- `npm run build` - TypeScript와 별칭 해결로 프로젝트 빌드
- `npm run build:watch` - 감시 모드로 빌드

### 코드 품질
- `npm run lint` - 소스 파일에 ESLint 실행
- `npm run lint-fix` - 자동 수정과 함께 ESLint 실행
- `npm run format` - Prettier로 코드 포맷팅

### 테스트
- `npm run test` - 단위 테스트 실행
- `npm run test:watch` - 감시 모드로 테스트 실행
- `npm run test:cov` - 커버리지와 함께 테스트 실행

### Docker 운영
- `npm run docker:local:up` - 로컬 Docker 스택 시작
- `npm run docker:local:down` - 로컬 Docker 스택 중지

## 아키텍처

### 핵심 구조
- **진입점**: `src/main.ts` - Swagger 설정과 함께 애플리케이션 부트스트랩
- **앱 모듈**: `src/app.module.ts` - 모든 기능 모듈을 가져오는 루트 모듈
- **글로벌 설정**: `src/setNestApp.ts` - 글로벌 파이프, 필터, 인터셉터, CORS 설정

### 기능 모듈 구조
- **Service 모듈** (`src/modules/service/`) - 서비스 관리 (HTTP + TCP)
  - `service.controller.ts` - HTTP REST 엔드포인트
  - `service-tcp.controller.ts` - TCP 마이크로서비스
  - `service.manager.ts` - 비즈니스 로직 오케스트레이터 (authz-server TCP 호출 포함)
  - `service.repository.ts` - 데이터 접근 계층
- **Health 모듈** (`src/modules/health/`) - 헬스체크 (`/health`, `/health/ready`)

### 설정
- **Config 디렉터리** (`src/config/`) - 환경별 설정 (Joi 검증)
- **Database 모듈** (`src/database/`) - TypeORM 및 Redis 설정
- **Clients** (`src/common/clients/`) - 외부 TCP 클라이언트 (AUTH, AUTHZ)

### 공유 라이브러리 의존성
- `@krgeobuk/core` - 핵심 유틸리티, 인터셉터, 필터
- `@krgeobuk/jwt` - JWT 토큰 검증 (`AccessTokenGuard`)
- `@krgeobuk/authorization` - 권한 가드, `@RequireAccess()` 데코레이터
- `@krgeobuk/swagger` - API 문서화 설정
- `@krgeobuk/database-config` - TypeORM 및 Redis 설정
- `@krgeobuk/service` - 서비스 DTO, 인터페이스, 예외 처리
- `@krgeobuk/service-visible-role` - 서비스 가시성 역할 TCP 패턴
- `@krgeobuk/role` - 역할 TCP 패턴
- `@krgeobuk/shared` - 공유 타입 및 유틸리티

### 데이터베이스 설정
- **MySQL**: 중앙 인프라 (krgeobuk-mysql, 포트 3306, DB: `portal_dev`)
- **Redis**: 중앙 인프라 (krgeobuk-redis, 포트 6379)
- **TypeORM**: snake_case 네이밍 전략

### API 구조
- **HTTP REST API**: 글로벌 프리픽스 `/portal` (health 제외)
- **TCP 마이크로서비스**: 포트 8210에서 실행
- **Swagger**: `http://localhost:8200/api-docs` (글로벌 프리픽스 미적용)

## TCP 마이크로서비스 통신

### 서버 설정

```typescript
// main.ts
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.TCP,
  options: {
    host: '0.0.0.0',
    port: 8210,
  },
});
```

### Service TCP 엔드포인트

다른 서비스에서 `portal-server:8210`으로 TCP 통신하여 서비스 정보를 조회합니다.

| 패턴 | 설명 | 요청 데이터 | 응답 타입 |
|------|------|-------------|-----------|
| `service.find-all` | 전체 서비스 목록 조회 | - | `Service[]` |
| `service.search` | 서비스 검색 (페이지네이션) | `ServiceSearchQuery` | `TcpSearchResponse<ServiceSearchResult>` |
| `service.find-by-id` | ID로 서비스 조회 | `{ serviceId: string }` | `Service \| null` |
| `service.find-by-ids` | 여러 ID로 서비스 조회 | `{ serviceIds: string[] }` | `Service[]` |
| `service.exists` | 서비스 존재 여부 확인 | `{ serviceId: string }` | `boolean` |
| `service.create` | 서비스 생성 | `CreateService` | `{ success: true }` |
| `service.update` | 서비스 수정 | `{ serviceId, updateData }` | `{ success: true }` |
| `service.delete` | 서비스 삭제 | `{ serviceId: string }` | `{ success: true }` |

### 다른 서비스에서 사용 예시

```typescript
// authz-server에서 portal-server TCP 호출
@Injectable()
export class AuthorizationService {
  constructor(
    @Inject('PORTAL_SERVICE') private portalClient: ClientProxy
  ) {}

  async getAvailableServices(): Promise<Service[]> {
    return firstValueFrom(
      this.portalClient.send(ServiceTcpPatterns.FIND_ALL, {})
    );
  }

  async getServiceById(serviceId: string): Promise<Service | null> {
    return firstValueFrom(
      this.portalClient.send(ServiceTcpPatterns.FIND_BY_ID, { serviceId })
    );
  }
}
```

### 클라이언트 설정 예시

```typescript
// app.module.ts
ClientsModule.register([
  {
    name: 'PORTAL_SERVICE',
    transport: Transport.TCP,
    options: {
      host: 'portal-server',  // Docker 네트워크 내 호스트명
      port: 8210,
    },
  },
])
```

## 외부 서비스 연동 (authz-server TCP)

portal-server의 `ServiceManager`는 authz-server에 TCP 통신하여 서비스 상세 정보를 보강합니다.

| 호출 상황 | TCP 패턴 | 용도 |
|-----------|----------|------|
| 서비스 목록 검색 | `service-visible-role.find-role-counts-batch` | 서비스별 가시성 역할 수 조회 |
| 서비스 상세 조회 | `service-visible-role.find-roles-by-service` | 서비스의 가시성 역할 ID 목록 |
| 서비스 상세 조회 | `role.find-by-ids` | 역할 ID → 역할 정보 변환 |
| 서비스 삭제 전 | `service-visible-role.exists` | 가시성 역할 존재 여부 확인 |

> **폴백 처리**: 외부 서비스 장애 시 빈 배열/0 반환으로 기본 동작 유지

## 개발 가이드라인

### 환경 설정

```bash
# 서버 설정
NODE_ENV=development
PORT=8200
TCP_PORT=8210
APP_NAME=portal-server
CORS_ORIGINS=http://localhost:3000,http://localhost:3200,http://localhost:3210

# 외부 서비스
AUTH_SERVICE_HOST=auth-server
AUTH_SERVICE_PORT=8010
AUTHZ_SERVICE_HOST=authz-server
AUTHZ_SERVICE_PORT=8110

# MySQL (중앙 인프라)
MYSQL_HOST=krgeobuk-mysql
MYSQL_PORT=3306
MYSQL_USER=dev_user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=portal_dev

# Redis (중앙 인프라)
REDIS_HOST=krgeobuk-redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_KEY_PREFIX=dev

# JWT (auth-server 공개키)
JWT_ACCESS_PUBLIC_KEY_PATH=./keys/access-public.key
```

### Import 경로 별칭

```typescript
import { ServiceManager } from '@modules/service/service.manager';
import { DatabaseConfig } from '@config/database';
import { RedisService } from '@database/redis/redis.service';
import { DefaultConfig } from '@common/interfaces';
```

### 코드 품질 관리

```bash
npm run lint-fix    # ESLint 자동 수정
npm run format      # Prettier 포맷팅
npm run build       # TypeScript 컴파일
```

### 로깅 시스템
- **Winston** 기반 구조화된 로깅
- **개발환경**: 콘솔 출력
- **프로덕션**: 파일 로깅 + 일별 로테이션
- **로그 레벨**: error, warn, info, debug

---

# portal-server 전용 개발 가이드

> **NestJS 공통 개발 표준**: [docs/KRGEOBUK_NESTJS_SERVER_GUIDE.md](../docs/KRGEOBUK_NESTJS_SERVER_GUIDE.md)를 필수로 참조하세요.

## Service 도메인 구조

portal-server는 단일 `service` 도메인으로 구성됩니다.

```
src/modules/service/
├── entities/
│   └── service.entity.ts        # TypeORM 엔티티
├── service.controller.ts        # HTTP REST 엔드포인트
├── service-tcp.controller.ts    # TCP 마이크로서비스
├── service.manager.ts           # 비즈니스 로직 + authz-server 연동
├── service.repository.ts        # 데이터 접근 계층
└── service.module.ts            # 모듈 정의
```

## HTTP 엔드포인트 패턴

모든 엔드포인트는 `AccessTokenGuard` + `AuthorizationGuard` + `@RequireAccess()`로 보호됩니다.

```typescript
@Controller('services')
export class ServiceController {
  // 목록 조회 - ADMIN | SERVICE_MANAGER | SERVICE_READ
  @Get()
  @UseGuards(AccessTokenGuard, AuthorizationGuard)
  @RequireAccess({
    roles: [GLOBAL_ROLES.ADMIN, SERVICE_ROLES.SERVICE_MANAGER],
    permissions: [SERVICE_PERMISSIONS.SERVICE_READ],
    combinationOperator: 'OR',
  })
  async searchServices(@Query() query: ServiceSearchQueryDto) { ... }

  // 생성/수정/삭제 - SUPER_ADMIN | SERVICE_MANAGER | SERVICE_CREATE/UPDATE/DELETE
  @Post()
  @UseGuards(AccessTokenGuard, AuthorizationGuard)
  @RequireAccess({
    roles: [GLOBAL_ROLES.SUPER_ADMIN, SERVICE_ROLES.SERVICE_MANAGER],
    permissions: [SERVICE_PERMISSIONS.SERVICE_CREATE],
    combinationOperator: 'OR',
  })
  async createService(@Body() dto: CreateServiceDto) { ... }
}
```

## ServiceManager 오케스트레이션 패턴

`ServiceManager`는 authz-server TCP 호출과 폴백 처리를 담당합니다:

```typescript
@Injectable()
export class ServiceManager {
  constructor(
    private readonly serviceRepo: ServiceRepository,
    @Inject('AUTHZ_SERVICE') private readonly authzClient: ClientProxy
  ) {}

  // 외부 서비스 장애 시 폴백 처리 패턴
  async searchServices(query: ServiceSearchQuery) {
    const services = await this.serviceRepo.searchServices(query);

    try {
      // authz-server에서 가시성 역할 수 조회
      const visibleRoleCounts = await firstValueFrom(
        this.authzClient.send(
          ServiceVisibleRoleTcpPatterns.FIND_ROLE_COUNTS_BATCH,
          { serviceIds }
        )
      );
      return this.buildServiceSearchResults(services.items, visibleRoleCounts);
    } catch {
      // TCP 실패 시 기본값(0)으로 폴백
      return this.buildFallbackServiceSearchResults(services.items);
    }
  }
}
```

## TCP 컨트롤러 패턴

```typescript
@Controller()
export class ServiceTcpController {
  private readonly logger = new Logger(ServiceTcpController.name);

  @MessagePattern(ServiceTcpPatterns.FIND_ALL)  // 'service.find-all'
  async findAll(): Promise<Service[]> {
    this.logger.debug('TCP service findAll request');
    try {
      return await this.serviceManager.findAll();
    } catch (error: unknown) {
      this.logger.error('TCP service findAll failed', { error });
      throw error;
    }
  }

  @MessagePattern(ServiceTcpPatterns.EXISTS)   // 'service.exists'
  async exists(@Payload() data: { serviceId: string }): Promise<boolean> {
    // ...
  }
}
```

## 개발 워크플로우

```bash
# 1. 중앙 인프라 확인 (krgeobuk-network, MySQL, Redis)
# 2. 환경 변수 설정
cp envs/.env.example envs/.env.local

# 3. JWT 공개키 복사 (auth-server에서)
cp ../auth-server/keys/access-public.key ./keys/

# 4. Docker 스택 시작
npm run docker:local:up

# 5. 코드 품질 확인
npm run lint-fix && npm run format

# 6. 테스트
npm run test
```

## 포트 구성

| 서비스 | 포트 | 프로토콜 |
|--------|------|---------|
| portal-server HTTP | 8200 | REST API |
| portal-server TCP | 8210 | 마이크로서비스 |
| auth-server TCP | 8010 | 사용자 정보 조회 |
| authz-server TCP | 8110 | 권한/역할 조회 |
| MySQL | 3306 | 중앙 인프라 |
| Redis | 6379 | 중앙 인프라 |
