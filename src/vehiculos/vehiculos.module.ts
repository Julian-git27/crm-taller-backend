import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehiculo } from './vehiculos.entity';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { VehiculosNotificacionesService } from './vehiculos-notificaciones.service';
import { VehiculosNotificacionesController } from './vehiculos-notificaciones.controller';
import { Cliente } from '../clientes/clientes.entity';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module'; // ← IMPORTANTE

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehiculo, Cliente]),
    MailModule, // Importar el módulo de correo
    AuthModule,
  ],
  controllers: [
    VehiculosController,
    VehiculosNotificacionesController, // Añadir el nuevo controlador
  ],
  providers: [
    VehiculosService,
    VehiculosNotificacionesService, // Añadir el nuevo servicio
  ],
  exports: [VehiculosService],
})
export class VehiculosModule {}