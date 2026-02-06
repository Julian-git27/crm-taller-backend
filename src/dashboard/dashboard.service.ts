// src/dashboard/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Factura, EstadoPago } from '../facturas/facturas.entity';
import { OrdenServicio, EstadoOrden } from '../ordenes-servicio/orden-servicio.entity';
import { OrdenDetalle } from '../ordenes-servicio/orden-detalle.entity';
import { Producto } from '../productos/productos.entity';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Mecanico } from '../mecanicos/mecanicos.entity';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Factura)
    private facturaRepo: Repository<Factura>,

    @InjectRepository(OrdenServicio)
    private ordenRepo: Repository<OrdenServicio>,

    @InjectRepository(OrdenDetalle)
    private detalleRepo: Repository<OrdenDetalle>,

    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,

    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,

    @InjectRepository(Vehiculo)
    private vehiculoRepo: Repository<Vehiculo>,

    @InjectRepository(Mecanico)
    private mecanicoRepo: Repository<Mecanico>,
  ) {}

  // 🔧 NUEVO: Obtener dashboard completo con todos los KPIs
  async getDashboardCompleto(startDate?: string, endDate?: string) {
    try {
      const fechaInicio = startDate ? new Date(startDate) : null;
      const fechaFin = endDate ? new Date(endDate) : null;
      
      if (fechaInicio) fechaInicio.setHours(0, 0, 0, 0);
      if (fechaFin) fechaFin.setHours(23, 59, 59, 999);

      // 1. TOTAL RECAUDADO Y FACTURAS PAGADAS
      let whereFacturasPagadas: any = { estado_pago: EstadoPago.PAGADO };
      if (fechaInicio && fechaFin) {
        whereFacturasPagadas.fecha = Between(fechaInicio, fechaFin);
      }

      const facturasPagadas = await this.facturaRepo.find({
        where: whereFacturasPagadas,
        relations: ['orden', 'orden.cliente', 'orden.vehiculo', 'cliente']
      });

      const totalRecaudado = facturasPagadas.reduce((sum, factura) => 
        sum + Number(factura.total || 0), 0
      );
      const cantidadFacturasPagadas = facturasPagadas.length;

      // 2. TOTAL PENDIENTE POR RECAUDAR
      let whereFacturasPendientes: any = { estado_pago: EstadoPago.NO_PAGA };
      if (fechaInicio && fechaFin) {
        whereFacturasPendientes.fecha = Between(fechaInicio, fechaFin);
      }

      const facturasPendientes = await this.facturaRepo.find({
        where: whereFacturasPendientes
      });

      const totalPendiente = facturasPendientes.reduce((sum, factura) => 
        sum + Number(factura.total || 0), 0
      );

      // 3. TOTALES GENERALES (no dependen del intervalo)
      const totalClientes = await this.clienteRepo.count();
      const totalVehiculos = await this.vehiculoRepo.count();

      // 4. ORDENES DE SERVICIO EN EL INTERVALO
      let whereOrdenes: any = {};
      if (fechaInicio && fechaFin) {
        whereOrdenes.fecha_ingreso = Between(fechaInicio, fechaFin);
      }

      const ordenesIntervalo = await this.ordenRepo.find({
        where: whereOrdenes,
        relations: ['cliente', 'vehiculo', 'mecanico'],
        order: { fecha_ingreso: 'DESC' }
      });

      // 5. PRODUCTOS MÁS VENDIDOS EN EL INTERVALO
      const productosMasVendidos = await this.getProductosMasVendidosIntervalo(fechaInicio, fechaFin);

      // 6. CLIENTES CON MÁS PAGOS EN EL INTERVALO
      const clientesConMasPagos = await this.getClientesConMasPagos(fechaInicio, fechaFin);

      // 7. CLIENTES NUEVOS EN EL INTERVALO
      let whereClientesNuevos: any = {};
      if (fechaInicio && fechaFin) {
        whereClientesNuevos.created_at = Between(fechaInicio, fechaFin);
      }

      const clientesNuevos = await this.clienteRepo.find({
        where: whereClientesNuevos,
        order: { created_at: 'DESC' }
      });

      return {
        // KPIs Principales
        totalRecaudado,
        cantidadFacturasPagadas,
        totalPendiente,
        totalClientes,
        totalVehiculos,
        
        // Datos del intervalo
        ordenesIntervalo,
        productosMasVendidos,
        clientesConMasPagos,
        clientesNuevos,
        
        // Información adicional
        fechaInicio: fechaInicio ? fechaInicio.toISOString() : null,
        fechaFin: fechaFin ? fechaFin.toISOString() : null,
        totalFacturasPendientes: facturasPendientes.length,
        totalOrdenesIntervalo: ordenesIntervalo.length,
        totalClientesNuevos: clientesNuevos.length,
        
        // Para compatibilidad con el frontend existente
        totalVentas: totalRecaudado,
        ordenesActivas: await this.ordenRepo.count({ where: { estado: EstadoOrden.EN_PROCESO } }),
        ordenesCompletadas: await this.ordenRepo.count({ 
          where: [
            { estado: EstadoOrden.TERMINADA },
            { estado: EstadoOrden.FACTURADA }
          ] 
        }),
      };
    } catch (error) {
      this.logger.error('Error en getDashboardCompleto:', error);
      throw error;
    }
  }

  // 📦 PRODUCTOS MÁS VENDIDOS EN INTERVALO
  private async getProductosMasVendidosIntervalo(fechaInicio: Date | null, fechaFin: Date | null) {
    try {
      let query = this.detalleRepo
        .createQueryBuilder('d')
        .innerJoin('d.producto', 'p')
        .innerJoin('d.orden', 'o')
        .select('p.id', 'id')
        .addSelect('p.nombre', 'nombre')
        .addSelect('p.referencia', 'referencia')
        .addSelect('p.stock', 'stock_actual')
        .addSelect('SUM(d.cantidad)', 'cantidad_vendida')
        .addSelect('SUM(d.cantidad * d.precio_unitario)', 'total_vendido')
        .where('p.id IS NOT NULL')
        .groupBy('p.id, p.nombre, p.referencia, p.stock');

      if (fechaInicio && fechaFin) {
        query = query.andWhere('o.fecha_ingreso BETWEEN :start AND :end', {
          start: fechaInicio,
          end: fechaFin
        });
      }

      const resultados = await query
        .orderBy('cantidad_vendida', 'DESC')
        .limit(10)
        .getRawMany();

      return resultados.map(item => ({
        id: item.id,
        nombre: item.nombre,
        referencia: item.referencia || '-',
        cantidad_vendida: parseInt(item.cantidad_vendida) || 0,
        total_vendido: parseFloat(item.total_vendido) || 0,
        stock_actual: parseInt(item.stock_actual) || 0
      }));
    } catch (error) {
      this.logger.error('Error en getProductosMasVendidosIntervalo:', error);
      return [];
    }
  }

  // 👥 CLIENTES CON MÁS PAGOS EN INTERVALO
  private async getClientesConMasPagos(fechaInicio: Date | null, fechaFin: Date | null) {
    try {
      let query = this.facturaRepo
        .createQueryBuilder('f')
        .innerJoin('f.cliente', 'c')
        .select('c.id', 'cliente_id')
        .addSelect('c.nombre', 'nombre_cliente')
        .addSelect('c.identificacion', 'identificacion')
        .addSelect('COUNT(f.id)', 'total_facturas_pagadas')
        .addSelect('SUM(f.total)', 'total_pagado')
        .where('f.estado_pago = :estado', { estado: EstadoPago.PAGADO })
        .groupBy('c.id, c.nombre, c.identificacion');

      if (fechaInicio && fechaFin) {
        query = query.andWhere('f.fecha BETWEEN :start AND :end', {
          start: fechaInicio,
          end: fechaFin
        });
      }

      const resultados = await query
        .orderBy('total_pagado', 'DESC')
        .limit(10)
        .getRawMany();

      return resultados.map(item => ({
        cliente_id: item.cliente_id,
        nombre: item.nombre_cliente,
        identificacion: item.identificacion,
        total_facturas_pagadas: parseInt(item.total_facturas_pagadas) || 0,
        total_pagado: parseFloat(item.total_pagado) || 0
      }));
    } catch (error) {
      this.logger.error('Error en getClientesConMasPagos:', error);
      return [];
    }
  }

  // 📊 FUNCIONES DE EXPORTACIÓN
  async exportarFacturas(startDate: string, endDate: string) {
    try {
      const fechaInicio = new Date(startDate);
      const fechaFin = new Date(endDate);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin.setHours(23, 59, 59, 999);

      const facturas = await this.facturaRepo.find({
        where: {
          fecha: Between(fechaInicio, fechaFin)
        },
        relations: ['cliente', 'orden', 'orden.vehiculo', 'detalles']
      });

      return facturas;
    } catch (error) {
      this.logger.error('Error en exportarFacturas:', error);
      throw error;
    }
  }

  async exportarInventario() {
    try {
      const productos = await this.productoRepo.find({
        order: { nombre: 'ASC' }
      });

      return productos;
    } catch (error) {
      this.logger.error('Error en exportarInventario:', error);
      throw error;
    }
  }

