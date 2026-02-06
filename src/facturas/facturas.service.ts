import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, MoreThan } from 'typeorm';
import { Factura, EstadoPago } from './facturas.entity';
import { FacturaDetalle, TipoDetalle } from './factura-detalle.entity';
import { OrdenServicio, EstadoOrden } from '../ordenes-servicio/orden-servicio.entity';
import { Cliente } from '../clientes/clientes.entity';
import { Vehiculo } from '../vehiculos/vehiculos.entity';
import { Producto } from '../productos/productos.entity';
import { Servicio } from '../servicios/servicios.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { ILike } from 'typeorm';
import { UpdateEstadoPagoDto } from './dto/update-estado-pago.dto';
import { CreateFacturaIndependienteDto, FacturaDetalleDto } from './dto/create-factura-independiente.dto';
import { UpdateFacturaDto, UpdateFacturaDetalleDto } from './dto/update-factura.dto';
import { Mecanico } from '../mecanicos/mecanicos.entity';
import { MailService } from '../mail/mail.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Función helper para asegurar que los precios sean números
const ensureNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Función helper para formatear precios
const formatPrice = (price: any): string => {
  const num = ensureNumber(price);
  return `$${num.toFixed(2)}`;
};

// Función para formatear el método de pago
const formatearMetodoPago = (metodo: string): string => {
  const metodos: Record<string, string> = {
    'EFECTIVO': 'Efectivo',
    'TARJETA_CREDITO': 'Tarjeta de Crédito',
    'TARJETA_DEBITO': 'Tarjeta de Débito',
    'TRANSFERENCIA': 'Transferencia',
    'CHEQUE': 'Cheque',
    'OTRO': 'Otro',
    'CONTADO': 'Contado'
  };
  
  const metodoUpper = metodo.toUpperCase();
  return metodos[metodoUpper] || metodo;
};

// Función para determinar tipo de item
const determinarTipoItem = (descripcion: string): string => {
  const desc = descripcion.toLowerCase();
  
  const keywordsServicios = [
    'servicio', 'mantenimiento', 'reparación', 'diagnóstico', 'alineación',
    'balanceo', 'cambio', 'revisión', 'instalación', 'montaje', 'desmontaje',
    'limpieza', 'ajuste', 'calibración', 'sincronización', 'prueba', 'test',
    'mano de obra', 'labor', 'trabajo', 'inspección', 'chequeo', 'control',
    'evaluación', 'análisis', 'medición', 'verificación'
  ];
  
  const keywordsProductos = [
    'filtro', 'aceite', 'bujía', 'pastilla', 'disco', 'neumático', 'llanta',
    'batería', 'amortiguador', 'bomba', 'correa', 'manguera', 'fusible',
    'bombillo', 'lámpara', 'sensor', 'pieza', 'repuesto', 'kit', 'juego',
    'refacción', 'accesorio', 'herramienta', 'material', 'lubricante',
    'aditivo', 'freno', 'embrague', 'radiador', 'alternador', 'motor',
    'caja', 'transmisión', 'escape', 'suspensión'
  ];
  
  for (const keyword of keywordsServicios) {
    if (desc.includes(keyword)) return 'servicio';
  }
  
  for (const keyword of keywordsProductos) {
    if (desc.includes(keyword)) return 'producto';
  }
  
  return 'producto';
};

// Función para obtener información unificada
const obtenerInfoUnificada = (factura: any) => {
  // Vehículo - Prioridad: vehículo directo, luego orden.vehiculo
  const vehiculo = factura.vehiculo || factura.orden?.vehiculo || null;
  
  // Cliente
  const cliente = factura.cliente || factura.orden?.cliente || {};
  
  // Mecánico
  const mecanico = factura.mecanico || factura.orden?.mecanico || null;
  
  // Detalles
  const detalles = factura.detalles || factura.orden?.detalles || [];
  
  // Método de pago
  const metodoPago = factura.metodo_pago || 'CONTADO';
  const esTarjetaCredito = metodoPago.toUpperCase() === 'TARJETA_CREDITO';
  
  return {
    vehiculo,
    cliente,
    mecanico,
    detalles,
    metodoPago,
    esTarjetaCredito,
    metodoPagoFormateado: formatearMetodoPago(metodoPago)
  };
};

