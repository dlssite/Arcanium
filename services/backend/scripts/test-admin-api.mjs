// Test the admin circles endpoint directly with a real admin JWT
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Get dev admin user
const user = await prisma.user.findUnique({
  where: { email: 'dev@arcanium.local' },
  select: { id: true, role: true, email: true },
});

if (!user) { console.error('dev user not found'); process.exit(1); }

// Sign a token the same way the backend does
const token = jwt.sign(
  { sub: user.id, role: user.role, type: 'access' },
  process.env.JWT_SECRET ?? 'fallback',
  { expiresIn: '1h' }
);

console.log('User:', user.email, 'role:', user.role);

// Call the admin circles endpoint
const res = await fetch('http://localhost:4000/api/v1/admin/circles', {
  headers: { Authorization: `Bearer ${token}` },
});

const body = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(body, null, 2).slice(0, 1000));

await prisma.$disconnect();
