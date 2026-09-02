import { registerAs } from '@nestjs/config';
import { IsOptional, IsString, MinLength } from 'class-validator';
import validateConfig from 'src/shared/helpers/validate-config.helper';
import { AuthConfig } from './auth-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @MinLength(16, {
    message: 'JWT_SECRET must be at least 16 characters',
  })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string;

  @IsString()
  @IsOptional()
  ENCRYPTION_KEY: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    secret: process.env.JWT_SECRET as string,
    expires: process.env.JWT_EXPIRATION || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRATION || '7d',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  };
});
