const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add workspace packages to watchFolders
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];

// Configure resolver to handle workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Custom resolver to handle .js imports in TypeScript files
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle .js imports in TypeScript files (relative imports)
  if (
    moduleName.startsWith(".") &&
    moduleName.endsWith(".js") &&
    context.originModulePath
  ) {
    const originDir = path.dirname(context.originModulePath);
    const withoutExt = moduleName.slice(0, -3);
    
    // Try resolving as .ts, .tsx, then .js
    const extensions = [".ts", ".tsx", ".js"];
    for (const ext of extensions) {
      const tryPath = path.resolve(originDir, withoutExt + ext);
      if (fs.existsSync(tryPath)) {
        return {
          filePath: tryPath,
          type: "sourceFile",
        };
      }
    }
  }

  // Fall back to default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
