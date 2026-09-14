import { PrismaClient, ContentType, ContentStatus, ContentSource, UserRole, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_SHELVES = ["Reading","Completed","On Hold","Dropped","Plan to Read"];

async function createUserWithShelves(email, displayName, password, role = UserRole.USER) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName, role },
    create: { email, displayName, role },
  });
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    await prisma.authAccount.upsert({
      where: { userId_provider: { userId: user.id, provider: AuthProvider.EMAIL } },
      update: {},
      create: { userId: user.id, provider: AuthProvider.EMAIL, password: hash },
    });
  }
  for (const [index, name] of DEFAULT_SHELVES.entries()) {
    await prisma.shelf.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name, isDefault: true, sortOrder: index },
    });
  }
  return user;
}

async function main() {
  console.info("Seeding database...");

  // Dev user (email + password, ADMIN role for testing ingest endpoint)
  const devUser = await createUserWithShelves("dev@arcanium.local", "Dev User", "devpassword123", UserRole.ADMIN);
  console.info("Dev user:", devUser.email, "role:", devUser.role);

  // Demo admin account (often used in frontend tests — also set to ADMIN)
  const demoUser = await createUserWithShelves("demo@eternie.app", "Demo Admin", "demo123", UserRole.ADMIN);
  console.info("Demo user:", demoUser.email, "role:", demoUser.role);

  // Regular reader
  await createUserWithShelves("reader@arcanium.local", "Erin Vance", "reader123");
  console.info("Reader user created");

  // Sample content catalogue (free domain / demo titles)
  const sampleContent = [
    {
      type: ContentType.WEB_NOVEL,
      status: ContentStatus.COMPLETED,
      source: ContentSource.ADMIN_UPLOAD,
      title: "The Wind in the Willows",
      slug: "the-wind-in-the-willows",
      author: "Kenneth Grahame",
      synopsis: "A timeless fable along English riverbanks celebrating friendship, cozy hearths, and pastoral wonders.",
      chapterCount: 12,
      metadata: { genres: ["Pastoral Fables", "Classic"], tags: ["Friendship", "Nature"] },
    },
    {
      type: ContentType.WEB_NOVEL,
      status: ContentStatus.COMPLETED,
      source: ContentSource.ADMIN_UPLOAD,
      title: "The Secret Garden",
      slug: "the-secret-garden",
      author: "Frances Hodgson Burnett",
      synopsis: "A forgotten estate garden where mystery and healing intertwine under blooming rose arbors.",
      chapterCount: 27,
      metadata: { genres: ["Forgotten Lore", "Classic"], tags: ["Mystery", "Growth"] },
    },
    {
      type: ContentType.WEB_NOVEL,
      status: ContentStatus.COMPLETED,
      source: ContentSource.ADMIN_UPLOAD,
      title: "The Great Gatsby",
      slug: "the-great-gatsby",
      author: "F. Scott Fitzgerald",
      synopsis: "A tale of wealth, obsession, and the American Dream in the Jazz Age.",
      chapterCount: 9,
      metadata: { genres: ["Classic", "Literary Fiction"], tags: ["Wealth", "Obsession"] },
    },
  ];

  // Skip placeholder content if any Content rows already exist (e.g. after reseed.mjs).
  // This prevents the seed from blocking on a DB lock held by the backend dev server.
  const existingContentCount = await prisma.content.count();
  if (existingContentCount === 0) {
    for (const item of sampleContent) {
      const content = await prisma.content.upsert({
        where: { slug: item.slug },
        update: {},
        create: item,
      });
      for (let i = 1; i <= Math.min(3, item.chapterCount); i++) {
        await prisma.chapter.upsert({
          where: { contentId_number: { contentId: content.id, number: i } },
          update: {},
          create: {
            contentId: content.id,
            number: i,
            title: `Chapter ${i}`,
            bodyText: `<p>This is a placeholder for Chapter ${i} of <em>${item.title}</em>.</p><p>Use the ingest endpoint with a real URL to populate full chapter text via the scraper pipeline.</p>`,
            wordCount: 30,
            isPublished: true,
            isDraft: false,
            publishedAt: new Date(),
          },
        });
      }
      console.info("Seeded:", item.title, "with", Math.min(3, item.chapterCount), "chapters");
    }
  } else {
    console.info(`Skipping placeholder content — ${existingContentCount} content records already exist.`);
  }

  // ---------------------------------------------------------------------------
  // Feature Flags — Canonical set matching the admin UI mock data
  // ---------------------------------------------------------------------------

  const flagSeeds = [
    {
      key: 'enable_community_feed',
      name: 'Community Reader Feed',
      description: 'Enables user review posts, quotes highlighting, and public reading activity streams.',
      category: 'CORE_READER' as const,
      enabled: true,
      rolloutPct: 100,
    },
    {
      key: 'enable_voice_chat',
      name: 'Liber Voice Synthesis (TTS)',
      description: 'Enables streaming neural voice reading for books and conversational vocal feedback with Liber.',
      category: 'AI_LIBER' as const,
      enabled: false,
      rolloutPct: 15,
    },
    {
      key: 'enable_creator_publishing',
      name: 'Verified Creator Self-Publishing',
      description: 'Grants approved authors access to write, schedule chapters, and monetize on Arcanium directly.',
      category: 'CREATOR_ECONOMY' as const,
      enabled: true,
      rolloutPct: 100,
    },
    {
      key: 'enable_ai_search',
      name: 'Vector Semantic Catalog Search',
      description: 'Replaces keyword search with natural-language mood & trope embeddings via Liber.',
      category: 'AI_LIBER' as const,
      enabled: true,
      rolloutPct: 80,
    },
    {
      key: 'enable_liber_memory',
      name: 'Liber Persistent Reading Memory',
      description: 'Allows Liber to retain memories of user reading tastes, dropped tropes, and favorite characters.',
      category: 'AI_LIBER' as const,
      enabled: true,
      rolloutPct: 100,
    },
    {
      key: 'enable_creator_tipping',
      name: 'Arcane Shard Creator Tipping',
      description: 'Allows readers to tip verified writers with virtual shards redeemable for creator payouts.',
      category: 'CREATOR_ECONOMY' as const,
      enabled: false,
      rolloutPct: 0,
    },
    {
      key: 'enable_offline_reading',
      name: 'IndexedDB Offline Chapter Storage',
      description: 'Enables client-side caching of upcoming chapters for encrypted offline reading.',
      category: 'CORE_READER' as const,
      enabled: true,
      rolloutPct: 100,
    },
    {
      key: 'maintenance_mode',
      name: 'Global Maintenance Lockdown',
      description: 'Renders the public reading client in read-only mode for database migrations.',
      category: 'SYSTEM' as const,
      enabled: false,
      rolloutPct: 0,
    },
  ];

  for (const flag of flagSeeds) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {}, // Don't overwrite existing flags on reseed
      create: {
        key:         flag.key,
        name:        flag.name,
        description: flag.description,
        category:    flag.category,
        enabled:     flag.enabled,
        rolloutPct:  flag.rolloutPct,
        updatedById: null, // System-seeded flags have no updatedById
      },
    });
  }
  console.info("Seeded", flagSeeds.length, "feature flags");

  // ---------------------------------------------------------------------------
  // Creator Applications — sample queue for UI testing
  // ---------------------------------------------------------------------------

  // Seed two additional writer-applicant users if they don't exist
  const writerA = await createUserWithShelves("kael.shadows@void.xyz", "Kaelen Void", "writer123");
  const writerB = await createUserWithShelves("talia.alchemist@potion.dev", "Talia Aurelia", "writer123");
  const writerC = await createUserWithShelves("lyra.starlight@astral.space", "Lyra Solis", "writer123", UserRole.VERIFIED_WRITER);

  const appSeeds = [
    {
      userId:         writerA.id,
      applicantName:  'Kaelen Void',
      penName:        'K. V. Nether',
      email:          'kael.shadows@void.xyz',
      portfolioUrl:   'https://royalroad.com/author/kael-nether',
      sampleTitle:    'The Umbral Weaver of Valdor',
      sampleSynopsis: 'In a city where shadows are taxed by the clergy, an apprentice dye-master discovers how to weave living void-silk.',
      pitch:          'Looking to publish serialized weekly chapters directly on Arcanium with exclusive subscriber art and annotated lore glossaries.',
      primaryGenre:   'Dark Fantasy',
      status:         'PENDING' as const,
    },
    {
      userId:         writerB.id,
      applicantName:  'Talia Aurelia',
      penName:        'Master Talia',
      email:          'talia.alchemist@potion.dev',
      portfolioUrl:   'https://scribblehub.com/profile/mastertalia',
      sampleTitle:    'Arcane Botany for the Condemned',
      sampleSynopsis: 'A disgraced palace botanist is exiled to the toxic outer reaches of the empire, cultivating impossible flora to cure a dying god.',
      pitch:          'Deep cozy craft fantasy with detailed botanical diagrams. I already have 4,000 active monthly readers.',
      primaryGenre:   'Cozy Fantasy / Progression',
      status:         'PENDING' as const,
    },
    {
      userId:         writerC.id,
      applicantName:  'Lyra Solis',
      penName:        'Astral Quill',
      email:          'lyra.starlight@astral.space',
      portfolioUrl:   'https://astralquill.ink',
      sampleTitle:    'Echoes of the Shattered Clockwork',
      sampleSynopsis: 'When the world chronometer faltered, time fractured into jagged islands. A pilot navigates temporal currents in search of lost hours.',
      pitch:          'Transmedia interactive novella with reader choice branches at the climax of every act.',
      primaryGenre:   'Weird Fiction / Steampunk',
      status:         'APPROVED' as const,
      reviewedAt:     new Date('2026-02-22T14:30:00Z'),
      reviewedById:   devUser.id,
    },
  ];

  for (const app of appSeeds) {
    // Use userId as natural dedup key — one application per user
    const existing = await prisma.creatorApplication.findFirst({ where: { userId: app.userId } });
    if (!existing) {
      await prisma.creatorApplication.create({ data: app });
    }
  }
  console.info("Seeded", appSeeds.length, "creator applications");

  // ---------------------------------------------------------------------------
  // Moderated Content — use first seeded content item as the flagged target
  // ---------------------------------------------------------------------------

  const firstContent = await prisma.content.findFirst({ orderBy: { createdAt: 'asc' } });
  if (firstContent) {
    const existingMod = await prisma.moderatedContent.findFirst({ where: { contentId: firstContent.id } });
    if (!existingMod) {
      await prisma.moderatedContent.create({
        data: {
          contentId:   firstContent.id,
          authorId:    writerA.id,
          flagReason:  'Automated AI filter: excessive violence threshold triggered (score: 84%)',
          riskScore:   84,
          status:      'FLAGGED',
        },
      });
      console.info("Seeded 1 moderated content record for:", firstContent.title);
    } else {
      console.info("Moderated content already exists — skipping");
    }
  } else {
    console.info("No content found to seed moderation record — run reseed.mjs first");
  }

  // ---------------------------------------------------------------------------
  // Scraper Configs — canonical parser registry
  // ---------------------------------------------------------------------------

  const scraperSeeds = [
    {
      name:           'Royal Road Ingestion Engine',
      targetDomain:   'royalroad.com',
      selectorType:   'CHEERIO' as const,
      enabled:        true,
      requestDelayMs: 1500,
    },
    {
      name:           'MangaDex API Connector',
      targetDomain:   'mangadex.org',
      selectorType:   'REST' as const,
      enabled:        true,
      requestDelayMs: 500,
    },
    {
      name:           'Open Library API Bridge',
      targetDomain:   'openlibrary.org',
      selectorType:   'REST' as const,
      enabled:        true,
      requestDelayMs: 800,
    },
    {
      name:           'Generic Readability Fallback',
      targetDomain:   '*',
      selectorType:   'READABILITY' as const,
      enabled:        true,
      requestDelayMs: 2000,
    },
  ];

  for (const cfg of scraperSeeds) {
    await prisma.scraperConfig.upsert({
      where:  { targetDomain: cfg.targetDomain },
      update: {},  // never overwrite admin-edited values on reseed
      create: cfg,
    });
  }
  console.info("Seeded", scraperSeeds.length, "scraper configs");

  // ---------------------------------------------------------------------------
  // Book Reviews & Ratings — sample reviews for dev/demo content
  // ---------------------------------------------------------------------------

  // Seed extra reader accounts so we get a spread of reviewers
  const reviewer1 = await createUserWithShelves("sol.vance@arcanium.local",    "Sol Vance",     "reader123");
  const reviewer2 = await createUserWithShelves("mira.ashford@arcanium.local", "Mira Ashford",  "reader123");
  const reviewer3 = await createUserWithShelves("finn.darrow@arcanium.local",  "Finn Darrow",   "reader123");

  // All content in the catalogue (seeded above + anything from reseed.mjs)
  const allContent = await prisma.content.findMany({ select: { id: true, slug: true, title: true } });

  if (allContent.length > 0) {
    // Review payloads: (reviewer, content index, rating, text)
    const reviewSeeds: Array<{
      user:       { id: string };
      contentIdx: number;
      rating:     number;
      reviewText: string | null;
    }> = [
      {
        user:       devUser,
        contentIdx: 0,
        rating:     5,
        reviewText: "An absolute masterpiece. The world-building is unlike anything I've ever encountered — every chapter peels back another layer of this richly imagined universe. Highly recommended for anyone who loves deep, immersive storytelling.",
      },
      {
        user:       demoUser,
        contentIdx: 0,
        rating:     4,
        reviewText: "A wonderful read with a lot of heart. The character development is exceptional, and the pacing keeps you hooked from the first page. My only minor gripe is the middle act drags slightly, but the payoff is absolutely worth it.",
      },
      {
        user:       reviewer1,
        contentIdx: 0,
        rating:     5,
        reviewText: "I finished this in one sitting — which says everything. The prose is beautiful, the dialogue sharp, and the themes hit surprisingly close to home. A must-read for fans of the genre.",
      },
      {
        user:       reviewer2,
        contentIdx: 0,
        rating:     3,
        reviewText: "Decent enough, but not quite what I hoped for. The opening chapters are strong, but the story loses momentum in the second half. Worth reading if you're already a fan, but maybe not the best entry point.",
      },
      {
        user:       reviewer3,
        contentIdx: 0,
        rating:     4,
        reviewText: "Really enjoyed this one. The magic system is inventive and the side characters are surprisingly fleshed out. Picked this up on a whim and ended up completely absorbed. Looking forward to what comes next.",
      },
      // Second content item
      {
        user:       devUser,
        contentIdx: 1,
        rating:     4,
        reviewText: "A beautifully layered story that rewards patience. The author has a gift for atmosphere, and the world feels genuinely lived-in. Some plot threads could have been resolved more cleanly, but overall a satisfying experience.",
      },
      {
        user:       reviewer1,
        contentIdx: 1,
        rating:     5,
        reviewText: "I rarely give five stars but this earned every single one. The ending in particular left me sitting quietly for a few minutes just processing everything. Exceptional work — one of the best I've read on this platform.",
      },
      {
        user:       reviewer2,
        contentIdx: 1,
        rating:     4,
        reviewText: "Quietly brilliant. Not the kind of story that grabs you immediately, but by chapter three I was completely invested. The themes of memory and identity are handled with real nuance.",
      },
      // Third content item (if it exists)
      ...(allContent.length > 2 ? [
        {
          user:       reviewer3,
          contentIdx: 2,
          rating:     3,
          reviewText: "Interesting premise but the execution is a bit uneven. The first act is genuinely compelling, but the story struggles to maintain that energy throughout. Still worth a read if you enjoy this genre.",
        },
        {
          user:       demoUser,
          contentIdx: 2,
          rating:     5,
          reviewText: "A hidden gem. Underrated and deserves far more attention. The writing is confident and economical, the plot moves at exactly the right pace, and the characters feel like real people. Highly recommended.",
        },
      ] : []),
    ];

    let reviewsCreated = 0;

    for (const seed of reviewSeeds) {
      const targetContent = allContent[seed.contentIdx];
      if (!targetContent) continue;

      // Upsert so reseed is idempotent
      await prisma.review.upsert({
        where:  { contentId_userId: { contentId: targetContent.id, userId: seed.user.id } },
        update: { rating: seed.rating, reviewText: seed.reviewText },
        create: {
          contentId:  targetContent.id,
          userId:     seed.user.id,
          rating:     seed.rating,
          reviewText: seed.reviewText,
          echoCount:  0,
        },
      });
      reviewsCreated++;
    }

    // Add some echo reactions (reviewer2 echoes devUser's reviews)
    const devReviews = await prisma.review.findMany({ where: { userId: devUser.id } });
    for (const review of devReviews) {
      await prisma.reviewReaction.upsert({
        where:  { reviewId_userId: { reviewId: review.id, userId: reviewer2.id } },
        update: {},
        create: { reviewId: review.id, userId: reviewer2.id },
      });
      await prisma.reviewReaction.upsert({
        where:  { reviewId_userId: { reviewId: review.id, userId: reviewer3.id } },
        update: {},
        create: { reviewId: review.id, userId: reviewer3.id },
      });
      // Update echoCount denormalized field
      const echoCount = await prisma.reviewReaction.count({ where: { reviewId: review.id } });
      await prisma.review.update({ where: { id: review.id }, data: { echoCount } });
    }

    // Recalculate and persist denormalized aggregates on each Content record
    for (const content of allContent) {
      const agg = await prisma.review.aggregate({
        where:   { contentId: content.id },
        _avg:    { rating: true },
        _count:  { id: true },
      });
      const reviewCount = await prisma.review.count({ where: { contentId: content.id } });
      const avg = agg._avg.rating;
      await prisma.content.update({
        where: { id: content.id },
        data:  {
          averageRating: avg !== null ? Math.round(avg * 10) / 10 : null,
          ratingCount:   agg._count.id,
          reviewCount,
        },
      });
    }

    console.info(`Seeded ${reviewsCreated} reviews with aggregate ratings updated on ${allContent.length} content records`);
  } else {
    console.info("No content found — skipping review seed (run reseed.mjs first)");
  }

  console.info("Seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
