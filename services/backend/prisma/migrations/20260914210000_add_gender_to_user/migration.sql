-- Create Gender enum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- Add nullable gender column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" "Gender";
