import { Test, TestingModule } from '@nestjs/testing';
import { OrdenesServicioService } from './ordenes-servicio.service';

describe('OrdenesServicioService', () => {
  let service: OrdenesServicioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdenesServicioService],
    }).compile();

    service = module.get<OrdenesServicioService>(OrdenesServicioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
