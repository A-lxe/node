/* eslint-disable node-core/required-modules */
export default ({ resolve: parentResolve }) => {
  return {
    async resolve(specifier, parentModuleURL) {
      if (
        parentModuleURL &&
        specifier === "../fixtures/es-modules/test-esm-ok.mjs"
      ) {
        return {
          url: specifier,
          format: "esm"
        };
      }

      return parentResolve(specifier, parentModuleURL);
    }
  };
};
