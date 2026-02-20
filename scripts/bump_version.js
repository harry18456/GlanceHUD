const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
    console.error("Usage: node bump_version.js <new_version>");
    process.exit(1);
}

// 1. build/config.yml (YAML)
const configYmlPath = path.join(__dirname, '..', 'build', 'config.yml');
if (fs.existsSync(configYmlPath)) {
    let content = fs.readFileSync(configYmlPath, 'utf8');
    // Replace version: "..."
    content = content.replace(/version: "[^"]*"/, `version: "${newVersion}"`);
    fs.writeFileSync(configYmlPath, content);
    console.log(`Updated build/config.yml to ${newVersion}`);
}

// 2. wails.json (JSON)
const wailsJsonPath = path.join(__dirname, '..', 'wails.json');
if (fs.existsSync(wailsJsonPath)) {
    const content = JSON.parse(fs.readFileSync(wailsJsonPath, 'utf8'));
    content.version = newVersion;
    fs.writeFileSync(wailsJsonPath, JSON.stringify(content, null, 2));
    console.log(`Updated wails.json to ${newVersion}`);
}

// 3. frontend/package.json (JSON)
const packageJsonPath = path.join(__dirname, '..', 'frontend', 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    content.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(content, null, 2));
    console.log(`Updated frontend/package.json to ${newVersion}`);
}

// 4. version.go
const versionGoPath = path.join(__dirname, '..', 'version.go');
if (fs.existsSync(versionGoPath)) {
    let content = fs.readFileSync(versionGoPath, 'utf8');
    content = content.replace(/const Version = "[^"]*"/, `const Version = "${newVersion}"`);
    fs.writeFileSync(versionGoPath, content);
    console.log(`Updated version.go to ${newVersion}`);
}
