# Coolify Test App

A simple test application to verify wildcard domain configuration in Coolify.

## Purpose

This app confirms that:
- Cloudflare Tunnel wildcard routing works
- Coolify can deploy apps with custom subdomains
- Traefik reverse proxy is functioning
- SSL certificates are automatically provisioned

## Deployment

1. Push this repo to GitHub
2. In Coolify, create a new application
3. Connect to this GitHub repository
4. Set domain to: `test.aiwrk.org` (or any subdomain)
5. Deploy!

## What It Does

Displays a simple success page showing:
- Deployment status
- Current domain/hostname
- Protocol (HTTP/HTTPS)
- Confirmation that wildcard setup works

## Tech Stack

- Nginx (Alpine)
- Static HTML/CSS/JS
- Docker
