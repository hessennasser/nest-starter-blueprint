import { registerAs } from '@nestjs/config';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import validateConfig from 'src/shared/helpers/validate-config.helper';
import { MailConfig } from './mail-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  MAIL_HOST: string;

  @IsInt()
  @IsOptional()
  MAIL_PORT: number;

  @IsString()
  @IsOptional()
  MAIL_USER: string;

  @IsString()
  @IsOptional()
  MAIL_PASSWORD: string;

  @IsBoolean()
  @IsOptional()
  MAIL_SECURE: boolean;

  @IsString()
  @IsOptional()
  MAIL_FROM_EMAIL: string;
}

export default registerAs<MailConfig>('mail', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const host = process.env.MAIL_HOST || undefined;
  const user = process.env.MAIL_USER || undefined;
  const password = process.env.MAIL_PASSWORD || undefined;

  return {
    host,
    port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
    user,
    password,
    secure: process.env.MAIL_SECURE === 'true',
    requireTls: process.env.MAIL_REQUIRE_TLS !== 'false',
    fromEmail: process.env.MAIL_FROM_EMAIL || 'no-reply@example.com',
    fromName: process.env.MAIL_FROM_NAME || 'Nest Starter',
    enabled: Boolean(host && user && password),
  };
});
