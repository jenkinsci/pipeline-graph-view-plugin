import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Extracts Jenkins core's stylesheet from the jenkins.war the plugin builds against, so stories
 * are styled as they are on Jenkins' pages. It's kept in .storybook/jenkins, and only extracted
 * again when jenkins.version changes.
 */
function extractJenkinsStyles() {
  const pom = readFileSync(join(import.meta.dirname, "../pom.xml"), "utf8");
  const version = pom.match(/<jenkins\.version>(.+?)<\/jenkins\.version>/)?.[1];
  if (!version) {
    throw new Error("Couldn't find <jenkins.version> in pom.xml");
  }

  const outDir = join(import.meta.dirname, "jenkins");
  const versionFile = join(outDir, "version");
  if (
    existsSync(versionFile) &&
    readFileSync(versionFile, "utf8") === version
  ) {
    return;
  }

  const war = join(
    homedir(),
    ".m2/repository/org/jenkins-ci/main/jenkins-war",
    version,
    `jenkins-war-${version}.war`,
  );
  if (!existsSync(war)) {
    throw new Error(
      `Couldn't find Jenkins ${version} at ${war}. Run "mvn dependency:get ` +
        `-Dartifact=org.jenkins-ci.main:jenkins-war:${version}:war ` +
        `-DremoteRepositories=https://repo.jenkins-ci.org/public/" to download it.`,
    );
  }

  mkdirSync(outDir, { recursive: true });
  execFileSync("jar", ["xf", war, "jsbundles/styles.css"], { cwd: outDir });
  writeFileSync(versionFile, version);
}

extractJenkinsStyles();

const config: StorybookConfig = {
  stories: ["../src/main/frontend/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  core: {
    builder: {
      name: "@storybook/builder-vite",
      options: {
        // The project's config builds the plugin's bundles, which would
        // override Storybook's own build
        viteConfigPath: ".storybook/vite.config.ts",
      },
    },
  },
};

export default config;
