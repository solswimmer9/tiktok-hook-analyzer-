
const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Manually load env vars from .env.local
const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
    const envConfig = readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDbWrite() {
    const searchTermId = '5dbdd9ea-f73e-4d9e-862b-f6d9de49e431'; // From previous check
    const dummyVideoId = 'test_video_' + Date.now();

    console.log('Attempting to insert dummy video...');

    const { data, error } = await supabase
        .from('tiktok_videos')
        .insert({
            search_term_id: searchTermId,
            video_id: dummyVideoId,
            title: 'Test Video',
            creator: 'Test Creator',
            creator_username: 'test_user',
            view_count: 100,
            like_count: 10,
            share_count: 1,
            comment_count: 1,
            duration: 60,
            video_url: 'https://tiktok.com/test',
            thumbnail_url: 'https://example.com/thumb.jpg',
            raw_payload: {}
        })
        .select();

    if (error) {
        console.error('Error inserting video:', error);
        return;
    }

    console.log('Successfully inserted video:', data);

    // Cleanup
    console.log('Cleaning up...');
    const { error: deleteError } = await supabase
        .from('tiktok_videos')
        .delete()
        .eq('video_id', dummyVideoId);

    if (deleteError) {
        console.error('Error deleting dummy video:', deleteError);
    } else {
        console.log('Successfully deleted dummy video.');
    }
}

testDbWrite();
