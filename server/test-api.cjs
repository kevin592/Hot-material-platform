const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    console.log('Testing DeepSeek API...');
    console.log('API URL:', process.env.DEEPSEEK_API_URL);
    console.log('API Key:', process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...');

    const response = await axios.post(
      process.env.DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {role: 'system', content: 'You are a helpful assistant'},
          {role: 'user', content: 'Say hello in Chinese'}
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    console.log('\n✅ API调用成功!');
    console.log('Response:', response.data.choices[0].message.content);
  } catch (error) {
    console.log('\n❌ API调用失败');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data || error.message, null, 2));
  }
}

test();
