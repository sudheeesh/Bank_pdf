const https = require('https');
const fs = require('fs');
const path = require('path');

const LOGOS = [
  { 
    name: 'sbi_logo.png', 
    url: 'https://res.cloudinary.com/dpu9ikeqe/image/upload/v1772833867/sbi_logo_no_bg_r3oysu.png' 
  },
  { 
    name: 'federal_logo.png', 
    url: 'https://res.cloudinary.com/dpu9ikeqe/image/upload/v1773427506/ChatGPT_Image_Mar_14_2026_12_12_41_AM_eryv8v.png' 
  }
];

const targetDir = path.join(__dirname, 'assets', 'logos');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

LOGOS.forEach(logo => {
  const filePath = path.join(targetDir, logo.name);
  const file = fs.createWriteStream(filePath);
  https.get(logo.url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${logo.name}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`Error downloading ${logo.name}: ${err.message}`);
  });
});
