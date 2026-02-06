import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';

export class EnviarRecordatorioDto {
  @ApiProperty({
    description: 'Tipo de documento a notificar',
    enum: ['SOAT', 'TECNOMECANICA'],
    example: 'SOAT',
  })
  @IsNotEmpty()
  @IsIn(['SOAT', 'TECNOMECANICA'])
  tipoDocumento: 'SOAT' | 'TECNOMECANICA';
}