-- Phase 4, Epic 1D: Add updated_at to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
