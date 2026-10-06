-- DropIndex
DROP INDEX "Payment_billId_key";

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");
