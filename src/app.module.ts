import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ClientesModule } from './clientes/clientes.module';
import { MecanicosModule } from './mecanicos/mecanicos.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { ProductosModule } from './productos/productos.module';
import { OrdenesServicioModule } from './ordenes-servicio/ordenes-servicio.module';
import { FacturasModule } from './facturas/facturas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ServiciosModule } from './servicios/servicios.module';
import { MailModule } from './mail/mail.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    // 🔥 CARGA .env ANTES DE TODO
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 🔥 TYPEORM CON VARIABLES SEGURAS
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<number>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // ❌ NUNCA true en producción
        ssl:
          config.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // 🧩 MÓDULOS
    ClientesModule,
    MecanicosModule,
    VehiculosModule,
    VehiculosModule,
    ProductosModule,
    OrdenesServicioModule,
    FacturasModule,
    DashboardModule,
    ServiciosModule,
    MailModule,
    UsuariosModule,
    AuthModule,
  ],

  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
