const fs = require('fs');

const data = fs.readFileSync('scratch/resp__share_730f01a1af96_skid_df0fde43_c39d_4109_ab1d_eabe049c0bc0.txt', 'utf8');

const terms = ['Kasim', 'Zayd', 'Qahhar', 'Idris', 'Masyukh', 'Nasir', 'Rafiq', 'Iron Needle', 'Mudawwan', 'Mamluk', 'Rihla', 'Sultanate', 'Alchemist', 'Trench', 'Homunculus', 'Brazen Bull', 'Lion of Jabir'];

terms.forEach(t => {
  const idx = data.toLowerCase().indexOf(t.toLowerCase());
  console.log(`Term "${t}": index = ${idx}`);
  if (idx !== -1) {
    console.log(`   Context: ${data.substring(Math.max(0, idx - 50), idx + 200)}`);
  }
});
