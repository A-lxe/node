import assert from 'assert';

import {createRequire} from '../../common/index.mjs';

const require = createRequire(import.meta.url);
const dep = require('./loader-dep.js');

export default ({ resolve: parentResolve }) => {
  return {
    resolve(specifier, base) {
      assert.strictEqual(dep.format, 'module');
      return parentResolve(specifier, base);
    }
  };
}
