variable "linode_token" {
  description = "Linode API personal access token."
  type        = string
  sensitive   = true
}

variable "vps_ip" {
  description = "Optional fallback public IPv4 address of the Station VPS when the imported instance IP is not yet available."
  type        = string
  nullable    = true
  default     = null
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
  description = "SSH public key content for the deploy user. Optional for imported VPS workflows; if set, this is intended only for initial/create-time authorized_keys configuration and is not reconciled by Terraform after import or later changes."
  type        = string
  nullable    = true
  default     = null
}
