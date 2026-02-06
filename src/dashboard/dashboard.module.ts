// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Factura } from '../facturas/facturas.entity';
import { OrdenServicio } from '../ordenes-servicio/orden-servicio.entity';
import { OrdenDetalle } from '../ordenes-servicio/orden-detalle.entity';
import { Producto } from '../productos/productos.entity';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      OrdenServicio,
      OrdenDetalle,
      Producto,
      Cliente,
      Vehiculo,
      Mecanico,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}