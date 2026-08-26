const https = require('https');
const fs = require('fs');

const shareId = '730f01a1af96';

// Let's test fetching the batchexecute RPC or public share API
const reqBody = 'f.req=' + encodeURIComponent(JSON.stringify([
  [['wXb2De', JSON.stringify([shareId]), null, 'generic']]
]));

const options = {
  hostname: 'gemini.google.com',
  path: '/_/BardChatUi/data/batchexecute?rpcids=wXb2De&_reqid=100000&rt=c',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Length': Buffer.byteLength(reqBody)
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response length:', data.length);
    fs.writeFileSync('scratch/gemini_rpc_resp.txt', data);
    console.log('Saved response snippet:', data.substring(0, 500));
  });
});

req.on('error', (e) => console.error(e));
req.write(reqBody);
req.end();
