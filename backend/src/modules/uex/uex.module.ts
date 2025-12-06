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
import { UexService } from './uex.service';
import { UexController } from './uex.controller';

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
  providers: [UexService],
  controllers: [UexController],
  exports: [UexService],
})
export class UexModule {}
