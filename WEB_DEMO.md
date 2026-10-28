# CloudDrop frontend demo

The GitHub Pages workflow builds only the React frontend with `VITE_DEMO_MODE=true`.

In demo mode:
- sample files and folders are shown locally in the browser;
- search, folder navigation, new folders, simulated upload/download, move, delete and sharing UI can be demonstrated;
- no live backend credentials or infrastructure are required.

The normal Docker/local build is unchanged conceptually and still uses the real backend stack:
NestJS + PostgreSQL + Redis + S3-compatible object storage.

## GitHub Pages

1. Push this project to a GitHub repository.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The workflow `.github/workflows/deploy-frontend-demo.yml` builds and deploys the frontend automatically.
4. The resulting project URL will normally be:
   `https://<username>.github.io/<repository>/`
