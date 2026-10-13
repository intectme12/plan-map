-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

