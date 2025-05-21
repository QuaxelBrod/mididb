const fs = require('fs');
const path = require('path');

export function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// const srcDir = path.join(__dirname, 'soundfont');
// const outDir = path.join(__dirname, 'out', 'soundfont');
// copyRecursiveSync(srcDir, outDir);

// console.log('soundfont copied to out/soundfont');