import "server-only";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export async function audit(params: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary operation outside a transaction.
    if (params.tx) throw err;
    console.error("[audit] failed to write audit log", err);
  }
}
