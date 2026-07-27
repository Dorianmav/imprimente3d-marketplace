import { Test, TestingModule } from '@nestjs/testing';
import { ImprimeurService } from './imprimeur.service';

describe('ImprimeurService', () => {
  let service: ImprimeurService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImprimeurService],
    }).compile();

    service = module.get<ImprimeurService>(ImprimeurService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
