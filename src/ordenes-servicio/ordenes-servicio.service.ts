import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OrdenServicio, EstadoOrden } from './orden-servicio.entity';
import { OrdenDetalle, TipoDetalle } from './orden-detalle.entity';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity';
import { CreateOrdenDto, OrdenDetalleDto } from './dto/create-orden.dto';
import { AddDetalleDto } from './dto/add-detalle.dto';
import * as bcrypt from 'bcrypt';
import { Usuario, RolUsuario } from '../usuarios/usuarios.entity';
import { UsuariosService } from 'src/usuarios/usuarios.service';



@Injectable()
export class OrdenesServicioService {
  constructor(
    @InjectRepository(OrdenServicio)
    private ordenRepo: Repository<OrdenServicio>,

    @InjectRepository(OrdenDetalle)
    private detalleRepo: Repository<OrdenDetalle>,

    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,

    @InjectRepository(Vehiculo)
    private vehiculoRepo: Repository<Vehiculo>,

    @InjectRepository(Mecanico)
    private mecanicoRepo: Repository<Mecanico>,

    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,
    private usuariosService: UsuariosService,
    @InjectRepository(Servicio)
    private servicioRepo: Repository<Servicio>,

     
  ) {}

  /* =========================
     CREAR ORDEN CON DETALLES
  ========================= */
  async create(dto: CreateOrdenDto) {
    const cliente = await this.clienteRepo.findOneBy({ id: dto.clienteId });
    const vehiculo = await this.vehiculoRepo.findOneBy({ id: dto.vehiculoId });
    const mecanico = await this.mecanicoRepo.findOneBy({ id: dto.mecanicoId });

    if (!cliente || !vehiculo || !mecanico) {
      throw new NotFoundException('Cliente, vehículo o mecánico no existe');
    }

    const orden = this.ordenRepo.create({
      cliente,
      vehiculo,
      mecanico,
      observaciones: dto.observaciones,
      total: 0,
    });

    const ordenGuardada = await this.ordenRepo.save(orden);

    // Si vienen detalles en la creación, procesarlos
   return await this.findOne(ordenGuardada.id);
  }

  
  /* =========================
     LISTAR ÓRDENES
  ========================= */
  async findAll() {
    return this.ordenRepo.find({
      relations: ['detalles', 'detalles.producto', 'detalles.servicio'],
      order: { fecha_ingreso: 'DESC' },
    });
  }

