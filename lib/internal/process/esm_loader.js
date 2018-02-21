'use strict';

const {
  ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING,
} = require('internal/errors').codes;

const { Loader } = require('internal/modules/esm/loader');
const { pathToFileURL } = require('internal/url');
const {
  wrapToModuleMap,
} = require('internal/vm/source_text_module');
const { Object } = primordials;

exports.initializeImportMetaObject = function(wrap, meta) {
  const { callbackMap } = internalBinding('module_wrap');
  if (callbackMap.has(wrap)) {
    const { initializeImportMeta } = callbackMap.get(wrap);
    if (initializeImportMeta !== undefined) {
      initializeImportMeta(meta, wrapToModuleMap.get(wrap) || wrap);
    }
  }
};

exports.importModuleDynamicallyCallback = async function(wrap, specifier) {
  const { callbackMap } = internalBinding('module_wrap');
  if (callbackMap.has(wrap)) {
    const { importModuleDynamically } = callbackMap.get(wrap);
    if (importModuleDynamically !== undefined) {
      return importModuleDynamically(
        specifier, wrapToModuleMap.get(wrap) || wrap);
    }
  }
  throw new ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING();
};

let loaderResolve;
exports.loaderPromise = new Promise((resolve) => loaderResolve = resolve);

exports.ESMLoader = undefined;

exports.initializeLoader = function(cwd, userLoaders) {
  const RuntimeLoader = new Loader();
  const loaderPromise = (async () => {
    if (userLoaders && userLoaders.length > 0) {
      const BootstrapLoader = new Loader();
      const hooks = await buildUserLoaderChainHook(
        BootstrapLoader,
        cwd,
        userLoaders
      );
      RuntimeLoader.hook(hooks);
      exports.ESMLoader = RuntimeLoader;
    }
    return RuntimeLoader;
  })();
  loaderResolve(loaderPromise);

  exports.ESMLoader = RuntimeLoader;
};

async function buildUserLoaderChainHook(BootstrapLoader, cwd, userLoaders) {
  let previous = {
    resolve: (url, referrer) => {
      return require('internal/modules/esm/default_resolve')(url, referrer);
    },
    dynamicInstantiate: null
  };
  for (var i = 0; i < userLoaders.length; i++) {
    const loaderSpecifier = userLoaders[i];
    const { default: factory } = await BootstrapLoader.import(
      loaderSpecifier,
      pathToFileURL(`${cwd}/`).href
    );
    const parent = previous;
    previous = factory({
      __proto__: null,
      resolve: parent.resolve ?
        Object.setPrototypeOf(async (url, referrer) => {
          const ret = await parent.resolve(url, referrer);
          return {
            __proto__: null,
            url: `${ret.url}`,
            format: `${ret.format}`
          };
        }, null) :
        null,
      dynamicInstantiate: parent.dynamicInstantiate ?
        Object.setPrototypeOf(async (url) => {
          const ret = await parent.dynamicInstantiate(url);
          return {
            __proto__: null,
            exports: ret.exports,
            execute: ret.execute
          };
        }, null) :
        null
    });
  }

  return {
    resolve: previous.resolve ? previous.resolve.bind(previous) : undefined,
    dynamicInstantiate: previous.dynamicInstantiate ?
      previous.dynamicInstantiate.bind(previous) :
      undefined
  };
}
