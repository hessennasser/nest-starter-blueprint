import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllConfigType } from 'src/config/config.type';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshSession } from './entities/refresh-session.entity';
import { RefreshSessionService } from './refresh-session.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Role, RefreshSession]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AllConfigType>) => ({
        secret: config.getOrThrow('auth.secret', { infer: true }),
        signOptions: {
          expiresIn: config.get('auth.expires', { infer: true }) || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshSessionService, JwtStrategy],
  // JwtModule is exported so guards elsewhere can verify tokens (e.g. a WS gateway).
  exports: [AuthService, RefreshSessionService, JwtModule],
})
export class AuthModule {}