  /* =========================
     OBTENER UNA ORDEN
  ========================= */
  async findOne(id: number) {
  // Usar query builder con cache: false
  const orden = await this.ordenRepo
    .createQueryBuilder('orden')
    .leftJoinAndSelect('orden.cliente', 'cliente')
    .leftJoinAndSelect('orden.vehiculo', 'vehiculo')
    .leftJoinAndSelect('orden.mecanico', 'mecanico')
    .leftJoinAndSelect('orden.detalles', 'detalles')
    .leftJoinAndSelect('detalles.producto', 'producto')
    .leftJoinAndSelect('detalles.servicio', 'servicio')
    .where('orden.id = :id', { id })
    .cache(false) // ⬅️ IMPORTANTE: Desactivar cache
    .getOne();

  if (!orden) {
    throw new NotFoundException('Orden no encontrada');
  }

  // Recalcular total por si acaso
  const total = orden.detalles.reduce(
    (sum, d) => sum + (Number(d.cantidad) * Number(d.precio_unitario)),
    0
  );
  
  orden.total = total;
  
  return orden;
}

/* =========================
   AGREGAR DETALLE (PRODUCTO / SERVICIO) - VERSIÓN CORREGIDA
========================= */
async addDetalle(ordenId: number, dto: AddDetalleDto) {
  const orden = await this.ordenRepo.findOne({
    where: { id: ordenId },
  });

  if (!orden) {
    throw new NotFoundException('Orden no encontrada');
  }

  let producto: Producto | null = null;
  let servicio: Servicio | null = null;
  let tipo: TipoDetalle = TipoDetalle.OTRO;

  // Manejar producto
  if (dto.productoId) {
    producto = await this.productoRepo.findOneBy({ id: dto.productoId });
    if (!producto) throw new NotFoundException('Producto no existe');
    tipo = TipoDetalle.PRODUCTO;

    if (producto.stock < dto.cantidad) {
      throw new BadRequestException('Stock insuficiente');
    }

    producto.stock -= dto.cantidad;
    await this.productoRepo.save(producto);
  }

  // Manejar servicio
  if (dto.servicioId) {
    servicio = await this.servicioRepo.findOneBy({ id: dto.servicioId });
    if (!servicio) throw new NotFoundException('Servicio no existe');
    tipo = TipoDetalle.SERVICIO;

    if (!servicio.esActivo) {
      throw new BadRequestException(`El servicio ${servicio.nombre} no está activo`);
    }
  }

  // Mapear tipo del DTO
  if (dto.tipo) {
    if (dto.tipo === 'PRODUCTO') tipo = TipoDetalle.PRODUCTO;
    else if (dto.tipo === 'SERVICIO') tipo = TipoDetalle.SERVICIO;
    else if (dto.tipo === 'OTRO') tipo = TipoDetalle.OTRO;
  }

  const detalle = this.detalleRepo.create({
    orden,
    producto,
    servicio,
    descripcion: dto.descripcion,
    cantidad: dto.cantidad,
    precio_unitario: dto.precio_unitario,
    tipo,
  });

  await this.detalleRepo.save(detalle);

  // ✅ Calcular el subtotal de este detalle y sumarlo al total
  const subtotal = dto.cantidad * dto.precio_unitario;
  orden.total = Number(orden.total) + subtotal;
  await this.ordenRepo.save(orden);

  return detalle;
}
/* =========================
   RECALCULAR TOTAL (FUNCIÓN AUXILIAR MEJORADA)
========================= */
private async recalcularTotal(ordenId: number) {
  const detalles = await this.detalleRepo.find({
    where: { orden: { id: ordenId } },
  });

  const total = detalles.reduce(
    (sum, d) => sum + (Number(d.cantidad) * Number(d.precio_unitario)),
    0,
  );

  await this.ordenRepo.update(ordenId, { total });
}

