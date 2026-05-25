import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const esmPreset = createDefaultEsmPreset({
  tsconfig: "<rootDir>/tsconfig.jest.json",
});

const config: Config = {
  ...esmPreset,
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/app/**/*.jest.test.ts", "<rootDir>/app/**/*.jest.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "!app/generated/**",
    "!app/**/*.d.ts",
    "!app/features/admin/components/StoryExtraContentEditor.tsx",
  ],
};

export default config;
