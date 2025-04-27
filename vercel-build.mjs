#!/usr/bin/env node
// Helper script to prepare files for Vercel deployment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run the Vite build first
console.log('Running Vite build...');
try {
  execSync('npm run build:client', { stdio: 'inherit' });
  console.log('Vite build completed successfully');
} catch (error) {
  console.error('Vite build failed:', error);
  process.exit(1);
}

// Make sure dist exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Define paths
const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const clientBuildDir = path.join(rootDir, 'client/dist/client');

console.log('Root directory:', rootDir);
console.log('Dist directory:', distDir);
console.log('Client build directory:', clientBuildDir);

// Check if client build exists
if (!fs.existsSync(clientBuildDir)) {
  console.error(`Client build directory not found at: ${clientBuildDir}`);
  // Try finding the client build directory
  let foundDir = false;
  try {
    const findClientDir = execSync('find . -path "*/dist/client" -type d | grep -v node_modules', { encoding: 'utf8' });
    if (findClientDir) {
      console.log('Found client build directories:', findClientDir);
      foundDir = true;
    }
  } catch (error) {
    console.error('Error searching for client build directory:', error);
  }
  
  if (!foundDir) {
    console.error('No client build found anywhere. Build process may have failed.');
    process.exit(1);
  }
}

// Copy client files to dist
try {
  console.log('Copying client files to dist...');
  
  // Copy each file from client build to dist
  const copyFiles = (src, dest) => {
    if (!fs.existsSync(src)) {
      console.error(`Source directory does not exist: ${src}`);
      return;
    }
    
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyFiles(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  // Copy all files from client build to dist
  copyFiles(clientBuildDir, distDir);
  console.log('Client files copied successfully');
  
} catch (error) {
  console.error('Error copying client files:', error);
  process.exit(1);
}

// Copy server-vercel.js to dist
console.log('Copying server-vercel.js to dist...');
try {
  const serverFile = path.join(rootDir, 'server-vercel.js');
  const serverDest = path.join(distDir, 'server-vercel.js');
  
  if (fs.existsSync(serverFile)) {
    fs.copyFileSync(serverFile, serverDest);
    console.log('server-vercel.js copied successfully');
  } else {
    console.error('server-vercel.js not found at:', serverFile);
  }
} catch (error) {
  console.error('Error copying server-vercel.js:', error);
}

console.log('Build script completed'); 