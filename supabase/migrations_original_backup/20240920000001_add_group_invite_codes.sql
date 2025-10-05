-- Add invite codes and privacy settings to groups table
-- Migration: 20240920000001_add_group_invite_codes.sql

-- Add new columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_code VARCHAR(12) UNIQUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for invite_code lookups
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);

-- Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate invite codes
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate unique invite code if not provided
    IF NEW.invite_code IS NULL THEN
        LOOP
            NEW.invite_code := generate_invite_code();
            -- Check if code is unique
            IF NOT EXISTS (SELECT 1 FROM groups WHERE invite_code = NEW.invite_code) THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    -- Set updated_at timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invite codes on insert/update
DROP TRIGGER IF EXISTS trigger_set_group_invite_code ON groups;
CREATE TRIGGER trigger_set_group_invite_code
    BEFORE INSERT OR UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_invite_code();

-- Generate invite codes for existing groups
UPDATE groups SET invite_code = generate_invite_code() WHERE invite_code IS NULL;

-- Add constraint to ensure invite_code is always present
ALTER TABLE groups ALTER COLUMN invite_code SET NOT NULL;

COMMENT ON COLUMN groups.invite_code IS 'Unique 8-character invite code for joining the group';
COMMENT ON COLUMN groups.description IS 'Optional description of the group';
COMMENT ON COLUMN groups.is_public IS 'Whether the group is publicly discoverable and joinable';
COMMENT ON COLUMN groups.updated_at IS 'Timestamp when the group was last updated';