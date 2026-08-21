import { defineConfig, devices } from "@playwright/test";
const hasE2eEnvironment=Boolean(process.env.E2E_USER_EMAIL&&process.env.E2E_USER_PASSWORD&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export default defineConfig({ testDir: "./tests/e2e", fullyParallel: false, use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" }, webServer: hasE2eEnvironment?{ command: "npm run dev", url: "http://127.0.0.1:3000", reuseExistingServer: true }:undefined, projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }] });
