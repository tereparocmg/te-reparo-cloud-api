import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Seed — bootstraps a SUPER_ADMIN user from env vars:
 *   SUPER_ADMIN_EMAIL (default admin@terebaro.com)
 *   SUPER_ADMIN_PASSWORD (default Admin12345!)
 *   SUPER_ADMIN_NAME (default "Super Admin")
 *
 * Run with: `bun run prisma:seed` (or `ts-node prisma/seed.ts`)
 * Idempotent — will reuse the existing user if the email matches.
 */
async function main(): Promise<void> {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'admin@terebaro.com').trim();
  const password = (process.env.SUPER_ADMIN_PASSWORD || 'Admin12345!').trim();
  const name = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim();

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.usuario.findUnique({ where: { email } });

    if (existing) {
      // Ensure password & rol are correct if the user already exists.
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.usuario.update({
        where: { id: existing.id },
        data: {
          password: passwordHash,
          nombre: name,
          rol: 'SUPER_ADMIN',
          activo: true,
          deletedAt: null,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`[seed] SUPER_ADMIN '${email}' updated (password reset).`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.usuario.create({
        data: {
          email,
          password: passwordHash,
          nombre: name,
          rol: 'SUPER_ADMIN',
          activo: true,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`[seed] SUPER_ADMIN '${email}' created.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  process.exit(1);
});
