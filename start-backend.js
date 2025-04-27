import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('Starting API server...');

// Define possible app.py locations to check
const possibleAppPaths = [
  'app.py',                      // Current directory
  'api/app.py'                   // api subdirectory
];

// Find the correct app.py
let appPath = possibleAppPaths[0]; // Default to the first one
for (const path of possibleAppPaths) {
  if (fs.existsSync(path)) {
    appPath = path;
    console.log(`Found app.py at: ${path}`);
    break;
  }
}

// Start the Python FastAPI server
const apiProcess = spawn('python', ['-m', 'uvicorn', appPath.replace('.py', '') + ':app', '--reload', '--port', '8000'], {
  stdio: 'inherit',
  shell: true
});

apiProcess.on('error', (error) => {
  console.error(`Error starting API server: ${error.message}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down API server...');
  apiProcess.kill('SIGINT');
  process.exit();
}); 