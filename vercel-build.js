// Helper script to prepare files for Vercel deployment
const fs = require('fs');
const path = require('path');

// Make sure dist exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy client files to correct location
if (fs.existsSync('dist/client')) {
  // Create a list of files in dist/client
  const files = fs.readdirSync('dist/client');
  
  // Copy each file to the root dist directory
  files.forEach(file => {
    const srcPath = path.join('dist/client', file);
    const destPath = path.join('dist', file);
    
    if (fs.lstatSync(srcPath).isDirectory()) {
      // If it's a directory, copy the whole directory
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      copyDir(srcPath, destPath);
    } else {
      // If it's a file, copy the file
      fs.copyFileSync(srcPath, destPath);
    }
  });
  
  console.log('Successfully copied client files for Vercel deployment');
} else {
  console.error('dist/client directory not found');
  process.exit(1);
}

// Helper function to copy directories recursively
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
} 