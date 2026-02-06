// src/mecanicos/mecanicos.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Mecanico } from './mecanicos.entity';
import { CreateMecanicoDto } from './dto/create-mecanico.dto';
import { UpdateMecanicoDto } from './dto/update-mecanico.dto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/usuarios.entity'; // ✅ Importar Usuario
import { RolUsuario } from '../usuarios/usuarios.entity';

@Injectable()
export class MecanicosService {
 async findByUsuarioId(usuarioId: number) {
  return await this.mecanicoRepo.findOne({
    where: { usuario: { id: usuarioId } },
    relations: ['usuario']
  });
}
  constructor(
    @InjectRepository(Mecanico)
    private mecanicoRepo: Repository<Mecanico>,
    private usuariosService: UsuariosService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateMecanicoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar si ya existe un mecánico con el mismo nombre
      const existente = await queryRunner.manager.findOne(Mecanico, {
        where: { nombre: dto.nombre }
      });

      if (existente) {
        throw new BadRequestException('Ya existe un mecánico con este nombre');
      }

      // Crear usuario si se proporcionan credenciales
      let usuario = null;
      if (dto.username && dto.password) {
        usuario = await this.usuariosService.create(
          dto.username,
          dto.password,
          RolUsuario.MECANICO
        );
      }

      // Crear mecánico
      const mecanico = this.mecanicoRepo.create({
        nombre: dto.nombre,
        especialidad: dto.especialidad,
        telefono: dto.telefono,
        email: dto.email,
        direccion: dto.direccion,
        observaciones: dto.observaciones,
        activo: dto.activo ?? true,
        usuario: usuario
      });

      const savedMecanico = await queryRunner.manager.save(mecanico);
      await queryRunner.commitTransaction();

      return await this.mecanicoRepo.findOne({
        where: { id: savedMecanico.id },
        relations: ['usuario']
      });

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(search?: string) {
    const query = this.mecanicoRepo
      .createQueryBuilder('mecanico')
      .leftJoinAndSelect('mecanico.usuario', 'usuario');

    if (search) {
      query.where(
        '(mecanico.nombre ILIKE :search OR mecanico.especialidad ILIKE :search OR mecanico.telefono ILIKE :search OR usuario.usuario ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    query.orderBy('mecanico.nombre', 'ASC');
    
    return await query.getMany();
  }

  async findActive() {
    return await this.mecanicoRepo.find({
      where: { activo: true },
      relations: ['usuario'],
      order: { nombre: 'ASC' }
    });
  }

  async findOne(id: number) {
    const mecanico = await this.mecanicoRepo.findOne({
      where: { id },
      relations: ['usuario']
    });
    
    if (!mecanico) {
      throw new NotFoundException(`Mecánico con ID ${id} no encontrado`);
    }
    
    return mecanico;
  }

  async update(id: number, dto: UpdateMecanicoDto) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const mecanico = await queryRunner.manager.findOne(Mecanico, {
      where: { id },
      relations: ['usuario'],
    });

    if (!mecanico) {
      throw new NotFoundException('Mecánico no encontrado');
    }

    // =========================
    // DATOS DEL MECÁNICO
    // =========================
    if (dto.nombre !== undefined) mecanico.nombre = dto.nombre;
    if (dto.especialidad !== undefined) mecanico.especialidad = dto.especialidad || null;
    if (dto.telefono !== undefined) mecanico.telefono = dto.telefono || null;
    if (dto.email !== undefined) mecanico.email = dto.email || null;
    if (dto.direccion !== undefined) mecanico.direccion = dto.direccion || null;
    if (dto.observaciones !== undefined) mecanico.observaciones = dto.observaciones || null;
    if (dto.activo !== undefined) mecanico.activo = dto.activo;

    // =========================
    // USUARIO EXISTENTE
    // =========================
    if (mecanico.usuario) {
      // 🔐 Username
      if (dto.username && dto.username !== mecanico.usuario.usuario) {
        const exists = await queryRunner.manager.findOne(Usuario, {
          where: { usuario: dto.username },
        });

        if (exists && exists.id !== mecanico.usuario.id) {
          throw new BadRequestException('El nombre de usuario ya existe');
        }

        mecanico.usuario.usuario = dto.username;
      }

      // 🔐 Password (AQUÍ estaba el bug)
      if (dto.password) {
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        mecanico.usuario.password = await bcrypt.hash(dto.password, salt);
      }

      await queryRunner.manager.save(Usuario, mecanico.usuario);
    }

    // =========================
    // CREAR USUARIO SI NO EXISTE
    // =========================
    if (!mecanico.usuario && dto.username && dto.password) {
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);

      const usuario = queryRunner.manager.create(Usuario, {
        usuario: dto.username,
        password: await bcrypt.hash(dto.password, salt),
        rol: RolUsuario.MECANICO,
        activo: true,
      });

      await queryRunner.manager.save(usuario);
      mecanico.usuario = usuario;
    }

    // =========================
    // GUARDAR MECÁNICO
    // =========================
    await queryRunner.manager.save(Mecanico, mecanico);
    await queryRunner.commitTransaction();

    return await this.mecanicoRepo.findOne({
      where: { id },
      relations: ['usuario'],
    });

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

  async remove(id: number) {
    const mecanico = await this.findOne(id);
    return await this.mecanicoRepo.remove(mecanico);
  }

  async toggleStatus(id: number) {
    const mecanico = await this.findOne(id);
    mecanico.activo = !mecanico.activo;
    
    // También actualizar estado del usuario si existe
    if (mecanico.usuario) {
      await this.usuariosService.update(mecanico.usuario.id, { 
        activo: mecanico.activo 
      });
    }
    
    return await this.mecanicoRepo.save(mecanico);
  }

  async getStats() {
    const total = await this.mecanicoRepo.count();
    const activos = await this.mecanicoRepo.count({ where: { activo: true } });
    const inactivos = total - activos;
    
    const especialidades = await this.mecanicoRepo
      .createQueryBuilder('m')
      .select('m.especialidad', 'especialidad')
      .addSelect('COUNT(*)', 'total')
      .where('m.especialidad IS NOT NULL')
      .groupBy('m.especialidad')
      .orderBy('total', 'DESC')
      .getRawMany();
    
    return {
      total,
      activos,
      inactivos,
      especialidades
    };
  }
}