// Función para calcular totales
const calcularTotales = (detalles: any[], esTarjetaCredito: boolean) => {
  let subtotalServiciosSinIva = 0;
  let subtotalProductos = 0;
  let ivaServicios = 0;
  let totalServiciosConIva = 0;

  detalles.forEach((d: any) => {
    const cantidad = ensureNumber(d.cantidad);
    const precioUnitario = ensureNumber(d.precio_unitario);
    const valorSinIva = cantidad * precioUnitario;
    
    // Determinar tipo
    let tipo = 'producto';
    if (d.tipo) {
      tipo = d.tipo.toLowerCase();
    } else if (d.productoId) {
      tipo = 'producto';
    } else if (d.servicioId) {
      tipo = 'servicio';
    } else {
      tipo = determinarTipoItem(d.descripcion || '');
    }
    
    if (tipo === 'servicio') {
      subtotalServiciosSinIva += valorSinIva;
      
      if (esTarjetaCredito) {
        const ivaItem = valorSinIva * 0.19;
        ivaServicios += ivaItem;
        totalServiciosConIva += valorSinIva + ivaItem;
      } else {
        totalServiciosConIva += valorSinIva;
      }
    } else {
      subtotalProductos += valorSinIva;
    }
  });

  const subtotalTotal = subtotalServiciosSinIva + subtotalProductos;
  const totalGeneral = totalServiciosConIva + subtotalProductos;

  return {
    subtotalServiciosSinIva,
    subtotalProductos,
    ivaServicios,
    totalServiciosConIva,
    subtotalTotal,
    totalGeneral
  };
};

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura)
    private facturaRepo: Repository<Factura>,

    @InjectRepository(FacturaDetalle)
    private detalleRepo: Repository<FacturaDetalle>,

    @InjectRepository(OrdenServicio)
    private ordenRepo: Repository<OrdenServicio>,

    @InjectRepository(Cliente)
    private clienteRepo: Repository<Cliente>,

    @InjectRepository(Vehiculo)
    private vehiculoRepo: Repository<Vehiculo>,

    @InjectRepository(Producto)
    private productoRepo: Repository<Producto>,

    @InjectRepository(Servicio)
    private servicioRepo: Repository<Servicio>,

    @InjectRepository(Mecanico)
    private mecanicoRepo: Repository<Mecanico>,

    private dataSource: DataSource,

    private mailService: MailService,

    private readonly usuariosService: UsuariosService,
  ) {}

  // REEMPLAZO DE LA FUNCIÓN generarPdfFactura
 private async generarPdfFactura(factura: Factura): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const {
      vehiculo,
      cliente,
      mecanico,
      detalles,
      metodoPago,
      esTarjetaCredito,
      metodoPagoFormateado,
    } = obtenerInfoUnificada(factura);

    const totales = calcularTotales(detalles, esTarjetaCredito);

    /* ===== CONFIG VISUAL ===== */
    const margin = 40;
    let y = height - margin;
    const primary = rgb(139 / 255, 0, 0);
    const gray = rgb(0.55, 0.55, 0.55);
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);

    /* ================= HEADER ================= */
    page.drawRectangle({
      x: 0,
      y: height - 70,
      width,
      height: 70,
      color: primary,
    });

    /* ===== ESPACIO PARA LOGO BASE64 ===== */
