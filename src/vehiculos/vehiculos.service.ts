import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './vehiculos.entity';
import { Cliente } from '../clientes/clientes.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private vehiculoRepo: Repository<Vehiculo>,

    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,
  ) {}

  async create(dto: CreateVehiculoDto) {
    // Verificar si la placa ya existe
    const placaExistente = await this.vehiculoRepo.findOne({
      where: { placa: dto.placa.toUpperCase() }
    });
    
    if (placaExistente) {
      throw new BadRequestException('Ya existe un vehículo con esta placa');
    }

    const cliente = await this.clienteRepo.findOneBy({
      id: dto.clienteId,
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no existe');
    }

    const vehiculo = this.vehiculoRepo.create({
      placa: dto.placa.toUpperCase(),
      marca: dto.marca,
      modelo: dto.modelo,
      anio: dto.anio ?? null,
      cilindraje: dto.cilindraje ?? null,
      color: dto.color ?? null,
      kilometraje: dto.kilometraje ?? 0,
      fecha_vencimiento_soat: dto.fecha_vencimiento_soat ? new Date(dto.fecha_vencimiento_soat) : null,
      fecha_vencimiento_tecnomecanica: dto.fecha_vencimiento_tecnomecanica ? new Date(dto.fecha_vencimiento_tecnomecanica) : null,
      cliente,
    });

    return this.vehiculoRepo.save(vehiculo);
  }

  findAll() {
    return this.vehiculoRepo.find({
      where: { activo: true },
      relations: ['cliente'],
      order: { placa: 'ASC' }
    });
  }

  // Método para obtener vehículos con SOAT próximo a vencer (opcional)
  async findVehiculosSoatPorVencer(diasAnticipacion: number = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
    
    return this.vehiculoRepo
      .createQueryBuilder('vehiculo')
      .leftJoinAndSelect('vehiculo.cliente', 'cliente')
      .where('vehiculo.activo = :activo', { activo: true })
      .andWhere('vehiculo.fecha_vencimiento_soat IS NOT NULL')
      .andWhere('vehiculo.fecha_vencimiento_soat <= :fechaLimite', { fechaLimite })
      .orderBy('vehiculo.fecha_vencimiento_soat', 'ASC')
      .getMany();
  }

  // Método para obtener vehículos con Tecnomecánica próxima a vencer (opcional)
  async findVehiculosTecnoPorVencer(diasAnticipacion: number = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
    
    return this.vehiculoRepo
      .createQueryBuilder('vehiculo')
      .leftJoinAndSelect('vehiculo.cliente', 'cliente')
      .where('vehiculo.activo = :activo', { activo: true })
      .andWhere('vehiculo.fecha_vencimiento_tecnomecanica IS NOT NULL')
      .andWhere('vehiculo.fecha_vencimiento_tecnomecanica <= :fechaLimite', { fechaLimite })
      .orderBy('vehiculo.fecha_vencimiento_tecnomecanica', 'ASC')
      .getMany();
  }

  async findByCliente(clienteId: number) {
    return this.vehiculoRepo.find({
      where: { 
        cliente: { id: clienteId },
        activo: true 
      },
      relations: ['cliente'],
      order: { placa: 'ASC' }
    });
  }

  async findOne(id: number) {
    const vehiculo = await this.vehiculoRepo.findOne({
      where: { id },
      relations: ['cliente']
    });
    if (!vehiculo) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehiculo;
  }

  async update(id: number, dto: UpdateVehiculoDto) {
    const vehiculo = await this.findOne(id);
    
    // Verificar si la nueva placa ya existe (excepto para este mismo vehículo)
    if (dto.placa && dto.placa.toUpperCase() !== vehiculo.placa) {
      const placaExistente = await this.vehiculoRepo.findOne({
        where: { placa: dto.placa.toUpperCase() }
      });
      
      if (placaExistente && placaExistente.id !== id) {
        throw new BadRequestException('Ya existe otro vehículo con esta placa');
      }
    }
    
    // Actualizar cliente si se proporciona
    if (dto.clienteId && dto.clienteId !== vehiculo.cliente.id) {
      const cliente = await this.clienteRepo.findOneBy({
        id: dto.clienteId,
      });
      
      if (!cliente) {
        throw new NotFoundException('Cliente no existe');
      }
      
      vehiculo.cliente = cliente;
    }
    
    // Actualizar otros campos
    if (dto.placa !== undefined) vehiculo.placa = dto.placa.toUpperCase();
    if (dto.marca !== undefined) vehiculo.marca = dto.marca;
    if (dto.modelo !== undefined) vehiculo.modelo = dto.modelo;
    if (dto.anio !== undefined) vehiculo.anio = dto.anio;
    if (dto.cilindraje !== undefined) vehiculo.cilindraje = dto.cilindraje;
    if (dto.color !== undefined) vehiculo.color = dto.color;
    if (dto.kilometraje !== undefined) vehiculo.kilometraje = dto.kilometraje;
    if (dto.fecha_vencimiento_soat !== undefined) {
      vehiculo.fecha_vencimiento_soat = dto.fecha_vencimiento_soat ? new Date(dto.fecha_vencimiento_soat) : null;
    }
    if (dto.fecha_vencimiento_tecnomecanica !== undefined) {
      vehiculo.fecha_vencimiento_tecnomecanica = dto.fecha_vencimiento_tecnomecanica ? new Date(dto.fecha_vencimiento_tecnomecanica) : null;
    }
    
    return this.vehiculoRepo.save(vehiculo);
  }

  async remove(id: number) {
    const vehiculo = await this.findOne(id);
    vehiculo.activo = false;
    return this.vehiculoRepo.save(vehiculo);
  }
}