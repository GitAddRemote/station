import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexCategory } from './entities/uex-category.entity';
import { UexItem } from './entities/uex-item.entity';
import { UexItemSearchDto } from './dto/uex-item-search.dto';
import { UexStarSystem } from './entities/uex-star-system.entity';
import { UexStarSystemFilterDto } from './dto/uex-star-system-filter.dto';

@Injectable()
export class UexService {
  constructor(
    @InjectRepository(UexCategory)
    private readonly categoryRepository: Repository<UexCategory>,
    @InjectRepository(UexItem)
    private readonly itemRepository: Repository<UexItem>,
    @InjectRepository(UexStarSystem)
    private readonly starSystemRepository: Repository<UexStarSystem>,
  ) {}

  async getActiveCategories(): Promise<
    Array<{ id: number; name: string; section?: string; type?: string }>
  > {
    const categories = await this.categoryRepository.find({
      where: { active: true, deleted: false },
      order: { name: 'ASC' },
      select: ['id', 'name', 'section', 'type'],
    });

    return categories.map((category) => ({
      id: Number(category.id),
      name: category.name,
      section: category.section || undefined,
      type: category.type || undefined,
    }));
  }

  async searchItems(searchDto: UexItemSearchDto): Promise<{
    items: Array<{
      id: number;
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
        id: Number(item.id),
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

  async getStarSystems(filters: UexStarSystemFilterDto = {}): Promise<
    Array<{
      id: number;
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
      id: Number(system.id),
      uexId: system.uexId,
      name: system.name,
      code: system.code,
      active: system.active,
    }));
  }
}