// Cuando tengas el logo:
// const logoBase64 = 'data:image/png;base64,AAAA...';
// const logoBytes = Buffer.from(logoBase64.split(',')[1], 'base64');
// const logoImage = await pdfDoc.embedPng(logoBytes);
// page.drawImage(logoImage, {
//   x: margin,
//   y: height - 60,
//   width: 90,
//   height: 40,
// });

    page.drawText('FACTURA', {
      x: width - margin - 110,
      y: height - 45,
      size: 24,
      font: fontBold,
      color: white,
    });

    page.drawText('DOCUMENTO TRIBUTARIO', {
      x: width - margin - 110,
      y: height - 60,
      size: 10,
      font,
      color: white,
    });

    y = height - 90;

    /* ================= EMPRESA ================= */
    page.drawText('MOTOROOM TALLER MECÁNICO', {
      x: margin,
      y,
      size: 13,
      font: fontBold,
      color: primary,
    });

    [
      'NIT: 70434575-0 • Régimen Simple',
      'Cel: 3122012588',
      'Email: facturacion@motoroom.com',
    ].forEach((t, i) => {
      page.drawText(t, {
        x: margin,
        y: y - 14 - i * 12,
        size: 10,
        font,
      });
    });

    /* ================= DATOS FACTURA ================= */
    const fecha = new Date(factura.fecha || Date.now());

    const boxX = width - margin - 200;
    const boxY = y - 10;

    page.drawRectangle({
      x: boxX,
      y: boxY - 85,
      width: 180,
      height: mecanico ? 85 : 70,
      borderWidth: 1,
      borderColor: primary,
    });

    const datosFactura = [
      'DATOS FACTURA',
      `No: F-${factura.id.toString().padStart(6, '0')}`,
      `Fecha: ${fecha.toLocaleDateString('es-ES')}`,
      `Método: ${metodoPagoFormateado}`,
      `Estado: ${factura.estado_pago}`,
      mecanico ? `Mecánico: ${mecanico.nombre}` : null,
    ].filter(Boolean);

    datosFactura.forEach((t, i) => {
      page.drawText(t as string, {
        x: boxX + 10,
        y: boxY - 18 - i * 13,
        size: i === 0 ? 11 : 10,
        font: i === 0 ? fontBold : font,
        color: i === 0 ? primary : black,
      });
    });

    y -= 115;

    /* ================= CLIENTE / VEHÍCULO ================= */
    const drawBox = (x: number, title: string, lines: string[]) => {
      const h = lines.length * 14 + 28;

      page.drawRectangle({
        x,
        y: y - h,
        width: 240,
        height: h,
        borderWidth: 1,
        borderColor: primary,
      });

      page.drawText(title, {
        x: x + 10,
        y: y - 18,
        size: 11,
        font: fontBold,
        color: primary,
      });

      lines.forEach((l, i) => {
        page.drawText(l, {
          x: x + 10,
          y: y - 34 - i * 14,
          size: 10,
          font,
        });
      });

      return y - h - 15;
    };

    const yCliente = drawBox(margin, 'CLIENTE', [
      `Nombre: ${cliente.nombre || 'N/A'}`,
      `ID: ${cliente.identificacion || cliente.cedula || 'N/A'}`,
      `Teléfono: ${cliente.telefono || 'N/A'}`,
      `Email: ${cliente.email || 'N/A'}`,
      `Dirección: ${cliente.direccion || 'N/A'}`,
    ]);

    const yVehiculo = drawBox(margin + 260, 'VEHÍCULO', vehiculo ? [
      `Placa: ${vehiculo.placa}`,
      `Marca: ${vehiculo.marca}`,
      `Modelo: ${vehiculo.modelo || 'N/A'}`,
      `Año: ${vehiculo.anio || 'N/A'}`,
      `Km: ${vehiculo.kilometraje || 'N/A'}`,
    ] : ['Sin vehículo asignado']);

    y = Math.min(yCliente, yVehiculo);

    /* ================= TABLA DETALLES ================= */
    y -= 10;

    /* 🔥 COLUMNAS AJUSTADAS MÁS COMPACTAS */
    const cols = {
      num: margin,
      desc: margin + 25,      // Más cerca del número
      tipo: margin + 220,     // Reducido de 330 a 220 (110px menos)
      cant: margin + 280,     // Reducido de 390 a 280 (110px menos)
      precio: margin + 320,   // Reducido de 445 a 320 (125px menos)
      subtotal: margin + 380, // Reducido de 510 a 380 (130px menos)
    };

    page.drawText('DETALLE DE LA FACTURA', {
      x: margin,
      y,
      size: 13,
      font: fontBold,
      color: primary,
    });

    y -= 18;

    // Encabezados más compactos
    ['#', 'DESCRIPCIÓN', 'TIPO', 'CANT', 'PRECIO', 'SUBTOTAL'].forEach((h, i) => {
      page.drawText(h, {
        x: Object.values(cols)[i],
        y,
        size: 10,
        font: fontBold,
      });
    });

    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: gray,
    });

    y -= 12;

    detalles.forEach((d, i) => {
      if (y < 120) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - margin;
      }

      const cantidad = ensureNumber(d.cantidad);
      const precio = ensureNumber(d.precio_unitario);
      const base = cantidad * precio;

      const tipo =
        d.tipo?.toLowerCase() ||
        (d.servicioId ? 'servicio' : 'producto');

      const totalLinea =
        esTarjetaCredito && tipo === 'servicio'
          ? base * 1.19
          : base;

      const row = [
        (i + 1).toString(),
        d.descripcion || 'Sin descripción',
        tipo.toUpperCase(),
        cantidad.toString(),
        formatPrice(precio),
        formatPrice(totalLinea),
      ];

      row.forEach((t, j) => {
        // Ancho máximo para cada columna
        const maxWidths = [
          15,    // # (muy angosto)
          180,   // DESCRIPCIÓN (reducido para que quepa)
          40,    // TIPO
          30,    // CANT
          55,    // PRECIO
          65,    // SUBTOTAL
        ];

        page.drawText(t, {
          x: Object.values(cols)[j],
          y,
          size: 10,
          font,
          maxWidth: maxWidths[j],
        });
      });

      y -= 16;
    });

    /* ================= TOTALES ================= */
    y -= 20;

    const resumen = [
      ['SUBTOTAL', totales.subtotalTotal],
      ...(esTarjetaCredito && totales.ivaServicios > 0
        ? [['IVA SERVICIOS (19%)', totales.ivaServicios]]
        : []),
      ['TOTAL GENERAL', totales.totalGeneral],
    ];

    resumen.forEach(([l, v], i) => {
      page.drawText(l as string, {
        x: width - margin - 220,
        y: y - i * 18,
        size: i === resumen.length - 1 ? 13 : 11,
        font: fontBold,
      });

      page.drawText(formatPrice(v), {
        x: width - margin - 80,
        y: y - i * 18,
        size: i === resumen.length - 1 ? 13 : 11,
        font: fontBold,
        color: i === resumen.length - 1 ? primary : black,
      });
    });

    /* ================= FOOTER ================= */
    page.drawLine({
      start: { x: margin, y: 55 },
      end: { x: width - margin, y: 55 },
      thickness: 0.5,
      color: gray,
    });

    page.drawText(
      `Motoroom Taller Mecánico • ${fecha.toLocaleDateString('es-ES')}`,
      {
        x: width / 2 - 140,
        y: 38,
        size: 9,
        font,
        color: gray,
      },
    );

    return Buffer.from(await pdfDoc.save());
  } catch (error) {
    console.error('Error PDF:', error);
    throw error;
  }
}


  // El resto de los métodos permanecen igual...

  async getReporteManoObra(
    mecanicoId: number,
    fechaInicio: string,
    fechaFin: string,
    servicioNombre: string
  ) {
    try {
      const servicio = await this.servicioRepo.findOne({
        where: {
          nombre: ILike(`%${servicioNombre}%`),
          esActivo: true
        }
      });

      if (!servicio) {
        throw new NotFoundException('Servicio no encontrado');
      }

      const facturas = await this.facturaRepo
        .createQueryBuilder('factura')
        .innerJoinAndSelect('factura.detalles', 'detalle')
        .innerJoinAndSelect('factura.cliente', 'cliente')
        .innerJoinAndSelect('factura.mecanico', 'mecanico')
        .where('factura.mecanicoId = :mecanicoId', { mecanicoId })
        .andWhere('detalle.servicioId = :servicioId', { servicioId: servicio.id })
        .andWhere('factura.fecha BETWEEN :fechaInicio AND :fechaFin', {
          fechaInicio: fechaInicio,
          fechaFin: fechaFin + ' 23:59:59'
        })
        .andWhere('factura.deleted_at IS NULL')
        .orderBy('factura.fecha', 'DESC')
        .getMany();

      const mecanico = await this.mecanicoRepo.findOne({
        where: { id: mecanicoId }
      });

      if (!mecanico) {
        throw new NotFoundException('Mecánico no encontrado');
      }

      const facturasDetalle = facturas.map(factura => {
        const detalleServicio = factura.detalles.find(d =>
          d.servicioId === servicio.id
        );

        return {
          factura_id: factura.id,
          fecha: factura.fecha,
          cliente_nombre: factura.cliente.nombre,
          cantidad: detalleServicio?.cantidad || 0,
          precio_unitario: detalleServicio?.precio_unitario || 0,
          estado_pago: factura.estado_pago,
          total_factura: factura.total
        };
      });

      const total_facturado = facturasDetalle.reduce((sum, item) => {
        return sum + (item.cantidad * item.precio_unitario);
      }, 0);

      return {
        mecanico_nombre: mecanico.nombre,
        mecanico_especialidad: mecanico.especialidad,
        servicio_nombre: servicio.nombre,
        servicio_precio_base: servicio.precio,
        total_facturado,
        cantidad_facturas: facturas.length,
        facturas: facturasDetalle,
        periodo: {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error generando reporte:', error);
      throw new BadRequestException('Error al generar el reporte');
    }
  }

  async enviarFacturaPorEmail(
    id: number,
    emailData: {
      email: string;
      asunto: string;
      mensaje: string;
      copia?: string;
      pdfBase64?: string;
    }
  ) {
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'mecanico', 'detalles'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.email)) {
      throw new BadRequestException('Correo electrónico inválido');
    }

    try {
      let pdfBuffer: Buffer;
      if (emailData.pdfBase64) {
        pdfBuffer = Buffer.from(emailData.pdfBase64, 'base64');
      } else {
        pdfBuffer = await this.generarPdfFactura(factura);
      }

      const resultado = await this.mailService.enviarFactura(
        emailData.email,
        factura.cliente.nombre,
        factura.id,
        emailData.asunto,
        emailData.mensaje,
        pdfBuffer,
        emailData.copia
      );

      await this.registrarEnvioCorreo(
        factura.id,
        emailData.email,
        emailData.asunto,
        resultado.messageId
      );

      return {
        success: true,
        message: 'Correo enviado exitosamente',
        messageId: resultado.messageId,
        timestamp: new Date().toISOString(),
        datos: {
          facturaId: factura.id,
          cliente: factura.cliente.nombre,
          email: emailData.email,
          cc: emailData.copia,
        },
      };
    } catch (error) {
      console.error('Error al enviar correo:', error);
      throw new BadRequestException('Error al enviar el correo: ' + error.message);
    }
  }

  private async registrarEnvioCorreo(
    facturaId: number,
    email: string,
    asunto: string,
    messageId: string
  ) {
    console.log('📧 Correo enviado registrado:', {
      facturaId,
      email,
      asunto,
      messageId,
      fecha: new Date().toISOString(),
    });
  }

  // NUEVO MÉTODO: Validar contraseña para edición
  async validarPassword(id: number, password: string, accion: string) {
    // Primero verificar que la factura exista
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Si la acción es EDITAR, verificar que no esté pagada
    if (accion === 'EDITAR' && factura.estado_pago === EstadoPago.PAGADO) {
      throw new ForbiddenException('No se puede editar una factura pagada');
    }

    // Buscar usuario admin (VENDEDOR)
    const admin = await this.usuariosService.findByUsername('admin');

    if (!admin || admin.rol !== 'VENDEDOR') {
      throw new ForbiddenException('Usuario administrador no válido');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return {
      valido: true,
      message: `Contraseña validada para ${accion.toLowerCase()}`,
      usuario: admin.usuario,
      accion: accion,
    };
  }

  async deleteSecure(id: number, password: string) {
    const admin = await this.usuariosService.findByUsername('admin');

    if (!admin || admin.rol !== 'VENDEDOR') {
      throw new ForbiddenException('Administrador inválido');
    }

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      throw new ForbiddenException('Contraseña incorrecta');
    }

    const factura = await this.facturaRepo.findOne({ 
      where: { id },
      relations: ['orden'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (factura.estado_pago === EstadoPago.PAGADO) {
      throw new ForbiddenException('No se puede eliminar una factura pagada');
    }

    // Realizar soft delete
    factura.deleted_at = new Date();
    await this.facturaRepo.save(factura);

    // Si tiene orden asociada, cambiar su estado
    if (factura.orden) {
      factura.orden.estado = EstadoOrden.TERMINADA;
      await this.ordenRepo.save(factura.orden);
    }

    return { message: 'Factura eliminada correctamente' };
  }

  async generarPdfBuffer(facturaId: number): Promise<Buffer> {
    const factura = await this.facturaRepo.findOne({
      where: { id: facturaId, deleted_at: null },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'mecanico', 'detalles'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return await this.generarPdfFactura(factura);
  }

  /* =========================
     CREAR FACTURA DESDE ORDEN
  ========================= */
  async create(dto: CreateFacturaDto) {
    const orden = await this.ordenRepo.findOne({
      where: { id: dto.ordenId },
      relations: ['detalles', 'cliente', 'mecanico', 'detalles.producto', 'detalles.servicio'],
    });

    if (!orden) {
      throw new NotFoundException('Orden no existe');
    }

    if (orden.estado !== EstadoOrden.TERMINADA) {
      throw new BadRequestException(
        'La orden debe estar TERMINADA para facturar',
      );
    }

    const facturaExistente = await this.facturaRepo.findOne({
      where: {
        orden: { id: dto.ordenId },
        deleted_at: null
      },
    });

    if (facturaExistente) {
      throw new ConflictException('Ya existe una factura para esta orden');
    }

    const total = orden.detalles.reduce(
      (sum, d) => sum + Number(d.precio_unitario) * d.cantidad,
      0,
    );

    let mecanico = orden.mecanico;
    if (dto.mecanicoId) {
      mecanico = await this.mecanicoRepo.findOneBy({ id: dto.mecanicoId });
      if (!mecanico) {
        throw new NotFoundException('Mecánico no encontrado');
      }
    }

    const factura = this.facturaRepo.create({
      orden,
      cliente: orden.cliente,
      mecanico,
      total,
      metodo_pago: dto.metodo_pago,
      notas: dto.notas,
      estado_pago: dto.estado_pago || EstadoPago.NO_PAGA,
    });

    if (factura.estado_pago === EstadoPago.PAGADO) {
      factura.pagado_at = new Date();
    }

    const facturaGuardada = await this.facturaRepo.save(factura);

    for (const d of orden.detalles) {
      let tipoDetalle = TipoDetalle.OTRO;

      if (d.producto) {
        tipoDetalle = TipoDetalle.PRODUCTO;
      }
      else if (d.servicio) {
        tipoDetalle = TipoDetalle.SERVICIO;
      }
      else if (d.tipo) {
        const tipoUpper = d.tipo.toUpperCase();

        if (tipoUpper === TipoDetalle.PRODUCTO) {
          tipoDetalle = TipoDetalle.PRODUCTO;
        } else if (tipoUpper === TipoDetalle.SERVICIO) {
          tipoDetalle = TipoDetalle.SERVICIO;
        }
      }

      const detalle = this.detalleRepo.create({
        factura: facturaGuardada,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        productoId: d.producto?.id || null,
        servicioId: d.servicio?.id || null,
        tipo: tipoDetalle,
      });

      await this.detalleRepo.save(detalle);
    }

    orden.estado = EstadoOrden.FACTURADA;
    await this.ordenRepo.save(orden);

    return await this.findOne(facturaGuardada.id);
  }

  /* =========================
     LISTAR FACTURAS
  ========================= */
  findAll() {
    return this.facturaRepo.find({
      where: { deleted_at: null },
      relations: [
        'cliente',
        'orden',
        'orden.vehiculo',
        'vehiculo', // Añadir relación con vehículo directo de la factura
        'mecanico',
        'detalles',
      ],
      order: { fecha: 'DESC' },
    });
  }

  /* =========================
     CREAR FACTURA INDEPENDIENTE
  ========================= */
  async createIndependiente(dto: CreateFacturaIndependienteDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let cliente: Cliente;
      if (dto.clienteId) {
        cliente = await queryRunner.manager.findOne(Cliente, {
          where: { id: dto.clienteId }
        });
        if (!cliente) {
          throw new NotFoundException('Cliente no encontrado');
        }
      } else if (dto.nuevoCliente) {
        cliente = queryRunner.manager.create(Cliente, dto.nuevoCliente);
        cliente = await queryRunner.manager.save(cliente);
      } else {
        throw new BadRequestException('Se debe proporcionar un cliente existente o crear uno nuevo');
      }

      let vehiculo: Vehiculo | null = null;
      if (dto.vehiculoId) {
        // IMPORTANTE: Verificar si el vehículo existe
        vehiculo = await queryRunner.manager.findOne(Vehiculo, {
          where: { id: dto.vehiculoId },
          relations: ['cliente']
        });
        if (!vehiculo) {
          throw new NotFoundException('Vehículo no encontrado');
        }
        if (vehiculo.cliente.id !== cliente.id) {
          throw new BadRequestException('El vehículo no pertenece al cliente seleccionado');
        }
        console.log('🚗 Vehículo encontrado:', {
          id: vehiculo.id,
          placa: vehiculo.placa,
          clienteId: vehiculo.cliente.id,
          clienteNombre: vehiculo.cliente.nombre
        });
      } else if (dto.nuevoVehiculo) {
        console.log('🚗 Creando nuevo vehículo:', dto.nuevoVehiculo);
        
        // IMPORTANTE: Crear el vehículo con relación al cliente
        const nuevoVehiculoData = {
          ...dto.nuevoVehiculo,
          cliente: cliente, // Asignar el cliente como objeto, no solo ID
        };
        
        // Verificar si la placa ya existe
        const placaUpper = dto.nuevoVehiculo.placa?.toUpperCase();
        const existePlaca = await queryRunner.manager.findOne(Vehiculo, {
          where: { placa: placaUpper }
        });
        
        if (existePlaca) {
          throw new BadRequestException(`Ya existe un vehículo con la placa ${placaUpper}`);
        }
        
        vehiculo = queryRunner.manager.create(Vehiculo, nuevoVehiculoData);
        vehiculo = await queryRunner.manager.save(vehiculo);
        console.log('🚗 Nuevo vehículo creado:', {
          id: vehiculo.id,
          placa: vehiculo.placa,
          clienteId: vehiculo.cliente?.id
        });
      } else {
        console.log('🚗 No se especificó vehículo');
      }

      let mecanico: Mecanico | null = null;
      if (dto.mecanicoId) {
        mecanico = await queryRunner.manager.findOne(Mecanico, {
          where: { id: dto.mecanicoId }
        });
        if (!mecanico) {
          throw new NotFoundException('Mecánico no encontrado');
        }
      }

      const total = dto.detalles.reduce(
        (sum, detalle) => sum + (Number(detalle.precio_unitario) * detalle.cantidad),
        0
      );

      // **CORRECCIÓN IMPORTANTE: Crear la factura de manera más explícita**
      const facturaData = {
        cliente: cliente,
        total: total,
        metodo_pago: dto.metodo_pago,
        notas: dto.notas,
        estado_pago: dto.estado_pago || EstadoPago.NO_PAGA,
        orden: null,
        mecanico: mecanico || null,
        vehiculo: vehiculo || null, // **ESTO ES CLAVE**
      };

      console.log('📄 Datos de la factura a crear:', {
        clienteId: cliente.id,
        vehiculoId: vehiculo?.id || null,
        vehiculoPlaca: vehiculo?.placa || 'N/A',
        mecanicoId: mecanico?.id || null
      });

      const factura = queryRunner.manager.create(Factura, facturaData);

      if (factura.estado_pago === EstadoPago.PAGADO) {
        factura.pagado_at = new Date();
      }

      const facturaGuardada = await queryRunner.manager.save(Factura, factura);
      
      console.log('✅ Factura guardada con ID:', facturaGuardada.id);
      console.log('🚗 Vehículo en factura guardada:', facturaGuardada.vehiculo);

      for (const detalleDto of dto.detalles) {
        let tipo = 'OTRO';
        if (detalleDto.productoId) tipo = 'PRODUCTO';
        else if (detalleDto.servicioId) tipo = 'SERVICIO';
        else if (detalleDto.tipo) tipo = detalleDto.tipo;

        const detalleData: any = {
          factura: facturaGuardada,
          descripcion: detalleDto.descripcion,
          cantidad: detalleDto.cantidad,
          precio_unitario: detalleDto.precio_unitario,
          productoId: detalleDto.productoId || null,
          servicioId: detalleDto.servicioId || null,
          tipo: tipo,
        };

        const detalle = queryRunner.manager.create(FacturaDetalle, detalleData);
        await queryRunner.manager.save(FacturaDetalle, detalle);

        if (detalleDto.productoId) {
          await queryRunner.manager.decrement(
            Producto,
            { id: detalleDto.productoId },
            'stock',
            detalleDto.cantidad
          );
        }
      }

      await queryRunner.commitTransaction();

      // **CORRECCIÓN: Forzar la carga de relaciones frescas**
      const facturaCompleta = await queryRunner.manager.findOne(Factura, {
        where: { id: facturaGuardada.id },
        relations: ['cliente', 'mecanico', 'vehiculo', 'detalles'],
      });

      if (!facturaCompleta) {
        throw new NotFoundException('Factura no encontrada después de guardar');
      }

      console.log('📦 Factura completa recuperada:', {
        id: facturaCompleta.id,
        tieneVehiculo: !!facturaCompleta.vehiculo,
        vehiculoPlaca: facturaCompleta.vehiculo?.placa || 'N/A',
        vehiculoId: facturaCompleta.vehiculo?.id || null
      });

      return facturaCompleta;

    } catch (error) {
      console.error('❌ Error en createIndependiente:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /* =========================
     PROCESAR DETALLES DE FACTURA
  ========================= */
  private async procesarDetallesFactura(factura: Factura, detallesDto: FacturaDetalleDto[]): Promise<void> {
    for (const detalleDto of detallesDto) {
      let tipo: TipoDetalle = TipoDetalle.OTRO;
      if (detalleDto.productoId) tipo = TipoDetalle.PRODUCTO;
      else if (detalleDto.servicioId) tipo = TipoDetalle.SERVICIO;
      else if (detalleDto.tipo) {
        if (detalleDto.tipo === 'PRODUCTO') tipo = TipoDetalle.PRODUCTO;
        else if (detalleDto.tipo === 'SERVICIO') tipo = TipoDetalle.SERVICIO;
      }

      const detalle = this.detalleRepo.create({
        factura,
        descripcion: detalleDto.descripcion,
        cantidad: detalleDto.cantidad,
        precio_unitario: detalleDto.precio_unitario,
        productoId: detalleDto.productoId || null,
        servicioId: detalleDto.servicioId || null,
        tipo,
      });

      await this.detalleRepo.save(detalle);

      if (detalleDto.productoId) {
        const producto = await this.productoRepo.findOne({
          where: { id: detalleDto.productoId }
        });

        if (producto) {
          producto.stock -= detalleDto.cantidad;
          if (producto.stock < 0) producto.stock = 0;
          await this.productoRepo.save(producto);
        }
      }

      if (detalleDto.servicioId) {
        const servicio = await this.servicioRepo.findOne({
          where: { id: detalleDto.servicioId }
        });

        if (!servicio) {
          throw new NotFoundException(`Servicio con ID ${detalleDto.servicioId} no encontrado`);
        }

        if (!servicio.esActivo) {
          throw new BadRequestException(`El servicio ${servicio.nombre} no está activo`);
        }
      }
    }
  }

  /* =========================
     BUSCAR FACTURA POR ID
  ========================= */
  async findOne(id: number) {
    const factura = await this.facturaRepo
      .createQueryBuilder('factura')
      .leftJoinAndSelect('factura.detalles', 'detalles')
      .leftJoinAndSelect('factura.cliente', 'cliente')
      .leftJoinAndSelect('factura.orden', 'orden')
      .leftJoinAndSelect('orden.vehiculo', 'vehiculoOrden') // Renombrar para evitar conflicto
      .leftJoinAndSelect('factura.vehiculo', 'vehiculoFactura') // <- AÑADIR ESTA LÍNEA
      .leftJoinAndSelect('factura.mecanico', 'mecanico')
      .where('factura.id = :id', { id })
      .andWhere('factura.deleted_at IS NULL')
      .cache(false)
      .getOne();

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Agregar un helper para que el frontend pueda acceder fácilmente al vehículo
    return this.enriquecerFacturaConVehiculo(factura);
  }

  private enriquecerFacturaConVehiculo(factura: Factura): any {
    // Determinar qué vehículo mostrar (prioridad: vehículo directo de la factura)
    const vehiculo = factura.vehiculo || factura.orden?.vehiculo;
    
    // Retornar la factura con un campo adicional para facilitar el acceso
    return {
      ...factura,
      vehiculo, // Campo unificado para el frontend
      tieneVehiculoDirecto: !!factura.vehiculo,
      tieneVehiculoOrden: !!factura.orden?.vehiculo
    };
  }

  /* =========================
     EDITAR FACTURA
  ========================= */
  async editarFactura(id: number, dto: UpdateFacturaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const factura = await queryRunner.manager.findOne(Factura, {
        where: { id, deleted_at: null },
      });

      if (!factura) {
        throw new NotFoundException('Factura no encontrada');
      }

      if (factura.estado_pago === EstadoPago.PAGADO) {
        throw new BadRequestException('No se puede editar una factura pagada');
      }

      if (dto.metodo_pago) factura.metodo_pago = dto.metodo_pago;
      if (dto.notas !== undefined) factura.notas = dto.notas;
      if (dto.mecanicoId && !factura.orden) {
        const mecanico = await this.mecanicoRepo.findOneBy({ id: dto.mecanicoId });
        if (!mecanico) {
          throw new NotFoundException('Mecánico no encontrado');
        }
        factura.mecanico = mecanico;
      }

      const detallesAnteriores = await queryRunner.manager.find(FacturaDetalle, {
        where: { facturaId: factura.id },
      });

      const detallesPreviosMap = new Map<number, number>();
      for (const d of detallesAnteriores) {
        if (d.productoId) {
          detallesPreviosMap.set(
            d.productoId,
            (detallesPreviosMap.get(d.productoId) || 0) + d.cantidad
          );
        }
      }

      const detallesNuevosMap = new Map<number, number>();
      for (const d of dto.detalles || []) {
        if (d.productoId) {
          detallesNuevosMap.set(
            d.productoId,
            (detallesNuevosMap.get(d.productoId) || 0) + d.cantidad
          );
        }

        if (d.servicioId) {
          const servicio = await queryRunner.manager.findOne(Servicio, {
            where: { id: d.servicioId }
          });

          if (!servicio) {
            throw new NotFoundException(`Servicio con ID ${d.servicioId} no encontrado`);
          }

          if (!servicio.esActivo) {
            throw new BadRequestException(`El servicio ${servicio.nombre} no está activo`);
          }
        }
      }

      for (const [productoId, nuevaCantidad] of detallesNuevosMap.entries()) {
        const cantidadAnterior = detallesPreviosMap.get(productoId) || 0;
        const diferencia = nuevaCantidad - cantidadAnterior;

        if (diferencia !== 0) {
          const producto = await queryRunner.manager.findOne(Producto, {
            where: { id: productoId },
          });

          if (!producto) {
            throw new BadRequestException(`Producto ${productoId} no existe`);
          }

          if (diferencia > 0 && producto.stock < diferencia) {
            throw new BadRequestException(
              `Stock insuficiente para ${producto.nombre}`
            );
          }

          await queryRunner.manager.decrement(
            Producto,
            { id: productoId },
            'stock',
            diferencia
          );
        }
      }

      for (const [productoId, cantidadAnterior] of detallesPreviosMap.entries()) {
        if (!detallesNuevosMap.has(productoId)) {
          await queryRunner.manager.increment(
            Producto,
            { id: productoId },
            'stock',
            cantidadAnterior
          );
        }
      }

      await queryRunner.manager.delete(FacturaDetalle, {
        facturaId: factura.id,
      });

      let nuevoTotal = 0;
      if (dto.detalles?.length) {
        for (const detalleDto of dto.detalles) {
          let tipo: TipoDetalle = TipoDetalle.OTRO;
          if (detalleDto.productoId) tipo = TipoDetalle.PRODUCTO;
          else if (detalleDto.servicioId) tipo = TipoDetalle.SERVICIO;
          else if (detalleDto.tipo) {
            if (detalleDto.tipo === 'PRODUCTO') tipo = TipoDetalle.PRODUCTO;
            else if (detalleDto.tipo === 'SERVICIO') tipo = TipoDetalle.SERVICIO;
          }

          const detalle = queryRunner.manager.create(FacturaDetalle, {
            facturaId: factura.id,
            descripcion: detalleDto.descripcion,
            cantidad: detalleDto.cantidad,
            precio_unitario: detalleDto.precio_unitario,
            productoId: detalleDto.productoId !== undefined && detalleDto.productoId !== null
              ? Number(detalleDto.productoId)
              : null,
            servicioId: detalleDto.servicioId !== undefined && detalleDto.servicioId !== null
              ? Number(detalleDto.servicioId)
              : null,
            tipo,
          });

          await queryRunner.manager.save(FacturaDetalle, detalle);
          nuevoTotal += Number(detalleDto.precio_unitario) * detalleDto.cantidad;
        }
      }

      factura.total = nuevoTotal;
      await queryRunner.manager.save(Factura, factura);
      await queryRunner.commitTransaction();

      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /* =========================
     RESTANTES MÉTODOS
  ========================= */
  async findByEstado(estado: EstadoPago) {
    const facturas = await this.facturaRepo.find({
      where: {
        estado_pago: estado,
        deleted_at: null
      },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'vehiculo', 'mecanico'], // Añadir 'vehiculo'
      order: { fecha: 'DESC' },
    });
    
    return facturas.map(factura => this.enriquecerFacturaConVehiculo(factura));
  }

  async findByCliente(clienteId: number) {
    const facturas = await this.facturaRepo.find({
      where: {
        cliente: { id: clienteId },
        deleted_at: null
      },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'vehiculo', 'mecanico'], // Añadir 'vehiculo'
      order: { fecha: 'DESC' },
    });
    
    return facturas.map(factura => this.enriquecerFacturaConVehiculo(factura));
  }

  async findByFechaRange(fechaInicio: Date, fechaFin: Date) {
    const facturas = await this.facturaRepo.find({
      where: {
        fecha: Between(fechaInicio, fechaFin),
        deleted_at: null,
      },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'vehiculo', 'mecanico'], // Añadir 'vehiculo'
      order: { fecha: 'DESC' },
    });
    
    return facturas.map(factura => this.enriquecerFacturaConVehiculo(factura));
  }

  async updateEstadoPago(id: number, dto: UpdateEstadoPagoDto) {
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (factura.estado_pago === dto.estado_pago) {
      return factura;
    }

    factura.estado_pago = dto.estado_pago;

    if (dto.estado_pago === EstadoPago.PAGADO) {
      factura.pagado_at = dto.fecha_pago || new Date();
    } else {
      factura.pagado_at = null;
    }

    return this.facturaRepo.save(factura);
  }

  async marcarComoPagada(id: number, fechaPago?: Date) {
    return this.updateEstadoPago(id, {
      estado_pago: EstadoPago.PAGADO,
      fecha_pago: fechaPago,
    });
  }

  async marcarComoNoPagada(id: number) {
    return this.updateEstadoPago(id, {
      estado_pago: EstadoPago.NO_PAGA,
    });
  }

  async remove(id: number) {
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
      relations: ['orden'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (factura.estado_pago === EstadoPago.PAGADO) {
      throw new ForbiddenException('No se puede eliminar una factura pagada');
    }

    factura.deleted_at = new Date();
    await this.facturaRepo.save(factura);

    if (factura.orden) {
      factura.orden.estado = EstadoOrden.TERMINADA;
      await this.ordenRepo.save(factura.orden);
    }

    return {
      message: 'Factura eliminada correctamente',
      id: factura.id,
      fecha: new Date().toISOString()
    };
  }

  async restore(id: number) {
    const factura = await this.facturaRepo.findOne({
      where: { id },
      withDeleted: true,
      relations: ['orden'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (!factura.deleted_at) {
      throw new BadRequestException('La factura no está eliminada');
    }

    factura.deleted_at = null;
    await this.facturaRepo.save(factura);

    if (factura.orden) {
      factura.orden.estado = EstadoOrden.FACTURADA;
      await this.ordenRepo.save(factura.orden);
    }

    return factura;
  }

  async verificarSiPuedeEditar(id: number) {
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    return {
      puede_editar: factura.estado_pago === EstadoPago.NO_PAGA,
      estado_actual: factura.estado_pago,
      motivo: factura.estado_pago === EstadoPago.PAGADO
        ? 'No se puede editar una factura pagada'
        : 'Factura editable'
    };
  }

  async getServiciosDisponibles() {
    return await this.servicioRepo.find({
      where: { esActivo: true },
      order: { nombre: 'ASC' },
    });
  }

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

  async getEstadisticas() {
    const totalFacturas = await this.facturaRepo.count({
      where: { deleted_at: null }
    });

    const facturasPagadas = await this.facturaRepo.count({
      where: {
        estado_pago: EstadoPago.PAGADO,
        deleted_at: null
      }
    });

    const facturasNoPagadas = await this.facturaRepo.count({
      where: {
        estado_pago: EstadoPago.NO_PAGA,
        deleted_at: null
      }
    });

    const totalRecaudado = await this.facturaRepo
      .createQueryBuilder('factura')
      .select('SUM(factura.total)', 'total')
      .where('factura.estado_pago = :estado', { estado: EstadoPago.PAGADO })
      .andWhere('factura.deleted_at IS NULL')
      .getRawOne();

    const pendienteCobro = await this.facturaRepo
      .createQueryBuilder('factura')
      .select('SUM(factura.total)', 'total')
      .where('factura.estado_pago = :estado', { estado: EstadoPago.NO_PAGA })
      .andWhere('factura.deleted_at IS NULL')
      .getRawOne();

    return {
      total_facturas: totalFacturas,
      facturas_pagadas: facturasPagadas,
      facturas_no_pagadas: facturasNoPagadas,
      porcentaje_pagado: totalFacturas > 0 ? ((facturasPagadas / totalFacturas) * 100).toFixed(2) : '0.00',
      total_recaudado: parseFloat(totalRecaudado?.total || '0') || 0,
      pendiente_cobro: parseFloat(pendienteCobro?.total || '0') || 0,
    };
  }

  // Método para generar y descargar PDF
  async generarYDescargarPdf(id: number): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const factura = await this.facturaRepo.findOne({
      where: { id, deleted_at: null },
      relations: ['cliente', 'orden', 'orden.vehiculo', 'mecanico', 'detalles'],
    });

    if (!factura) {
      throw new NotFoundException('Factura no encontrada');
    }

    const buffer = await this.generarPdfFactura(factura);
    const nombreArchivo = `factura-${factura.id}-${factura.cliente.nombre.replace(/\s+/g, '-')}.pdf`;

    return { buffer, nombreArchivo };
  }
}