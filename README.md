# How to deploy

- auth-server: deploy via GitHub Action.
  - `AAD_CLIENT_SECRET`, obtain from "HITS Figma Plugin" AAD app. Do NOT surround value with quotes. It may work locally but will cause problem in the Cloud
  - `PORT=5201`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
- api-proxy: deploy via GitHub Action.
  - `PORT=5202`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
- assistant-web: deploy via GitHub Action.
  - Ref: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-static-site-github-actions
- assistant-pluin: deploy inside Figma via Microsoft Organization plugins
- impromptu-web: local development only
- impromptu-assistant: local development only
