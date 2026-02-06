// src/usuarios/usuarios.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Mecanico } from '../mecanicos/mecanicos.entity';

export enum RolUsuario {
  VENDEDOR = 'VENDEDOR',
  MECANICO = 'MECANICO',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  usuario: string; // Mantengo 'usuario' como en tu código original

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: RolUsuario,
    default: RolUsuario.MECANICO
  })
  rol: RolUsuario;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  // ✅ Relación inversa con Mecanico
  @OneToOne(() => Mecanico, mecanico => mecanico.usuario)
  mecanico: Mecanico;
}