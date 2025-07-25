import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rqqprndupswvpgwzqvhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcXBybmR1cHN3dnBnd3pxdmhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTA5MzYsImV4cCI6MjA2ODk4NjkzNn0.RtbKYcOtzcpMGfnidF-K9K-DoovZW6ceHF86UgtA7aQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 