const https = require('https');
const fs = require('fs');

function testEndpoint(path, postData) {
  const options = {
    hostname: 'gemini.google.com',
    path: path,
    method: postData ? 'POST' : 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(postData ? {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData)
      } : {})
    }
  };

  const req = https.request(options, (res) => {
    console.log(`[${path}] Status:`, res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[${path}] Data length:`, data.length);
      fs.writeFileSync(`scratch/resp_${path.replace(/[^a-zA-Z0-9]/g, '_')}.txt`, data);
      const sample = data.substring(0, 300);
      console.log(`[${path}] Snippet:`, sample);
      if (data.includes('Al-Qarn') || data.includes('Kasim') || data.includes('Jabir') || data.includes('Living Engineer')) {
        console.log(`>>> FOUND LORE IN ${path} <<<`);
      }
    });
  });

  req.on('error', (e) => console.error(e));
  if (postData) req.write(postData);
  req.end();
}

testEndpoint('/share/730f01a1af96?skid=df0fde43-c39d-4109-ab1d-eabe049c0bc0');
