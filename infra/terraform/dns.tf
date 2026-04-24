resource "linode_domain" "drdnt_org" {
  domain      = "drdnt.org"
  type        = "master"
  soa_email   = "admin@drdnt.org"
  description = "Station DNS zone"
}

resource "linode_domain_record" "api" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "api"
  record_type = "A"
  target      = var.vps_ip
  ttl_sec     = 300
}

resource "linode_domain_record" "station" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "station"
  record_type = "A"
  target      = var.vps_ip
  ttl_sec     = 300
}

resource "linode_domain_record" "bot" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "bot"
  record_type = "A"
  target      = var.vps_ip
  ttl_sec     = 300
}
