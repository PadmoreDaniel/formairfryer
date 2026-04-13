# Deploying Form Airfryer

**Hosting URL:** https://formairfryer.web.app/  
**Firebase Project:** formairfryer

## Prerequisites

- [Node.js](https://nodejs.org/) installed
- Firebase CLI available (`npm install -g firebase-tools` or use `npx`)
- Authenticated with Firebase (`npx firebase login`)

## Deploy Steps

1. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

2. **Build for production:**

   ```bash
   npm run build
   ```

3. **Deploy to Firebase Hosting:**

   ```bash
   npx firebase deploy --only hosting
   ```

## One-Liner

```bash
npm run build && npx firebase deploy --only hosting
```

## Notes

- The `build/` folder is deployed (configured in `firebase.json`)
- All routes rewrite to `index.html` for client-side routing
- Firebase project ID is `formairfryer`
