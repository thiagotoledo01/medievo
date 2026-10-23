import { createFileRoute } from "@tanstack/react-router";

// Public Firebase web config for the static game (Firebase web keys are designed to be public;
// security comes from the Realtime Database rules).
export const Route = createFileRoute("/api/public/firebase-config")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            apiKey: (process.env["GOOGLE_API_KEY"] || "").trim(),
            authDomain: "medievo-c9a64.firebaseapp.com",
            databaseURL: "https://medievo-c9a64-default-rtdb.firebaseio.com",
            projectId: "medievo-c9a64",
            storageBucket: "medievo-c9a64.firebasestorage.app",
            messagingSenderId: "1015302544403",
            appId: "1:1015302544403:web:295a4138cd9e55773673e6",
            measurementId: (process.env["GOOGLE_ANALYTICS_MEASUREMENT_ID"] || "").trim() || undefined,
          },
          { headers: { "Cache-Control": "public, max-age=300" } },
        ),
    },
  },
});
