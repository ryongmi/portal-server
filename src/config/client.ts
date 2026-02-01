import { registerAs } from '@nestjs/config';

import { ClientConfig } from '@common/interfaces/config.interfaces.js';

export const clientConfig = registerAs(
  'client',
  (): ClientConfig => ({
    authServiceHost: process.env.AUTH_SERVICE_HOST!,
    authServicePort: parseInt(process.env.AUTH_SERVICE_PORT! ?? '8010', 10),
    authzServiceHost: process.env.AUTHZ_SERVICE_HOST!,
    authzServicePort: parseInt(process.env.AUTHZ_SERVICE_PORT! ?? '8110', 10),
  })
);
