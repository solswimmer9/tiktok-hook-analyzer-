const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

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
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVideos() {
    const { data: term } = await supabase
        .from('search_terms')
        .select('id')
        .eq('term', 'A level chem')
        .single();
    
    if (!term) {
        console.log('Term not found');
        return;
    }
    
    const { data: videos } = await supabase
        .from('tiktok_videos')
        .select('id, title, r2_url, r2_key, created_at')
        .eq('search_term_id', term.id)
        .order('created_at', { ascending: false })
        .limit(10);
    
    console.log('Sample of A level chem videos:');
    videos?.forEach(v => {
        const status = v.r2_url ? 'Downloaded' : 'Downloading...';
        console.log(`- ${v.title?.substring(0, 40)}... | ${status} | Created: ${v.created_at}`);
    });
    
    const { data: allVideos } = await supabase
        .from('tiktok_videos')
        .select('id, r2_url')
        .eq('search_term_id', term.id);
    
    const downloaded = allVideos?.filter(v => v.r2_url).length || 0;
    const total = allVideos?.length || 0;
    
    console.log(`\nProcessing Status: ${downloaded}/${total} videos downloaded`);
    
    const videoIds = allVideos?.map(v => v.id) || [];
    const { data: analyses } = await supabase
        .from('hook_analysis')
        .select('video_id')
        .in('video_id', videoIds);
    
    console.log(`Hook Analysis: ${analyses?.length || 0}/${total} videos analyzed`);
}

checkVideos();
