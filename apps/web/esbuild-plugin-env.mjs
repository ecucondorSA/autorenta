/**
 * ESBuild plugin to inject environment variables into import.meta.env
 * This is needed for Angular's new application builder (@angular/build:application)
 */
export function createEnvPlugin() {
  return {
    name: 'env-vars',
    setup(build) {
      // Get all environment variables that start with NG_APP_
      const envVars = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('NG_APP_')) {
          envVars[key] = value;
        }
      }

      // Create define replacements for import.meta.env
      const define = {};
      for (const [key, value] of Object.entries(envVars)) {
        define[`import.meta.env.${key}`] = JSON.stringify(value);
      }

      console.log('🔧 ESBuild plugin: Injecting environment variables:', Object.keys(envVars));

      // Apply defines
      build.initialOptions.define = {
        ...build.initialOptions.define,
        ...define,
      };
    },
  };
}
