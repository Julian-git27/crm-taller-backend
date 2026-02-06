// src/mecanicos/mecanicos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MecanicosService } from './mecanicos.service';
import { MecanicosController } from './mecanicos.controller';
import { Mecanico } from './mecanicos.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mecanico]),
    UsuariosModule
  ],
  controllers: [MecanicosController],
  providers: [MecanicosService],
  exports: [MecanicosService],
})
export class MecanicosModule {}