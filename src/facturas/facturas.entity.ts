import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Cliente } from '../clientes/clientes.entity';
import { OrdenServicio } from '../ordenes-servicio/orden-servicio.entity';
import { FacturaDetalle } from './factura-detalle.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity'; // ✅ Agregar import

export enum EstadoPago {
  PAGADO = 'PAGA',
  NO_PAGA = 'NO_PAGA'
}

@Entity('facturas')
@Index('idx_facturas_estado_pago', ['estado_pago'])
@Index('idx_facturas_deleted_at', ['deleted_at'], { where: 'deleted_at IS NULL' })
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @ManyToOne(() => OrdenServicio, { nullable: true }) // ✅ Cambiar a nullable
  @JoinColumn({ name: 'ordenId' })
  orden: OrdenServicio | null; // ✅ Cambiar tipo

  @ManyToOne(() => Mecanico, { nullable: true, eager: true })
  @JoinColumn({ name: 'mecanicoId' })
  mecanico: Mecanico | null;

  

  @ManyToOne(() => Vehiculo, { nullable: true, eager: true })
  @JoinColumn({ name: 'vehiculoId' })
  vehiculo: Vehiculo | null; // Nueva relación directa
  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column()
  metodo_pago: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: EstadoPago.NO_PAGA
  })
  estado_pago: EstadoPago;

  @Column({ nullable: true, type: 'timestamp' })
  pagado_at: Date;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @OneToMany(() => FacturaDetalle, (d) => d.factura, {
    cascade: true,
  })
  detalles: FacturaDetalle[];

  @CreateDateColumn()
  fecha: Date;

  @DeleteDateColumn({ nullable: true, type: 'timestamp' })
  deleted_at: Date;

  // Método helper
  marcarComoPagada() {
    this.estado_pago = EstadoPago.PAGADO;
    this.pagado_at = new Date();
  }

  marcarComoNoPagada() {
    this.estado_pago = EstadoPago.NO_PAGA;
    this.pagado_at = null;
  }

  estaPagada(): boolean {
    return this.estado_pago === EstadoPago.PAGADO;
  }
}