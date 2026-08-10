import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalDiskStorageService } from './local-disk-storage.service';

/**
 * Swapping to S3 is this one binding plus one new class implementing
 * StorageService. No consumer changes, because no consumer knows a filesystem
 * exists.
 */
@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalDiskStorageService }],
  exports: [StorageService],
})
export class StorageModule {}
