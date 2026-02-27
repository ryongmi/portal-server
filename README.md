# Portal Server

> KRGeobuk 생태계의 서비스 관리 서버

krgeobuk 마이크로서비스 생태계의 포털 서버로, 서비스 등록/관리, JWT 인증 연동, TCP 마이크로서비스 통신을 제공합니다.

---

## 주요 기능

### 서비스 관리
- **서비스 CRUD** - 마이크로서비스 목록 등록, 수정, 삭제 (소프트 삭제)
- **서비스 검색** - 이름/가시성 필터링 및 페이지네이션
- **역할 기반 접근 제어** - `AccessTokenGuard` + `AuthorizationGuard` + `@RequireAccess()`

### 마이크로서비스
- **HTTP REST API** - 클라이언트 앱용 (포트 8200)
- **TCP 마이크로서비스** - 서비스 간 서비스 정보 조회 (포트 8210)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | NestJS 10, TypeScript (ESM) |
| 데이터베이스 | MySQL 8 (TypeORM, snake_case) |
| 캐시 | Redis (ioredis) |
| 인증 | JWT (AccessTokenGuard, `@krgeobuk/jwt`) |
| 인가 | RBAC (`@krgeobuk/authorization`) |
| 로깅 | Winston + 일별 로테이션 |

---

## 빠른 시작

### 환경 요구사항
- Node.js 18+
- Docker & Docker Compose
- 중앙 인프라 네트워크 구성 (`krgeobuk-network`)
- auth-server의 JWT 공개키 파일

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp envs/.env.example envs/.env.local
# .env.local 파일에서 실제 값으로 수정

# 3. JWT 공개키 파일 복사 (auth-server에서)
cp ../auth-server/keys/access-public.key ./keys/

# 4. 개발 서버 시작 (Docker)
npm run docker:local:up
```

서버가 다음 포트에서 실행됩니다:
- **HTTP API**: http://localhost:8200
- **Swagger**: http://localhost:8200/api-docs
- **TCP Service**: localhost:8210

### 스크립트

```bash
# 개발
npm run start:debug       # 개발 서버 (nodemon)
npm run build             # TypeScript 빌드
npm run build:watch       # 감시 모드 빌드

# 코드 품질
npm run lint              # ESLint 검사
npm run lint-fix          # ESLint 자동 수정
npm run format            # Prettier 포맷팅

# 테스트
npm run test              # 단위 테스트
npm run test:watch        # 감시 모드 테스트
npm run test:cov          # 커버리지 테스트
npm run test:e2e          # E2E 테스트

# Docker
npm run docker:local:up   # 로컬 스택 시작
npm run docker:local:down # 로컬 스택 중지
```

---

## 프로젝트 구조

```
src/
├── modules/                         # 기능 모듈
│   ├── service/                     # 서비스 관리 (HTTP + TCP)
│   │   ├── entities/                # TypeORM 엔티티
│   │   ├── service.controller.ts    # HTTP REST 엔드포인트
│   │   ├── service-tcp.controller.ts # TCP 마이크로서비스
│   │   ├── service.service.ts       # 비즈니스 로직
│   │   ├── service.manager.ts       # 오케스트레이터
│   │   └── service.repository.ts   # 데이터 접근 계층
│   └── health/                      # 헬스체크
│
├── common/                          # 공통 모듈
│   ├── clients/                     # MSA TCP 클라이언트 설정
│   ├── constants/                   # 상수 정의
│   └── interfaces/                  # 공통 인터페이스
│
├── config/                          # 환경 설정 (Joi 검증)
│
├── database/                        # TypeORM + Redis
│   └── redis/
│
└── main.ts                          # HTTP(8200) + TCP(8210) 부트스트랩
```

---

## API 엔드포인트

> 전체 API 문서: http://localhost:8200/api-docs (Swagger)

### 서비스 (`/portal/services`)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/services` | 서비스 목록 검색 (페이지네이션) | ADMIN \| SERVICE_MANAGER \| SERVICE_READ |
| GET | `/services/:id` | 서비스 상세 조회 | ADMIN \| SERVICE_MANAGER \| SERVICE_READ |
| POST | `/services` | 서비스 생성 | SUPER_ADMIN \| SERVICE_MANAGER \| SERVICE_CREATE |
| PATCH | `/services/:id` | 서비스 수정 | SUPER_ADMIN \| SERVICE_MANAGER \| SERVICE_UPDATE |
| DELETE | `/services/:id` | 서비스 삭제 (소프트) | SUPER_ADMIN \| SERVICE_MANAGER \| SERVICE_DELETE |

