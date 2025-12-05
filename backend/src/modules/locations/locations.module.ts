import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { LocationsService } from './locations.service';
import { LocationPopulationService } from './location-population.service';
import { Game } from '../games/game.entity';
import { User } from '../users/user.entity';
import { UexStarSystem } from '../uex/entities/uex-star-system.entity';
import { UexPlanet } from '../uex/entities/uex-planet.entity';
import { UexMoon } from '../uex/entities/uex-moon.entity';
import { UexCity } from '../uex/entities/uex-city.entity';
import { UexSpaceStation } from '../uex/entities/uex-space-station.entity';
import { UexOutpost } from '../uex/entities/uex-outpost.entity';
import { UexPoi } from '../uex/entities/uex-poi.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      Game,
      User,
      UexStarSystem,
      UexPlanet,
      UexMoon,
      UexCity,
      UexSpaceStation,
      UexOutpost,
      UexPoi,
    ]),
  ],
  providers: [LocationsService, LocationPopulationService],
  exports: [LocationsService, LocationPopulationService],
})
export class LocationsModule {}
