// src/mecanicos/mecanicos.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuarios.entity';

@Entity('mecanicos')
export class Mecanico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  especialidad: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  direccion: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  // ✅ Agregar relación con Usuario
  @OneToOne(() => Usuario, { 
    nullable: true, 
    cascade: true,
    onDelete: 'SET NULL',
    eager: true // Esto carga el usuario automáticamente
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ nullable: true, name: 'usuario_id' })
  usuarioId: number;
}