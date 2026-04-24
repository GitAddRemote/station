# Infrastructure

This directory holds the infrastructure-as-code and VPS provisioning assets for Station.

## Terraform Setup

Issue `#106` establishes the Linode foundation as code. The Terraform configuration manages:

- the existing Linode VPS instance through `terraform import`
- the Linode firewall allowing only TCP ports `22`, `80`, and `443`
- the DNS records for `api.drdnt.org`, `station.drdnt.org`, and `bot.drdnt.org`

### Files

- `terraform/main.tf`: provider, instance, and firewall configuration
- `terraform/dns.tf`: Linode domain and A records
- `terraform/variables.tf`: required input variables
- `terraform/outputs.tf`: useful outputs for the VPS IP and FQDNs
- `terraform/terraform.tfvars.example`: example input values

### Workflow

```bash
cd infra/terraform
terraform init
terraform import linode_instance.vps <linode-instance-id>
terraform import linode_domain.drdnt_org <linode-domain-id>
terraform plan
terraform apply
```

Review `terraform plan` before every apply. The existing VPS must be imported rather than recreated.

### Variables

- `linode_token`: Linode API token
- `linode_instance_id`: existing Linode instance ID to import
- `linode_domain_id`: existing Linode domain ID to import
- `vps_ip`: public IPv4 of the VPS
- `ssh_public_key`: deploy SSH public key

Keep real values in `infra/terraform/terraform.tfvars`, which is gitignored.
