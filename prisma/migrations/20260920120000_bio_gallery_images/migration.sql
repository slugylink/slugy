-- Gallery images shown in the bio links horizontal carousel.
CREATE TABLE "bio_gallery_images" (
    "id" TEXT NOT NULL,
    "bioId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bio_gallery_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bio_gallery_images_bioId_idx" ON "bio_gallery_images"("bioId");

ALTER TABLE "bio_gallery_images"
  ADD CONSTRAINT "bio_gallery_images_bioId_fkey"
  FOREIGN KEY ("bioId") REFERENCES "bios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;