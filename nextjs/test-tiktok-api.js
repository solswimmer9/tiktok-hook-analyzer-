
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const https = require('https');

// Manually load env vars
const envPath = join(process.cwd(), '.env.local');
let rapidApiKey = '';

if (existsSync(envPath)) {
    const envConfig = readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && key.trim() === 'RAPID_API_KEY') {
            rapidApiKey = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

if (!rapidApiKey) {
    console.error('RAPID_API_KEY not found in .env.local');
    process.exit(1);
}

console.log('RAPID_API_KEY found (masked):', rapidApiKey.substring(0, 5) + '...');

const keyword = "AQA A LEVEL Chemistry";
const params = new URLSearchParams({
    keywords: keyword,
    region: 'us',
    count: '10',
    cursor: '0',
    publish_time: '0',
    sort_type: '0',
});

const options = {
    hostname: 'tiktok-scraper7.p.rapidapi.com',
    path: `/feed/search?${params.toString()}`,
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
        'Content-Type': 'application/json',
    }
};

console.log(`Testing API for keyword: "${keyword}"...`);

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Response Code:', json.code);
            console.log('Response Msg:', json.msg);
            console.log('Videos Found:', json.data?.videos?.length || 0);

            if (json.data?.videos?.length > 0) {
                console.log('First Video Title:', json.data.videos[0].title);
            } else {
                console.log('Full Response:', JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.end();
