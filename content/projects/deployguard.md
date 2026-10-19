---
title: DeployGuard
summary: A Kubernetes deployment triage agent with human approval built into remediation.
category: Cloud & agents
status: Project
featured: true
order: 2
tags: [Kubernetes, Google ADK, Python]
repository: https://github.com/omkarjoshi0304/deployguard
---
## The idea

DeployGuard explores how an AI agent can help investigate Kubernetes deployment failures and propose focused fixes, while keeping people in control of remediation.

## What it handles

The agent targets three failure classes: bad image tags, missing environment variables, and OOMKilled pods. It combines Google ADK with Cloud Run, Pub/Sub, Firestore, and Slack to coordinate the investigation and approval workflow.

## Keeping remediation accountable

Human approval gates sit between diagnosis and action. Idempotent remediation helps avoid repeating the same operation, while OpenTelemetry tracing makes the workflow easier to follow.
