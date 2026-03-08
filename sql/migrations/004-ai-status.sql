-- Add AI generation status tracking to report_periods
ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS ai_status TEXT CHECK (ai_status IN ('pending', 'generating', 'complete', 'error'));
ALTER TABLE report_periods ADD COLUMN IF NOT EXISTS ai_error TEXT;
