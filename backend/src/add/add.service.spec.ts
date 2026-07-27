import { Test, TestingModule } from '@nestjs/testing';
import { AddService } from './add.service';

describe('AddService', () => {
  let service: AddService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AddService],
    }).compile();

    service = module.get<AddService>(AddService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
