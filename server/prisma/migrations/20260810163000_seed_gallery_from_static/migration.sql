-- Move the six photographs that were hardcoded at module scope in
-- src/pages/gallery/GalleryPage.jsx into the database, so switching the public
-- page to the API does not blank it.
--
-- Same treatment Phase 1b gave the product images: driver EXTERNAL, because
-- these are Unsplash URLs we only reference. StorageService must never try to
-- delete bytes it did not write. Replacing them with real photography is an
-- upload in the admin, which creates LOCAL assets alongside these.
--
-- width/height are 0 - the intrinsic size of these remote files was never
-- measured, and a guessed number is worse than an absent one. The public page
-- omits the attributes when they are 0, exactly as the product cards do.
--
-- altText is NULL on purpose. The page rendered alt="" for all six, so there is
-- no existing text to migrate and inventing descriptions of photographs nobody
-- has looked at would be fabricating content. The admin flags the gap.
INSERT INTO "media_assets" ("id", "filename", "storagePath", "driver", "url", "mimeType", "width", "height", "sizeBytes", "altText", "createdAt")
VALUES
  ('seedgal000000000000000001', 'gallery-01.jpg', 'external:gallery-01', 'EXTERNAL', 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP),
  ('seedgal000000000000000002', 'gallery-02.jpg', 'external:gallery-02', 'EXTERNAL', 'https://images.unsplash.com/photo-1557844352-761f2565b576?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP),
  ('seedgal000000000000000003', 'gallery-03.jpg', 'external:gallery-03', 'EXTERNAL', 'https://images.unsplash.com/photo-1518843875459-f738682238a6?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP),
  ('seedgal000000000000000004', 'gallery-04.jpg', 'external:gallery-04', 'EXTERNAL', 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP),
  ('seedgal000000000000000005', 'gallery-05.jpg', 'external:gallery-05', 'EXTERNAL', 'https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP),
  ('seedgal000000000000000006', 'gallery-06.jpg', 'external:gallery-06', 'EXTERNAL', 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=1000&q=85', 'image/jpeg', 0, 0, 0, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "gallery_images" ("id", "mediaAssetId", "caption", "order", "published", "createdAt")
VALUES
  ('seedgalimg0000000000000001', 'seedgal000000000000000001', NULL, 0, true, CURRENT_TIMESTAMP),
  ('seedgalimg0000000000000002', 'seedgal000000000000000002', NULL, 1, true, CURRENT_TIMESTAMP),
  ('seedgalimg0000000000000003', 'seedgal000000000000000003', NULL, 2, true, CURRENT_TIMESTAMP),
  ('seedgalimg0000000000000004', 'seedgal000000000000000004', NULL, 3, true, CURRENT_TIMESTAMP),
  ('seedgalimg0000000000000005', 'seedgal000000000000000005', NULL, 4, true, CURRENT_TIMESTAMP),
  ('seedgalimg0000000000000006', 'seedgal000000000000000006', NULL, 5, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
