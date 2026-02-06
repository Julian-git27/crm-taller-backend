import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from './facturas.entity';
import { FacturaDetalle } from './factura-detalle.entity';
import { FacturasService } from './facturas.service';
import { FacturasController } from './facturas.controller';
import { OrdenServicio } from '../ordenes-servicio/orden-servicio.entity';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity'; // ← Importar Servicio
import { Mecanico } from '../mecanicos/mecanicos.entity'; // ← Importar Mecanico
import { MailService } from '../mail/mail.service';
import { MailModule } from '../mail/mail.module'; // Importar MailModule
import { UsuariosModule } from '../usuarios/usuarios.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      FacturaDetalle,
      OrdenServicio,
      Cliente,
      Vehiculo,
      Producto,
      Servicio, // ← Agregar Servicio
      Mecanico, // ← Agregar Mecanico
      MailService,
      
    ]),
    MailModule, // ¡Agregar esta línea!
    UsuariosModule, // ✅ IMPORTANTE
  ],
  providers: [FacturasService],
  controllers: [FacturasController],
})
export class FacturasModule {}