  /* =========================
     LIMPIAR DETALLES
  ========================= */
  async clearDetalles(id: number) {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Reponer stock de productos antes de eliminar
    for (const detalle of orden.detalles) {
      if (detalle.producto) {
        const producto = await this.productoRepo.findOneBy({ 
          id: detalle.producto.id 
        });
        if (producto) {
          producto.stock += detalle.cantidad;
          await this.productoRepo.save(producto);
        }
      }
    }

    await this.detalleRepo.delete({ orden: { id } });

    orden.total = 0;
    return this.ordenRepo.save(orden);
  }
a// ordenes-servicio.service.ts - CORRIGE forceRefresh:

async forceRefresh(id: number) {
  console.log('💥 FORCE REFRESH para orden', id);
  
  const connection = this.ordenRepo.manager.connection;
  
  try {
    // 1. Limpiar cache de TypeORM si existe
    if (connection.queryResultCache) {
      console.log('🧹 Limpiando cache de TypeORM...');
      await connection.queryResultCache.clear();
    }
    
    // 2. Obtener detalles directamente - PostgreSQL NO tiene RESET QUERY CACHE
    console.log('📊 Obteniendo detalles actuales...');
    const detallesResult = await connection.query(
      'SELECT * FROM orden_detalle WHERE "ordenId" = $1',
      [id]
    );
    
    // 3. Recalcular total
    console.log('🧮 Recalculando total...');
    const total = detallesResult.reduce((sum: number, d: any) => 
      sum + (Number(d.cantidad) * Number(d.precio_unitario)), 0
    );
    
    // 4. Actualizar si es necesario
    console.log('💾 Actualizando total en DB...');
    await connection.query(
      'UPDATE ordenes_servicio SET total = $1 WHERE id = $2',
      [total, id]
    );
    
    // 5. Obtener datos actualizados
    console.log('🔄 Obteniendo datos finales...');
    const [ordenActualizada] = await connection.query(
      'SELECT total FROM ordenes_servicio WHERE id = $1',
      [id]
    );
    
    return {
      success: true,
      message: 'Force refresh completado',
      detalles_count: detallesResult.length,
      total_calculado: total,
      total_actualizado: ordenActualizada?.total || 0
    };
    
  } catch (error) {
    console.error('❌ Error en forceRefresh:', error);
    return {
      success: false,
      message: 'Error en forceRefresh',
      error: error.message
    };
  }
}
async findByMecanico(mecanicoId: number) {
  return this.ordenRepo.find({
    where: {
      mecanico: { id: mecanicoId },
    },
    relations: ['cliente', 'vehiculo', 'detalles', 'detalles.producto', 'detalles.servicio'],
    order: { fecha_ingreso: 'DESC' },
  });
}
// CORRIGE emergencyCheck:

async emergencyCheck(id: number) {
  console.log('🚨 EMERGENCY CHECK para orden', id);
  
  const connection = this.ordenRepo.manager.connection;
  
  try {
    // Datos directos de DB
    console.log('📊 Obteniendo datos directos de DB...');
    
    // 1. Contar detalles
    const detallesCountResult = await connection.query(
      'SELECT COUNT(*) as count FROM orden_detalle WHERE "ordenId" = $1',
      [id]
    );
    const detallesCount = detallesCountResult[0]?.count || 0;
    
    // 2. Obtener detalles con información de productos/servicios
    const detallesResult = await connection.query(
      `SELECT od.*, 
              p.nombre as producto_nombre, p.precio as producto_precio,
              s.nombre as servicio_nombre, s.precio as servicio_precio
       FROM orden_detalle od
       LEFT JOIN productos p ON od."productoId" = p.id
       LEFT JOIN servicios s ON od."servicioId" = s.id
       WHERE od."ordenId" = $1`,
      [id]
    );
    
    // 3. Obtener total de la orden
    const ordenResult = await connection.query(
      'SELECT total FROM ordenes_servicio WHERE id = $1',
      [id]
    );
    const ordenTotal = ordenResult[0]?.total || 0;
    
    // 4. Obtener datos vía servicio normal (con cache desactivado)
    console.log('🔍 Obteniendo datos vía servicio...');
    const serviceData = await this.ordenRepo
      .createQueryBuilder('orden')
      .leftJoinAndSelect('orden.detalles', 'detalles')
      .leftJoinAndSelect('detalles.producto', 'producto')
      .leftJoinAndSelect('detalles.servicio', 'servicio')
      .where('orden.id = :id', { id })
      .cache(false)
      .getOne();
    
    return {
      success: true,
      db_check: {
        detalles_count: Number(detallesCount),
        total_in_db: Number(ordenTotal),
        detalles_in_db: detallesResult.map(d => ({
          id: d.id,
          descripcion: d.descripcion,
          cantidad: Number(d.cantidad),
          precio_unitario: Number(d.precio_unitario),
          tipo: d.tipo,
          productoId: d.productoId,
          servicioId: d.servicioId,
          producto_nombre: d.producto_nombre,
          servicio_nombre: d.servicio_nombre
        }))
      },
      service_check: {
        detalles_count: serviceData?.detalles?.length || 0,
        total_in_service: serviceData?.total || 0,
        detalles_in_service: serviceData?.detalles?.map(d => ({
          id: d.id,
          descripcion: d.descripcion,
          tipo: d.tipo,
          productoId: d.producto?.id,
          servicioId: d.servicio?.id
        })) || []
      },
      status: detallesCount === serviceData?.detalles?.length ? '✅ CONSISTENTE' : '⚠️ INCONSISTENTE'
    };
    
  } catch (error) {
    console.error('❌ Error en emergencyCheck:', error);
    return {
      success: false,
      message: 'Error en emergencyCheck',
      error: error.message
    };
  }
}
  /* =========================
     ACTUALIZAR ORDEN (DATOS BÁSICOS)
  ========================= */
  async update(id: number, dto: CreateOrdenDto) {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    const cliente = await this.clienteRepo.findOneBy({ id: dto.clienteId });
    const vehiculo = await this.vehiculoRepo.findOneBy({ id: dto.vehiculoId });
    const mecanico = await this.mecanicoRepo.findOneBy({ id: dto.mecanicoId });

    if (!cliente || !vehiculo || !mecanico) {
      throw new NotFoundException('Cliente, vehículo o mecánico no existe');
    }

    orden.cliente = cliente;
    orden.vehiculo = vehiculo;
    orden.mecanico = mecanico;
    orden.observaciones = dto.observaciones ?? null;

    return this.ordenRepo.save(orden);
  }

// ordenes-servicio.service.ts - AÑADE logging detallado en updateDetalles:

async updateDetalles(ordenId: number, nuevosDetalles: AddDetalleDto[]) {
  console.log(`🔄 Actualizando ${nuevosDetalles.length} detalles para orden #${ordenId}`);
  
  const connection = this.ordenRepo.manager.connection;
  
  // 1. Eliminar detalles existentes
  await connection.query('DELETE FROM orden_detalle WHERE "ordenId" = $1', [ordenId]);
  
  // 2. Insertar nuevos detalles
  let totalOrden = 0;
  
  for (const dto of nuevosDetalles) {
    const query = `
      INSERT INTO orden_detalle 
      ("ordenId", descripcion, cantidad, precio_unitario, tipo, "productoId", "servicioId") 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const params = [
      ordenId,
      dto.descripcion,
      dto.cantidad,
      dto.precio_unitario,
      dto.tipo || 'OTRO',
      dto.productoId || null,
      dto.servicioId || null
    ];
    
    await connection.query(query, params);
    totalOrden += dto.cantidad * dto.precio_unitario;
  }

  // 3. Actualizar total
  await connection.query(
    'UPDATE ordenes_servicio SET total = $1 WHERE id = $2',
    [totalOrden, ordenId]
  );

  // 4. Limpiar cache
  if (connection.queryResultCache) {
    await connection.queryResultCache.clear();
  }
  
  // 5. Retornar datos frescos
  return await this.findOne(ordenId);
}

// REEMPLAZA getOrdenWithRawQuery con esta versión para PostgreSQL:

private async getOrdenWithRawQuery(ordenId: number) {
  const connection = this.ordenRepo.manager.connection;
  
  // Obtener orden básica
  const ordenResult = await connection.query(
    `SELECT os.*, 
            c.id as cliente_id, c.nombre as cliente_nombre, c.identificacion as cliente_identificacion,
            v.id as vehiculo_id, v.placa as vehiculo_placa, v.marca as vehiculo_marca, v.modelo as vehiculo_modelo,
            m.id as mecanico_id, m.nombre as mecanico_nombre
     FROM ordenes_servicio os
     LEFT JOIN clientes c ON os."clienteId" = c.id
     LEFT JOIN vehiculos v ON os."vehiculoId" = v.id
     LEFT JOIN mecanicos m ON os."mecanicoId" = m.id
     WHERE os.id = $1`,
    [ordenId]
  );

  const orden = ordenResult[0];
  if (!orden) {
    throw new NotFoundException('Orden no encontrada');
  }

  // Obtener detalles
  const detallesResult = await connection.query(
    `SELECT od.*, 
            p.id as producto_id, p.nombre as producto_nombre, p.precio as producto_precio,
            s.id as servicio_id, s.nombre as servicio_nombre, s.precio as servicio_precio
     FROM orden_detalle od
     LEFT JOIN productos p ON od."productoId" = p.id
     LEFT JOIN servicios s ON od."servicioId" = s.id
     WHERE od."ordenId" = $1`,
    [ordenId]
  );

  // Formatear respuesta
  return {
    id: orden.id,
    estado: orden.estado,
    total: Number(orden.total),
    observaciones: orden.observaciones,
    fecha_ingreso: orden.fecha_ingreso,
    cliente: {
      id: orden.cliente_id,
      nombre: orden.cliente_nombre,
      identificacion: orden.cliente_identificacion,
    },
    vehiculo: {
      id: orden.vehiculo_id,
      placa: orden.vehiculo_placa,
      marca: orden.vehiculo_marca,
      modelo: orden.vehiculo_modelo,
    },
    mecanico: {
      id: orden.mecanico_id,
      nombre: orden.mecanico_nombre,
    },
    detalles: detallesResult.map(d => ({
      id: d.id,
      descripcion: d.descripcion,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      tipo: d.tipo,
      producto: d.producto_id ? {
        id: d.producto_id,
        nombre: d.producto_nombre,
        precio: Number(d.producto_precio),
      } : null,
      servicio: d.servicio_id ? {
        id: d.servicio_id,
        nombre: d.servicio_nombre,
        precio: Number(d.servicio_precio),
      } : null,
    })),
  };
}
async updateDetallesMecanico(
  ordenId: number,
  mecanicoId: number,
  nuevosDetalles: AddDetalleDto[],
) {
  const orden = await this.ordenRepo.findOne({
    where: { id: ordenId },
    relations: ['mecanico', 'detalles'],
  });

  if (!orden) throw new NotFoundException('Orden no encontrada');

  // 🔐 Seguridad - verificar que la orden pertenece al mecánico
  if (orden.mecanico.id !== mecanicoId) {
    throw new ForbiddenException('Esta orden no te pertenece');
  }

  // 🔒 Verificar que no se estén agregando servicios
  for (const dto of nuevosDetalles) {
    if (dto.servicioId) {
      throw new ForbiddenException('No puedes agregar servicios');
    }
    
    // Si es un producto existente, verificar que no se modifique el precio
    if (dto.productoId && dto.precio_unitario !== undefined) {
      // Buscar el producto en la base de datos para verificar precio
      const producto = await this.productoRepo.findOneBy({ id: dto.productoId });
      if (producto && dto.precio_unitario !== producto.precio) {
        throw new ForbiddenException('No puedes modificar precios de productos');
      }
    }
  }

  // 1. Eliminar todos los detalles actuales
  await this.detalleRepo.delete({ orden: { id: ordenId } });

  // 2. Crear y guardar todos los nuevos detalles
  const detallesACrear = [];
  
  for (const dto of nuevosDetalles) {
    let producto = null;
    let servicio = null;
    let tipo = TipoDetalle.OTRO;
    let precioFinal = dto.precio_unitario;
    let descripcionFinal = dto.descripcion;

    // Si es un producto, obtener información actualizada
    if (dto.productoId) {
      producto = await this.productoRepo.findOneBy({ id: dto.productoId });
      if (!producto) throw new NotFoundException(`Producto ${dto.productoId} no existe`);

      // Verificar stock para productos nuevos o con cantidad incrementada
      const detalleExistente = orden.detalles.find(d => 
        d.producto?.id === dto.productoId
      );
      
      const cantidadAnterior = detalleExistente?.cantidad || 0;
      const incrementoStock = dto.cantidad - cantidadAnterior;
      
      if (incrementoStock > 0 && producto.stock < incrementoStock) {
        throw new BadRequestException(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`);
      }

