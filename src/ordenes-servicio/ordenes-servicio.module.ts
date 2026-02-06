import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenServicio } from './orden-servicio.entity';
import { OrdenDetalle } from './orden-detalle.entity';
import { OrdenesServicioService } from './ordenes-servicio.service';
import { OrdenesServicioController } from './ordenes-servicio.controller';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity'; // ← Importar la entidad
import { UsuariosModule } from '../usuarios/usuarios.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrdenServicio,
      OrdenDetalle,
      Cliente,
      Vehiculo,
      Mecanico,
      Producto,
      Servicio, // ← Agregar aquí
    ]),
     UsuariosModule, // ✅ AQUÍ
  ],
  providers: [OrdenesServicioService],
  controllers: [OrdenesServicioController],
})
export class OrdenesServicioModule {}