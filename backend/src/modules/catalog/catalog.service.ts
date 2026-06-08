import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import {
  CatalogEntryDto,
  PaginatedCatalogEntriesDto,
} from './dto/catalog-entry.dto';
import { CatalogCategoryTreeDto } from './dto/catalog-category-tree.dto';
import { StationCatalogCategory } from './entities/station-catalog-category.entity';
import { StationCatalogEntry } from './entities/station-catalog-entry.entity';

@Injectable()
export class CatalogService {
  private readonly CACHE_TTL_MS = 300_000;

  constructor(
    @InjectRepository(StationCatalogEntry)
    private readonly entryRepository: Repository<StationCatalogEntry>,
    @InjectRepository(StationCatalogCategory)
    private readonly categoryRepository: Repository<StationCatalogCategory>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async searchCatalog(
    query: CatalogQueryDto,
  ): Promise<PaginatedCatalogEntriesDto> {
    const normalized = this.normalizeQuery(query);
    const cacheKey = this.buildSearchCacheKey(normalized);
    const cached =
      await this.cacheManager.get<PaginatedCatalogEntriesDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const categoryFilter = normalized.categoryId
      ? await this.categoryRepository.findOne({
          where: { id: normalized.categoryId },
        })
      : null;

    if (normalized.categoryId && !categoryFilter) {
      throw new NotFoundException(
        `Catalog category with ID ${normalized.categoryId} not found`,
      );
    }

    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .innerJoinAndSelect('entry.category', 'category')
      .orderBy('entry.name', 'ASC')
      .skip((normalized.page - 1) * normalized.limit)
      .take(normalized.limit);

    if (!normalized.includeUnavailable) {
      queryBuilder.andWhere('entry.is_available_live = TRUE');
    }

    if (normalized.search) {
      queryBuilder.andWhere('entry.name ILIKE :search', {
        search: `%${normalized.search}%`,
      });
    }

    if (categoryFilter) {
      queryBuilder.andWhere(
        '(category.path = :categoryPath OR category.path LIKE :categoryPathLike)',
        {
          categoryPath: categoryFilter.path,
          categoryPathLike: `${categoryFilter.path}.%`,
        },
      );
    }

    const [entries, total] = await queryBuilder.getManyAndCount();

    const result: PaginatedCatalogEntriesDto = {
      data: entries.map((entry) => this.toCatalogEntryDto(entry)),
      total,
      page: normalized.page,
      limit: normalized.limit,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_MS);

    return result;
  }

  async getCategoryTree(): Promise<CatalogCategoryTreeDto[]> {
    const cacheKey = 'catalog:categories:tree';
    const cached =
      await this.cacheManager.get<CatalogCategoryTreeDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const categories = await this.categoryRepository.find({
      order: { depth: 'ASC', sortOrder: 'ASC', name: 'ASC' },
    });

    const nodes = new Map<string, CatalogCategoryTreeDto>();
    const roots: CatalogCategoryTreeDto[] = [];

    for (const category of categories) {
      nodes.set(category.id, {
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        slug: category.slug,
        path: category.path,
        pathIds: category.pathIds,
        depth: category.depth,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        children: [],
      });
    }

    for (const category of categories) {
      const node = nodes.get(category.id)!;
      if (category.parentId) {
        nodes.get(category.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    await this.cacheManager.set(cacheKey, roots, this.CACHE_TTL_MS);

    return roots;
  }

  async getCatalogEntryById(id: string): Promise<CatalogEntryDto> {
    const cacheKey = `catalog:entry:${id}`;
    const cached = await this.cacheManager.get<CatalogEntryDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!entry) {
      throw new NotFoundException(`Catalog entry with ID ${id} not found`);
    }

    const result = this.toCatalogEntryDto(entry);
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  private normalizeQuery(query: CatalogQueryDto): CatalogQueryDto {
    return {
      categoryId: query.categoryId,
      search: query.search?.trim() || undefined,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? 50, 200),
      includeUnavailable: query.includeUnavailable ?? false,
    };
  }

  private buildSearchCacheKey(query: CatalogQueryDto): string {
    return [
      `catalog:search=${query.search ?? ''}`,
      `cat=${query.categoryId ?? ''}`,
      `page=${query.page}`,
      `limit=${query.limit}`,
      `unavail=${query.includeUnavailable}`,
    ].join(':');
  }

  private toCatalogEntryDto(entry: StationCatalogEntry): CatalogEntryDto {
    return {
      id: entry.id,
      catalogKind: entry.catalogKind,
      uexId: entry.uexId,
      name: entry.name,
      slug: entry.slug,
      categoryId: entry.categoryId,
      categoryPath: entry.category.path,
      isAvailableLive: entry.isAvailableLive,
      isIllegal: entry.isIllegal,
      isConcept: entry.isConcept,
      size: entry.size,
      scu: entry.scu,
      crewMin: entry.crewMin,
      crewMax: entry.crewMax,
      baseProperties: entry.baseProperties,
      attributes: entry.attributes,
    };
  }
}
