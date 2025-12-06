import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UexCategory } from './entities/uex-category.entity';

@Injectable()
export class UexService {
  constructor(
    @InjectRepository(UexCategory)
    private readonly categoryRepository: Repository<UexCategory>,
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
}
