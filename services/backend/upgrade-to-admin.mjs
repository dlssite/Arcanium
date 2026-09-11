#!/usr/bin/env node
/**
 * upgrade-to-admin.mjs — Promote a user to ADMIN role
 * 
 * Usage: node upgrade-to-admin.mjs <email>
 * Example: node upgrade-to-admin.mjs queen@arcanium.com
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient, UserRole } from '@prisma/client';

config({ path: resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Usage: node upgrade-to-admin.mjs <email>');
    console.error('Example: node upgrade-to-admin.mjs queen@arcanium.com');
    process.exit(1);
  }

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`✗ User not found: ${email}`);
      process.exit(1);
    }

    // Update to ADMIN role
    const updated = await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN },
    });

    console.log(`✓ Promoted ${email} to ADMIN role`);
    console.log(`  Previous role: ${user.role}`);
    console.log(`  New role:      ${updated.role}`);
  } catch (e) {
    console.error('✗ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
