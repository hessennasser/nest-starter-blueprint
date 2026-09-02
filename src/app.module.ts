import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { redisStore } from 'cache-manager-ioredis-yet';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import databaseConfig from './database/config/database.config';
import { AllConfigType } from './config/config.type';
import { TypeOrmConfigService } from './database/typeorm-config.service';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { FileUrlTransformInterceptor } from './shared/interceptors';
import { MailModule } from './shared/mail/mail.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ArticlesModule } from './modules/articles/articles.module';

// Resolve the i18n translation directory across dev (src) and prod (dist).
const resolveI18nPath = (): string => {
  const candidates = [
    path.join(process.cwd(), 'dist', 'i18n'),
    path.join(process.cwd(), 'src', 'i18n'),
    path.join(__dirname, 'i18n'),
  ];
  const existing = candidates.find((c) => existsSync(c));
  if (existing) return existing;
  mkdirSync(candidates[0], { recursive: true });
  return candidates[0];
};

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, mailConfig, redisConfig, databaseConfig],
      envFilePath: ['.env'],
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: (options?: DataSourceOptions) =>
        new DataSource(options as DataSourceOptions).initialize(),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AllConfigType>) => ({
        store: await redisStore({
          host: config.getOrThrow('redis.host', { infer: true }),
          port: config.getOrThrow('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }) || undefined,
          db: config.get('redis.db', { infer: true }) ?? 0,
        }),
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        redis: {
          host: config.getOrThrow('redis.host', { infer: true }),
          port: config.getOrThrow('redis.port', { infer: true }),
          password: config.get('redis.password', { infer: true }) || undefined,
          db: config.get('redis.db', { infer: true }) ?? 0,
        },
      }),
    }),

    I18nModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        fallbackLanguage: config.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: resolveI18nPath(), watch: true },
      }),
      resolvers: [AcceptLanguageResolver],
    }),

    MailModule,

    // Feature modules
    AuthModule,
    UsersModule,
    RbacModule,
    ArticlesModule,
  ],
  providers: [
    AppService,
    // Order-independent globals. Interceptors added imperatively in main.ts
    // (LoggingInterceptor, ResponseInterceptor) run OUTSIDE these.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: FileUrlTransformInterceptor },
  ],
})
export class AppModule {}
