export default ({ resolve: parentResolve }) => {
  return {
    async resolve(specifier, parentModuleURL) {
      if (
        parentModuleURL &&
        specifier === "../fixtures/es-modules/test-esm-ok.mjs"
      ) {
        return {
          url: "file:///asdf"
        };
      }
      return await parentResolve(specifier, parentModuleURL);
    }
  };
};
