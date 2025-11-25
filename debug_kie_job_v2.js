const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://eghqmopkvuephhfjvvgs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaHFtb3BrdnVlcGhoZmp2dmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MjIzNzksImV4cCI6MjA2ODk5ODM3OX0.WALS-wQ7BHCnzWzaly4skZhMxHGda0fl8fJPPTyffqs";
const kieApiKey = "6880d04b585a71d47aafa930fb2f8720";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const jobId = '4f86f76a-8eef-465b-b8ac-4c293ae539bc';

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

    console.log('Job found. KIE Task IDs:', conversion.kie_task_id);

    if (!conversion.kie_task_id) {
        console.log('No KIE task IDs found');
        return;
    }

    const taskIds = JSON.parse(conversion.kie_task_id);

    for (const taskId of taskIds) {
        console.log(`\nChecking KIE task ${taskId}...`);
        try {
            const response = await fetch(
                `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`,
                {
                    headers: { Authorization: `Bearer ${kieApiKey}` }
                }
            );

            const data = await response.json();
            console.log('Response Status:', response.status);
            console.log('Response Data:', JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('KIE API Error:', err.message);
        }
    }
}

main();
