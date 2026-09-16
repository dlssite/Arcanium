import { z } from 'zod';
import type { ToolDefinition } from '../providers/index.js';
import { prisma } from '../../lib/prisma.js';

export const getCollectionBooksArgsSchema = z.object({
  collectionSlug: z.string().describe('The slug identifier of the collection (e.g., "grimoires-spells", "celestial-maps")'),
  limit: z.number().int().min(1).max(10).default(5),
});

export type GetCollectionBooksArgs = z.infer<typeof getCollectionBooksArgsSchema>;

export const getCollectionBooksDefinition: ToolDefinition = {
  name: 'get_collection_books',
  description:
    'Get books from a specific special collection. Use this to recommend curated titles from themed collections like "Grimoires & Spells" or "Celestial Maps". Returns book titles with descriptions.',
  parameters: {
    type: 'object',
    properties: {
      collectionSlug: { 
        type: 'string', 
        description: 'The collection identifier (slug). Ask the system context for available collections or use common ones like "grimoires-spells".' 
      },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
    required: ['collectionSlug'],
  },
};

export async function executeGetCollectionBooks(
  args: GetCollectionBooksArgs,
): Promise<string> {
  const { collectionSlug, limit } = args;

  // Find the collection with its entries
  const collection = await prisma.collection.findUnique({
    where: { slug: collectionSlug },
    include: {
      entries: {
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          content: {
            select: {
              slug: true,
              title: true,
              synopsis: true,
              type: true,
              author: true,
              status: true,
            }
          }
        }
      }
    },
  });

  if (!collection) {
    return `Collection "${collectionSlug}" not found. Available collections can be seen in the system context.`;
  }

  // Filter to only published content
  const publishedEntries = collection.entries.filter((e: any) => e.content.status === 'PUBLISHED');

  if (publishedEntries.length === 0) {
    return `The collection "${collection.name}" exists but currently has no published books available.`;
  }

  const bookList = publishedEntries.map((entry: any, idx: number) => {
    const book = entry.content;
    const author = book.author || 'Unknown Author';
    const desc = book.synopsis ? `\n   ${book.synopsis.slice(0, 150)}${book.synopsis.length > 150 ? '...' : ''}` : '';
    return `${idx + 1}. **${book.title}** by ${author}${desc}`;
  }).join('\n\n');

  const intro = collection.description
    ? `From the **${collection.name}** collection: ${collection.description}\n\n`
    : `From the **${collection.name}** collection:\n\n`;

  return `${intro}${bookList}\n\nWould the scholar like to add any of these to their library?`;
}
