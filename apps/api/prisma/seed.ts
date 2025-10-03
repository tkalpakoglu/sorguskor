import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.plan.upsert({
    where: { id: "free" },
    update: { priceUsd: 0, monthlyQuota: 10, isActive: true },
    create: { id: "free", priceUsd: 0, monthlyQuota: 10, features: {} },
  });
  await prisma.plan.upsert({
    where: { id: "pro" },
    update: { priceUsd: 2, monthlyQuota: 1000, isActive: true },
    create: { id: "pro", priceUsd: 2, monthlyQuota: 1000, features: {} },
  });
  await prisma.plan.upsert({
    where: { id: "ultimate" },
    update: { priceUsd: 5, monthlyQuota: null, isActive: true },
    create: { id: "ultimate", priceUsd: 5, monthlyQuota: null, features: {} },
  });
}
main().finally(() => prisma.$disconnect());
