import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrdenServicio } from './orden-servicio.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity';

export enum TipoDetalle {
  PRODUCTO = 'PRODUCTO',
  SERVICIO = 'SERVICIO',
  OTRO = 'OTRO',
}

@Entity('orden_detalle')
export class OrdenDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrdenServicio, (orden) => orden.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ordenId' })
  orden: OrdenServicio;

  // ✅ NUEVO: Agregar esta columna
  @Column({ nullable: true })
  ordenId: number;

  // Producto (opcional)
  @ManyToOne(() => Producto, { nullable: true, eager: true })
  @JoinColumn({ name: 'productoId' })
  producto?: Producto;

  @Column({ nullable: true })
  productoId?: number;

  // Servicio (opcional)
  @ManyToOne(() => Servicio, { nullable: true, eager: true })
  @JoinColumn({ name: 'servicioId' })
  servicio?: Servicio;

  @Column({ nullable: true })
  servicioId?: number;

  @Column()
  descripcion: string;

  @Column({ default: 1 })
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  precio_unitario: number;

  @Column({
    type: 'enum',
    enum: TipoDetalle,
    default: TipoDetalle.OTRO,
  })
  tipo: TipoDetalle;
}
