locals {
  vps_ipv4 = linode_instance.vps.ip_address != null && linode_instance.vps.ip_address != "" ? linode_instance.vps.ip_address : var.vps_ip
}

resource "linode_domain" "drdnt_org" {
  domain      = "drdnt.org"
  type        = "master"
  soa_email   = "admin@drdnt.org"
  description = "Station DNS zone"

  lifecycle {
    prevent_destroy = true
  }
}

resource "linode_domain_record" "api" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "api"
  record_type = "A"
  target      = local.vps_ipv4
  ttl_sec     = 300

  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = local.vps_ipv4 != null && trim(local.vps_ipv4) != ""
      error_message = "Provide vps_ip until the imported VPS exposes a non-empty public IPv4 address, otherwise DNS records cannot be created safely."
    }
  }
}

resource "linode_domain_record" "station" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "station"
  record_type = "A"
  target      = local.vps_ipv4
  ttl_sec     = 300

  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = local.vps_ipv4 != null && trim(local.vps_ipv4) != ""
      error_message = "Provide vps_ip until the imported VPS exposes a non-empty public IPv4 address, otherwise DNS records cannot be created safely."
    }
  }
}

resource "linode_domain_record" "bot" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "bot"
  record_type = "A"
  target      = local.vps_ipv4
  ttl_sec     = 300

  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = local.vps_ipv4 != null && trim(local.vps_ipv4) != ""
      error_message = "Provide vps_ip until the imported VPS exposes a non-empty public IPv4 address, otherwise DNS records cannot be created safely."
    }
  }
}
