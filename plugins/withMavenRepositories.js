const { withProjectBuildGradle } = require('@expo/config-plugins');

function withMavenRepositories(config) {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    if (buildGradle.includes('wallet-sdk/android/libs')) {
      return config;
    }

    config.modResults.contents = buildGradle.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      `allprojects {\n  repositories {\n    maven { url 'https://repo.danubetech.com/repository/maven-public/' }\n    flatDir { dirs "\${rootProject.projectDir}/../node_modules/@br.gov.dataprev.inji/wallet-sdk/android/libs" }`
    );

    return config;
  });
}

module.exports = withMavenRepositories;
