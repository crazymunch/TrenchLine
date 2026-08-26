const { execFile } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const url = 'https://gemini.google.com/share/730f01a1af96?skid=df0fde43-c39d-4109-ab1d-eabe049c0bc0';

console.log('Launching Edge headless...');
execFile(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--virtual-time-budget=12000',
  '--dump-dom',
  url
], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
  if (error) {
    console.error('Exec error:', error);
    return;
  }
  console.log('Stdout length:', stdout.length);
  fs.writeFileSync('scratch/rendered_lore.html', stdout);
  console.log('Saved rendered DOM to scratch/rendered_lore.html');
});
