import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy'; // ← AÑADE ESTA IMPORTACIÓN
import { UsuariosModule } from '../usuarios/usuarios.module';
import { MecanicosModule } from '../mecanicos/mecanicos.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // ← AÑADE register()
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: config.get<'1d' | '8h' | '12h'>('JWT_EXPIRES') ?? '8h',
        },
      }),
    }),

    ConfigModule, // ← AÑADE ConfigModule si no está ya importado globalmente
    UsuariosModule,
    MecanicosModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // ← AÑADE JwtStrategy aquí
  exports: [AuthService, JwtModule, PassportModule], // ← Exporta JwtModule y PassportModule
})
export class AuthModule {}