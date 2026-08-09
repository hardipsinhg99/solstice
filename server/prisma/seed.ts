/**
 * One-time seed. Two jobs:
 *   1. Create the single admin from ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD if no
 *      admin row exists. Credentials are never hardcoded here.
 *   2. Import the 8 products that live in ../../src/data/products.js today, so
 *      Phase 1a launches against real content rather than an empty table.
 *
 * The frontend file is plain ESM with no dependencies, so it is read and parsed
 * rather than imported - keeping the server free of any build-time coupling to
 * the frontend source tree.
 */
import { PrismaClient, ProductStatus, TradeDirection } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createContext, runInNewContext } from 'vm';

const prisma = new PrismaClient();

interface StaticProduct {
  trade: string; slug: string; name: string; type: string;
  image: string | null; description: string; varieties: string[];
  season: string; origin: string; packaging: string;
  certification: string; placeholder?: boolean;
}

function readStaticProducts(): StaticProduct[] {
  const file = resolve(__dirname, '../../src/data/products.js');
  const source = readFileSync(file, 'utf8');
  // Strip the ESM export keyword and evaluate the array literal in a sandbox
  // with no globals - the file is data, but it is still executed, so it gets no
  // access to process, fs or require.
  const body = source.replace(/^\s*export\s+const\s+products\s*=/m, 'const products =');
  const sandbox: { products?: StaticProduct[] } = {};
  runInNewContext(`${body}\n;this.products = products;`, createContext(sandbox));
  if (!Array.isArray(sandbox.products)) throw new Error('Could not parse products.js');
  return sandbox.products;
}

async function seedAdmin(): Promise<string> {
  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must be set (see .env.example)');
  }

  const existing = await prisma.admin.findFirst();
  if (existing) {
    console.log(`  admin: already present (${existing.email}) - left untouched`);
    return existing.id;
  }

  const admin = await prisma.admin.create({
    data: { email, name: 'Solstice Admin', passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`  admin: created ${admin.email}`);
  return admin.id;
}

async function seedProducts(adminId: string) {
  const statics = readStaticProducts();
  console.log(`  products: ${statics.length} records found in src/data/products.js`);

  for (const p of statics) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`    skip  ${p.slug} (already present)`);
      continue;
    }

    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        type: p.type,
        image: p.image ?? null,
        description: p.description,
        season: p.season,
        origin: p.origin,
        packaging: p.packaging,
        placeholder: Boolean(p.placeholder),
        trade: p.trade === 'import' ? TradeDirection.IMPORT : TradeDirection.EXPORT,
        // Live content migrates as PUBLISHED. Importing it as DRAFT would empty
        // the public catalogue the moment the site starts reading from the API.
        status: ProductStatus.PUBLISHED,
        updatedById: adminId,
        varieties: {
          create: (p.varieties ?? []).map((name, order) => ({ name, order, updatedById: adminId })),
        },
        // The static shape carries one certification string with no reference,
        // so every seeded claim starts unverifiable by definition. That is the
        // honest state, and the admin UI renders it as a warning until someone
        // supplies a certificate number.
        certifications: p.certification
          ? { create: [{ name: p.certification, verifiable: false, order: 0, updatedById: adminId }] }
          : undefined,
      },
    });
    console.log(`    seed  ${p.slug} (${p.trade}${p.placeholder ? ', placeholder' : ''})`);
  }
}

async function main() {
  console.log('Seeding Solstice CMS…');
  const adminId = await seedAdmin();
  await seedProducts(adminId);
  const count = await prisma.product.count();
  console.log(`Done. ${count} products in the database.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
