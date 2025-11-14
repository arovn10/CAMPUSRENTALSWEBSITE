# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment and CI/CD.

## Workflows

### `auto-deploy-check.yml`
**Automated deployment check that runs every 15 minutes**

This workflow:
- Checks for new commits every 15 minutes
- If changes are detected, automatically:
  1. Pulls latest code from Git on the server
  2. Installs/updates dependencies
  3. Rebuilds the application
  4. Restarts the site with PM2
- If no changes are detected, the workflow exits without deploying

**Required GitHub Secrets:**
- `SSH_PRIVATE_KEY`: Your SSH private key for server access (contents of your `.pem` file)
- `SERVER_HOST`: Your server IP address (e.g., `23.21.76.187`)
- `SERVER_USER`: SSH username (e.g., `bitnami`)

**How to set up secrets:**
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" for each:
   - Name: `SSH_PRIVATE_KEY`, Value: Contents of your `.pem` file
   - Name: `SERVER_HOST`, Value: Your server IP (e.g., `23.21.76.187`)
   - Name: `SERVER_USER`, Value: Your SSH username (e.g., `bitnami`)

**Manual trigger:**
You can also manually trigger this workflow from the Actions tab → "Auto Deploy Check" → "Run workflow"

### `deploy.yml`
**Deployment on push to main branch**

This workflow automatically deploys when code is pushed to the `main` branch.

## Notes

- The auto-deploy-check workflow uses a commit SHA tracking file (`.github/last-deployed-sha`) to detect changes
- If the file doesn't exist, it will deploy on the first run
- The workflow will update the SHA file after successful deployment


