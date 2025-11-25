const axios = require('axios');

const kieApiKey = "6880d04b585a71d47aafa930fb2f8720";
const taskId = "3c7f74cd583fe70490ce6f2f7592abc8"; // From the logs

async function testQueryEndpoints() {
    const endpoints = [
        '/api/v1/jobs/queryTask',
        '/api/v1/grok/record-info',
        '/api/v1/jobs/task-status',
        '/api/v1/jobs/getTask',
    ];

    for (const endpoint of endpoints) {
        console.log(`\nTesting: ${endpoint}`);
        try {
            const response = await axios.get(
                `https://api.kie.ai${endpoint}?taskId=${taskId}`,
                {
                    headers: { Authorization: `Bearer ${kieApiKey}` }
                }
            );
            console.log('✅ Success!');
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (err) {
            console.log('❌ Failed:', err.response?.status, err.response?.data || err.message);
        }
    }
}

testQueryEndpoints();
