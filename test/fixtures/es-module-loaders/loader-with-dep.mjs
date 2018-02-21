import { createRequire } from "../../common/index.mjs";

const require = createRequire(import.meta.url);
const dep = require("./loader-dep.js");

export default ({ resolve: parentResolve }) => {
  return {
    async resolve(specifier, base) {
      return {
        url: (await parentResolve(specifier, base)).url,
        format: dep.format
      };
    }
  };
};
