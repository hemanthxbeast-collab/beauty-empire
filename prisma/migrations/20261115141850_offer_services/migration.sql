-- CreateTable
CREATE TABLE "offer_service" (
    "offerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "offer_service_pkey" PRIMARY KEY ("offerId","serviceId")
);

-- CreateIndex
CREATE INDEX "offer_service_serviceId_idx" ON "offer_service"("serviceId");

-- AddForeignKey
ALTER TABLE "offer_service" ADD CONSTRAINT "offer_service_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_service" ADD CONSTRAINT "offer_service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
