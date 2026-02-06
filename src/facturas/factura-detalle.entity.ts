import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Factura } from './facturas.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity';

// Define el mismo enum para consistencia
export enum TipoDetalle {
  PRODUCTO = 'PRODUCTO',
  SERVICIO = 'SERVICIO',
  OTRO = 'OTRO',
}

@Entity('factura_detalle')
export class FacturaDetalle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  facturaId: number;

  @ManyToOne(() => Factura, (factura) => factura.detalles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'facturaId' })
  factura: Factura;

  @Column()
  descripcion: string;

  @Column()
  cantidad: number;

  @Column('decimal', { precision: 10, scale: 2 })
  precio_unitario: number;

  // Producto (opcional)
  @Column({ nullable: true })
  productoId: number | null;

  @ManyToOne(() => Producto, { nullable: true })
  @JoinColumn({ name: 'productoId' })
  producto?: Producto;

  // Servicio (opcional)
  @Column({ nullable: true })
  servicioId: number | null;

  @ManyToOne(() => Servicio, { nullable: true })
  @JoinColumn({ name: 'servicioId' })
  servicio?: Servicio;

  @Column({
    type: 'enum',
    enum: TipoDetalle,
    default: TipoDetalle.OTRO,
  })
  tipo: TipoDetalle;
}