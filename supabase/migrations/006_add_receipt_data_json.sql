-- Add receipt_data JSONB column to store full digitized receipt information
-- This stores the complete ReceiptScanResult with all items from OCR scan

ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS receipt_data JSONB;

-- Add an index on receipt_data for faster queries (optional, but can be useful)
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_data ON receipts USING GIN (receipt_data);

