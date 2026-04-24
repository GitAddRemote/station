variable "linode_token" {
  description = "Linode API personal access token."
  type        = string
  sensitive   = true
}

variable "vps_ip" {
  description = "Public IPv4 address of the Station VPS."
  type        = string
}

variable "vps_label" {
  description = "Linode label of the imported VPS."
  type        = string
}

variable "vps_region" {
  description = "Linode region slug of the imported VPS."
  type        = string
}

variable "vps_type" {
  description = "Linode plan type of the imported VPS."
  type        = string
}

variable "vps_image" {
  description = "Base image recorded for the imported VPS."
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key content for the deploy user."
  type        = string
}
