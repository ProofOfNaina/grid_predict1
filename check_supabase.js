import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const url = envVars['VITE_SUPABASE_URL'];
const key = envVars['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
  console.log("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkData() {
  console.log("Checking profiles table...");
  const { data: profiles, error: profileErr } = await supabase.from('profiles').select('*');
  if (profileErr) {
    console.error("Error fetching profiles:", profileErr.message);
  } else {
    console.log(`Found ${profiles.length} profiles.`);
    if (profiles.length > 0) console.log(JSON.stringify(profiles, null, 2));
  }

  console.log("\nChecking bets table...");
  const { data: bets, error: betsErr } = await supabase.from('bets').select('*');
  if (betsErr) {
    console.error("Error fetching bets:", betsErr.message);
  } else {
    console.log(`Found ${bets.length} bets.`);
    if (bets.length > 0) console.log(JSON.stringify(bets, null, 2));
  }
}

checkData();
