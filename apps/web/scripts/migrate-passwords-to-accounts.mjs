// 1회성 마이그레이션: better-auth 도입 이전 계정의 users.passwordHash를
// better-auth가 실제로 읽는 accounts(providerId="credential") row로 옮긴다.
// users.passwordHash 자체는 지우지 않고 레거시 안전망으로 남겨둔다.
// 재실행해도 안전함(이미 credential account가 있으면 건너뜀).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { passwordHash: { not: null } },
    select: { id: true, passwordHash: true },
  });

  let created = 0;
  let skipped = 0;
  for (const user of users) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: user.passwordHash,
      },
    });
    created++;
  }

  console.log(`account 생성: ${created}건, 이미 존재해서 건너뜀: ${skipped}건 (대상 ${users.length}명)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
