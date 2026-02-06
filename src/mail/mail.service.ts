// src/mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verificar conexión
    this.verificarConexion();
  }

  private async verificarConexion() {
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de correo configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando servicio de correo:', error);
    }
  }

  async enviarFactura(
    emailDestino: string,
    nombreCliente: string,
    facturaId: number,
    asunto: string,
    mensaje: string,
    pdfBuffer: Buffer,
    copia?: string
  ) {
    const mailOptions: nodemailer.SendMailOptions = {
      from:  process.env.MAIL_FROM,
      to: emailDestino,
      cc: copia,
      subject: asunto,
      html: this.generarHtmlCorreo(nombreCliente, facturaId, mensaje, pdfBuffer.length),
      attachments: [
        {
          filename: `factura-${facturaId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Correo enviado exitosamente:', {
        messageId: info.messageId,
        to: emailDestino,
        facturaId,
        timestamp: new Date().toISOString(),
      });
      
      return { 
        success: true, 
        messageId: info.messageId,
        info 
      };
    } catch (error: any) {
      console.error('❌ Error enviando correo:', {
        error: error.message,
        to: emailDestino,
        facturaId,
      });
      throw new Error(`Error al enviar correo: ${error.message}`);
    }
  }

  private generarHtmlCorreo(
    nombreCliente: string,
    facturaId: number,
    mensaje: string,
    pdfSize: number
  ): string {
    const fecha = new Date().toLocaleDateString('es-ES');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura #${facturaId}</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:20px 0;">
    <tr>
      <td align="center">

        <!-- CONTENEDOR -->
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:#0f172a; padding:24px; text-align:center;">
              
              <!-- LOGO -->
              <!--
              <img src="data:image/png;base64,XXXX"
                   alt="Logo Taller"
                   width="140"
                   style="display:block; margin:0 auto 12px;">
              -->

              <h1 style="margin:0; color:#ffffff; font-size:22px;">
                Factura #${facturaId}
              </h1>
              <p style="margin:6px 0 0; color:#cbd5f5; font-size:13px;">
                Taller Mecánico Automotriz
              </p>
            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td style="padding:28px; color:#111827;">

              <!-- SALUDO -->
              <p style="margin:0 0 16px; font-size:15px;">
                Hola <strong>${nombreCliente}</strong>,
              </p>

              <!-- MENSAJE -->
              <div style="
                background:#f9fafb;
                border-left:4px solid #2563eb;
                padding:16px;
                margin-bottom:24px;
                font-size:14px;
                line-height:1.7;
              ">
                ${mensaje.replace(/\n/g, '<br>')}
              </div>

              <!-- INFO FACTURA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="
                background:#f0fdf4;
                border:1px solid #bbf7d0;
                border-radius:6px;
                margin-bottom:24px;
              ">
                <tr>
                  <td style="padding:16px;">
                    <strong style="color:#166534; font-size:14px;">
                      📄 Información del documento
                    </strong>

                    <table width="100%" style="margin-top:12px; font-size:13px;">
                      <tr>
                        <td>Factura</td>
                        <td align="right"><strong>#${facturaId}</strong></td>
                      </tr>
                      <tr>
                        <td>Formato</td>
                        <td align="right">PDF</td>
                      </tr>
                      <tr>
                        <td>Tamaño</td>
                        <td align="right">${Math.round(pdfSize / 1024)} KB</td>
                      </tr>
                      <tr>
                        <td>Fecha</td>
                        <td align="right">${fecha}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ADJUNTO -->
              <div style="
                text-align:center;
                padding:20px;
                border:1px dashed #c7d2fe;
                border-radius:6px;
                background:#eef2ff;
                margin-bottom:28px;
              ">
                <p style="margin:0 0 8px; font-size:14px;">
                  📎 La factura se encuentra adjunta a este correo
                </p>
                <p style="margin:0; font-size:12px; color:#4b5563;">
                  Busque el archivo <strong>factura-${facturaId}.pdf</strong>
                </p>
              </div>

              <!-- DESPEDIDA -->
              <p style="margin:0; font-size:14px;">
                Gracias por confiar en nosotros.<br>
                <strong>Taller Mecánico Automotriz</strong>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="
              background:#f9fafb;
              padding:20px;
              text-align:center;
              font-size:12px;
              color:#6b7280;
            ">
              📍 ${process.env.DIRECCION_TALLER || 'Av. Principal #123'}<br>
              📞 ${process.env.TELEFONO_TALLER || '+1 234 567 8900'}<br>
              ✉️ ${process.env.CORREO_CONTACTO || 'contacto@taller.com'}
              <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;">
              <span style="font-size:11px;">
                Este correo fue generado automáticamente. No responder.
              </span>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
  }

  async enviarCorreoVencimiento(
    emailDestino: string,
    asunto: string,
    mensaje: string,
    datosVehiculo?: {
      placa: string;
      marca: string;
      modelo: string;
      tipoDocumento: string;
      fechaVencimiento: string;
      diasRestantes: number;
      kilometraje?: number;
    }
  ) {
    // Log para debugging en producción
    console.log('📦 Datos vehículo recibidos para recordatorio:', {
      datosVehiculo,
      emailDestino,
      timestamp: new Date().toISOString()
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Taller Mecánico - Recordatorios" <${process.env.MAIL_FROM || 'no-reply@taller.com'}>`,
      to: emailDestino,
      subject: asunto,
      html: this.generarHtmlRecordatorio(mensaje, datosVehiculo),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('📧 Recordatorio enviado:', {
        messageId: info.messageId,
        to: emailDestino,
        placa: datosVehiculo?.placa,
        tipo: datosVehiculo?.tipoDocumento,
        timestamp: new Date().toISOString(),
      });
      
      return { 
        success: true, 
        messageId: info.messageId,
        info 
      };
    } catch (error: any) {
      console.error('❌ Error enviando recordatorio:', {
        error: error.message,
        to: emailDestino,
        placa: datosVehiculo?.placa,
      });
      throw new Error(`Error al enviar recordatorio: ${error.message}`);
    }
  }

  private generarHtmlRecordatorio(
    mensaje: string,
    datosVehiculo?: {
      placa: string;
      marca: string;
      modelo: string;
      tipoDocumento: string;
      fechaVencimiento: string;
      diasRestantes: number;
      kilometraje?: number;
    }
  ): string {
    // 🔧 NORMALIZAR DATOS - ESTO ES CLAVE PARA EVITAR ERROR 500
    const vehiculo = {
      placa: datosVehiculo?.placa || 'N/A',
      marca: datosVehiculo?.marca || 'N/A',
      modelo: datosVehiculo?.modelo || '',
      tipoDocumento: datosVehiculo?.tipoDocumento || 'Documento',
      fechaVencimiento: datosVehiculo?.fechaVencimiento || 'N/A',
      diasRestantes: typeof datosVehiculo?.diasRestantes === 'number'
        ? datosVehiculo.diasRestantes
        : 0,
      kilometraje: typeof datosVehiculo?.kilometraje === 'number'
        ? datosVehiculo.kilometraje
        : null,
    };

    // 🎨 COLOR DEL ESTADO BASADO EN DIAS RESTANTES (ya seguro)
    const colorEstado = vehiculo.diasRestantes <= 3
      ? '#ff4d4f'
      : vehiculo.diasRestantes <= 7
      ? '#faad14'
      : '#52c41a';

    // 🏷️ TEXTO DEL ESTADO
    const estadoTexto = vehiculo.diasRestantes <= 3
      ? 'URGENTE'
      : vehiculo.diasRestantes <= 7
      ? 'PRÓXIMO'
      : 'VIGENTE';

    // 🚨 ICONO SEGÚN ESTADO
    const iconoEstado = vehiculo.diasRestantes <= 3
      ? '🚨'
      : vehiculo.diasRestantes <= 7
      ? '⚠️'
      : '📋';
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Vencimiento</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 20px;
        }
        .header {
            background: ${vehiculo.diasRestantes <= 3 ? 
              'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' : 
              vehiculo.diasRestantes <= 7 ? 
              'linear-gradient(135deg, #faad14 0%, #d48806 100%)' :
              'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)'};
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header .icon {
            font-size: 40px;
            margin-bottom: 15px;
        }
        .content {
            padding: 30px;
        }
        .vehiculo-info {
            background-color: #f6ffed;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #52c41a;
        }
        .vehiculo-info h3 {
            margin-top: 0;
            color: #389e0d;
            font-size: 16px;
        }
        .vehiculo-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .vehiculo-item {
            font-size: 14px;
        }
        .vehiculo-item strong {
            color: #666;
            display: inline-block;
            width: 140px;
        }
        .estado-badge {
            display: inline-block;
            padding: 6px 12px;
            background-color: ${colorEstado};
            color: white;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin-left: 10px;
        }
        .mensaje-cliente {
            white-space: pre-wrap;
            background-color: #fff7e6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #fa8c16;
            font-size: 14px;
            line-height: 1.8;
        }
        .acciones {
            background-color: #f0f7ff;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            text-align: center;
        }
        .btn-accion {
            display: inline-block;
            background-color: #1890ff;
            color: white;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 0 10px;
            border: none;
            cursor: pointer;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .contact-info {
            font-size: 13px;
            color: #666;
            line-height: 1.8;
        }
        .disclaimer {
            font-size: 11px;
            color: #999;
            margin-top: 20px;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">
                ${iconoEstado}
            </div>
            <h1>Recordatorio de Vencimiento</h1>
            ${vehiculo.placa !== 'N/A' && `
            <p>
                ${vehiculo.tipoDocumento} - ${vehiculo.placa}
                <span class="estado-badge">
                    ${estadoTexto}
                </span>
            </p>
            `}
        </div>
        
        <div class="content">
            ${vehiculo.placa !== 'N/A' && `
            <div class="vehiculo-info">
                <h3>📋 Información del Vehículo</h3>
                <div class="vehiculo-details">
                    <div class="vehiculo-item">
                        <strong>Placa:</strong> ${vehiculo.placa}
                    </div>
                    <div class="vehiculo-item">
                        <strong>Vehículo:</strong> ${vehiculo.marca} ${vehiculo.modelo}
                    </div>
                    <div class="vehiculo-item">
                        <strong>Documento:</strong> ${vehiculo.tipoDocumento}
                    </div>
                    <div class="vehiculo-item">
                        <strong>Vence:</strong> ${vehiculo.fechaVencimiento}
                    </div>
                    <div class="vehiculo-item">
                        <strong>Días restantes:</strong> ${vehiculo.diasRestantes}
                    </div>
                    <div class="vehiculo-item">
                        <strong>Kilometraje:</strong>
                        ${vehiculo.kilometraje !== null
                          ? `${vehiculo.kilometraje.toLocaleString()} km`
                          : 'N/A'}
                    </div>
                </div>
            </div>
            `}
            
            <div class="mensaje-cliente">
                ${mensaje.replace(/\n/g, '<br>')}
            </div>
            
            <div class="acciones">
                <p style="margin-bottom: 20px; color: #666;">
                    <strong>¿Necesita ayuda con la renovación?</strong>
                </p>
                <a href="tel:${process.env.TELEFONO_TALLER || ''}" class="btn-accion">
                    📞 Llamar al taller
                </a>
                <a href="mailto:${process.env.CORREO_CONTACTO || ''}" class="btn-accion">
                    ✉️ Enviar correo
                </a>
            </div>
        </div>
        
        <div class="footer">
            <div class="contact-info">
                <strong>Taller Mecánico Automotriz</strong><br>
                📍 ${process.env.DIRECCION_TALLER || 'Av. Principal #123, Ciudad'}<br>
                📞 ${process.env.TELEFONO_TALLER || '+1 234 567 8900'}<br>
                ✉️ ${process.env.CORREO_CONTACTO || 'contacto@taller.com'}<br>
                🕒 ${process.env.HORARIO_TALLER || 'Lunes a Viernes: 8:00 AM - 6:00 PM'}
            </div>
            
            <div class="disclaimer">
                <hr style="border: none; border-top: 1px solid #e9ecef; margin: 20px 0;">
                <p>
                    Este es un mensaje automático del sistema de gestión de vehículos.<br>
                    Para dejar de recibir estos recordatorios, contacte al taller.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
  }

  // Método para pruebas
  async enviarCorreoPrueba(email: string) {
    const mailOptions = {
      from: `"Taller Mecánico" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: 'Prueba de configuración - Servicio de Correo',
      html: `
        <h1>✅ Configuración de correo exitosa</h1>
        <p>El servicio de correo del taller está configurado correctamente.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      throw error;
    }
  }
}