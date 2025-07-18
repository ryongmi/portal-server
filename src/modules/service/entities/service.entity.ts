import { Entity, Column } from 'typeorm';

import { BaseEntityUUID } from '@krgeobuk/core/entities';

@Entity()
export class ServiceEntity extends BaseEntityUUID {
  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null; // 홈페이지 가입 이메일, 통합 기준

  @Column({ type: 'varchar', length: 2048, nullable: true })
  baseUrl?: string | null; // 실제 서비스 URL

  @Column({ type: 'boolean', default: true })
  isVisible?: boolean; // 포털에서 표시 여부

  @Column({ type: 'boolean', default: false })
  isVisibleByRole?: boolean; // 권한 기반 표시 여부

  @Column({ type: 'varchar', length: 50, nullable: true })
  displayName?: string | null; // 사용자에게 보여줄 이름 (예: "관리자 포털")

  @Column({ type: 'varchar', length: 2048, nullable: true })
  iconUrl?: string | null; // UI에 표시할 서비스 아이콘
}

