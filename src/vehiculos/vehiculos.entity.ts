import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Cliente } from '../clientes/clientes.entity';

@Entity('vehiculos')
export class Vehiculo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cliente, { eager: true })
  cliente: Cliente;

  @Column({ unique: true })
  placa: string;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column({ nullable: true })
  anio: number;

  @Column({ nullable: true })
  cilindraje: number;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  kilometraje: number;

  @Column({ nullable: true })
  fecha_vencimiento_soat: Date;

  @Column({ nullable: true })
  fecha_vencimiento_tecnomecanica: Date;

  @Column({ default: true })
  activo: boolean;
}