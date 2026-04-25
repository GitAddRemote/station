variable "linode_token" {
  description = "Linode API personal access token."
  type        = string
  sensitive   = true
}

variable "vps_ip" {
  description = "Fallback public IPv4 address of the Station VPS. Provide this until the imported instance IP is available so DNS records always have a valid target."
  type        = string
  nullable    = true
  default     = null

  validation {
    condition     = var.vps_ip == null || trim(var.vps_ip) != ""
    error_message = "vps_ip must be omitted or set to a non-empty IPv4 string."
  }
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
