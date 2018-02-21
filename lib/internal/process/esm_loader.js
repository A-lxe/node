'use strict';

const {
  ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING,
  ERR_MISSING_DYNAMIC_INSTANTIATE_HOOK,
  ERR_LOADER_HOOK_BAD_TYPE
} = require('internal/errors').codes;

const { Loader } = require('internal/modules/esm/loader');
const { pathToFileURL } = require('internal/url');
const {
  wrapToModuleMap,
} = require('internal/vm/source_text_module');
const { Object } = primordials;

const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
const apply = Reflect.apply;

const errors = require('internal/errors');

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
  let resolve = (url, referrer) => {
    return require('internal/modules/esm/default_resolve')(url, referrer);
  };
  let dynamicInstantiate = (url) => {
    throw new ERR_MISSING_DYNAMIC_INSTANTIATE_HOOK();
  };
  for (var i = 0; i < userLoaders.length; i++) {
    const loaderSpecifier = userLoaders[i];
    const { default: factory } = await BootstrapLoader.import(
      loaderSpecifier,
      pathToFileURL(`${cwd}/`).href
    );
    const cachedResolve = resolve;
    const cachedDynamicInstantiate = dynamicInstantiate;
    const next = factory({
      __proto__: null,
      resolve: Object.setPrototypeOf(async (url, referrer) => {
        const ret = await cachedResolve(url, referrer);
        return {
          __proto__: null,
          url: `${ret.url}`,
          format: `${ret.format}`
        };
      }, null),
      dynamicInstantiate: Object.setPrototypeOf(async (url) => {
        const ret = await cachedDynamicInstantiate(url);
        return {
          __proto__: null,
          exports: ret.exports,
          execute: ret.execute
        };
      }, null)
    });

    const resolveDesc = getOwnPropertyDescriptor(next, 'resolve');
    if (resolveDesc !== undefined) {
      resolve = grabPropertyOffDescriptor(next, resolveDesc);
      if (typeof resolve !== 'function') {
        throw new ERR_LOADER_HOOK_BAD_TYPE('resolve', 'function');
      }
    }
    const dynamicInstantiateDesc = getOwnPropertyDescriptor(
      next,
      'dynamicInstantiate'
    );
    if (dynamicInstantiateDesc !== undefined) {
      dynamicInstantiate = grabPropertyOffDescriptor(
        next,
        dynamicInstantiateDesc
      );
      if (typeof dynamicInstantiate !== 'function') {
        throw new ERR_LOADER_HOOK_BAD_TYPE('dynamicInstantiate', 'function');
      }
    }
  }

  return { resolve, dynamicInstantiate };
}

function grabPropertyOffDescriptor(object, descriptor) {
  if (hasOwnProperty(descriptor, 'value')) {
    return descriptor.value;
  } else {
    return apply(descriptor.get, object, []);
  }
}
