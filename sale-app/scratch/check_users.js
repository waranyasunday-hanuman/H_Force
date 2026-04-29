
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseAdmin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function listUsers() {
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
            console.error('Error fetching users:', error);
            return;
        }

        console.log('--- Supabase Users ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, ID: ${u.id}`);
        });

        const { data: profiles, error: pError } = await supabaseAdmin.from('profiles').select('*');
        if (pError) {
            console.error('Error fetching profiles:', pError);
            return;
        }

        console.log('\n--- Profiles ---');
        profiles.forEach(p => {
            console.log(`ID: ${p.id}, Role: ${p.role}`);
        });
    } catch (e) {
        console.error('Script error:', e);
    }
}

listUsers();
