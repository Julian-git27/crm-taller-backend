// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator'; // Importa el decorador

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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


}