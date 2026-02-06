import { Test, TestingModule } from '@nestjs/testing';
import { MecanicosController } from './mecanicos.controller';

describe('MecanicosController', () => {
  let controller: MecanicosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecanicosController],
    }).compile();

    controller = module.get<MecanicosController>(MecanicosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
