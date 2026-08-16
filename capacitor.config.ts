import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.syllune.study",
  appName: "Syllune",
  // The web layer is the existing app. `capacitor-web` holds a tiny offline
  // shell; the live app is loaded from the deployed URL below so the full
  // server-rendered TanStack Start app (auth, sync, AI photo import) works.
  webDir: "capacitor-web",
  server: {
    url: "https://sylluneplanner.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
