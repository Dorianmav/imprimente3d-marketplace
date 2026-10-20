-- Add new columns to User table
ALTER TABLE "User" ADD COLUMN "actifVendeur" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
