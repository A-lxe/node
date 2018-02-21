export default ({ resolve: parentResolve }) => {
  return {
    async resolve(specifier, parentModuleURL) {
      if (specifier !== "test") {
        return parentResolve(specifier, parentModuleURL);
      }
      return { url: "file://", format: "dynamic" };
    }
  };
};
