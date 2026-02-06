import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // 📊 NUEVO ENDPOINT PRINCIPAL
  @Get('dashboard-completo')
  getDashboardCompleto(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getDashboardCompleto(startDate, endDate);
  }

  // 📄 NUEVOS ENDPOINTS PARA EXPORTACIÓN
  @Get('exportar-facturas')
  exportarFacturas(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.exportarFacturas(startDate, endDate);
  }

  @Get('exportar-inventario')
  exportarInventario() {
    return this.dashboardService.exportarInventario();
  }

  @Get('exportar-clientes')
  exportarClientes() {
    return this.dashboardService.exportarClientes();
  }

  // 🔄 ENDPOINTS EXISTENTES (para compatibilidad)
  @Get('kpis')
  getKpis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.kpis(startDate, endDate);
  }

  @Get('top-productos')
  topProductos(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.productosMasVendidos(limit || 10, startDate, endDate);
  }

  @Get('ultimas-ordenes')
  ultimasOrdenes(@Query('limit') limit?: number) {
    return this.dashboardService.ultimasOrdenes(limit || 10);
  }

  @Get('top-mecanicos')
  topMecanicos(@Query('limit') limit?: number) {
    return this.dashboardService.topMecanicos(limit || 5);
  }

  @Get('top-clientes')
  topClientes(@Query('limit') limit?: number) {
    return this.dashboardService.topClientes(limit || 5);
  }

  // 📋 ENDPOINTS EXISTENTES QUE DEBEN MANTENERSE
  @Get('servicios-mas-solicitados')
  serviciosMasSolicitados(@Query('limit') limit?: number) {
    return this.dashboardService.serviciosMasSolicitados(limit || 5);
  }

  @Get('estadisticas-exportacion')
  estadisticasExportacion(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.estadisticasExportacion(startDate, endDate);
  }

  @Get('reporte-productos-facturados')
  reporteProductosFacturados(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dashboardService.reporteProductosFacturados(startDate, endDate);
  }
}