const fs = require('fs');
const path = require('path');

// Copy the generated PNG as icon.png in build folder
// electron-builder can use .png on Windows too if no .ico is found,
// but ideally we need .ico

// We'll use electron-builder's built-in icon conversion or a simple approach
// For now, copy the PNG as both icon.png (for Linux) and create placeholder for Windows

const srcPng = process.argv[2];
const buildDir = path.join(__dirname, '..', 'build');

if (!srcPng) {
  console.log('Usage: node scripts/make-icon.js <path-to-png>');
  process.exit(1);
}

// Copy as icon.png for Linux/mac fallback
fs.copyFileSync(srcPng, path.join(buildDir, 'icon.png'));
console.log('Copied icon.png to build/');

// Use png-to-ico if available
try {
  const pngToIco = require('png-to-ico');
  pngToIco(srcPng)
    .then(buf => {
      fs.writeFileSync(path.join(buildDir, 'icon.ico'), buf);
      console.log('Created icon.ico in build/');
    })
    .catch(err => {
      console.error('Failed to create .ico:', err.message);
    });
} catch(e) {
  console.log('png-to-ico not available, skipping .ico creation');
}
