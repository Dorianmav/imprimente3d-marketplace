import { Test, TestingModule } from '@nestjs/testing';
import { ImprimeurController } from './imprimeur.controller';

describe('ImprimeurController', () => {
  let controller: ImprimeurController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImprimeurController],
    }).compile();

    controller = module.get<ImprimeurController>(ImprimeurController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
