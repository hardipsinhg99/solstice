import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { MediaModule } from '../media/media.module';

// MediaModule imported, not reimplemented - the one upload pipeline.
@Module({ imports: [MediaModule], controllers: [TeamController], providers: [TeamService] })
export class TeamModule {}
