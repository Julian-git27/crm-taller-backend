// src/shared/dto/buscar-items.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  tipo: 'PRODUCTO' | 'SERVICIO';

  @ApiProperty()
  precio: number;

  @ApiProperty({ required: false })
  referencia?: string;

  @ApiProperty({ required: false })
  categoria?: string;

  @ApiProperty({ required: false })
  stock?: number;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty({ required: false })
  duracionMinutos?: number;
}

export class ItemsCombinadosResponseDto {
  @ApiProperty({ type: [ItemResponseDto] })
  productos: ItemResponseDto[];

  @ApiProperty({ type: [ItemResponseDto] })
  servicios: ItemResponseDto[];
}