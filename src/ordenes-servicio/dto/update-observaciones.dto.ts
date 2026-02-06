import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateObservacionesDto {
  @ApiProperty({ 
    required: false, 
    description: 'Observaciones de la orden',
    example: 'Se cambió el aceite y filtro' 
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}