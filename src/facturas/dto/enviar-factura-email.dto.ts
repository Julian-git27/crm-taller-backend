// src/facturas/dto/enviar-factura-email.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnviarFacturaEmailDto {
  @ApiProperty({ description: 'Correo electrónico del destinatario' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo es requerido' })
  email: string;

  @ApiProperty({ description: 'Asunto del correo' })
  @IsNotEmpty({ message: 'El asunto es requerido' })
  @IsString()
  asunto: string;

  @ApiProperty({ description: 'Mensaje del correo' })
  @IsNotEmpty({ message: 'El mensaje es requerido' })
  @IsString()
  mensaje: string;

  @ApiProperty({ description: 'Correo para copia (CC)', required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  copia?: string;

  @ApiProperty({ description: 'PDF en base64', required: false })
  @IsOptional()
  @IsString()
  pdfBase64?: string;
}