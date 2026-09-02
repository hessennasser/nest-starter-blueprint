import './register-paths';
import type { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { webcrypto, timingSafeEqual } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { I18nService } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { AllConfigType } from './config/config.type';
import {
  LoggingInterceptor,
  ResponseInterceptor,
} from './shared/interceptors';

// Node < 20 compatibility shim for libraries expecting a global WebCrypto.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

/** Constant-time string comparison that tolerates length differences. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** HTTP Basic Auth middleware guarding the Swagger documentation routes. */
function createSwaggerAuthMiddleware(user: string, password: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      if (
        sep !== -1 &&
        safeEqual(decoded.slice(0, sep), user) &&
        safeEqual(decoded.slice(sep + 1), password)
      ) {
        return next();
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="API Documentation"');
    res.status(401).send('Authentication required to access API documentation.');
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });

  // Let class-validator custom constraints resolve their DI dependencies.
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const config = app.get(ConfigService<AllConfigType>);
  const i18n = app.get(I18nService);

  // Trust one reverse-proxy hop so Express resolves request.ip correctly.
  app.set('trust proxy', 1);

  const apiPrefix = config.getOrThrow('app.apiPrefix', { infer: true });
  app.setGlobalPrefix(apiPrefix, { exclude: ['/'] });
  app.enableVersioning({ type: VersioningType.URI });

  // Static assets: /public/* and uploaded files under /uploads/*.
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/public/' });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Ordering matters: LoggingInterceptor first (outermost), then the envelope.
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(i18n),
  );
  // The global exception filter is registered in AppModule via APP_FILTER.

  const frontendDomain = config.get('app.frontendDomain', { infer: true });
  app.enableCors({
    origin: frontendDomain?.length ? frontendDomain : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Language',
    ],
  });

  // --- Swagger, behind HTTP Basic auth ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nest Starter API')
    .setDescription('Reference API. Use /auth/login to obtain a bearer token.')
    .setVersion('1.0')
    .addServer('/', 'URI-versioned API server')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  const docsPath = `${apiPrefix}/docs`;
  app.use(
    [`/${docsPath}`, `/${docsPath}-json`, `/${docsPath}-yaml`],
    createSwaggerAuthMiddleware(
      config.getOrThrow('app.swaggerUser', { infer: true }),
      config.getOrThrow('app.swaggerPassword', { infer: true }),
    ),
  );
  SwaggerModule.setup(docsPath, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();

  const port = config.getOrThrow('app.port', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Docs at http://localhost:${port}/${docsPath}`);
}

void bootstrap();
