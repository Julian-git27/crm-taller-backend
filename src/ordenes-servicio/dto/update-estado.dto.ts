import { IsEnum } from 'class-validator';
import { EstadoOrden } from '../orden-servicio.entity';

export class UpdateEstadoDto {
  @IsEnum(EstadoOrden, {
    message:
      'Estado inválido. Valores permitidos: RECIBIDA, EN_PROCESO, TERMINADA, FACTURADA',
  })
  estado: EstadoOrden;
}
