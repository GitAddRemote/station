import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const lockfile = readInfraFile('../pnpm-lock.yaml');

  assert.match(gitignore, /infra\/terraform\/\.terraform\//);
  assert.match(gitignore, /infra\/terraform\/terraform\.tfvars/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate/);
  assert.match(gitignore, /infra\/terraform\/\*\.tfstate\.backup/);
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
