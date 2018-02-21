import module, { builtinModules } from "module";

export default ({
  resolve: parentResolve
}) => {
  return {
    dynamicInstantiate(url) {
      const builtinInstance = module._load(url.substr(5));
      const builtinExports = ['default', ...Object.keys(builtinInstance)];
      return {
        exports: builtinExports,
        execute: exports => {
          for (let name of builtinExports)
            exports[name].set(builtinInstance[name]);
          exports.default.set(builtinInstance);
        }
      };
    },

    resolve(specifier, base) {
      if (builtinModules.includes(specifier)) {
        return {
          url: `node:${specifier}`,
          format: 'dynamic'
        };
      }
      return parentResolve(specifier, base);
    }
  };
}
