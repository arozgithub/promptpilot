# Supabase Integration Setup Guide

## Overview
This guide will help you set up Supabase integration for your PromptPilot application to store prompt versions in the cloud instead of localStorage.

## Prerequisites
- A Supabase account (free at https://supabase.com)
- Your PromptPilot application running locally

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in to your account
2. Click "New Project"
3. Choose your organization
4. Fill in your project details:
   - **Project name**: promptpilot (or your preferred name)
   - **Database password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be set up (this takes a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public key** (starts with `eyJ...`)

## Step 3: Configure Environment Variables

1. In your PromptPilot project, update the `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace the placeholder values with your actual Supabase credentials
3. Save the file

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of the `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create:
- `prompt_groups` table for storing prompt groups
- `prompt_versions` table for storing individual versions
- Proper indexes for performance
- Row Level Security (RLS) policies
- Sample data (optional - you can remove this section from the SQL)

## Step 5: Update Your Application

1. **Replace the storage context**: Update your `layout.tsx` to use the new Supabase storage context:

```tsx
// Replace this line:
import { StorageProvider } from '@/contexts/storage-context';

// With this:
import { StorageProvider } from '@/contexts/supabase-storage-context';
```

2. **Restart your development server**:
```bash
npm run dev
```

## Step 6: Test the Integration

1. Open your application at http://localhost:9002
2. Go to the Templates tab and click "Create First Prompt"
3. The prompt should now be saved to Supabase instead of localStorage
4. You can verify this by:
   - Checking the data in your Supabase dashboard (Table Editor > prompt_groups)
   - Opening the browser in an incognito window - your prompts should still be there

## Features

### Automatic Fallback
The application will automatically fall back to localStorage if:
- Supabase credentials are not configured
- There's a connection error to Supabase
- Any database operation fails

### Data Migration
If you have existing prompts in localStorage, they will continue to work alongside Supabase data. You may want to manually recreate important prompts in Supabase.

### Row Level Security
The database is configured with RLS policies that:
- Allow users to see all prompts when not authenticated (user_id is NULL)
- Will support user-specific prompts when authentication is added later

## Optional: Authentication Setup

If you want user-specific prompts (recommended for production):

1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Configure your preferred authentication providers
3. Update the application to handle user authentication
4. Prompts will then be user-specific

## Troubleshooting

### "Failed to load data" Error
- Check that your environment variables are correct
- Verify your Supabase project is running
- Check the browser console for detailed error messages

### Database Connection Issues
- Ensure your Supabase project hasn't been paused (free tier projects pause after inactivity)
- Check that the database schema was created correctly
- Verify your API keys have the correct permissions

### Data Not Syncing
- Check the browser network tab for failed API requests
- Verify the RLS policies are not blocking your operations
- Try creating a prompt and check the Supabase table editor

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase project status in the dashboard
3. Test the database connection in the SQL Editor
4. Ensure all environment variables are set correctly

## Next Steps

Once Supabase is working:
- Consider setting up authentication for user-specific prompts
- Set up database backups in Supabase
- Monitor usage in the Supabase dashboard
- Consider upgrading to a paid plan for production use