async exportarClientes() {
  try {
    this.logger.log('Iniciando exportación de clientes');
    
    // Cargar clientes CON la relación vehiculos
    const clientes = await this.clienteRepo.find({
      relations: ['vehiculos'], // Esto ahora funcionará
      order: { nombre: 'ASC' }
    });

    this.logger.log(`Encontrados ${clientes.length} clientes`);
    
    // Debug: Verificar relación
    if (clientes.length > 0) {
      const clienteConVehiculos = clientes.find(c => c.vehiculos && c.vehiculos.length > 0);
      if (clienteConVehiculos) {
        this.logger.log('Cliente con vehículos encontrado:', {
          nombre: clienteConVehiculos.nombre,
          totalVehiculos: clienteConVehiculos.vehiculos.length,
          placas: clienteConVehiculos.vehiculos.map(v => v.placa)
        });
      } else {
        this.logger.warn('No se encontraron clientes con vehículos');
      }
    }

    return clientes;
  } catch (error) {
    this.logger.error('Error en exportarClientes:', error);
    throw error;
  }
}

  // 🎯 FUNCIONES EXISTENTES (mantenidas por compatibilidad)
  async kpis(startDate?: string, endDate?: string) {
    return this.getDashboardCompleto(startDate, endDate);
  }

  async productosMasVendidos(limit: number = 10, startDate?: string, endDate?: string) {
    const fechaInicio = startDate ? new Date(startDate) : null;
    const fechaFin = endDate ? new Date(endDate) : null;
    const productos = await this.getProductosMasVendidosIntervalo(fechaInicio, fechaFin);
    return productos.slice(0, limit);
  }

  async ultimasOrdenes(limit: number = 10) {
    return this.ordenRepo.find({
      relations: ['cliente', 'vehiculo', 'mecanico'],
      order: { fecha_ingreso: 'DESC' },
      take: limit,
    });
  }

  async topMecanicos(limit: number = 5) {
    try {
      return await this.mecanicoRepo
        .createQueryBuilder('m')
        .leftJoin('ordenes_servicio', 'o', 'o."mecanicoId" = m.id')
        .select('m.id', 'id')
        .addSelect('m.nombre', 'nombre')
        .addSelect('COUNT(o.id)', 'total_ordenes')
        .addSelect('COALESCE(SUM(o.total), 0)', 'total_facturado')
        .groupBy('m.id, m.nombre')
        .orderBy('total_ordenes', 'DESC')
        .limit(limit)
        .getRawMany();
    } catch (error) {
      this.logger.error('Error in topMecanicos:', error);
      return [];
    }
  }

  async topClientes(limit: number = 5) {
    const clientes = await this.getClientesConMasPagos(null, null);
    return clientes.slice(0, limit);
  }

  async serviciosMasSolicitados(limit: number = 5) {
    try {
      return await this.detalleRepo
        .createQueryBuilder('d')
        .select('d.descripcion', 'descripcion')
        .addSelect('COUNT(*)', 'veces_solicitado')
        .addSelect('COALESCE(SUM(d.cantidad * d.precio_unitario), 0)', 'total_ingresos')
        .where('d."productoId" IS NULL')
        .groupBy('d.descripcion')
        .orderBy('veces_solicitado', 'DESC')
        .limit(limit)
        .getRawMany();
    } catch (error) {
      this.logger.error('Error in serviciosMasSolicitados:', error);
      return [];
    }
  }

  async estadisticasExportacion(startDate: string, endDate: string) {
    try {
      const fechaInicio = new Date(startDate);
      const fechaFin = new Date(endDate);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin.setHours(23, 59, 59, 999);

      // Productos facturados
      const productosFacturados = await this.detalleRepo
        .createQueryBuilder('d')
        .innerJoin('d.producto', 'p')
        .innerJoin('d.orden', 'o')
        .innerJoin('facturas', 'f', 'f."ordenId" = o.id')
        .select('p.id', 'producto_id')
        .addSelect('p.nombre', 'nombre_producto')
        .addSelect('SUM(d.cantidad)', 'cantidad_vendida')
        .addSelect('COALESCE(SUM(d.cantidad * d.precio_unitario), 0)', 'total_vendido')
        .where('p.id IS NOT NULL')
        .andWhere('f.fecha BETWEEN :start AND :end', {
          start: fechaInicio,
          end: fechaFin
        })
        .groupBy('p.id, p.nombre')
        .orderBy('total_vendido', 'DESC')
        .getRawMany();

      // Ventas diarias
      const ventasDiarias = await this.facturaRepo
        .createQueryBuilder('f')
        .select("TO_CHAR(f.fecha, 'YYYY-MM-DD')", 'fecha')
        .addSelect('COUNT(*)', 'total_facturas')
        .addSelect('COALESCE(SUM(f.total), 0)', 'total_ventas')
        .where('f.fecha BETWEEN :start AND :end', {
          start: fechaInicio,
          end: fechaFin
        })
        .groupBy("TO_CHAR(f.fecha, 'YYYY-MM-DD')")
        .orderBy('fecha', 'ASC')
        .getRawMany();

      return {
        productosFacturados,
        ventasDiarias,
        periodo: { startDate, endDate },
        totalProductosVendidos: productosFacturados.reduce((sum, p) => sum + parseInt(p.cantidad_vendida || 0), 0),
        totalVentasPeriodo: ventasDiarias.reduce((sum, v) => sum + parseFloat(v.total_ventas || 0), 0),
        totalFacturasPeriodo: ventasDiarias.reduce((sum, v) => sum + parseInt(v.total_facturas || 0), 0),
      };
    } catch (error) {
      this.logger.error('Error in estadisticasExportacion:', error);
      throw error;
    }
  }

  async reporteProductosFacturados(startDate: string, endDate: string) {
    try {
      const fechaInicio = new Date(startDate);
      const fechaFin = new Date(endDate);
      fechaInicio.setHours(0, 0, 0, 0);
      fechaFin.setHours(23, 59, 59, 999);

      return await this.detalleRepo
        .createQueryBuilder('d')
        .innerJoin('d.producto', 'p')
        .innerJoin('d.orden', 'o')
        .innerJoin('facturas', 'f', 'f."ordenId" = o.id')
        .select('p.id', 'producto_id')
        .addSelect('p.nombre', 'nombre_producto')
        .addSelect('SUM(d.cantidad)', 'cantidad_vendida')
        .addSelect('COALESCE(SUM(d.cantidad * d.precio_unitario), 0)', 'total_vendido')
        .addSelect('MIN(f.fecha)', 'fecha_primer_venta')
        .addSelect('MAX(f.fecha)', 'fecha_ultima_venta')
        .where('p.id IS NOT NULL')
        .andWhere('f.fecha BETWEEN :start AND :end', {
          start: fechaInicio,
          end: fechaFin
        })
        .groupBy('p.id, p.nombre')
        .orderBy('total_vendido', 'DESC')
        .getRawMany();
    } catch (error) {
      this.logger.error('Error in reporteProductosFacturados:', error);
      throw error;
    }
  }
}