import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexCategory } from './entities/uex-category.entity';
import { UexCommodity } from './entities/uex-commodity.entity';
import { UexItem } from './entities/uex-item.entity';
import { UexCommoditySearchDto } from './dto/uex-commodity-search.dto';
import { UexItemSearchDto } from './dto/uex-item-search.dto';
import { UexStarSystem } from './entities/uex-star-system.entity';
import { UexStarSystemFilterDto } from './dto/uex-star-system-filter.dto';

@Injectable()
export class UexService {
  constructor(
    @InjectRepository(UexCategory)
    private readonly categoryRepository: Repository<UexCategory>,
    @InjectRepository(UexCommodity)
    private readonly commodityRepository: Repository<UexCommodity>,
    @InjectRepository(UexItem)
    private readonly itemRepository: Repository<UexItem>,
    @InjectRepository(UexStarSystem)
    private readonly starSystemRepository: Repository<UexStarSystem>,
  ) {}

  async getActiveCategories(): Promise<
    Array<{ id: string; name: string; section?: string; type?: string }>
  > {
    const categories = await this.categoryRepository.find({
      where: { active: true, deleted: false },
      order: { name: 'ASC' },
      select: ['id', 'name', 'section', 'type'],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      section: category.section || undefined,
      type: category.type || undefined,
    }));
  }

  async searchItems(searchDto: UexItemSearchDto): Promise<{
    items: Array<{
      id: string;
      uexId: number;
      name: string;
      categoryId?: number;
      categoryName?: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryBuilder = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .where('item.deleted = FALSE')
      .andWhere('item.active = TRUE');

    if (searchDto.categoryId) {
      queryBuilder.andWhere('item.idCategory = :categoryId', {
        categoryId: searchDto.categoryId,
      });
    }

    if (searchDto.search) {
      queryBuilder.andWhere('item.name ILIKE :search', {
        search: `%${searchDto.search}%`,
      });
    }

    const limit = Math.min(searchDto.limit ?? 25, 100);
    const offset = searchDto.offset ?? 0;

    queryBuilder.orderBy('item.name', 'ASC').take(limit).skip(offset);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map((item) => ({
        id: item.id,
        uexId: item.uexId,
        name: item.name,
        categoryId: item.idCategory || undefined,
        categoryName: item.category?.name || item.categoryName || undefined,
      })),
      total,
      limit,
      offset,
    };
  }

  async searchCommodities(searchDto: UexCommoditySearchDto): Promise<{
    commodities: Array<{
      id: string;
      uexId: number;
      name: string;
      code?: string;
      section?: string;
      categoryId?: number;
      isBuyable: boolean;
      isSellable: boolean;
      isIllegal: boolean;
      isFuel: boolean;
      priceBuy?: number;
      priceSell?: number;
      scu?: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryBuilder = this.commodityRepository
      .createQueryBuilder('commodity')
      .where('commodity.deleted = FALSE')
      .andWhere('commodity.active = TRUE');

    if (searchDto.search) {
      queryBuilder.andWhere('commodity.name ILIKE :search', {
        search: `%${searchDto.search}%`,
      });
    }

    if (searchDto.categoryId) {
      queryBuilder.andWhere('commodity.idCategory = :categoryId', {
        categoryId: searchDto.categoryId,
      });
    }

    if (searchDto.isBuyable !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(commodity.isBuyable, FALSE) = :isBuyable',
        { isBuyable: searchDto.isBuyable },
      );
    }

    if (searchDto.isSellable !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(commodity.isSellable, FALSE) = :isSellable',
        { isSellable: searchDto.isSellable },
      );
    }

    if (searchDto.isIllegal !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(commodity.isIllegal, FALSE) = :isIllegal',
        { isIllegal: searchDto.isIllegal },
      );
    }

    if (searchDto.isFuel !== undefined) {
      queryBuilder.andWhere('COALESCE(commodity.isFuel, FALSE) = :isFuel', {
        isFuel: searchDto.isFuel,
      });
    }

    const limit = Math.min(searchDto.limit ?? 25, 100);
    const offset = searchDto.offset ?? 0;

    queryBuilder.orderBy('commodity.name', 'ASC').take(limit).skip(offset);

    const [commodities, total] = await queryBuilder.getManyAndCount();

    return {
      commodities: commodities.map((c) => ({
        id: c.id,
        uexId: c.uexId,
        name: c.name,
        code: c.code ?? undefined,
        section: c.section ?? undefined,
        categoryId: c.idCategory ?? undefined,
        isBuyable: c.isBuyable ?? false,
        isSellable: c.isSellable ?? false,
        isIllegal: c.isIllegal ?? false,
        isFuel: c.isFuel ?? false,
        priceBuy: c.priceBuy != null ? Number(c.priceBuy) : undefined,
        priceSell: c.priceSell != null ? Number(c.priceSell) : undefined,
        scu: c.scu != null ? Number(c.scu) : undefined,
      })),
      total,
      limit,
      offset,
    };
  }

  async getStarSystems(filters: UexStarSystemFilterDto = {}): Promise<
    Array<{
      id: string;
      uexId: number;
      name: string;
      code: string;
      active: boolean;
    }>
  > {
    const queryBuilder = this.starSystemRepository
      .createQueryBuilder('system')
      .where('system.deleted = FALSE');

    if (filters.activeOnly !== false) {
      queryBuilder.andWhere('system.active = TRUE');
    }

    queryBuilder.orderBy('system.name', 'ASC');

    const systems = await queryBuilder.getMany();

    return systems.map((system) => ({
      id: system.id,
      uexId: system.uexId,
      name: system.name,
      code: system.code,
      active: system.active,
    }));
  }
}
