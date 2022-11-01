# How to deploy

- auth-server: deploy via GitHub Action.
  - `AAD_CLIENT_SECRET`, obtain from "HITS Figma Plugin" AAD app. Do NOT surround value with quotes. It may work locally but will cause problem in the Cloud
  - `PORT=5201`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
  - `WEB_HOST`, Host URL for the frontend
- api-proxy: deploy via GitHub Action.
  - `PORT=5201`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
- web: deploy manually via Azure Static Websites on Blob Storage
- figma-pluin: deploy inside Figma via Microsoft Organization plugins