      // Actualizar stock solo si es incremento
      if (incrementoStock > 0) {
        producto.stock -= incrementoStock;
        await this.productoRepo.save(producto);
      } else if (incrementoStock < 0) {
        // Si se reduce la cantidad, reponer stock
        producto.stock += Math.abs(incrementoStock);
        await this.productoRepo.save(producto);
      }

      tipo = TipoDetalle.PRODUCTO;
      precioFinal = producto.precio; // Siempre usar precio del catálogo
      descripcionFinal = producto.nombre;
    } 
    // Si es un servicio existente (solo mantenerlo, no crear nuevos)
    else if (dto.servicioId) {
      // Verificar que es un servicio existente en la orden original
      const servicioExistente = orden.detalles.find(d => 
        d.servicio?.id === dto.servicioId
      );
      
      if (!servicioExistente) {
        throw new ForbiddenException('No puedes agregar nuevos servicios');
      }
      
      servicio = await this.servicioRepo.findOneBy({ id: dto.servicioId });
      tipo = TipoDetalle.SERVICIO;
      precioFinal = servicio?.precio || dto.precio_unitario;
      descripcionFinal = servicio?.nombre || dto.descripcion;
    }
    // Si es OTRO, mantener como está (mano de obra, etc.)
    else {
      tipo = TipoDetalle.OTRO;
    }

    const detalle = this.detalleRepo.create({
      orden,
      producto,
      servicio,
      descripcion: descripcionFinal,
      cantidad: dto.cantidad,
      precio_unitario: precioFinal,
      tipo,
    });

    detallesACrear.push(detalle);
  }

  // Guardar todos los detalles
  const detallesGuardados = await this.detalleRepo.save(detallesACrear);

  // Recalcular total
  await this.recalcularTotal(ordenId);

  // Retornar orden actualizada
  return this.findOne(ordenId);
}
async removeWithAdminPassword(ordenId: number, adminPassword: string) {
  // 1️⃣ Buscar usuario admin
  const admin = await this.usuariosService.findByUsername('admin');

  if (!admin || admin.rol !== RolUsuario.VENDEDOR) {
    throw new ForbiddenException('Usuario administrador inválido');
  }

  // 2️⃣ Validar contraseña
  const isValid = await bcrypt.compare(adminPassword, admin.password);
  if (!isValid) {
    throw new ForbiddenException('Contraseña incorrecta');
  }

  // 3️⃣ Buscar orden
  const orden = await this.ordenRepo.findOne({
    where: { id: ordenId },
    relations: ['detalles', 'detalles.producto'],
  });

  if (!orden) {
    throw new NotFoundException('Orden no encontrada');
  }

  // 4️⃣ Reponer stock
  for (const detalle of orden.detalles) {
    if (detalle.producto) {
      detalle.producto.stock += detalle.cantidad;
      await this.productoRepo.save(detalle.producto);
    }
  }

  // 5️⃣ Eliminar
  await this.detalleRepo.remove(orden.detalles);
  await this.ordenRepo.remove(orden);

  return { success: true };
}

  /* =========================
     ACTUALIZAR ESTADO
  ========================= */
  async updateEstado(id: number, estado: EstadoOrden) {
    const orden = await this.ordenRepo.findOneBy({ id });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    orden.estado = estado;
    return this.ordenRepo.save(orden);
  }
