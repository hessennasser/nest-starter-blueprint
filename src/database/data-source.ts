import 'reflect-metadata';
import '../register-paths';
import { DataSource, DataSourceOptions } from 'typeorm';
import { loadEnvFile } from './load-env-file';

// The TypeORM CLI (migrations, generate) loads this file directly, so it must
// read its own env and resolve the `src/*` alias without Nest.
loadEnvFile();

const AppDataSource = new DataSource({
  type: (process.env.DATABASE_TYPE as DataSourceOptions['type']) || 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT
    ? parseInt(process.env.DATABASE_PORT, 10)
    : 5432,
  username: process.env.DATABASE_USERNAME,
  database: process.env.DATABASE_NAME,
  synchronize: false,
  migrationsTransactionMode: 'each',
  keepConnectionAlive: true,
  logging: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  extra: {
    max: process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 100,
    ssl:
      process.env.DATABASE_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
          }
        : undefined,
  },
  ...(process.env.DATABASE_PASSWORD
    ? { password: process.env.DATABASE_PASSWORD }
    : {}),
} as DataSourceOptions);

export default AppDataSource;
