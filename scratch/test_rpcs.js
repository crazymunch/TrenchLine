const https = require('https');
const fs = require('fs');

const shareId = '730f01a1af96';
const rpcList = [
  'DGWCxb', 'EmZ2Bf', 'NJ1rfe', 'Pjplud', 'QGR0gd', 'ScI3Yc', 
  'UYRIEb', 'YIZmRd', 'cEt90b', 'dIoSBb', 'dowIGb', 'eBAeSb', 
  'iFQyKf', 'oGtAuc', 'qQEoOc', 'qddgKe', 'wNp4Gc', 'wR5FRb', 'yxTchf',
  'bvyh7d', 'H9yAxe', 'fK9Jle', 'gK1F0c', 'uF9P0b', 'maXjh', 'd5w3fe'
];

async function testRpc(rpc) {
  return new Promise((resolve) => {
    const reqPayload = [[[rpc, JSON.stringify([shareId]), null, "generic"]]];
    const body = 'f.req=' + encodeURIComponent(JSON.stringify(reqPayload));

    const options = {
      hostname: 'gemini.google.com',
      path: `/_/BardChatUi/data/batchexecute?rpcids=${rpc}&_reqid=100000&rt=c`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.length > 200 || !data.includes('["er",null,null,null,null,400')) {
          console.log(`[${rpc}] Success / Data length: ${data.length}`);
          fs.writeFileSync(`scratch/rpc_${rpc}.txt`, data);
          if (data.includes('Al-Qarn') || data.includes('Kasim') || data.includes('Sultanate')) {
            console.log(`>>> BINGO: ${rpc} HAS LORE! <<<`);
          }
        }
        resolve();
      });
    });

    req.on('error', () => resolve());
    req.write(body);
    req.end();
  });
}

async function runAll() {
  for (const rpc of rpcList) {
    await testRpc(rpc);
  }
}

runAll();
