import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { SERVICE_CONSTANTS } from '@krgeobuk/core/constants';

const { AUTH_SERVICE, AUTHZ_SERVICE, PORTAL_SERVICE, MYPICK_SERVICE } = SERVICE_CONSTANTS;

export class SeedInitialServices20260314100002 implements MigrationInterface {
  name = 'SeedInitialServices20260314100002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`service\` (\`id\`, \`name\`, \`display_name\`, \`is_visible\`, \`is_visible_by_role\`)
      VALUES
        ('${AUTH_SERVICE.id}',   '${AUTH_SERVICE.name}',   '${AUTH_SERVICE.displayName}',   0, 0),
        ('${AUTHZ_SERVICE.id}',  '${AUTHZ_SERVICE.name}',  '${AUTHZ_SERVICE.displayName}',  0, 0),
        ('${PORTAL_SERVICE.id}', '${PORTAL_SERVICE.name}', '${PORTAL_SERVICE.displayName}', 1, 0),
        ('${MYPICK_SERVICE.id}', '${MYPICK_SERVICE.name}', '${MYPICK_SERVICE.displayName}', 1, 0)
      ON DUPLICATE KEY UPDATE \`name\` = \`name\`
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`service\`
      WHERE \`id\` IN (
        '${AUTH_SERVICE.id}',
        '${AUTHZ_SERVICE.id}',
        '${PORTAL_SERVICE.id}',
        '${MYPICK_SERVICE.id}'
      )
    `);
  }
}
