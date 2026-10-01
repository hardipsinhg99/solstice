import { Global, Module } from '@nestjs/common';
import { PrerenderController } from './prerender.controller';
import { PrerenderService } from './prerender.service';

/** Global: pages, products and settings all trigger rebuilds, and threading the
    same provider through three modules' imports adds nothing. */
@Global()
@Module({
  controllers: [PrerenderController],
  providers: [PrerenderService],
  exports: [PrerenderService],
})
export class PrerenderModule {}
