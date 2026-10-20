import { Module } from '@nestjs/common';

@Module({
  exports: [], // Decorators are tree-shaken at compile time
})
export class CommonModule {}
