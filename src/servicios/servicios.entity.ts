// src/servicios/servicios.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { OrdenDetalle } from '../ordenes-servicio/orden-detalle.entity';

@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column('decimal', { precision: 10, scale: 2 })
  precio: number;

  @Column({ name: 'duracion_minutos', default: 60 })
  duracionMinutos: number;

  @Column({ nullable: true })
  categoria: string;

  @Column({ name: 'es_activo', default: true })
  esActivo: boolean;

  @Column({ name: 'requiere_repuestos', default: false })
  requiereRepuestos: boolean;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  // Relación con OrdenDetalle (para servicios en órdenes)
  @OneToMany(() => OrdenDetalle, (ordenDetalle) => ordenDetalle.servicio)
  detallesOrden: OrdenDetalle[];
}