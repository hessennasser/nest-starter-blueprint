import { AppConfig } from './app-config.type';
import { AuthConfig } from './auth-config.type';
import { MailConfig } from './mail-config.type';
import { RedisConfig } from './redis-config.type';
import { DatabaseConfig } from '../database/config/database-config.type';

/**
 * The single typed view of every `registerAs(...)` namespace. Inject
 * `ConfigService<AllConfigType>` and read with `.get('app.port', { infer: true })`.
 */
export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  mail: MailConfig;
  redis: RedisConfig;
  database: DatabaseConfig;
};
