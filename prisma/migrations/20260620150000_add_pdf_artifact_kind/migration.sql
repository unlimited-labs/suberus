-- PDF joins the diff artifact kinds (the PDF version-diff path normalizes via the
-- docling sidecar). `kind` is part of the artifact cache key, so PDF and DOCX
-- artifacts for the same source sha never collide.
ALTER TYPE "ArtifactKind" ADD VALUE IF NOT EXISTS 'PDF';
