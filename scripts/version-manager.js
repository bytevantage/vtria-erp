#!/usr/bin/env node

/**
 * VTRIA ERP Version Manager
 * Manages version control for different deployment types
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.configDir = path.join(this.projectRoot, 'config');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
  }

  getCurrentBranch() {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      return branch;
    } catch (error) {
      console.error('Error getting current branch:', error.message);
      return 'unknown';
    }
  }

  getVersionType(branch) {
    if (branch === 'main') return 'demo';
    if (branch === 'production') return 'production';
    if (branch.startsWith('customer/')) return 'customer';
    if (branch === 'development') return 'development';
    return 'development';
  }

  loadConfig(versionType) {
    const configPath = path.join(this.configDir, `${versionType}.json`);
    if (!fs.existsSync(configPath)) {
      console.error(`Configuration file not found: ${configPath}`);
      process.exit(1);
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  updatePackageVersion(version) {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    packageJson.version = version;
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json version to: ${version}`);
  }

  getVersionFromPackage() {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    return packageJson.version;
  }

  createVersionTag(version, branch) {
    try {
      execSync(`git tag -a ${version} -m "Release ${version} for ${branch}"`, { stdio: 'inherit' });
      execSync(`git push origin ${version}`, { stdio: 'inherit' });
      console.log(`Created and pushed tag: ${version}`);
    } catch (error) {
      console.error('Error creating tag:', error.message);
    }
  }

  switchToBranch(branch) {
    try {
      execSync(`git checkout ${branch}`, { stdio: 'inherit' });
      console.log(`Switched to branch: ${branch}`);
    } catch (error) {
      console.error('Error switching branch:', error.message);
    }
  }

  mergeBranch(sourceBranch, targetBranch) {
    try {
      this.switchToBranch(targetBranch);
      execSync(`git merge ${sourceBranch}`, { stdio: 'inherit' });
      console.log(`Merged ${sourceBranch} into ${targetBranch}`);
    } catch (error) {
      console.error('Error merging branches:', error.message);
    }
  }

  calculateNewVersion(currentVersion, type = 'patch') {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;

    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  formatVersion(baseVersion, versionType, customerName = null) {
    switch (versionType) {
      case 'demo':
        return `${baseVersion}-demo`;
      case 'customer':
        return `${baseVersion}-${customerName || 'custom'}`;
      case 'production':
      default:
        return baseVersion;
    }
  }

  releaseDemo(versionType = 'patch') {
    console.log('🚀 Creating Demo Release...');
    
    const currentVersion = this.getVersionFromPackage();
    const newVersion = this.calculateNewVersion(currentVersion, versionType);
    const demoVersion = this.formatVersion(newVersion, 'demo');
    
    console.log(`Current version: ${currentVersion}`);
    console.log(`New demo version: ${demoVersion}`);
    
    // Switch to main branch
    this.switchToBranch('main');
    
    // Merge development into main
    this.mergeBranch('development', 'main');
    
    // Update version
    this.updatePackageVersion(demoVersion);
    
    // Commit version update
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "Demo release ${demoVersion}"`, { stdio: 'inherit' });
    
    // Push changes
    execSync('git push origin main', { stdio: 'inherit' });
    
    // Create tag
    this.createVersionTag(demoVersion, 'main');
    
    console.log(`✅ Demo release ${demoVersion} completed!`);
  }

  releaseProduction(versionType = 'patch') {
    console.log('🏭 Creating Production Release...');
    
    const currentVersion = this.getVersionFromPackage();
    const newVersion = this.calculateNewVersion(currentVersion, versionType);
    const prodVersion = this.formatVersion(newVersion, 'production');
    
    console.log(`Current version: ${currentVersion}`);
    console.log(`New production version: ${prodVersion}`);
    
    // Switch to production branch
    this.switchToBranch('production');
    
    // Merge development into production
    this.mergeBranch('development', 'production');
    
    // Update version
    this.updatePackageVersion(prodVersion);
    
    // Commit version update
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "Production release ${prodVersion}"`, { stdio: 'inherit' });
    
    // Push changes
    execSync('git push origin production', { stdio: 'inherit' });
    
    // Create tag
    this.createVersionTag(prodVersion, 'production');
    
    console.log(`✅ Production release ${prodVersion} completed!`);
  }

  createCustomerBranch(customerName) {
    const branchName = `customer/${customerName}`;
    console.log(`🏢 Creating customer branch: ${branchName}`);
    
    try {
      // Create customer branch from production
      this.switchToBranch('production');
      execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
      execSync(`git push -u origin ${branchName}`, { stdio: 'inherit' });
      console.log(`✅ Customer branch ${branchName} created!`);
    } catch (error) {
      console.error('Error creating customer branch:', error.message);
    }
  }

  releaseCustomer(customerName, versionType = 'patch') {
    console.log(`🏢 Creating Customer Release for ${customerName}...`);
    
    const branchName = `customer/${customerName}`;
    const currentVersion = this.getVersionFromPackage();
    const newVersion = this.calculateNewVersion(currentVersion, versionType);
    const customerVersion = this.formatVersion(newVersion, 'customer', customerName);
    
    console.log(`Current version: ${currentVersion}`);
    console.log(`New customer version: ${customerVersion}`);
    
    // Switch to customer branch
    this.switchToBranch(branchName);
    
    // Merge production into customer branch
    this.mergeBranch('production', branchName);
    
    // Update version
    this.updatePackageVersion(customerVersion);
    
    // Commit version update
    execSync('git add package.json', { stdio: 'inherit' });
    execSync(`git commit -m "Customer release ${customerVersion}"`, { stdio: 'inherit' });
    
    // Push changes
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });
    
    // Create tag
    this.createVersionTag(customerVersion, branchName);
    
    console.log(`✅ Customer release ${customerVersion} completed!`);
  }

  showStatus() {
    const branch = this.getCurrentBranch();
    const versionType = this.getVersionType(branch);
    const currentVersion = this.getVersionFromPackage();
    const config = this.loadConfig(versionType);
    
    console.log('\n📊 VTRIA ERP Version Status');
    console.log('============================');
    console.log(`Current Branch: ${branch}`);
    console.log(`Version Type: ${versionType}`);
    console.log(`Current Version: ${currentVersion}`);
    console.log(`App Name: ${config.app.name}`);
    console.log(`Environment: ${config.environment}`);
    console.log(`Features Enabled: ${Object.keys(config.modules || {}).filter(k => config.modules[k]).join(', ')}`);
    console.log('\n🔧 Available Commands:');
    console.log('  release-demo          - Create demo release');
    console.log('  release-production    - Create production release');
    console.log('  create-customer <name> - Create customer branch');
    console.log('  release-customer <name> - Create customer release');
    console.log('  status                - Show current status');
  }

  showHelp() {
    console.log('VTRIA ERP Version Manager');
    console.log('=========================');
    console.log('');
    console.log('Usage: node scripts/version-manager.js [command] [options]');
    console.log('');
    console.log('Commands:');
    console.log('  release-demo [patch|minor|major]  - Create demo release');
    console.log('  release-production [patch|minor|major] - Create production release');
    console.log('  create-customer <name>           - Create customer branch');
    console.log('  release-customer <name> [patch|minor|major] - Create customer release');
    console.log('  status                           - Show current status');
    console.log('  help                             - Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/version-manager.js release-demo');
    console.log('  node scripts/version-manager.js release-production minor');
    console.log('  node scripts/version-manager.js create-customer acme-corp');
    console.log('  node scripts/version-manager.js release-customer acme-corp');
  }
}

// Main execution
function main() {
  const vm = new VersionManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'release-demo':
      vm.releaseDemo(args[0] || 'patch');
      break;
    case 'release-production':
      vm.releaseProduction(args[0] || 'patch');
      break;
    case 'create-customer':
      if (!args[0]) {
        console.error('Error: Customer name is required');
        process.exit(1);
      }
      vm.createCustomerBranch(args[0]);
      break;
    case 'release-customer':
      if (!args[0]) {
        console.error('Error: Customer name is required');
        process.exit(1);
      }
      vm.releaseCustomer(args[0], args[1] || 'patch');
      break;
    case 'status':
      vm.showStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      vm.showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      vm.showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = VersionManager;
