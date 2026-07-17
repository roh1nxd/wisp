const { execSync } = require('child_process');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');

try {
  const zipPath = 'C:\\Users\\Rohan Verma\\OneDrive\\Desktop\\code-interface-redesign (1).zip';
  const destPath = join(__dirname, '..', 'temp_unzip');
  
  if (!existsSync(zipPath)) {
    console.error(`Error: Cannot find zip file at ${zipPath}`);
    process.exit(1);
  }

  if (!existsSync(destPath)) {
    mkdirSync(destPath, { recursive: true });
  }

  console.log(`Extracting components from ${zipPath} into ${destPath}...`);
  execSync(`powershell.exe -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destPath}' -Force"`, { stdio: 'inherit' });
  console.log('Extraction complete! Files inside temp_unzip:');
  
  // List files using Powershell to confirm
  execSync(`powershell.exe -Command "Get-ChildItem -Path '${destPath}' -Recurse | Select-Object -ExpandProperty FullName"`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to extract zip file:', error);
}
