import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('materiau') materiau?: string,
    @Query('categorie') categorie?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.searchService.search(query, {
      type: type as any,
      materiau,
      categorie,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
    });
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.searchService.autocomplete(query, type as any, parsedLimit);
  }

  @Get('trending')
  async getTrending(
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.searchService.getTrending(parsedLimit);
  }
}
