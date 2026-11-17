-- AlterTable
ALTER TABLE "appointment" ADD COLUMN     "idempotencyKey" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "appointment_idempotencyKey_key" ON "appointment"("idempotencyKey");

