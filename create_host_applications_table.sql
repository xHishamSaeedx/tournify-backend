-- Create host_applications table
CREATE TABLE IF NOT EXISTS host_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    youtube_channel TEXT,
    experience TEXT,
    motivation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_host_applications_created_at ON host_applications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own applications
CREATE POLICY "Users can view own host applications" ON host_applications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own applications
CREATE POLICY "Users can insert own host applications" ON host_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own applications
CREATE POLICY "Users can update own host applications" ON host_applications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all applications (you may want to add an admin role check)
-- CREATE POLICY "Admins can view all host applications" ON host_applications
--     FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin'));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON host_applications TO authenticated;
GRANT USAGE ON SEQUENCE host_applications_id_seq TO authenticated;
