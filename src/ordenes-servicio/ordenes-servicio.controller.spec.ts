import { Test, TestingModule } from '@nestjs/testing';
import { OrdenesServicioController } from './ordenes-servicio.controller';

describe('OrdenesServicioController', () => {
  let controller: OrdenesServicioController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdenesServicioController],
    }).compile();

    controller = module.get<OrdenesServicioController>(OrdenesServicioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
