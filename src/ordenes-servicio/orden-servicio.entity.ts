import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';
import { OrdenDetalle } from './orden-detalle.entity';

export enum EstadoOrden {
  RECIBIDA = 'RECIBIDA',
  EN_PROCESO = 'EN_PROCESO',
  TERMINADA = 'TERMINADA',
  FACTURADA = 'FACTURADA',
}

@Entity('ordenes_servicio')
export class OrdenServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cliente, { eager: true })
  cliente: Cliente;

  @ManyToOne(() => Vehiculo, { eager: true })
  vehiculo: Vehiculo;

  @ManyToOne(() => Mecanico, { eager: true })
  mecanico: Mecanico;

  @Column({
    type: 'enum',
    enum: EstadoOrden,
    default: EstadoOrden.RECIBIDA,
  })
  estado: EstadoOrden;

  @Column({ nullable: true })
  observaciones: string;

  // ✅ TOTAL PERSISTIDO
  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  total: number;

 @OneToMany(() => OrdenDetalle, (detalle) => detalle.orden, {
    cascade: true, // ✅ Esto permite operaciones en cascada
    onDelete: 'CASCADE', // ✅ Esto elimina detalles cuando se elimina la orden
  })
  detalles: OrdenDetalle[];

  @CreateDateColumn()
  fecha_ingreso: Date;
}
