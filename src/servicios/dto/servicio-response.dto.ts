import { ApiProperty } from '@nestjs/swagger';

export class ServicioResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty()
  precio: number;

  @ApiProperty()
  duracionMinutos: number;

  @ApiProperty({ required: false })
  categoria?: string;

  @ApiProperty()
  esActivo: boolean;

  @ApiProperty()
  requiereRepuestos: boolean;

  @ApiProperty({ required: false })
  observaciones?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}