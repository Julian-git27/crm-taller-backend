// src/usuarios/usuarios.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, RolUsuario } from './usuarios.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
  ) {}

  async create(username: string, password: string, rol: RolUsuario = RolUsuario.MECANICO) {
    // Verificar si el usuario ya existe
    const existingUser = await this.usuarioRepo.findOne({
      where: { usuario: username }
    });

    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya existe');
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const usuario = this.usuarioRepo.create({
      usuario: username,
      password: hashedPassword,
      rol,
      activo: true
    });

    return await this.usuarioRepo.save(usuario);
  }

  async updatePassword(userId: number, newPassword: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: userId }
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(newPassword, salt);

    return await this.usuarioRepo.save(usuario);
  }

  async update(id: number, data: Partial<Usuario>) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id }
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    Object.assign(usuario, data);
    return await this.usuarioRepo.save(usuario);
  }

  async findByUsername(username: string) {
    return await this.usuarioRepo.findOne({
      where: { usuario: username }
    });
  }

  async findById(id: number) {
    return await this.usuarioRepo.findOne({
      where: { id }
    });
  }
}