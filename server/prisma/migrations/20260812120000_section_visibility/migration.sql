-- Section-level visibility.
--
-- Two columns, mirroring draftData/publishedData: visibility is content, so it
-- follows the save -> publish flow rather than taking effect the instant it is
-- toggled.
--
-- DEFAULT true on both is the safety property. Every row that already exists
-- becomes visible, so applying this migration changes nothing about what any
-- page renders. Defaulting to false would have blanked the entire site.
ALTER TABLE "page_sections" ADD COLUMN "draftVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "page_sections" ADD COLUMN "publishedVisible" BOOLEAN NOT NULL DEFAULT true;
