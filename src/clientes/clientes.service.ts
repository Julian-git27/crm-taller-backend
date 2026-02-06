import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cliente } from './clientes.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
  ) {}

  async create(dto: CreateClienteDto) {
    try {
      // Verificar si ya existe un cliente con la misma identificación
      if (dto.identificacion) {
        const existente = await this.clienteRepo.findOne({
          where: { identificacion: dto.identificacion }
        });
        
        if (existente) {
          throw new BadRequestException('Ya existe un cliente con esta identificación');
        }
      }

      // Verificar si ya existe un cliente con el mismo email
      const existenteEmail = await this.clienteRepo.findOne({
        where: { email: dto.email }
      });
      
      if (existenteEmail) {
        throw new BadRequestException('Ya existe un cliente con este email');
      }

      const cliente = this.clienteRepo.create(dto);
      return await this.clienteRepo.save(cliente);
    } catch (error) {
      if (error.code === '23505') { // Violación de unique constraint
        if (error.detail?.includes('identificacion')) {
          throw new BadRequestException('Ya existe un cliente con esta identificación');
        }
        if (error.detail?.includes('email')) {
          throw new BadRequestException('Ya existe un cliente con este email');
        }
      }
      throw error;
    }
  }

  findAll() {
    return this.clienteRepo.find({
      order: { nombre: 'ASC' }
    });
  }

  async buscar(q?: string) {
    if (!q || q.trim() === '') {
      return this.findAll();
    }

    const query = `%${q.trim().toLowerCase()}%`;
    
    return this.clienteRepo
      .createQueryBuilder('cliente')
      .where('LOWER(cliente.nombre) LIKE :query', { query })
      .orWhere('LOWER(cliente.identificacion) LIKE :query', { query })
      .orWhere('LOWER(cliente.email) LIKE :query', { query })
      .orWhere('LOWER(cliente.telefono) LIKE :query', { query })
      .orWhere('LOWER(cliente.telefono2) LIKE :query', { query })
      .orWhere('LOWER(cliente.municipio) LIKE :query', { query })
      .orderBy('cliente.nombre', 'ASC')
      .getMany();
  }

  async findOne(id: number) {
    const cliente = await this.clienteRepo.findOneBy({ id });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  async update(id: number, dto: UpdateClienteDto) {
    const cliente = await this.findOne(id);
    
    // Verificar si la nueva identificación ya existe
    if (dto.identificacion && dto.identificacion !== cliente.identificacion) {
      const existente = await this.clienteRepo.findOne({
        where: { identificacion: dto.identificacion }
      });
      
      if (existente && existente.id !== id) {
        throw new BadRequestException('Ya existe otro cliente con esta identificación');
      }
    }
    
    // Verificar si el nuevo email ya existe
    if (dto.email && dto.email !== cliente.email) {
      const existente = await this.clienteRepo.findOne({
        where: { email: dto.email }
      });
      
      if (existente && existente.id !== id) {
        throw new BadRequestException('Ya existe otro cliente con este email');
      }
    }
    
    Object.assign(cliente, dto);
    return this.clienteRepo.save(cliente);
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    return this.clienteRepo.remove(cliente);
  }
}