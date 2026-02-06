// src/servicios/servicios.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicio } from './servicios.entity';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';

@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(Servicio)
    private servicioRepository: Repository<Servicio>,
  ) {}

  // Crear un nuevo servicio
  async create(createServicioDto: CreateServicioDto): Promise<Servicio> {
    // Verificar si ya existe un servicio con el mismo nombre
    const existingService = await this.servicioRepository.findOne({
      where: { nombre: createServicioDto.nombre },
      withDeleted: true,
    });

    if (existingService) {
      throw new ConflictException(`Ya existe un servicio con el nombre: ${createServicioDto.nombre}`);
    }

    const servicio = this.servicioRepository.create(createServicioDto);
    return await this.servicioRepository.save(servicio);
  }

  // Obtener todos los servicios (activos por defecto)
  async findAll(includeInactive: boolean = false): Promise<Servicio[]> {
    if (includeInactive) {
      return await this.servicioRepository.find({
        order: { nombre: 'ASC' },
      });
    }
    
    return await this.servicioRepository.find({
      where: { esActivo: true },
      order: { nombre: 'ASC' },
    });
  }

  // Obtener servicios paginados
  async findPaginated(page: number = 1, limit: number = 10, includeInactive: boolean = false): Promise<{ data: Servicio[]; total: number; page: number; limit: number }> {
    const where = includeInactive ? {} : { esActivo: true };
    
    const [data, total] = await this.servicioRepository.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // Buscar servicios por término
  async search(term: string): Promise<Servicio[]> {
    return await this.servicioRepository
      .createQueryBuilder('servicio')
      .where('servicio.nombre ILIKE :term', { term: `%${term}%` })
      .orWhere('servicio.descripcion ILIKE :term', { term: `%${term}%` })
      .orWhere('servicio.categoria ILIKE :term', { term: `%${term}%` })
      .andWhere('servicio.esActivo = :active', { active: true })
      .orderBy('servicio.nombre', 'ASC')
      .getMany();
  }

  // Obtener un servicio por ID
  async findOne(id: number): Promise<Servicio> {
    const servicio = await this.servicioRepository.findOne({ where: { id } });
    
    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    
    return servicio;
  }

  // Actualizar un servicio
  async update(id: number, updateServicioDto: UpdateServicioDto): Promise<Servicio> {
    const servicio = await this.findOne(id);
    
    // Verificar si el nuevo nombre ya existe (excluyendo el actual)
    if (updateServicioDto.nombre && updateServicioDto.nombre !== servicio.nombre) {
      const existingService = await this.servicioRepository.findOne({
        where: { nombre: updateServicioDto.nombre },
      });
      
      if (existingService) {
        throw new ConflictException(`Ya existe un servicio con el nombre: ${updateServicioDto.nombre}`);
      }
    }
    
    Object.assign(servicio, updateServicioDto);
    return await this.servicioRepository.save(servicio);
  }

  // Eliminar un servicio (soft delete)
  async remove(id: number): Promise<void> {
    const result = await this.servicioRepository.softDelete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
  }

  // Restaurar un servicio eliminado
  async restore(id: number): Promise<Servicio> {
    const result = await this.servicioRepository.restore(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado o no está eliminado`);
    }
    
    return await this.findOne(id);
  }

  // Obtener servicios por categoría
  async findByCategoria(categoria: string): Promise<Servicio[]> {
    return await this.servicioRepository.find({
      where: { 
        categoria,
        esActivo: true,
      },
      order: { nombre: 'ASC' },
    });
  }

  // Obtener servicios que requieren repuestos
  async findRequireRepuestos(): Promise<Servicio[]> {
    return await this.servicioRepository.find({
      where: { 
        requiereRepuestos: true,
        esActivo: true,
      },
      order: { nombre: 'ASC' },
    });
  }

  // Actualizar estado activo/inactivo
  async toggleActivo(id: number): Promise<Servicio> {
    const servicio = await this.findOne(id);
    servicio.esActivo = !servicio.esActivo;
    return await this.servicioRepository.save(servicio);
  }
}