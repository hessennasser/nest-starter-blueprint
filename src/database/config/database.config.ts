import { registerAs } from '@nestjs/config';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import validateConfig from 'src/shared/helpers/validate-config.helper';
import { DatabaseConfig } from './database-config.type';

type EnvValues = Record<string, unknown>;

const hasUrl = (env: EnvValues): boolean =>
  typeof env.DATABASE_URL === 'string' && env.DATABASE_URL.length > 0;

class EnvironmentVariablesValidator {
  @ValidateIf(hasUrl)
  @IsString()
  DATABASE_URL: string;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsString()
  DATABASE_TYPE: string;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsString()
  DATABASE_HOST: string;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsInt()
  @Min(0)
  @Max(65535)
  DATABASE_PORT: number;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsString()
  DATABASE_USERNAME: string;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsString()
  DATABASE_PASSWORD: string;

  @ValidateIf((env: EnvValues) => !hasUrl(env))
  @IsString()
  DATABASE_NAME: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SYNCHRONIZE: boolean;

  @IsInt()
  @IsOptional()
  DATABASE_MAX_CONNECTIONS: number;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_ENABLED: boolean;
}

export default registerAs<DatabaseConfig>('database', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    url: process.env.DATABASE_URL || undefined,
    type: process.env.DATABASE_TYPE || 'postgres',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT
      ? parseInt(process.env.DATABASE_PORT, 10)
      : 5432,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USERNAME,
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 100,
    sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
    ca: process.env.DATABASE_CA || undefined,
    key: process.env.DATABASE_KEY || undefined,
    cert: process.env.DATABASE_CERT || undefined,
  };
});