async updateObservaciones(id: number, observaciones: string) {
  const orden = await this.ordenRepo.findOneBy({ id });
  if (!orden) throw new NotFoundException('Orden no encontrada');

  orden.observaciones = observaciones || null;
  return this.ordenRepo.save(orden);
}
  /* =========================
     ELIMINAR ORDEN
  ========================= */
  async remove(id: number) {
    const orden = await this.ordenRepo.findOne({
      where: { id },
      relations: ['detalles'],
    });

    if (!orden) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Reponer stock antes de eliminar
    for (const detalle of orden.detalles) {
      if (detalle.producto) {
        const producto = await this.productoRepo.findOneBy({ 
          id: detalle.producto.id 
        });
        if (producto) {
          producto.stock += detalle.cantidad;
          await this.productoRepo.save(producto);
        }
      }
    }

    await this.detalleRepo.remove(orden.detalles);
    return this.ordenRepo.remove(orden);
  }

  /* =========================
     NUEVO: OBTENER SERVICIOS DISPONIBLES
  ========================= */
  async getServiciosDisponibles() {
    return await this.servicioRepo.find({
      where: { esActivo: true },
      order: { nombre: 'ASC' },
    });
  }

  /* =========================
     NUEVO: OBTENER PRODUCTOS Y SERVICIOS DISPONIBLES
  ========================= */
  async getItemsDisponibles() {
    const [productos, servicios] = await Promise.all([
      this.productoRepo.find({
        where: { stock: MoreThan(0) },
        order: { nombre: 'ASC' },
      }),
      this.servicioRepo.find({
        where: { esActivo: true },
        order: { nombre: 'ASC' },
      }),
    ]);

    return {
      productos,
      servicios,
    };
  }
}
