import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Producto } from './productos.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
  ) {}

  async create(dto: CreateProductoDto) {
    try {
      // Verificar si ya existe un producto con la misma referencia (si se proporciona)
      if (dto.referencia) {
        const existentePorRef = await this.productoRepo.findOne({
          where: { referencia: dto.referencia }
        });

        if (existentePorRef) {
          throw new BadRequestException('Ya existe un producto con esta referencia');
        }
      }

      const producto = this.productoRepo.create({
        nombre: dto.nombre,
        referencia: dto.referencia || null,
        categoria: dto.categoria || null,
        precio: Number(dto.precio),
        stock: Number(dto.stock) || 0,
        stock_minimo: dto.stock_minimo || 5,
      });
      
      return await this.productoRepo.save(producto);
    } catch (error) {
      if (error.code === '23505') { // Violación de unique constraint
        if (error.detail?.includes('referencia')) {
          throw new BadRequestException('Ya existe un producto con esta referencia');
        }
        throw new BadRequestException('Ya existe un producto con este nombre');
      }
      throw error;
    }
  }

  async findAll() {
    return await this.productoRepo.find({
      order: { nombre: 'ASC' }
    });
  }

  async findDisponibles() {
    return await this.productoRepo.find({
      where: { 
        stock: MoreThan(0) 
      },
      order: { nombre: 'ASC' }
    });
  }

  async findOne(id: number) {
    const producto = await this.productoRepo.findOne({
      where: { id }
    });
    
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    
    return producto;
  }

  async update(id: number, dto: UpdateProductoDto) {
    const producto = await this.findOne(id);
    
    // Verificar si la nueva referencia ya existe (excepto para este mismo producto)
    if (dto.referencia && dto.referencia !== producto.referencia) {
      const existentePorRef = await this.productoRepo.findOne({
        where: { referencia: dto.referencia }
      });
      
      if (existentePorRef && existentePorRef.id !== id) {
        throw new BadRequestException('Ya existe otro producto con esta referencia');
      }
    }
    
    // Actualizar solo los campos que vienen en el DTO
    if (dto.nombre !== undefined) producto.nombre = dto.nombre;
    if (dto.referencia !== undefined) producto.referencia = dto.referencia;
    if (dto.categoria !== undefined) producto.categoria = dto.categoria;
    if (dto.precio !== undefined) producto.precio = Number(dto.precio);
    if (dto.stock !== undefined) producto.stock = Number(dto.stock);
    if (dto.stock_minimo !== undefined) producto.stock_minimo = Number(dto.stock_minimo);
    
    return await this.productoRepo.save(producto);
  }

  async remove(id: number) {
    const producto = await this.findOne(id);
    
    // Verificar si el producto está siendo usado en órdenes
    const usadoEnOrdenes = await this.productoRepo
      .createQueryBuilder('producto')
      .innerJoin('orden_detalle', 'detalle', 'detalle."productoId" = producto.id')
      .where('producto.id = :id', { id })
      .getCount();
    
    if (usadoEnOrdenes > 0) {
      throw new BadRequestException(
        `No se puede eliminar el producto porque está siendo usado en ${usadoEnOrdenes} órdenes.`
      );
    }
    
    return await this.productoRepo.remove(producto);
  }

  // Método adicional para aumentar stock
  async aumentarStock(id: number, cantidad: number) {
    const producto = await this.findOne(id);
    producto.stock += cantidad;
    return await this.productoRepo.save(producto);
  }

  // Método adicional para reducir stock
  async reducirStock(id: number, cantidad: number) {
    const producto = await this.findOne(id);
    
    if (producto.stock < cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }
    
    producto.stock -= cantidad;
    return await this.productoRepo.save(producto);
  }

  // Método para obtener productos con bajo stock
  async getBajoStock() {
    return await this.productoRepo
      .createQueryBuilder('producto')
      .where('producto.stock <= producto.stock_minimo')
      .orderBy('producto.stock', 'ASC')
      .getMany();
  }
}