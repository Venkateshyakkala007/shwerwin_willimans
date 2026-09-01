# Architecture

The current runnable application uses a Vinext/Next-compatible web surface and Cloudflare-compatible output. Domain contracts, fake connectors, test data, API routes, and the worker simulation are kept outside UI components so production adapters can replace fakes without changing the dashboard.

PostgreSQL remains the intended operational source of truth and Redis the transient coordination layer for the Azure production architecture. The Sites-hosted demo uses deterministic in-process fake data because external APIs and enterprise infrastructure are unavailable.

Fake authentication and connectors are explicitly prohibited in production configuration. Entra ID, HR, Databricks, and provider adapters remain contract-compatible integration boundaries pending client credentials and approved payloads.
