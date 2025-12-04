import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UexCategory,
  UexCompany,
  UexItem,
  UexStarSystem,
  UexPlanet,
  UexMoon,
  UexCity,
  UexSpaceStation,
  UexOutpost,
  UexPoi,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UexCategory,
      UexCompany,
      UexItem,
      UexStarSystem,
      UexPlanet,
      UexMoon,
      UexCity,
      UexSpaceStation,
      UexOutpost,
      UexPoi,
    ]),
  ],
  providers: [],
  exports: [],
})
export class UexModule {}
