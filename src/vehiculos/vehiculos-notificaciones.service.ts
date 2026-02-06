import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehiculo } from './vehiculos.entity';
import { MailService } from '../mail/mail.service';
import * as dayjs from 'dayjs';

@Injectable()
export class VehiculosNotificacionesService {
  private readonly logger = new Logger(VehiculosNotificacionesService.name);

  constructor(
    @InjectRepository(Vehiculo)
    private vehiculoRepo: Repository<Vehiculo>,
    private mailService: MailService,
  ) {}

  // Verificar vencimientos y enviar notificaciones
  async verificarVencimientosYNotificar() {
    try {
      this.logger.log('Iniciando verificación de vencimientos...');
      
      const vehiculos = await this.vehiculoRepo.find({
        where: { activo: true },
        relations: ['cliente'],
      });

      let soatPorVencer = 0;
      let soatVencidos = 0;
      let tecnoPorVencer = 0;
      let tecnoVencidos = 0;
      let correosEnviados = 0;

      const hoy = dayjs();
      const resultados: any[] = [];

      for (const vehiculo of vehiculos) {
        const resultadoVehiculo = {
          placa: vehiculo.placa,
          cliente: vehiculo.cliente.nombre,
          clienteEmail: vehiculo.cliente.email,
          soat: null as any,
          tecnomecanica: null as any,
        };

        // Verificar SOAT
        if (vehiculo.fecha_vencimiento_soat) {
          const fechaSoat = dayjs(vehiculo.fecha_vencimiento_soat);
          const diasRestantesSoat = fechaSoat.diff(hoy, 'day');
          
          if (diasRestantesSoat < 0) {
            soatVencidos++;
            resultadoVehiculo.soat = {
              estado: 'VENCIDO',
              dias: Math.abs(diasRestantesSoat),
              fecha: fechaSoat.format('DD/MM/YYYY'),
            };
          } else if (diasRestantesSoat <= 7) {
            soatPorVencer++;
            resultadoVehiculo.soat = {
              estado: 'POR VENCER',
              dias: diasRestantesSoat,
              fecha: fechaSoat.format('DD/MM/YYYY'),
            };

            // Enviar correo si está por vencer (7 días o menos)
            if (vehiculo.cliente.email) {
              await this.enviarNotificacionSoat(vehiculo, diasRestantesSoat);
              correosEnviados++;
            }
          }
        }

        // Verificar Tecnomecánica
        if (vehiculo.fecha_vencimiento_tecnomecanica) {
          const fechaTecno = dayjs(vehiculo.fecha_vencimiento_tecnomecanica);
          const diasRestantesTecno = fechaTecno.diff(hoy, 'day');
          
          if (diasRestantesTecno < 0) {
            tecnoVencidos++;
            resultadoVehiculo.tecnomecanica = {
              estado: 'VENCIDA',
              dias: Math.abs(diasRestantesTecno),
              fecha: fechaTecno.format('DD/MM/YYYY'),
            };
          } else if (diasRestantesTecno <= 7) {
            tecnoPorVencer++;
            resultadoVehiculo.tecnomecanica = {
              estado: 'POR VENCER',
              dias: diasRestantesTecno,
              fecha: fechaTecno.format('DD/MM/YYYY'),
            };

            // Enviar correo si está por vencer (7 días o menos)
            if (vehiculo.cliente.email) {
              await this.enviarNotificacionTecno(vehiculo, diasRestantesTecno);
              correosEnviados++;
            }
          }
        }

        resultados.push(resultadoVehiculo);
      }

      this.logger.log(`Verificación completada:
        - SOAT por vencer: ${soatPorVencer}
        - SOAT vencidos: ${soatVencidos}
        - Tecnomecánica por vencer: ${tecnoPorVencer}
        - Tecnomecánica vencidos: ${tecnoVencidos}
        - Correos enviados: ${correosEnviados}
      `);

      return {
        totalVehiculos: vehiculos.length,
        soatPorVencer,
        soatVencidos,
        tecnoPorVencer,
        tecnoVencidos,
        correosEnviados,
        resultados,
        fecha: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error verificando vencimientos:', error);
      throw error;
    }
  }

  async enviarRecordatorioManual(vehiculoId: number, tipoDocumento: 'SOAT' | 'TECNOMECANICA') {
    try {
      this.logger.log(`Enviando recordatorio manual para vehículo ${vehiculoId}, tipo: ${tipoDocumento}`);
      
      const vehiculo = await this.vehiculoRepo.findOne({
        where: { id: vehiculoId, activo: true },
        relations: ['cliente'],
      });

      if (!vehiculo) {
        throw new NotFoundException(`Vehículo con ID ${vehiculoId} no encontrado`);
      }

      if (!vehiculo.cliente.email) {
        throw new BadRequestException(`El cliente ${vehiculo.cliente.nombre} no tiene email registrado`);
      }

      const hoy = dayjs();
      
      if (tipoDocumento === 'SOAT') {
        if (!vehiculo.fecha_vencimiento_soat) {
          throw new BadRequestException(`El vehículo ${vehiculo.placa} no tiene fecha de vencimiento para SOAT`);
        }
        
        const fechaSoat = dayjs(vehiculo.fecha_vencimiento_soat);
        const diasRestantes = fechaSoat.diff(hoy, 'day');
        await this.enviarNotificacionSoat(vehiculo, diasRestantes);
        
        this.logger.log(`Recordatorio manual SOAT enviado para ${vehiculo.placa}`);
        return {
          success: true,
          message: `Recordatorio SOAT enviado a ${vehiculo.cliente.email}`,
          placa: vehiculo.placa,
          cliente: vehiculo.cliente.nombre,
          diasRestantes,
        };
      } 
      else if (tipoDocumento === 'TECNOMECANICA') {
        if (!vehiculo.fecha_vencimiento_tecnomecanica) {
          throw new BadRequestException(`El vehículo ${vehiculo.placa} no tiene fecha de vencimiento para Tecnomecánica`);
        }
        
        const fechaTecno = dayjs(vehiculo.fecha_vencimiento_tecnomecanica);
        const diasRestantes = fechaTecno.diff(hoy, 'day');
        await this.enviarNotificacionTecno(vehiculo, diasRestantes);
        
        this.logger.log(`Recordatorio manual Tecnomecánica enviado para ${vehiculo.placa}`);
        return {
          success: true,
          message: `Recordatorio Tecnomecánica enviado a ${vehiculo.cliente.email}`,
          placa: vehiculo.placa,
          cliente: vehiculo.cliente.nombre,
          diasRestantes,
        };
      } 
      else {
        throw new BadRequestException(`Tipo de documento inválido: ${tipoDocumento}`);
      }
    } catch (error) {
      this.logger.error(`Error enviando recordatorio manual para vehículo ${vehiculoId}:`, error);
      
      // Relanzar el error para que el controlador lo maneje
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Si es otro tipo de error, lanzar uno genérico
      throw new BadRequestException(`Error al enviar recordatorio: ${error.message}`);
    }
  }

  async getVehiculosSinEmail() {
    const vehiculos = await this.vehiculoRepo.find({
      where: { activo: true },
      relations: ['cliente'],
    });

    return vehiculos
      .filter(v => !v.cliente.email)
      .map(v => ({
        id: v.id,
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        cliente: {
          id: v.cliente.id,
          nombre: v.cliente.nombre,
          identificacion: v.cliente.identificacion,
        },
        fecha_vencimiento_soat: v.fecha_vencimiento_soat,
        fecha_vencimiento_tecnomecanica: v.fecha_vencimiento_tecnomecanica,
      }));
  }

  // Enviar notificación de SOAT por vencer
  private async enviarNotificacionSoat(vehiculo: Vehiculo, diasRestantes: number) {
    const fechaVencimiento = dayjs(vehiculo.fecha_vencimiento_soat).format('DD/MM/YYYY');
    
    const asunto = `🚨 Recordatorio: SOAT de ${vehiculo.placa} por vencer`;
    const mensaje = `
Estimado/a ${vehiculo.cliente.nombre},

Le escribimos para recordarle que el **SOAT** de su vehículo está próximo a vencer.

━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL VEHÍCULO
━━━━━━━━━━━━━━━━━━━━
• **Placa:** ${vehiculo.placa}
• **Vehículo:** ${vehiculo.marca} ${vehiculo.modelo}
• **Fecha de vencimiento:** ${fechaVencimiento}
• **Días restantes:** ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}

━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANTE
━━━━━━━━━━━━━━━━━━━━
Renovar el SOAT a tiempo le evita inconvenientes como:
• Multas y sanciones económicas
• Inmovilización del vehículo
• Pérdida de cobertura ante accidentes

━━━━━━━━━━━━━━━━━━━━
📍 RENOVACIÓN DE SOAT
━━━━━━━━━━━━━━━━━━━━
En nuestro taller podemos asesorarle y ayudarle con el proceso de renovación.

📞 **Contacto:**  
${process.env.TELEFONO_TALLER || 'Teléfono del taller'}

Si ya realizó la renovación, por favor ignore este mensaje.

Atentamente,  
**Sistema de Gestión de Vehículos**  
*Taller Mecánico Automotriz*
`.trim();

    try {
      await this.mailService.enviarCorreoVencimiento(
        vehiculo.cliente.email,
        asunto,
        mensaje,
        {
          placa: vehiculo.placa,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          tipoDocumento: 'SOAT',
          fechaVencimiento,
          diasRestantes,
        }
      );
      this.logger.log(`Notificación SOAT enviada a ${vehiculo.cliente.email} - ${vehiculo.placa}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación SOAT a ${vehiculo.cliente.email}:`, error);
      throw error; // Relanzar el error
    }
  }

  // Enviar notificación de Tecnomecánica por vencer
  private async enviarNotificacionTecno(vehiculo: Vehiculo, diasRestantes: number) {
    const fechaVencimiento = dayjs(vehiculo.fecha_vencimiento_tecnomecanica).format('DD/MM/YYYY');
    
    const asunto = `🔧 Recordatorio: Revisión Tecnomecánica de ${vehiculo.placa} por vencer`;
    const mensaje = `
Estimado/a ${vehiculo.cliente.nombre},

Le recordamos que la **Revisión Técnico-Mecánica** de su vehículo está próxima a vencer.

━━━━━━━━━━━━━━━━━━━━
📋 INFORMACIÓN DEL VEHÍCULO
━━━━━━━━━━━━━━━━━━━━
• **Placa:** ${vehiculo.placa}
• **Vehículo:** ${vehiculo.marca} ${vehiculo.modelo}
• **Fecha de vencimiento:** ${fechaVencimiento}
• **Días restantes:** ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}
• **Kilometraje actual:** ${vehiculo.kilometraje || 'No registrado'} km

━━━━━━━━━━━━━━━━━━━━
🔧 SOBRE LA REVISIÓN TECNOMECÁNICA
━━━━━━━━━━━━━━━━━━━━
Este certificado es obligatorio y garantiza que su vehículo cumple con las condiciones mínimas de seguridad y funcionamiento.

━━━━━━━━━━━━━━━━━━━━
⚠️ CONSECUENCIAS DE NO RENOVAR
━━━━━━━━━━━━━━━━━━━━
• Multas por circular sin certificado vigente
• Inmovilización del vehículo
• Dificultades para renovar el SOAT

━━━━━━━━━━━━━━━━━━━━
📍 AGENDE SU CITA
━━━━━━━━━━━━━━━━━━━━
En nuestro taller contamos con el servicio de revisión técnico-mecánica.  
Agende su cita con anticipación y evite contratiempos.

📞 **Contacto:**  
${process.env.TELEFONO_TALLER || 'Teléfono del taller'}

Si ya realizó la revisión, puede ignorar este mensaje.

Atentamente,  
**Sistema de Gestión de Vehículos**  
*Taller Mecánico Automotriz*
`.trim();
    try {
      await this.mailService.enviarCorreoVencimiento(
        vehiculo.cliente.email,
        asunto,
        mensaje,
        {
          placa: vehiculo.placa,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          tipoDocumento: 'TECNOMECANICA', // 🔴 CORREGIDO: ahora en mayúsculas
          fechaVencimiento,
          diasRestantes,
          kilometraje: vehiculo.kilometraje,
        }
      );
      this.logger.log(`Notificación Tecnomecánica enviada a ${vehiculo.cliente.email} - ${vehiculo.placa}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación Tecnomecánica a ${vehiculo.cliente.email}:`, error);
      throw error; // Relanzar el error
    }
  }

  // Obtener vehículos con documentos por vencer (para panel de control)
  async getVehiculosPorVencer() {
    const hoy = dayjs();
    const vehiculos = await this.vehiculoRepo.find({
      where: { activo: true },
      relations: ['cliente'],
    });

    const soatPorVencer = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_soat) return false;
      const dias = dayjs(v.fecha_vencimiento_soat).diff(hoy, 'day');
      return dias <= 30 && dias >= 0;
    });

    const tecnoPorVencer = vehiculos.filter(v => {
      if (!v.fecha_vencimiento_tecnomecanica) return false;
      const dias = dayjs(v.fecha_vencimiento_tecnomecanica).diff(hoy, 'day');
      return dias <= 30 && dias >= 0;
    });

    const vencidos = vehiculos.filter(v => {
      const soatVencido = v.fecha_vencimiento_soat && dayjs(v.fecha_vencimiento_soat).isBefore(hoy, 'day');
      const tecnoVencido = v.fecha_vencimiento_tecnomecanica && dayjs(v.fecha_vencimiento_tecnomecanica).isBefore(hoy, 'day');
      return soatVencido || tecnoVencido;
    });

    return {
      soatPorVencer: soatPorVencer.map(v => ({
        id: v.id,
        placa: v.placa,
        cliente: v.cliente.nombre,
        email: v.cliente.email,
        fecha: v.fecha_vencimiento_soat,
        diasRestantes: dayjs(v.fecha_vencimiento_soat).diff(hoy, 'day'),
      })),
      tecnoPorVencer: tecnoPorVencer.map(v => ({
        id: v.id,
        placa: v.placa,
        cliente: v.cliente.nombre,
        email: v.cliente.email,
        fecha: v.fecha_vencimiento_tecnomecanica,
        diasRestantes: dayjs(v.fecha_vencimiento_tecnomecanica).diff(hoy, 'day'),
      })),
      vencidos: vencidos.map(v => ({
        id: v.id,
        placa: v.placa,
        cliente: v.cliente.nombre,
        soatVencido: v.fecha_vencimiento_soat && dayjs(v.fecha_vencimiento_soat).isBefore(hoy, 'day'),
        tecnoVencido: v.fecha_vencimiento_tecnomecanica && dayjs(v.fecha_vencimiento_tecnomecanica).isBefore(hoy, 'day'),
      })),
      total: {
        soatPorVencer: soatPorVencer.length,
        tecnoPorVencer: tecnoPorVencer.length,
        vencidos: vencidos.length,
      },
    };
  }
}