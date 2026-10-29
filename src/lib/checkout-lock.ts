
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const LOCK_DURATION_MS = 2 * 60 * 1000;

export async function acquireCheckoutLock(
  organisationId: string
): Promise<string | null> {
  const token = randomUUID();
  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + LOCK_DURATION_MS
  );

  const result = await prisma.organisation.updateMany({
    where: {
      id: organisationId,
      OR: [
        { checkoutLockToken: null },
        { checkoutLockExpiresAt: null },
        { checkoutLockExpiresAt: { lt: now } },
      ],
    },
    data: {
      checkoutLockToken: token,
      checkoutLockExpiresAt: expiresAt,
    },
  });

  return result.count === 1 ? token : null;
}

export async function releaseCheckoutLock(
  organisationId: string,
  token: string
): Promise<void> {
  await prisma.organisation.updateMany({
    where: {
      id: organisationId,
      checkoutLockToken: token,
    },
    data: {
      checkoutLockToken: null,
      checkoutLockExpiresAt: null,
    },
  });
}
