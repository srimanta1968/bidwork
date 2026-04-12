-- Enhanced Schema: Add name fields to users, create contractor_profiles
-- Migration for Sprint 2 features

-- Add name fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;

-- Update role check (homeowner, contractor, skilled_labor)
-- No enum constraint needed since we validate in application code

-- Contractor/Skilled Labor profiles
CREATE TABLE IF NOT EXISTS contractor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  office_address TEXT,
  phone VARCHAR(20),
  license_number VARCHAR(100),
  license_type VARCHAR(100),
  category VARCHAR(100) NOT NULL,
  skills TEXT[], -- for skilled labor: array of skill tags
  years_experience INTEGER,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

COMMENT ON TABLE contractor_profiles IS 'Profile data for contractors and skilled laborers';

-- Record schema version
INSERT INTO _schema_version (schema_hash, version, source) VALUES ('enhanced_v2', 2, 'migration');
