// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MecanicosService } from '../mecanicos/mecanicos.service';

@Injectable()
export class AuthService {
  usuariosRepo: any;
  constructor(
    private usuariosService: UsuariosService,
    private mecanicosService: MecanicosService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usuariosService.findByUsername(username);
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Buscar información del mecánico si el rol es MECANICO
    let mecanico = null;
    if (user.rol === 'MECANICO') {
      mecanico = await this.mecanicosService.findByUsuarioId(user.id);
    }

    return {
      id: user.id,
      username: user.usuario,
      rol: user.rol,
      mecanicoId: mecanico?.id || null,
      nombreMecanico: mecanico?.nombre || null
    };
  }

  async login(user: any) {
    const payload = { 
      username: user.username, 
      sub: user.id,
      rol: user.rol,
      mecanicoId: user.mecanicoId 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        rol: user.rol,
        mecanicoId: user.mecanicoId,
        nombreMecanico: user.nombreMecanico
      }
    };
  }
 async verificarPasswordAdmin(password: string) {
  const admin = await this.usuariosService.findByUsername('admin');

  if (!admin) {
    throw new UnauthorizedException('Usuario admin no existe');
  }

  if (!admin.activo) {
    throw new UnauthorizedException('Usuario admin inactivo');
  }

  const passwordOk = await bcrypt.compare(password, admin.password);

  if (!passwordOk) {
    throw new UnauthorizedException('Contraseña incorrecta');
  }

  return { ok: true };
}


  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}