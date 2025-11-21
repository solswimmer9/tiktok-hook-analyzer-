
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
} else {
    console.warn('.env.local not found, checking .env');
    const fallbackPath = join(process.cwd(), '.env');
    if (existsSync(fallbackPath)) {
        const envConfig = readFileSync(fallbackPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
            }
        });
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Key:', supabaseKey ? 'Set' : 'Missing');
    process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSearchStatus() {
    const searchTermText = "AQA A LEVEL Chemistry";
    console.log(`Checking status for: "${searchTermText}"...`);

    // 1. Get Search Term
    const { data: searchTerms, error: searchError } = await supabase
        .from('search_terms')
        .select('*')
        .ilike('term', searchTermText);

    if (searchError) {
        console.error('Error fetching search term:', searchError);
        return;
    }

    if (!searchTerms || searchTerms.length === 0) {
        console.log('No search term found with that exact name.');
        return;
    }

    const searchTerm = searchTerms[0];
    console.log('Search Term Details:', searchTerm);

    // 2. Count Videos
    const { count: videoCount, error: videoError } = await supabase
        .from('tiktok_videos')
        .select('*', { count: 'exact', head: true })
        .eq('search_term_id', searchTerm.id);

    if (videoError) {
        console.error('Error counting videos:', videoError);
        return;
    }

    console.log(`Total Videos Found: ${videoCount}`);

    // 3. Check for recent videos (to see if it's actively adding)
    const { data: recentVideos, error: recentError } = await supabase
        .from('tiktok_videos')
        .select('created_at')
        .eq('search_term_id', searchTerm.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (recentVideos && recentVideos.length > 0) {
        console.log(`Most recent video added at: ${recentVideos[0].created_at}`);
    } else {
        console.log('No videos added yet.');
    }
}

checkSearchStatus();
