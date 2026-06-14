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

resource "linode_domain_record" "status_cname" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "status"
  record_type = "CNAME"
  target      = "stats.uptimerobot.com"
  ttl_sec     = 300

  lifecycle {
    prevent_destroy = true
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

resource "linode_domain_record" "apex" {
  domain_id   = linode_domain.drdnt_org.id
  name        = ""
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

resource "linode_domain_record" "discord" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "discord"
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

resource "linode_domain_record" "grafana" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "grafana"
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

resource "linode_domain_record" "staging_api" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "staging.api"
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

resource "linode_domain_record" "staging_station" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "staging.station"
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

# Resend email — mail.drdnt.org (transactional + Grafana alert email)
resource "linode_domain_record" "resend_dkim" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "resend._domainkey.mail"
  record_type = "TXT"
  target      = "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCvj8tRhNsvOPgc9ZqqN4X7kKTca0GTSdIWi01qNIAtasVCfz/oW7UvP4Hw2snpSGUnxXWrYrLVDeKVIfwyatA+fszYKF7owR7YGi0ElNBhIK60NTcSrVzcMXXh45lRY3EHn27CNBG3oKSlAsHJmpWYMV8FT/eTTxCrpxexRen5/QIDAQAB"
  ttl_sec     = 300
}

resource "linode_domain_record" "resend_mx" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "send.mail"
  record_type = "MX"
  target      = "feedback-smtp.us-east-1.amazonses.com"
  priority    = 10
  ttl_sec     = 300
}

resource "linode_domain_record" "resend_spf" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "send.mail"
  record_type = "TXT"
  target      = "v=spf1 include:amazonses.com ~all"
  ttl_sec     = 300
}

resource "linode_domain_record" "resend_dmarc" {
  domain_id   = linode_domain.drdnt_org.id
  name        = "_dmarc"
  record_type = "TXT"
  target      = "v=DMARC1; p=none;"
  ttl_sec     = 300
}
