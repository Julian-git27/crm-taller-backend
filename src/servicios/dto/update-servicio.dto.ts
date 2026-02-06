import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateServicioDto } from './create-servicio.dto';

export class UpdateServicioDto extends PartialType(CreateServicioDto) {
  @ApiProperty({ required: false, description: 'Estado activo/inactivo' })
  @IsOptional()
  @IsBoolean()
  esActivo?: boolean;
}
