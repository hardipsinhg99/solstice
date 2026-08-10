/**
 * The storage seam.
 *
 * Nothing outside this folder may touch the filesystem, construct a disk path,
 * or import `fs`. Media controller and service depend on this abstract class
 * only, which is what makes a future S3/Cloudinary implementation a single new
 * class rather than a rewrite - see docs/admin-cms-blueprint.md and acceptance
 * check 10.
 *
 * `storagePath` is an OPAQUE KEY. It happens to be a relative filename under the
 * local driver, but no caller may interpret it - an S3 driver would put a bucket
 * key there and a Cloudinary driver a public id.
 */
export interface StoredFile {
  storagePath: string;
  url: string;
}

export interface SaveMeta {
  /** Extension without the dot, e.g. "webp". Drivers use it for the stored key. */
  extension: string;
  contentType: string;
}

export abstract class StorageService {
  abstract save(buffer: Buffer, meta: SaveMeta): Promise<StoredFile>;
  /** Must be idempotent: deleting an already-absent file is not an error. */
  abstract delete(storagePath: string): Promise<void>;
}
