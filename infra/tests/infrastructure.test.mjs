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
  assert.match(mainTf, /prevent_destroy = true/);
  assert.match(mainTf, /ports\s*=\s*"22"/);
  assert.match(mainTf, /ports\s*=\s*"80"/);
  assert.match(mainTf, /ports\s*=\s*"443"/);

  assert.match(dnsTf, /resource "linode_domain" "drdnt_org"/);
  assert.match(dnsTf, /resource "linode_domain_record" "api"/);
  assert.match(dnsTf, /resource "linode_domain_record" "station"/);
  assert.match(dnsTf, /resource "linode_domain_record" "bot"/);
  assert.match(dnsTf, /locals\s*\{/);
  assert.match(dnsTf, /linode_instance\.vps\.ip_address/);
  assert.match(dnsTf, /prevent_destroy = true/);
  assert.match(dnsTf, /precondition\s*\{/);

  assert.match(variablesTf, /variable "linode_token"/);
  assert.match(variablesTf, /variable "vps_ip"/);
  assert.match(variablesTf, /variable "vps_label"/);
  assert.match(variablesTf, /variable "vps_region"/);
  assert.match(variablesTf, /variable "vps_type"/);
  assert.match(variablesTf, /variable "vps_image"/);
  assert.match(variablesTf, /variable "ssh_public_key"/);
  assert.match(variablesTf, /nullable\s*=\s*true/);
  assert.match(variablesTf, /default\s*=\s*null/);
  assert.match(variablesTf, /validation\s*\{/);

  assert.match(outputsTf, /output "vps_ip"/);
  assert.match(outputsTf, /output "api_fqdn"/);
  assert.match(outputsTf, /output "station_fqdn"/);
  assert.match(outputsTf, /output "bot_fqdn"/);

  assert.match(tfvars, /linode_token/);
  assert.match(tfvars, /vps_ip/);
  assert.match(tfvars, /vps_label/);
  assert.match(tfvars, /vps_region/);
  assert.match(tfvars, /vps_type/);
  assert.match(tfvars, /vps_image/);
  assert.match(tfvars, /ssh_public_key/);

  assert.ok(lockfile.trim().length > 0);
  assert.ok(
    /terraform init|provider\s+"registry\.terraform\.io\/linode\/linode"/.test(
      lockfile,
    ),
  );
});

test('gitignore excludes terraform local state and secrets', () => {
  const gitignore = readInfraFile('../.gitignore');

  assert.match(gitignore, /^\.env\.\*$/m);
  assert.match(gitignore, /^!\.env\.production\.example$/m);
  assert.match(gitignore, /^!\.env\.staging\.example$/m);
  assert.match(gitignore, /infra\/terraform\/\.terraform\//);
  assert.match(gitignore, /infra\/terraform\/terraform\.tfvars/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate\.backup/);
});

test('pnpm lockfile includes the infra importer', () => {
  const lockfile = readInfraFile('../pnpm-lock.yaml');

  assert.match(lockfile, /(?:^|\n)importers:\s*(?:\n(?!\S).*)*\n\s{2,}infra:\s*(?:\{\}|$)/);
});

test('infra README documents terraform import and apply workflow', () => {
  const readme = readInfraFile('README.md');

  assert.match(readme, /Terraform Setup/);
  assert.match(readme, /terraform init/);
  assert.match(readme, /terraform import linode_instance\.vps/);
  assert.match(readme, /terraform import linode_domain\.drdnt_org/);
  assert.match(readme, /terraform plan/);
  assert.match(readme, /terraform apply/);
  assert.match(
    readme,
    /ssh_public_key`: optional deploy SSH public key for initial instance configuration; authorized keys are not continuously managed after import/,
  );
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
    path.join(infraRoot, 'scripts/deploy-staging.sh'),
    path.join(infraRoot, 'scripts/staging-up.sh'),
    path.join(infraRoot, 'scripts/staging-down.sh'),
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

test('staging scripts use the staging compose and env files', () => {
  const deployStaging = readInfraFile('scripts/deploy-staging.sh');
  const stagingUp = readInfraFile('scripts/staging-up.sh');
  const stagingDown = readInfraFile('scripts/staging-down.sh');

  assert.match(
    deployStaging,
    /docker compose(?: (?:--project-name|-p) \S+)? --env-file \.env\.staging -f docker-compose\.staging\.yml pull/,
  );
  assert.match(
    deployStaging,
    /docker compose(?: (?:--project-name|-p) \S+)? --env-file \.env\.staging -f docker-compose\.staging\.yml up -d --no-deps backend frontend/,
  );
  assert.match(
    stagingUp,
    /docker compose(?: (?:--project-name|-p) \S+)? --env-file \.env\.staging -f docker-compose\.staging\.yml up -d/,
  );
  assert.match(
    stagingDown,
    /docker compose(?: (?:--project-name|-p) \S+)? --env-file \.env\.staging -f docker-compose\.staging\.yml down/,
  );
});

test('release workflow safely quotes station version for remote deploys', () => {
  const workflow = readInfraFile('../.github/workflows/release.yml');

  assert.match(workflow, /concurrency:\s*\n\s*group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(
    workflow,
    /deploy-staging:[\s\S]*?concurrency:\s*\n\s*group: station-deploy\s*\n\s*cancel-in-progress: false/,
  );
  assert.match(
    workflow,
    /deploy-production:[\s\S]*?concurrency:\s*\n\s*group: station-deploy\s*\n\s*cancel-in-progress: false/,
  );
  assert.match(workflow, /validate-release/);
  assert.match(workflow, /image: postgres:16-alpine/);
  assert.match(workflow, /needs: validate-release/);
  assert.match(workflow, /Run backend lint/);
  assert.match(workflow, /Run backend unit tests/);
  assert.match(workflow, /Run backend E2E tests/);
  assert.match(workflow, /Run backend build/);
  assert.match(workflow, /Run frontend lint/);
  assert.match(workflow, /Run frontend typecheck/);
  assert.match(workflow, /Run frontend build/);
  assert.match(workflow, /ESCAPED_STATION_VERSION="\$\(printf '%q' "\$\{STATION_VERSION\}"\)"/);
  assert.match(
    workflow,
    /STATION_VERSION=\$\{ESCAPED_STATION_VERSION\} bash infra\/scripts\/deploy-staging\.sh/,
  );
  assert.match(
    workflow,
    /STATION_VERSION=\$\{ESCAPED_STATION_VERSION\} bash infra\/scripts\/deploy\.sh/,
  );
  assert.match(workflow, /if ! \[\[ "\$VERSION" =~ \^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\(\[\.-\]\[0-9A-Za-z\.-\]\+\)\?\$ \]\]; then/);
  assert.match(workflow, /VPS_KNOWN_HOSTS/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /printf '%s\\n' "\$VPS_KNOWN_HOSTS" > ~\/\.ssh\/known_hosts/);
  assert.match(workflow, /Write staging environment file/);
  assert.match(workflow, /Write production environment file/);
  assert.match(workflow, /cat > \/opt\/station\/\.env\.staging <<'ENVEOF'/);
  assert.match(workflow, /cat > \/opt\/station\/\.env\.production <<'ENVEOF'/);
  assert.match(workflow, /chmod 600 \/opt\/station\/\.env\.staging/);
  assert.match(workflow, /chmod 600 \/opt\/station\/\.env\.production/);
  assert.match(workflow, /DATABASE_HOST=\$\{DATABASE_HOST\}/);
  assert.match(workflow, /DATABASE_PORT=\$\{DATABASE_PORT\}/);
  assert.match(workflow, /DATABASE_USER=\$\{DATABASE_USER\}/);
  assert.match(workflow, /DATABASE_PASSWORD=\$\{DATABASE_PASSWORD\}/);
  assert.match(workflow, /DATABASE_NAME=\$\{DATABASE_NAME\}/);
  assert.match(workflow, /JWT_SECRET=\$\{JWT_SECRET\}/);
  assert.match(workflow, /REDIS_PASSWORD=\$\{REDIS_PASSWORD\}/);
  assert.match(workflow, /ALLOWED_ORIGIN=\$\{ALLOWED_ORIGIN\}/);
  assert.match(workflow, /FRONTEND_URL=\$\{FRONTEND_URL\}/);
  assert.match(workflow, /SENTRY_DSN=\$\{SENTRY_DSN\}/);
  assert.match(workflow, /LOGTAIL_SOURCE_TOKEN=\$\{LOGTAIL_SOURCE_TOKEN\}/);
  assert.match(workflow, /B2_ACCOUNT_ID=\$\{B2_ACCOUNT_ID\}/);
  assert.match(workflow, /B2_APPLICATION_KEY=\$\{B2_APPLICATION_KEY\}/);
  assert.match(workflow, /B2_BUCKET=\$\{B2_BUCKET\}/);
  assert.match(workflow, /BACKUP_HEALTHCHECK_URL=\$\{BACKUP_HEALTHCHECK_URL\}/);
  assert.match(workflow, /curl --fail --silent --show-error --connect-timeout 5 --max-time "\$max_time"/);
  assert.match(workflow, /deadline=\$\(\(SECONDS \+ 120\)\)/);
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
  if (process.platform === 'win32') {
    return;
  }

  const bootstrapMode = statSync(
    path.join(infraRoot, 'scripts/bootstrap-vps.sh'),
  ).mode;
  const swapMode = statSync(path.join(infraRoot, 'scripts/setup-swap.sh')).mode;
  const certMode = statSync(path.join(infraRoot, 'scripts/issue-certs.sh')).mode;
  const deployMode = statSync(path.join(infraRoot, 'scripts/deploy.sh')).mode;
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
  assert.ok(deployMode & 0o111);
  assert.ok(deployStagingMode & 0o111);
  assert.ok(stagingUpMode & 0o111);
  assert.ok(stagingDownMode & 0o111);
});

test('release workflow and CI branch rules are configured', () => {
  const releaseWorkflow = readInfraFile('../.github/workflows/release.yml');
  const releaseNotesWorkflow = readInfraFile('../.github/workflows/release-notes.yml');
  const backendCiWorkflow = readInfraFile('../.github/workflows/backend-ci.yml');
  const frontendCiWorkflow = readInfraFile('../.github/workflows/frontend-ci.yml');
  const cicdDoc = readInfraFile('../docs/cicd.md');
  const cliffConfig = readInfraFile('../cliff.toml');
  const changelog = readInfraFile('../CHANGELOG.md');
  const secretsDoc = readInfraFile('docs/secrets.md');

  assert.match(releaseWorkflow, /branches:\s*\n\s*- 'release\/\*\*'/);
  assert.match(releaseWorkflow, /deploy-staging/);
  assert.match(releaseWorkflow, /environment: staging/);
  assert.match(releaseWorkflow, /deploy-production/);
  assert.match(releaseWorkflow, /environment: production/);
  assert.match(releaseWorkflow, /softprops\/action-gh-release@v2/);
  assert.match(releaseWorkflow, /orhun\/git-cliff-action@v4/);
  assert.match(releaseWorkflow, /args: --tag "\$\{\{ needs\.build-and-push\.outputs\.version \}\}" --strip header --output RELEASE_NOTES\.md/);
  assert.match(releaseWorkflow, /args: --output CHANGELOG\.md/);
  assert.match(releaseWorkflow, /Persist generated CHANGELOG\.md/);
  assert.match(releaseWorkflow, /Checkout main for changelog update/);
  assert.match(releaseWorkflow, /path: changelog-main/);
  assert.match(releaseWorkflow, /working-directory: changelog-main/);
  assert.match(releaseWorkflow, /cp CHANGELOG\.md "\$\{RUNNER_TEMP\}\/CHANGELOG\.md"/);
  assert.match(releaseWorkflow, /git checkout -B changelog-sync origin\/main/);
  assert.match(releaseWorkflow, /for attempt in 1 2 3; do/);
  assert.match(releaseWorkflow, /git push origin HEAD:main/);
  assert.match(releaseWorkflow, /Wait for production health[\s\S]*Promote images to latest/);
  assert.match(releaseWorkflow, /Create git tag[\s\S]*Generate release notes[\s\S]*Update CHANGELOG\.md[\s\S]*Persist generated CHANGELOG\.md[\s\S]*Checkout main for changelog update[\s\S]*Commit CHANGELOG\.md to main[\s\S]*Create GitHub Release/);

  assert.match(releaseNotesWorkflow, /workflow_dispatch:/);
  assert.match(releaseNotesWorkflow, /description: Existing tag to regenerate release notes/);
  assert.match(releaseNotesWorkflow, /orhun\/git-cliff-action@v4/);
  assert.match(releaseNotesWorkflow, /softprops\/action-gh-release@v2/);
  assert.match(releaseNotesWorkflow, /tag_name: \$\{\{ inputs\.tag \}\}/);

  assert.match(cliffConfig, /\[changelog\]/);
  assert.match(cliffConfig, /### \{\{ group \}\}/);
  assert.match(cliffConfig, /Features/);
  assert.match(cliffConfig, /Bug Fixes/);
  assert.match(cliffConfig, /Performance/);
  assert.match(cliffConfig, /Refactoring/);
  assert.match(cliffConfig, /Testing/);
  assert.match(cliffConfig, /Documentation/);
  assert.match(cliffConfig, /Chores/);
  assert.match(cliffConfig, /\^v\[0-9\]\+\\\\\.\[0-9\]\+\\\\\.\[0-9\]\+\(\[\.-\]\.\*\)\?\$/);
  assert.match(changelog, /^# Changelog$/m);

  assert.doesNotMatch(
    backendCiWorkflow,
    /branches-ignore:\s*\n(?:\s*-\s*.*\n)*\s*-\s*'release\/\*\*'/,
  );
  assert.match(
    backendCiWorkflow,
    /on:\s*\n\s*push:\s*\n\s*paths:\s*\n(?:\s*-\s*'.*'\n)+\s*pull_request:/,
  );
  assert.doesNotMatch(
    frontendCiWorkflow,
    /branches-ignore:\s*\n(?:\s*-\s*.*\n)*\s*-\s*'release\/\*\*'/,
  );
  assert.match(
    frontendCiWorkflow,
    /on:\s*\n\s*push:\s*\n\s*paths:\s*\n(?:\s*-\s*'.*'\n)+\s*pull_request:/,
  );

  assert.match(cicdDoc, /GitHub Environments/);
  assert.match(cicdDoc, /environment-scoped secrets/);
  assert.match(cicdDoc, /VPS_SSH_KEY/);
  assert.match(cicdDoc, /VPS_KNOWN_HOSTS/);
  assert.match(cicdDoc, /DATABASE_PASSWORD/);
  assert.match(cicdDoc, /JWT_SECRET/);
  assert.match(cicdDoc, /REDIS_PASSWORD/);
  assert.match(cicdDoc, /B2_APPLICATION_KEY/);
  assert.match(cicdDoc, /BACKUP_HEALTHCHECK_URL/);
  assert.match(cicdDoc, /staging-up\.sh/);
  assert.match(cicdDoc, /station-staging/);
  assert.match(cicdDoc, /chmod 600/);
  assert.match(cicdDoc, /infra\/docs\/secrets\.md/);
  assert.match(cicdDoc, /## Release Notes/);
  assert.match(cicdDoc, /git-cliff/);
  assert.match(cicdDoc, /RELEASE_NOTES\.md/);
  assert.match(cicdDoc, /CHANGELOG\.md/);
  assert.match(cicdDoc, /release-notes\.yml/);
  assert.match(cicdDoc, /release workflow now runs its own backend\/frontend validation before image build and deploy/);
  assert.match(cicdDoc, /Release runs are serialized per release branch/);
  assert.match(cicdDoc, /global `station-deploy` concurrency group/);
  assert.match(cicdDoc, /postgres:16-alpine/);
  assert.match(cicdDoc, /Backend and frontend CI still run on `release\/\*\*` pushes, but the release workflow no longer depends on those separate runs to gate deploys/);
  assert.match(cicdDoc, /Rollback/);

  assert.match(secretsDoc, /^# Secrets Management$/m);
  assert.match(secretsDoc, /## Secret Inventory/);
  assert.match(secretsDoc, /VPS_KNOWN_HOSTS/);
  assert.match(secretsDoc, /DATABASE_PASSWORD/);
  assert.match(secretsDoc, /JWT_SECRET/);
  assert.match(secretsDoc, /REDIS_PASSWORD/);
  assert.match(secretsDoc, /B2_APPLICATION_KEY/);
  assert.match(secretsDoc, /LOGTAIL_SOURCE_TOKEN/);
  assert.match(secretsDoc, /BACKUP_HEALTHCHECK_URL/);
  assert.match(secretsDoc, /## Generic Rotation Procedure/);
  assert.match(secretsDoc, /## JWT Secret Rotation/);
  assert.match(secretsDoc, /## Database Password Rotation/);
  assert.match(secretsDoc, /## SSH Key Rotation/);
  assert.match(secretsDoc, /chmod 600/);
});

test('staging env example quotes values that contain spaces', () => {
  const stagingEnvExample = readInfraFile('../.env.staging.example');

  assert.match(stagingEnvExample, /^APP_NAME="STATION BACKEND STAGING"$/m);
  assert.match(stagingEnvExample, /^REFRESH_TOKEN_CLEANUP_CRON="0 3 \* \* \*"$/m);
});
