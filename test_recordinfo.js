const axios = require('axios');

const kieApiKey = "6880d04b585a71d47aafa930fb2f8720";
const taskId = "3c7f74cd583fe70490ce6f2f7592abc8";

async function testRecordInfo() {
    console.log('Testing /api/v1/jobs/recordInfo...\n');
    try {
        const response = await axios.get(
            `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
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

testRecordInfo();
