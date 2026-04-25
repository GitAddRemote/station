import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const infraRoot = path.resolve(__dirname, '..');

const readInfraFile = (relativePath) =>
  readFileSync(path.join(infraRoot, relativePath), 'utf8');

test('terraform configuration files exist and define the Linode foundation', () => {
  const mainTf = readInfraFile('terraform/main.tf');
  const dnsTf = readInfraFile('terraform/dns.tf');
  const variablesTf = readInfraFile('terraform/variables.tf');
  const outputsTf = readInfraFile('terraform/outputs.tf');
  const tfvars = readInfraFile('terraform/terraform.tfvars.example');
  const lockfile = readInfraFile('terraform/.terraform.lock.hcl');

  assert.match(mainTf, /required_providers/);
  assert.match(mainTf, /source\s*=\s*"linode\/linode"/);
  assert.match(mainTf, /resource "linode_instance" "vps"/);
  assert.match(mainTf, /resource "linode_firewall" "station"/);
  assert.match(mainTf, /ports\s*=\s*"22"/);
  assert.match(mainTf, /ports\s*=\s*"80"/);
  assert.match(mainTf, /ports\s*=\s*"443"/);

  assert.match(dnsTf, /resource "linode_domain" "drdnt_org"/);
  assert.match(dnsTf, /resource "linode_domain_record" "api"/);
  assert.match(dnsTf, /resource "linode_domain_record" "station"/);
  assert.match(dnsTf, /resource "linode_domain_record" "bot"/);

  assert.match(variablesTf, /variable "linode_token"/);
  assert.match(variablesTf, /variable "linode_instance_id"/);
  assert.match(variablesTf, /variable "linode_domain_id"/);
  assert.match(variablesTf, /variable "vps_ip"/);
  assert.match(variablesTf, /variable "ssh_public_key"/);

  assert.match(outputsTf, /output "vps_ip"/);
  assert.match(outputsTf, /output "api_fqdn"/);
  assert.match(outputsTf, /output "station_fqdn"/);
  assert.match(outputsTf, /output "bot_fqdn"/);

  assert.match(tfvars, /linode_token/);
  assert.match(tfvars, /linode_instance_id/);
  assert.match(tfvars, /linode_domain_id/);
  assert.match(tfvars, /vps_ip/);
  assert.match(tfvars, /ssh_public_key/);

  assert.match(lockfile, /terraform init/);
  assert.match(lockfile, /provider locks/);
});

test('gitignore excludes terraform local state and secrets', () => {
  const gitignore = readInfraFile('../.gitignore');

  assert.match(gitignore, /infra\/terraform\/\.terraform\//);
  assert.match(gitignore, /infra\/terraform\/terraform\.tfvars/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate\.backup/);
});

test('infra README documents terraform import and apply workflow', () => {
  const readme = readInfraFile('README.md');

  assert.match(readme, /Terraform Setup/);
  assert.match(readme, /terraform init/);
  assert.match(readme, /terraform import linode_instance\.vps/);
  assert.match(readme, /terraform import linode_domain\.drdnt_org/);
  assert.match(readme, /terraform plan/);
  assert.match(readme, /terraform apply/);
});

test('bash scripts have valid shell syntax', () => {
  if (process.platform === 'win32') {
    return;
  }

  const scripts = [
    path.join(infraRoot, 'scripts/bootstrap-vps.sh'),
    path.join(infraRoot, 'scripts/setup-swap.sh'),
    path.join(infraRoot, 'scripts/issue-certs.sh'),
    path.join(infraRoot, 'scripts/deploy.sh'),
  ];

  try {
    for (const script of scripts) {
      execFileSync('bash', ['-n', script]);
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code);
      if (code === 'ENOENT' || code === 'EPERM') {
        return;
      }
    }
    throw error;
  }
});

