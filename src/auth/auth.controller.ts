// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
  ) {}

  @Public() // 👈 Agrega este decorador
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { username: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Public() // 👈 Agrega este también si quieres validar tokens sin autenticación
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }

  @Post('verificar-admin-password')
async verificarAdminPassword(@Body('password') password: string) {
  return this.authService.verificarPasswordAdmin(password);
}

 @UseGuards(JwtAuthGuard)
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // 1. Validar contraseña actual
    const user = await this.usuariosService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword, 
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // 2. Actualizar contraseña
    await this.usuariosService.updatePassword(userId, changePasswordDto.newPassword);

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  }
}