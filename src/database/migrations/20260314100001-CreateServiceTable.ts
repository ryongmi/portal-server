import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateServiceTable20260314100001 implements MigrationInterface {
  name = 'CreateServiceTable20260314100001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`service\` (
        \`id\`                 CHAR(36)        NOT NULL,
        \`name\`               VARCHAR(50)     NOT NULL,
        \`description\`        VARCHAR(255)    NULL,
        \`base_url\`           VARCHAR(2048)   NULL,
        \`is_visible\`         TINYINT(1)      NOT NULL DEFAULT 1,
        \`is_visible_by_role\` TINYINT(1)      NOT NULL DEFAULT 0,
        \`display_name\`       VARCHAR(50)     NULL,
        \`icon_url\`           VARCHAR(2048)   NULL,
        \`created_at\`         TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`         TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\`         TIMESTAMP(6)    NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_service_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`service\``);
  }
}
