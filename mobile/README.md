# FarmTrace Mobile

React Native mobile app built with Expo for monitoring and managing farmland.

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Tech Stack

- **Expo** — Managed React Native workflow
- **React Navigation** — Screen navigation
- **React Native Maps** — Map display (Mapbox integration planned)
- **Zustand** — State management
- **Axios** — HTTP client for API calls

## Project Structure

```
mobile/
├── src/
│   ├── navigation/     # React Navigation config
│   ├── screens/        # Screen components
│   ├── components/     # Reusable UI components
│   ├── config/         # App-wide constants & theme
│   ├── utils/          # API client, helpers
│   └── assets/         # Images, fonts
├── App.tsx             # Entry point
├── app.json            # Expo config
└── package.json
```
