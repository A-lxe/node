export default ({ resolve: parentResolve }) => {
  return {
    async resolve(specifier, parentModuleURL) {
      if (specifier === "unknown-builtin-module") {
        return { url: "unknown-builtin-module", format: "builtin" };
      }
      return parentResolve(specifier, parentModuleURL);
    }
  };
};
