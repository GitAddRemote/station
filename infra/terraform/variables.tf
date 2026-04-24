variable "linode_token" {
  description = "Linode API personal access token."
  type        = string
  sensitive   = true
}

variable "linode_instance_id" {
  description = "Existing Linode instance ID to import."
  type        = number
}

variable "linode_domain_id" {
  description = "Existing Linode domain ID to import."
  type        = number
}

variable "vps_ip" {
  description = "Public IPv4 address of the Station VPS."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key content for the deploy user."
  type        = string
}
