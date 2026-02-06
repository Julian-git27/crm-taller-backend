import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Vehiculo } from '../vehiculos/vehiculos.entity'; // Asegúrate de importar

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  telefono2: string;

  @Column()
  email: string;

  @Column({ nullable: true, unique: true })
  identificacion: string;

  @Column({ nullable: true, type: 'text' })
  direccion: string;

  @Column({ nullable: true })
  municipio: string;

  @CreateDateColumn()
  created_at: Date;

  // ✅ AGREGAR ESTA RELACIÓN
  @OneToMany(() => Vehiculo, (vehiculo) => vehiculo.cliente, {
    cascade: true, // Opcional: si quieres que se eliminen los vehículos al eliminar el cliente
  })
  vehiculos: Vehiculo[];
}