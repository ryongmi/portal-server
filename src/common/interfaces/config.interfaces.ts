export interface DefaultConfig {
  mode: 'local' | 'development' | 'production';
  port: number;
  tcpPort: number;
  corsOrigins: string;
}

export interface ClientConfig {
  authServiceHost: string;
  authServicePort: number;
  authzServiceHost: string;
  authzServicePort: number;
}

export interface MysqlConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
  synchronize: boolean;
  logging: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  keyPrefix: string | undefined;
}

export interface JwtConfig {
  accessPublicKey: string;
}
