import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { AllConfigType } from '../config/config.type';

/**
 * Builds the runtime TypeORM options for the Nest app from validated config.
 * The standalone CLI DataSource lives in `data-source.ts` and is kept in sync
 * by hand — both point at the same entity/migration globs.
 */
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService<AllConfigType>) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const password = this.config.get('database.password', { infer: true });

    return {
      type: this.config.get('database.type', { infer: true }),
      url: this.config.get('database.url', { infer: true }),
      host: this.config.get('database.host', { infer: true }),
      port: this.config.get('database.port', { infer: true }),
      username: this.config.get('database.username', { infer: true }),
      ...(password !== undefined ? { password } : {}),
      database: this.config.get('database.name', { infer: true }),
      synchronize: this.config.get('database.synchronize', { infer: true }),
      dropSchema: false,
      keepConnectionAlive: true,
      logging:
        this.config.get('app.nodeEnv', { infer: true }) !== 'production',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      extra: {
        max: this.config.get('database.maxConnections', { infer: true }),
        ssl: this.config.get('database.sslEnabled', { infer: true })
          ? {
              rejectUnauthorized: this.config.get(
                'database.rejectUnauthorized',
                { infer: true },
              ),
              ca: this.config.get('database.ca', { infer: true }) ?? undefined,
              key: this.config.get('database.key', { infer: true }) ?? undefined,
              cert:
                this.config.get('database.cert', { infer: true }) ?? undefined,
            }
          : undefined,
      },
    } as TypeOrmModuleOptions;
  }
}
