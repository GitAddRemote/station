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
  execFileSync('bash', [
    '-n',
    path.join(infraRoot, 'scripts/bootstrap-vps.sh'),
    path.join(infraRoot, 'scripts/setup-swap.sh'),
    path.join(infraRoot, 'scripts/issue-certs.sh'),
  ]);
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
  assert.match(script, /setup-swap\.sh/);
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

test('staging scripts use the staging compose and env files', () => {
  const deployStaging = readInfraFile('scripts/deploy-staging.sh');
  const stagingUp = readInfraFile('scripts/staging-up.sh');
  const stagingDown = readInfraFile('scripts/staging-down.sh');

  assert.match(
    deployStaging,
    /docker compose --env-file \.env\.staging -f docker-compose\.staging\.yml pull/,
  );
  assert.match(
    deployStaging,
    /docker compose --env-file \.env\.staging -f docker-compose\.staging\.yml up -d --no-deps backend frontend/,
  );
  assert.match(
    stagingUp,
    /docker compose --env-file \.env\.staging -f docker-compose\.staging\.yml up -d/,
  );
  assert.match(
    stagingDown,
    /docker compose --env-file \.env\.staging -f docker-compose\.staging\.yml down/,
  );
});

test('nginx configs target the expected upstreams', () => {
  const apiConfig = readInfraFile('nginx/api.drdnt.org.conf');
  const stationConfig = readInfraFile('nginx/station.drdnt.org.conf');
  const botConfig = readInfraFile('nginx/bot.drdnt.org.conf');
  const stagingApiConfig = readInfraFile('nginx/staging.api.drdnt.org.conf');
  const stagingStationConfig = readInfraFile(
    'nginx/staging.station.drdnt.org.conf',
  );

  assert.match(apiConfig, /server_name api\.drdnt\.org;/);
  assert.match(apiConfig, /proxy_pass http:\/\/127\.0\.0\.1:3001;/);

  assert.match(stationConfig, /server_name station\.drdnt\.org;/);
  assert.match(stationConfig, /location \/api\/ \{/);
  assert.match(stationConfig, /proxy_pass http:\/\/127\.0\.0\.1:3001;/);
  assert.match(stationConfig, /proxy_pass http:\/\/127\.0\.0\.1:3000;/);

  assert.match(botConfig, /server_name bot\.drdnt\.org;/);
  assert.match(botConfig, /proxy_pass http:\/\/127\.0\.0\.1:3999;/);

  assert.match(stagingApiConfig, /server_name staging\.api\.drdnt\.org;/);
  assert.match(stagingApiConfig, /proxy_pass http:\/\/127\.0\.0\.1:3002;/);

  assert.match(
    stagingStationConfig,
    /server_name staging\.station\.drdnt\.org;/,
  );
  assert.match(
    stagingStationConfig,
    /proxy_pass http:\/\/127\.0\.0\.1:3003;/,
  );
});

test('infra scripts are executable on disk', () => {
  const bootstrapMode = statSync(
    path.join(infraRoot, 'scripts/bootstrap-vps.sh'),
  ).mode;
  const swapMode = statSync(path.join(infraRoot, 'scripts/setup-swap.sh')).mode;
  const certMode = statSync(path.join(infraRoot, 'scripts/issue-certs.sh')).mode;
  const deployStagingMode = statSync(
    path.join(infraRoot, 'scripts/deploy-staging.sh'),
  ).mode;
  const stagingUpMode = statSync(
    path.join(infraRoot, 'scripts/staging-up.sh'),
  ).mode;
  const stagingDownMode = statSync(
    path.join(infraRoot, 'scripts/staging-down.sh'),
  ).mode;

  assert.ok(bootstrapMode & 0o111);
  assert.ok(swapMode & 0o111);
  assert.ok(certMode & 0o111);
  assert.ok(deployStagingMode & 0o111);
  assert.ok(stagingUpMode & 0o111);
  assert.ok(stagingDownMode & 0o111);
});

test('release workflow and CI branch rules are configured', () => {
  const releaseWorkflow = readInfraFile('../.github/workflows/release.yml');
  const backendCiWorkflow = readInfraFile('../.github/workflows/backend-ci.yml');
  const frontendCiWorkflow = readInfraFile('../.github/workflows/frontend-ci.yml');
  const cicdDoc = readInfraFile('../docs/cicd.md');

  assert.match(releaseWorkflow, /branches:\s*\n\s*- 'release\/\*\*'/);
  assert.match(releaseWorkflow, /deploy-staging/);
  assert.match(releaseWorkflow, /environment: staging/);
  assert.match(releaseWorkflow, /deploy-production/);
  assert.match(releaseWorkflow, /environment: production/);
  assert.match(releaseWorkflow, /softprops\/action-gh-release@v2/);

  assert.match(backendCiWorkflow, /branches-ignore:/);
  assert.match(backendCiWorkflow, /'release\/\*\*'/);
  assert.match(frontendCiWorkflow, /branches-ignore:/);
  assert.match(frontendCiWorkflow, /'release\/\*\*'/);

  assert.match(cicdDoc, /GitHub Environments/);
  assert.match(cicdDoc, /VPS_SSH_KEY/);
  assert.match(cicdDoc, /staging-up\.sh/);
  assert.match(cicdDoc, /Rollback/);
});
