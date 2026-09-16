import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = await prisma.$queryRawUnsafe(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'CirclePost', 'CirclePostEcho', 'CirclePostReply',
      'CircleJoinRequest', 'ReadingCircle', 'CircleMember', 'CircleSession'
    )
  ORDER BY table_name
`);

console.log('Tables found:', JSON.stringify(tables, null, 2));

// Check new columns on ReadingCircle
const cols = await prisma.$queryRawUnsafe(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ReadingCircle'
    AND column_name IN ('ownerId','visibility','isFeatured','isArchived','coverColor')
`);
console.log('ReadingCircle new columns:', JSON.stringify(cols, null, 2));

await prisma.$disconnect();
