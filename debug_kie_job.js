const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load .env.local manually since we can't rely on nextjs to load it here
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = require('dotenv').parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Or SERVICE_ROLE if needed, but ANON might work if RLS allows
const kieApiKey = envConfig.KIE_AI_API_KEY;

if (!supabaseUrl || !supabaseKey || !kieApiKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const jobId = '4f86f76a-8eef-465b-b8ac-4c293ae539bc'; // From user logs

    console.log(`Fetching job ${jobId}...`);
    const { data: conversion, error } = await supabase
        .from('shorts_conversions')
        .select('*')
        .eq('id', jobId)
        .single();

    if (error) {
        console.error('Supabase error:', error);
        return;
    }

    if (!conversion) {
        console.error('Job not found');
        return;
    }

    console.log('Job found:', {
        id: conversion.id,
        status: conversion.status,
        kie_task_id: conversion.kie_task_id
    });

    if (!conversion.kie_task_id) {
        console.log('No KIE task IDs found');
        return;
    }

    const taskIds = JSON.parse(conversion.kie_task_id);
    console.log('Task IDs:', taskIds);

    for (const taskId of taskIds) {
        console.log(`\nChecking KIE task ${taskId}...`);
        try {
            const response = await axios.get(
                `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`,
                {
                    headers: { Authorization: `Bearer ${kieApiKey}` }
                }
            );

            console.log('Response Status:', response.status);
            console.log('Response Data:', JSON.stringify(response.data, null, 2));
        } catch (err) {
            console.error('KIE API Error:', err.message);
            if (err.response) {
                console.error('Error Data:', err.response.data);
            }
        }
    }
}

main();