test('bootstrap script provisions required VPS baseline steps', () => {
  const script = readInfraFile('scripts/bootstrap-vps.sh');

  assert.match(script, /apt update/);
  assert.match(script, /apt upgrade -y/);
  assert.match(script, /docker-ce/);
  assert.match(script, /docker-compose-plugin/);
  assert.match(script, /nginx/);
  assert.match(script, /certbot/);
  assert.match(script, /python3-certbot-nginx/);
  assert.match(script, /useradd -m -s \/bin\/bash "\$\{DEPLOY_USER\}"/);
  assert.match(script, /usermod -aG docker "\$\{DEPLOY_USER\}"/);
  assert.match(script, /authorized_keys/);
  assert.match(script, /\/opt\/station/);
  assert.match(script, /bash "\$\(dirname "\$0"\)\/setup-swap\.sh"/);
});

test('swap script creates and persists a 2 GB swap file', () => {
  const script = readInfraFile('scripts/setup-swap.sh');

  assert.match(script, /fallocate -l 2G \/swapfile/);
  assert.match(script, /chmod 600 \/swapfile/);
  assert.match(script, /mkswap \/swapfile/);
  assert.match(script, /swapon \/swapfile/);
  assert.match(script, /\/swapfile none swap sw 0 0/);
});

test('cert issuance script requests all Station domains and verifies renewal', () => {
  const script = readInfraFile('scripts/issue-certs.sh');

  assert.match(script, /certbot --nginx/);
  assert.match(script, /-d api\.drdnt\.org/);
  assert.match(script, /-d station\.drdnt\.org/);
  assert.match(script, /-d bot\.drdnt\.org/);
  assert.match(script, /certbot renew --dry-run/);
});

test('deploy script uses docker compose with the production env file', () => {
  const script = readInfraFile('scripts/deploy.sh');

  assert.match(
    script,
    /docker compose --env-file \.env\.production -f docker-compose\.prod\.yml pull/,
  );
  assert.match(
    script,
    /docker compose --env-file \.env\.production -f docker-compose\.prod\.yml up -d --no-deps backend frontend/,
  );
  assert.match(
    script,
    /docker compose --env-file \.env\.production -f docker-compose\.prod\.yml ps/,
  );
});

test('nginx configs target the expected upstreams', () => {
  const apiConfig = readInfraFile('nginx/api.drdnt.org.conf');
  const stationConfig = readInfraFile('nginx/station.drdnt.org.conf');
  const botConfig = readInfraFile('nginx/bot.drdnt.org.conf');

  assert.match(apiConfig, /server_name api\.drdnt\.org;/);
  assert.match(apiConfig, /proxy_pass http:\/\/127\.0\.0\.1:3001;/);

  assert.match(stationConfig, /server_name station\.drdnt\.org;/);
  assert.match(stationConfig, /location \/api\/ \{/);
  assert.match(stationConfig, /proxy_pass http:\/\/127\.0\.0\.1:3001;/);
  assert.match(stationConfig, /proxy_pass http:\/\/127\.0\.0\.1:3000;/);

  assert.match(botConfig, /server_name bot\.drdnt\.org;/);
  assert.match(botConfig, /proxy_pass http:\/\/127\.0\.0\.1:3999;/);
});

test('infra scripts are executable on disk', () => {
  if (process.platform === 'win32') {
    return;
  }

  const bootstrapMode = statSync(
    path.join(infraRoot, 'scripts/bootstrap-vps.sh'),
  ).mode;
  const swapMode = statSync(path.join(infraRoot, 'scripts/setup-swap.sh')).mode;
  const certMode = statSync(path.join(infraRoot, 'scripts/issue-certs.sh')).mode;
  const deployMode = statSync(path.join(infraRoot, 'scripts/deploy.sh')).mode;

  assert.ok(bootstrapMode & 0o111);
  assert.ok(swapMode & 0o111);
  assert.ok(certMode & 0o111);
  assert.ok(deployMode & 0o111);
});
