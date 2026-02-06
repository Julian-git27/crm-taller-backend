import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  nombre: string;

  @Column({ nullable: true, unique: true })  // Añadir unique si quieres que sea único
  referencia: string;  // Nueva columna

  @Column({ nullable: true })
  categoria: string;

  @Column('decimal', { precision: 10, scale: 2 })
  precio: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 5 })
  stock_minimo: number;

  @CreateDateColumn()
  created_at: Date;
}