### 기타

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| GET | `/health/ready` | 준비 상태 확인 |

---

## TCP 마이크로서비스 (포트 8210)

다른 서비스(authz-server 등)에서 `portal-server:8210`으로 서비스 정보를 조회합니다.

### Service TCP 패턴

| 메시지 패턴 | 요청 | 응답 |
|------------|------|------|
| `service.find-all` | - | `Service[]` |
| `service.search` | `ServiceSearchQuery` | `TcpSearchResponse<ServiceSearchResult>` |
| `service.find-by-id` | `{ serviceId: string }` | `Service \| null` |
| `service.find-by-ids` | `{ serviceIds: string[] }` | `Service[]` |
| `service.exists` | `{ serviceId: string }` | `boolean` |
| `service.create` | `CreateService` | `{ success: true }` |
| `service.update` | `{ serviceId, updateData }` | `{ success: true }` |
| `service.delete` | `{ serviceId: string }` | `{ success: true }` |

### 다른 서비스에서 연결 설정

```typescript
// app.module.ts
ClientsModule.register([
  {
    name: 'PORTAL_SERVICE',
    transport: Transport.TCP,
    options: {
      host: 'portal-server',  // Docker 네트워크 내 호스트명
      port: 8210,             // portal-server TCP 포트
    },
  },
])

// 사용
const services = await this.portalClient
  .send('service.find-all', {})
  .toPromise();

const service = await this.portalClient
  .send('service.find-by-id', { serviceId })
  .toPromise();
```

---

## 외부 서비스 연동

portal-server는 다음 서비스들과 TCP 통신합니다:

| 서비스 | 호스트 | 포트 | 용도 |
|--------|--------|------|------|
| auth-server | `auth-server` | 8010 | 사용자 인증/정보 조회 |
| authz-server | `authz-server` | 8110 | 권한 검사, 역할/서비스 조회 |

---

## 환경 변수

```bash
# ===== 서버 =====
NODE_ENV=development
PORT=8200
TCP_PORT=8210
APP_NAME=portal-server
CORS_ORIGINS=http://localhost:3000,http://localhost:3200,http://localhost:3210

# ===== 외부 서비스 =====
AUTH_SERVICE_HOST=auth-server
AUTH_SERVICE_PORT=8010
AUTHZ_SERVICE_HOST=authz-server
AUTHZ_SERVICE_PORT=8110

# ===== MySQL (중앙 인프라) =====
MYSQL_HOST=krgeobuk-mysql
MYSQL_PORT=3306
MYSQL_USER=dev_user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=portal_dev

# ===== Redis (중앙 인프라) =====
REDIS_HOST=krgeobuk-redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_KEY_PREFIX=dev               # 개발: dev, 프로덕션: prod

# ===== JWT =====
JWT_ACCESS_PUBLIC_KEY_PATH=./keys/access-public.key
```

전체 환경 변수 목록: `envs/.env.example`

---

## Docker

```yaml
# docker-compose.yaml 핵심 구성
services:
  server:
    ports:
      - 8200:8200    # HTTP API
      - 9231:9229    # Node.js 디버거
    networks:
      - krgeobuk-network   # 중앙 MySQL, Redis
```

Dockerfile은 멀티 스테이지로 구성됩니다: `deps → build → local/development/production`

---

## 포트 구성

| 서비스 | 포트 | 프로토콜 |
|--------|------|---------|
| portal-server HTTP | 8200 | REST API |
| portal-server TCP | 8210 | 마이크로서비스 |
| MySQL | 3306 | 중앙 인프라 |
| Redis | 6379 | 중앙 인프라 |

---

## 문서

| 파일 | 설명 |
|------|------|
| [CLAUDE.md](./CLAUDE.md) | 개발 가이드 (패턴, 표준, 워크플로우) |
| [docs/](./docs/) | 기능별 설계 문서 |
