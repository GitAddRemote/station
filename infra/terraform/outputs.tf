output "vps_ip" {
  description = "Public IPv4 address for the Station VPS."
  value       = local.vps_ipv4
}

output "api_fqdn" {
  description = "API hostname."
  value       = "api.${linode_domain.drdnt_org.domain}"
}

output "station_fqdn" {
  description = "Frontend hostname."
  value       = "station.${linode_domain.drdnt_org.domain}"
}

output "bot_fqdn" {
  description = "Bot hostname."
  value       = "bot.${linode_domain.drdnt_org.domain}"
}
