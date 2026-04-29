const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    if (line && line.indexOf('=') !== -1) {
        const parts = line.split('=');
        env[parts[0].trim()] = parts[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
    const { data, error } = await supabase.from('visits').select('id, created_at, plan_id').order('created_at', { ascending: false }).limit(3);
    console.log('Recent visits:', data, error);
}
test();
