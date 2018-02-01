;(function(){
var Internal = {};
var libsignal = {};
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;

// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)

if (Module['ENVIRONMENT']) {
  if (Module['ENVIRONMENT'] === 'WEB') {
    ENVIRONMENT_IS_WEB = true;
  } else if (Module['ENVIRONMENT'] === 'WORKER') {
    ENVIRONMENT_IS_WORKER = true;
  } else if (Module['ENVIRONMENT'] === 'NODE') {
    ENVIRONMENT_IS_NODE = true;
  } else if (Module['ENVIRONMENT'] === 'SHELL') {
    ENVIRONMENT_IS_SHELL = true;
  } else {
    throw new Error('The provided Module[\'ENVIRONMENT\'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.');
  }
} else {
  ENVIRONMENT_IS_WEB = typeof window === 'object';
  ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
  ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
  ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}


if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = console.log;
  if (!Module['printErr']) Module['printErr'] = console.warn;

  var nodeFS;
  var nodePath;

  Module['read'] = function shell_read(filename, binary) {
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    return binary ? ret : ret.toString();
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function shell_read() { throw 'no read() available' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof quit === 'function') {
    Module['quit'] = function(status, toThrow) {
      quit(status);
    }
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function shell_read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (ENVIRONMENT_IS_WORKER) {
    Module['readBinary'] = function readBinary(url) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(xhr.response);
    };
  }

  Module['readAsync'] = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
      } else {
        onerror();
      }
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function shell_print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function shell_printErr(x) {
      console.warn(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}
if (!Module['quit']) {
  Module['quit'] = function(status, toThrow) {
    throw toThrow;
  }
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = undefined;



// {{PREAMBLE_ADDITIONS}}

// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
    return value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      // optimize away arguments usage in common cases
      if (sig.length === 1) {
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func);
        };
      } else if (sig.length === 2) {
        sigCache[func] = function dynCall_wrapper(arg) {
          return Runtime.dynCall(sig, func, [arg]);
        };
      } else {
        // general case
        sigCache[func] = function dynCall_wrapper() {
          return Runtime.dynCall(sig, func, Array.prototype.slice.call(arguments));
        };
      }
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = HEAP32[DYNAMICTOP_PTR>>2];var end = (((ret + size + 15)|0) & -16);HEAP32[DYNAMICTOP_PTR>>2] = end;if (end >= TOTAL_MEMORY) {var success = enlargeMemory();if (!success) {HEAP32[DYNAMICTOP_PTR>>2] = ret;return 0;}}return ret;},
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var ABORT = 0; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try { func = eval('_' + ident); } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = Runtime.stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface.
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*[a-zA-Z$_0-9]*\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }

  // sources of useful functions. we create this lazily as it can trigger a source decompression on this entire file
  var JSsource = null;
  function ensureJSsource() {
    if (!JSsource) {
      JSsource = {};
      for (var fun in JSfuncs) {
        if (JSfuncs.hasOwnProperty(fun)) {
          // Elements of toCsource are arrays of three items:
          // the code, and the return value
          JSsource[fun] = parseJSFunc(JSfuncs[fun]);
        }
      }
    }
  }

  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      ensureJSsource();
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=(' + convertCode.returnValue + ');';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      ensureJSsource();
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [typeof _malloc === 'function' ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if (!runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
function UTF8ArrayToString(u8Array, idx) {
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  while (u8Array[endPtr]) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var u0, u1, u2, u3, u4, u5;

    var str = '';
    while (1) {
      // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
      u0 = u8Array[idx++];
      if (!u0) return str;
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u3 = u8Array[idx++] & 63;
        if ((u0 & 0xF8) == 0xF0) {
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
        } else {
          u4 = u8Array[idx++] & 63;
          if ((u0 & 0xFC) == 0xF8) {
            u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
          } else {
            u5 = u8Array[idx++] & 63;
            u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
          }
        }
      }
      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}


function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}


// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}


// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}


function demangle(func) {
  var __cxa_demangle_func = Module['___cxa_demangle'] || Module['__cxa_demangle'];
  if (__cxa_demangle_func) {
    try {
      var s =
        func.substr(1);
      var len = lengthBytesUTF8(s)+1;
      var buf = _malloc(len);
      stringToUTF8(s, buf, len);
      var status = _malloc(4);
      var ret = __cxa_demangle_func(buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed
    } catch(e) {
      // ignore problems here
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
    // failure when using libcxxabi, don't demangle
    return func;
  }
  Runtime.warnOnce('warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  return func;
}

function demangleAll(text) {
  var regex =
    /__Z[\w\d_]+/g;
  return text.replace(regex,
    function(x) {
      var y = demangle(x);
      return x === y ? x : (x + ' [' + y + ']');
    });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  var js = jsStackTrace();
  if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
  return demangleAll(js);
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
var MIN_TOTAL_MEMORY = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBuffer(buf) {
  Module['buffer'] = buffer = buf;
}

function updateGlobalBufferViews() {
  Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
  Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
  Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
}

var STATIC_BASE, STATICTOP, staticSealed; // static area
var STACK_BASE, STACKTOP, STACK_MAX; // stack area
var DYNAMIC_BASE, DYNAMICTOP_PTR; // dynamic area handled by sbrk

  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  staticSealed = false;



function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}


function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr('TOTAL_MEMORY should be larger than TOTAL_STACK, was ' + TOTAL_MEMORY + '! (TOTAL_STACK=' + TOTAL_STACK + ')');

// Initialize the runtime's memory



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
} else {
  // Use a WebAssembly memory where available
  {
    buffer = new ArrayBuffer(TOTAL_MEMORY);
  }
}
updateGlobalBufferViews();


function getTotalMemory() {
  return TOTAL_MEMORY;
}

// Endianness check (note: assumes compiler arch was little-endian)
  HEAP32[0] = 0x63736d65; /* 'emsc' */
HEAP16[1] = 0x6373;
if (HEAPU8[2] !== 0x73 || HEAPU8[3] !== 0x63) throw 'Runtime error: expected the system to be little-endian!';

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  Runtime.warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

if (!Math['trunc']) Math['trunc'] = function(x) {
  return x < 0 ? Math.ceil(x) : Math.floor(x);
};
Math.trunc = Math['trunc'];

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;






// === Body ===

var ASM_CONSTS = [];




STATIC_BASE = Runtime.GLOBAL_BASE;

STATICTOP = STATIC_BASE + 34528;
/* global initializers */  __ATINIT__.push();


/* memory initializer */ allocate([8,201,188,243,103,230,9,106,59,167,202,132,133,174,103,187,43,248,148,254,114,243,110,60,241,54,29,95,58,245,79,165,209,130,230,173,127,82,14,81,31,108,62,43,140,104,5,155,107,189,65,251,171,217,131,31,121,33,126,19,25,205,224,91,34,174,40,215,152,47,138,66,205,101,239,35,145,68,55,113,47,59,77,236,207,251,192,181,188,219,137,129,165,219,181,233,56,181,72,243,91,194,86,57,25,208,5,182,241,17,241,89,155,79,25,175,164,130,63,146,24,129,109,218,213,94,28,171,66,2,3,163,152,170,7,216,190,111,112,69,1,91,131,18,140,178,228,78,190,133,49,36,226,180,255,213,195,125,12,85,111,137,123,242,116,93,190,114,177,150,22,59,254,177,222,128,53,18,199,37,167,6,220,155,148,38,105,207,116,241,155,193,210,74,241,158,193,105,155,228,227,37,79,56,134,71,190,239,181,213,140,139,198,157,193,15,101,156,172,119,204,161,12,36,117,2,43,89,111,44,233,45,131,228,166,110,170,132,116,74,212,251,65,189,220,169,176,92,181,83,17,131,218,136,249,118,171,223,102,238,82,81,62,152,16,50,180,45,109,198,49,168,63,33,251,152,200,39,3,176,228,14,239,190,199,127,89,191,194,143,168,61,243,11,224,198,37,167,10,147,71,145,167,213,111,130,3,224,81,99,202,6,112,110,14,10,103,41,41,20,252,47,210,70,133,10,183,39,38,201,38,92,56,33,27,46,237,42,196,90,252,109,44,77,223,179,149,157,19,13,56,83,222,99,175,139,84,115,10,101,168,178,119,60,187,10,106,118,230,174,237,71,46,201,194,129,59,53,130,20,133,44,114,146,100,3,241,76,161,232,191,162,1,48,66,188,75,102,26,168,145,151,248,208,112,139,75,194,48,190,84,6,163,81,108,199,24,82,239,214,25,232,146,209,16,169,101,85,36,6,153,214,42,32,113,87,133,53,14,244,184,209,187,50,112,160,106,16,200,208,210,184,22,193,164,25,83,171,65,81,8,108,55,30,153,235,142,223,76,119,72,39,168,72,155,225,181,188,176,52,99,90,201,197,179,12,28,57,203,138,65,227,74,170,216,78,115,227,99,119,79,202,156,91,163,184,178,214,243,111,46,104,252,178,239,93,238,130,143,116,96,47,23,67,111,99,165,120,114,171,240,161,20,120,200,132,236,57,100,26,8,2,199,140,40,30,99,35,250,255,190,144,233,189,130,222,235,108,80,164,21,121,198,178,247,163,249,190,43,83,114,227,242,120,113,198,156,97,38,234,206,62,39,202,7,194,192,33,199,184,134,209,30,235,224,205,214,125,218,234,120,209,110,238,127,79,125,245,186,111,23,114,170,103,240,6,166,152,200,162,197,125,99,10,174,13,249,190,4,152,63,17,27,71,28,19,53,11,113,27,132,125,4,35,245,119,219,40,147,36,199,64,123,171,202,50,188,190,201,21,10,190,158,60,76,13,16,156,196,103,29,67,182,66,62,203,190,212,197,76,42,126,101,252,156,41,127,89,236,250,214,58,171,111,203,95,23,88,71,74,140,25,68,108,133,59,140,1,189,241,36,255,248,37,195,1,96,220,55,0,183,76,62,255,195,66,61,0,50,76,164,1,225,164,76,255,76,61,163,255,117,62,31,0,81,145,64,255,118,65,14,0,162,115,214,255,6,138,46,0,124,230,244,255,10,138,143,0,52,26,194,0,184,244,76,0,129,143,41,1,190,244,19,255,123,170,122,255,98,129,68,0,121,213,147,0,86,101,30,255,161,103,155,0,140,89,67,255,239,229,190,1,67,11,181,0,198,240,137,254,238,69,188,255,67,151,238,0,19,42,108,255,229,85,113,1,50,68,135,255,17,106,9,0,50,103,1,255,80,1,168,1,35,152,30,255,16,168,185,1,56,89,232,255,101,210,252,0,41,250,71,0,204,170,79,255,14,46,239,255,80,77,239,0,189,214,75,255,17,141,249,0,38,80,76,255,190,85,117,0,86,228,170,0,156,216,208,1,195,207,164,255,150,66,76,255,175,225,16,255,141,80,98,1,76,219,242,0,198,162,114,0,46,218,152,0,155,43,241,254,155,160,104,255,51,187,165,0,2,17,175,0,66,84,160,1,247,58,30,0,35,65,53,254,69,236,191,0,45,134,245,1,163,123,221,0,32,110,20,255,52,23,165,0,186,214,71,0,233,176,96,0,242,239,54,1,57,89,138,0,83,0,84,255,136,160,100,0,92,142,120,254,104,124,190,0,181,177,62,255,250,41,85,0,152,130,42,1,96,252,246,0,151,151,63,254,239,133,62,0,32,56,156,0,45,167,189,255,142,133,179,1,131,86,211,0,187,179,150,254,250,170,14,255,210,163,78,0,37,52,151,0,99,77,26,0,238,156,213,255,213,192,209,1,73,46,84,0,20,65,41,1,54,206,79,0,201,131,146,254,170,111,24,255,177,33,50,254,171,38,203,255,78,247,116,0,209,221,153,0,133,128,178,1,58,44,25,0,201,39,59,1,189,19,252,0,49,229,210,1,117,187,117,0,181,179,184,1,0,114,219,0,48,94,147,0,245,41,56,0,125,13,204,254,244,173,119,0,44,221,32,254,84,234,20,0,249,160,198,1,236,126,234,255,47,99,168,254,170,226,153,255,102,179,216,0,226,141,122,255,122,66,153,254,182,245,134,0,227,228,25,1,214,57,235,255,216,173,56,255,181,231,210,0,119,128,157,255,129,95,136,255,110,126,51,0,2,169,183,255,7,130,98,254,69,176,94,255,116,4,227,1,217,242,145,255,202,173,31,1,105,1,39,255,46,175,69,0,228,47,58,255,215,224,69,254,207,56,69,255,16,254,139,255,23,207,212,255,202,20,126,255,95,213,96,255,9,176,33,0,200,5,207,255,241,42,128,254,35,33,192,255,248,229,196,1,129,17,120,0,251,103,151,255,7,52,112,255,140,56,66,255,40,226,245,255,217,70,37,254,172,214,9,255,72,67,134,1,146,192,214,255,44,38,112,0,68,184,75,255,206,90,251,0,149,235,141,0,181,170,58,0,116,244,239,0,92,157,2,0,102,173,98,0,233,137,96,1,127,49,203,0,5,155,148,0,23,148,9,255,211,122,12,0,34,134,26,255,219,204,136,0,134,8,41,255,224,83,43,254,85,25,247,0,109,127,0,254,169,136,48,0,238,119,219,255,231,173,213,0,206,18,254,254,8,186,7,255,126,9,7,1,111,42,72,0,111,52,236,254,96,63,141,0,147,191,127,254,205,78,192,255,14,106,237,1,187,219,76,0,175,243,187,254,105,89,173,0,85,25,89,1,162,243,148,0,2,118,209,254,33,158,9,0,139,163,46,255,93,70,40,0,108,42,142,254,111,252,142,255,155,223,144,0,51,229,167,255,73,252,155,255,94,116,12,255,152,160,218,255,156,238,37,255,179,234,207,255,197,0,179,255,154,164,141,0,225,196,104,0,10,35,25,254,209,212,242,255,97,253,222,254,184,101,229,0,222,18,127,1,164,136,135,255,30,207,140,254,146,97,243,0,129,192,26,254,201,84,33,255,111,10,78,255,147,81,178,255,4,4,24,0,161,238,215,255,6,141,33,0,53,215,14,255,41,181,208,255,231,139,157,0,179,203,221,255,255,185,113,0,189,226,172,255,113,66,214,255,202,62,45,255,102,64,8,255,78,174,16,254,133,117,68,255,182,120,89,255,133,114,211,0,189,110,21,255,15,10,106,0,41,192,1,0,152,232,121,255,188,60,160,255,153,113,206,255,0,183,226,254,180,13,72,255,176,160,14,254,211,201,134,255,158,24,143,0,127,105,53,0,96,12,189,0,167,215,251,255,159,76,128,254,106,101,225,255,30,252,4,0,146,12,174,0,89,241,178,254,10,229,166,255,123,221,42,254,30,20,212,0,82,128,3,0,48,209,243,0,119,121,64,255,50,227,156,255,0,110,197,1,103,27,144,0,133,59,140,1,189,241,36,255,248,37,195,1,96,220,55,0,183,76,62,255,195,66,61,0,50,76,164,1,225,164,76,255,76,61,163,255,117,62,31,0,81,145,64,255,118,65,14,0,162,115,214,255,6,138,46,0,124,230,244,255,10,138,143,0,52,26,194,0,184,244,76,0,129,143,41,1,190,244,19,255,123,170,122,255,98,129,68,0,121,213,147,0,86,101,30,255,161,103,155,0,140,89,67,255,239,229,190,1,67,11,181,0,198,240,137,254,238,69,188,255,234,113,60,255,37,255,57,255,69,178,182,254,128,208,179,0,118,26,125,254,3,7,214,255,241,50,77,255,85,203,197,255,211,135,250,255,25,48,100,255,187,213,180,254,17,88,105,0,83,209,158,1,5,115,98,0,4,174,60,254,171,55,110,255,217,181,17,255,20,188,170,0,146,156,102,254,87,214,174,255,114,122,155,1,233,44,170,0,127,8,239,1,214,236,234,0,175,5,219,0,49,106,61,255,6,66,208,255,2,106,110,255,81,234,19,255,215,107,192,255,67,151,238,0,19,42,108,255,229,85,113,1,50,68,135,255,17,106,9,0,50,103,1,255,80,1,168,1,35,152,30,255,16,168,185,1,56,89,232,255,101,210,252,0,41,250,71,0,204,170,79,255,14,46,239,255,80,77,239,0,189,214,75,255,17,141,249,0,38,80,76,255,190,85,117,0,86,228,170,0,156,216,208,1,195,207,164,255,150,66,76,255,175,225,16,255,141,80,98,1,76,219,242,0,198,162,114,0,46,218,152,0,155,43,241,254,155,160,104,255,178,9,252,254,100,110,212,0,14,5,167,0,233,239,163,255,28,151,157,1,101,146,10,255,254,158,70,254,71,249,228,0,88,30,50,0,68,58,160,255,191,24,104,1,129,66,129,255,192,50,85,255,8,179,138,255,38,250,201,0,115,80,160,0,131,230,113,0,125,88,147,0,90,68,199,0,253,76,158,0,28,255,118,0,113,250,254,0,66,75,46,0,230,218,43,0,229,120,186,1,148,68,43,0,136,124,238,1,187,107,197,255,84,53,246,255,51,116,254,255,51,187,165,0,2,17,175,0,66,84,160,1,247,58,30,0,35,65,53,254,69,236,191,0,45,134,245,1,163,123,221,0,32,110,20,255,52,23,165,0,186,214,71,0,233,176,96,0,242,239,54,1,57,89,138,0,83,0,84,255,136,160,100,0,92,142,120,254,104,124,190,0,181,177,62,255,250,41,85,0,152,130,42,1,96,252,246,0,151,151,63,254,239,133,62,0,32,56,156,0,45,167,189,255,142,133,179,1,131,86,211,0,187,179,150,254,250,170,14,255,68,113,21,255,222,186,59,255,66,7,241,1,69,6,72,0,86,156,108,254,55,167,89,0,109,52,219,254,13,176,23,255,196,44,106,255,239,149,71,255,164,140,125,255,159,173,1,0,51,41,231,0,145,62,33,0,138,111,93,1,185,83,69,0,144,115,46,0,97,151,16,255,24,228,26,0,49,217,226,0,113,75,234,254,193,153,12,255,182,48,96,255,14,13,26,0,128,195,249,254,69,193,59,0,132,37,81,254,125,106,60,0,214,240,169,1,164,227,66,0,210,163,78,0,37,52,151,0,99,77,26,0,238,156,213,255,213,192,209,1,73,46,84,0,20,65,41,1,54,206,79,0,201,131,146,254,170,111,24,255,177,33,50,254,171,38,203,255,78,247,116,0,209,221,153,0,133,128,178,1,58,44,25,0,201,39,59,1,189,19,252,0,49,229,210,1,117,187,117,0,181,179,184,1,0,114,219,0,48,94,147,0,245,41,56,0,125,13,204,254,244,173,119,0,44,221,32,254,84,234,20,0,249,160,198,1,236,126,234,255,143,62,221,0,129,89,214,255,55,139,5,254,68,20,191,255,14,204,178,1,35,195,217,0,47,51,206,1,38,246,165,0,206,27,6,254,158,87,36,0,217,52,146,255,125,123,215,255,85,60,31,255,171,13,7,0,218,245,88,254,252,35,60,0,55,214,160,255,133,101,56,0,224,32,19,254,147,64,234,0,26,145,162,1,114,118,125,0,248,252,250,0,101,94,196,255,198,141,226,254,51,42,182,0,135,12,9,254,109,172,210,255,197,236,194,1,241,65,154,0,48,156,47,255,153,67,55,255,218,165,34,254,74,180,179,0,218,66,71,1,88,122,99,0,212,181,219,255,92,42,231,255,239,0,154,0,245,77,183,255,94,81,170,1,18,213,216,0,171,93,71,0,52,94,248,0,18,151,161,254,197,209,66,255,174,244,15,254,162,48,183,0,49,61,240,254,182,93,195,0,199,228,6,1,200,5,17,255,137,45,237,255,108,148,4,0,90,79,237,255,39,63,77,255,53,82,207,1,142,22,118,255,101,232,18,1,92,26,67,0,5,200,88,255,33,168,138,255,149,225,72,0,2,209,27,255,44,245,168,1,220,237,17,255,30,211,105,254,141,238,221,0,128,80,245,254,111,254,14,0,222,95,190,1,223,9,241,0,146,76,212,255,108,205,104,255,63,117,153,0,144,69,48,0,35,228,111,0,192,33,193,255,112,214,190,254,115,152,151,0,23,102,88,0,51,74,248,0,226,199,143,254,204,162,101,255,208,97,189,1,245,104,18,0,230,246,30,255,23,148,69,0,110,88,52,254,226,181,89,255,208,47,90,254,114,161,80,255,33,116,248,0,179,152,87,255,69,144,177,1,88,238,26,255,58,32,113,1,1,77,69,0,59,121,52,255,152,238,83,0,52,8,193,0,231,39,233,255,199,34,138,0,222,68,173,0,91,57,242,254,220,210,127,255,192,7,246,254,151,35,187,0,195,236,165,0,111,93,206,0,212,247,133,1,154,133,209,255,155,231,10,0,64,78,38,0,122,249,100,1,30,19,97,255,62,91,249,1,248,133,77,0,197,63,168,254,116,10,82,0,184,236,113,254,212,203,194,255,61,100,252,254,36,5,202,255,119,91,153,255,129,79,29,0,103,103,171,254,237,215,111,255,216,53,69,0,239,240,23,0,194,149,221,255,38,225,222,0,232,255,180,254,118,82,133,255,57,209,177,1,139,232,133,0,158,176,46,254,194,115,46,0,88,247,229,1,28,103,191,0,221,222,175,254,149,235,44,0,151,228,25,254,218,105,103,0,142,85,210,0,149,129,190,255,213,65,94,254,117,134,224,255,82,198,117,0,157,221,220,0,163,101,36,0,197,114,37,0,104,172,166,254,11,182,0,0,81,72,188,255,97,188,16,255,69,6,10,0,199,147,145,255,8,9,115,1,65,214,175,255,217,173,209,0,80,127,166,0,247,229,4,254,167,183,124,255,90,28,204,254,175,59,240,255,11,41,248,1,108,40,51,255,144,177,195,254,150,250,126,0,138,91,65,1,120,60,222,255,245,193,239,0,29,214,189,255,128,2,25,0,80,154,162,0,77,220,107,1,234,205,74,255,54,166,103,255,116,72,9,0,228,94,47,255,30,200,25,255,35,214,89,255,61,176,140,255,83,226,163,255,75,130,172,0,128,38,17,0,95,137,152,255,215,124,159,1,79,93,0,0,148,82,157,254,195,130,251,255,40,202,76,255,251,126,224,0,157,99,62,254,207,7,225,255,96,68,195,0,140,186,157,255,131,19,231,255,42,128,254,0,52,219,61,254,102,203,72,0,141,7,11,255,186,164,213,0,31,122,119,0,133,242,145,0,208,252,232,255,91,213,182,255,143,4,250,254,249,215,74,0,165,30,111,1,171,9,223,0,229,123,34,1,92,130,26,255,77,155,45,1,195,139,28,255,59,224,78,0,136,17,247,0,108,121,32,0,79,250,189,255,96,227,252,254,38,241,62,0,62,174,125,255,155,111,93,255,10,230,206,1,97,197,40,255,0,49,57,254,65,250,13,0,18,251,150,255,220,109,210,255,5,174,166,254,44,129,189,0,235,35,147,255,37,247,141,255,72,141,4,255,103,107,255,0,247,90,4,0,53,44,42,0,2,30,240,0,4,59,63,0,88,78,36,0,113,167,180,0,190,71,193,255,199,158,164,255,58,8,172,0,77,33,12,0,65,63,3,0,153,77,33,255,172,254,102,1,228,221,4,255,87,30,254,1,146,41,86,255,138,204,239,254,108,141,17,255,187,242,135,0,210,208,127,0,68,45,14,254,73,96,62,0,81,60,24,255,170,6,36,255,3,249,26,0,35,213,109,0,22,129,54,255,21,35,225,255,234,61,56,255,58,217,6,0,143,124,88,0,236,126,66,0,209,38,183,255,34,238,6,255,174,145,102,0,95,22,211,0,196,15,153,254,46,84,232,255,117,34,146,1,231,250,74,255,27,134,100,1,92,187,195,255,170,198,112,0,120,28,42,0,209,70,67,0,29,81,31,0,29,168,100,1,169,173,160,0,107,35,117,0,62,96,59,255,81,12,69,1,135,239,190,255,220,252,18,0,163,220,58,255,137,137,188,255,83,102,109,0,96,6,76,0,234,222,210,255,185,174,205,1,60,158,213,255,13,241,214,0,172,129,140,0,93,104,242,0,192,156,251,0,43,117,30,0,225,81,158,0,127,232,218,0,226,28,203,0,233,27,151,255,117,43,5,255,242,14,47,255,33,20,6,0,137,251,44,254,27,31,245,255,183,214,125,254,40,121,149,0,186,158,213,255,89,8,227,0,69,88,0,254,203,135,225,0,201,174,203,0,147,71,184,0,18,121,41,254,94,5,78,0,224,214,240,254,36,5,180,0,251,135,231,1,163,138,212,0,210,249,116,254,88,129,187,0,19,8,49,254,62,14,144,255,159,76,211,0,214,51,82,0,109,117,228,254,103,223,203,255,75,252,15,1,154,71,220,255,23,13,91,1,141,168,96,255,181,182,133,0,250,51,55,0,234,234,212,254,175,63,158,0,39,240,52,1,158,189,36,255,213,40,85,1,32,180,247,255,19,102,26,1,84,24,97,255,69,21,222,0,148,139,122,255,220,213,235,1,232,203,255,0,121,57,147,0,227,7,154,0,53,22,147,1,72,1,225,0,82,134,48,254,83,60,157,255,145,72,169,0,34,103,239,0,198,233,47,0,116,19,4,255,184,106,9,255,183,129,83,0,36,176,230,1,34,103,72,0,219,162,134,0,245,42,158,0,32,149,96,254,165,44,144,0,202,239,72,254,215,150,5,0,42,66,36,1,132,215,175,0,86,174,86,255,26,197,156,255,49,232,135,254,103,182,82,0,253,128,176,1,153,178,122,0,245,250,10,0,236,24,178,0,137,106,132,0,40,29,41,0,50,30,152,255,124,105,38,0,230,191,75,0,143,43,170,0,44,131,20,255,44,13,23,255,237,255,155,1,159,109,100,255,112,181,24,255,104,220,108,0,55,211,131,0,99,12,213,255,152,151,145,255,238,5,159,0,97,155,8,0,33,108,81,0,1,3,103,0,62,109,34,255,250,155,180,0,32,71,195,255,38,70,145,1,159,95,245,0,69,229,101,1,136,28,240,0,79,224,25,0,78,110,121,255,248,168,124,0,187,128,247,0,2,147,235,254,79,11,132,0,70,58,12,1,181,8,163,255,79,137,133,255,37,170,11,255,141,243,85,255,176,231,215,255,204,150,164,255,239,215,39,255,46,87,156,254,8,163,88,255,172,34,232,0,66,44,102,255,27,54,41,254,236,99,87,255,41,123,169,1,52,114,43,0,117,134,40,0,155,134,26,0,231,207,91,254,35,132,38,255,19,102,125,254,36,227,133,255,118,3,113,255,29,13,124,0,152,96,74,1,88,146,206,255,167,191,220,254,162,18,88,255,182,100,23,0,31,117,52,0,81,46,106,1,12,2,7,0,69,80,201,1,209,246,172,0,12,48,141,1,224,211,88,0,116,226,159,0,122,98,130,0,65,236,234,1,225,226,9,255,207,226,123,1,89,214,59,0,112,135,88,1,90,244,203,255,49,11,38,1,129,108,186,0,89,112,15,1,101,46,204,255,127,204,45,254,79,255,221,255,51,73,18,255,127,42,101,255,241,21,202,0,160,227,7,0,105,50,236,0,79,52,197,255,104,202,208,1,180,15,16,0,101,197,78,255,98,77,203,0,41,185,241,1,35,193,124,0,35,155,23,255,207,53,192,0,11,125,163,1,249,158,185,255,4,131,48,0,21,93,111,255,61,121,231,1,69,200,36,255,185,48,185,255,111,238,21,255,39,50,25,255,99,215,163,255,87,212,30,255,164,147,5,255,128,6,35,1,108,223,110,255,194,76,178,0,74,101,180,0,243,47,48,0,174,25,43,255,82,173,253,1,54,114,192,255,40,55,91,0,215,108,176,255,11,56,7,0,224,233,76,0,209,98,202,254,242,25,125,0,44,193,93,254,203,8,177,0,135,176,19,0,112,71,213,255,206,59,176,1,4,67,26,0,14,143,213,254,42,55,208,255,60,67,120,0,193,21,163,0,99,164,115,0,10,20,118,0,156,212,222,254,160,7,217,255,114,245,76,1,117,59,123,0,176,194,86,254,213,15,176,0,78,206,207,254,213,129,59,0,233,251,22,1,96,55,152,255,236,255,15,255,197,89,84,255,93,149,133,0,174,160,113,0,234,99,169,255,152,116,88,0,144,164,83,255,95,29,198,255,34,47,15,255,99,120,134,255,5,236,193,0,249,247,126,255,147,187,30,0,50,230,117,255,108,217,219,255,163,81,166,255,72,25,169,254,155,121,79,255,28,155,89,254,7,126,17,0,147,65,33,1,47,234,253,0,26,51,18,0,105,83,199,255,163,196,230,0,113,248,164,0,226,254,218,0,189,209,203,255,164,247,222,254,255,35,165,0,4,188,243,1,127,179,71,0,37,237,254,255,100,186,240,0,5,57,71,254,103,72,73,255,244,18,81,254,229,210,132,255,238,6,180,255,11,229,174,255,227,221,192,1,17,49,28,0,163,215,196,254,9,118,4,255,51,240,71,0,113,129,109,255,76,240,231,0,188,177,127,0,125,71,44,1,26,175,243,0,94,169,25,254,27,230,29,0,15,139,119,1,168,170,186,255,172,197,76,255,252,75,188,0,137,124,196,0,72,22,96,255,45,151,249,1,220,145,100,0,64,192,159,255,120,239,226,0,129,178,146,0,0,192,125,0,235,138,234,0,183,157,146,0,83,199,192,255,184,172,72,255,73,225,128,0,77,6,250,255,186,65,67,0,104,246,207,0,188,32,138,255,218,24,242,0,67,138,81,254,237,129,121,255,20,207,150,1,41,199,16,255,6,20,128,0,159,118,5,0,181,16,143,255,220,38,15,0,23,64,147,254,73,26,13,0,87,228,57,1,204,124,128,0,43,24,223,0,219,99,199,0,22,75,20,255,19,27,126,0,157,62,215,0,110,29,230,0,179,167,255,1,54,252,190,0,221,204,182,254,179,158,65,255,81,157,3,0,194,218,159,0,170,223,0,0,224,11,32,255,38,197,98,0,168,164,37,0,23,88,7,1,164,186,110,0,96,36,134,0,234,242,229,0,250,121,19,0,242,254,112,255,3,47,94,1,9,239,6,255,81,134,153,254,214,253,168,255,67,124,224,0,245,95,74,0,28,30,44,254,1,109,220,255,178,89,89,0,252,36,76,0,24,198,46,255,76,77,111,0,134,234,136,255,39,94,29,0,185,72,234,255,70,68,135,255,231,102,7,254,77,231,140,0,167,47,58,1,148,97,118,255,16,27,225,1,166,206,143,255,110,178,214,255,180,131,162,0,143,141,225,1,13,218,78,255,114,153,33,1,98,104,204,0,175,114,117,1,167,206,75,0,202,196,83,1,58,64,67,0,138,47,111,1,196,247,128,255,137,224,224,254,158,112,207,0,154,100,255,1,134,37,107,0,198,128,79,255,127,209,155,255,163,254,185,254,60,14,243,0,31,219,112,254,29,217,65,0,200,13,116,254,123,60,196,255,224,59,184,254,242,89,196,0,123,16,75,254,149,16,206,0,69,254,48,1,231,116,223,255,209,160,65,1,200,80,98,0,37,194,184,254,148,63,34,0,139,240,65,255,217,144,132,255,56,38,45,254,199,120,210,0,108,177,166,255,160,222,4,0,220,126,119,254,165,107,160,255,82,220,248,1,241,175,136,0,144,141,23,255,169,138,84,0,160,137,78,255,226,118,80,255,52,27,132,255,63,96,139,255,152,250,39,0,188,155,15,0,232,51,150,254,40,15,232,255,240,229,9,255,137,175,27,255,75,73,97,1,218,212,11,0,135,5,162,1,107,185,213,0,2,249,107,255,40,242,70,0,219,200,25,0,25,157,13,0,67,82,80,255,196,249,23,255,145,20,149,0,50,72,146,0,94,76,148,1,24,251,65,0,31,192,23,0,184,212,201,255,123,233,162,1,247,173,72,0,162,87,219,254,126,134,89,0,159,11,12,254,166,105,29,0,73,27,228,1,113,120,183,255,66,163,109,1,212,143,11,255,159,231,168,1,255,128,90,0,57,14,58,254,89,52,10,255,253,8,163,1,0,145,210,255,10,129,85,1,46,181,27,0,103,136,160,254,126,188,209,255,34,35,111,0,215,219,24,255,212,11,214,254,101,5,118,0,232,197,133,255,223,167,109,255,237,80,86,255,70,139,94,0,158,193,191,1,155,15,51,255,15,190,115,0,78,135,207,255,249,10,27,1,181,125,233,0,95,172,13,254,170,213,161,255,39,236,138,255,95,93,87,255,190,128,95,0,125,15,206,0,166,150,159,0,227,15,158,255,206,158,120,255,42,141,128,0,101,178,120,1,156,109,131,0,218,14,44,254,247,168,206,255,212,112,28,0,112,17,228,255,90,16,37,1,197,222,108,0,254,207,83,255,9,90,243,255,243,244,172,0,26,88,115,255,205,116,122,0,191,230,193,0,180,100,11,1,217,37,96,255,154,78,156,0,235,234,31,255,206,178,178,255,149,192,251,0,182,250,135,0,246,22,105,0,124,193,109,255,2,210,149,255,169,17,170,0,0,96,110,255,117,9,8,1,50,123,40,255,193,189,99,0,34,227,160,0,48,80,70,254,211,51,236,0,45,122,245,254,44,174,8,0,173,37,233,255,158,65,171,0,122,69,215,255,90,80,2,255,131,106,96,254,227,114,135,0,205,49,119,254,176,62,64,255,82,51,17,255,241,20,243,255,130,13,8,254,128,217,243,255,162,27,1,254,90,118,241,0,246,198,246,255,55,16,118,255,200,159,157,0,163,17,1,0,140,107,121,0,85,161,118,255,38,0,149,0,156,47,238,0,9,166,166,1,75,98,181,255,50,74,25,0,66,15,47,0,139,225,159,0,76,3,142,255,14,238,184,0,11,207,53,255,183,192,186,1,171,32,174,255,191,76,221,1,247,170,219,0,25,172,50,254,217,9,233,0,203,126,68,255,183,92,48,0,127,167,183,1,65,49,254,0,16,63,127,1,254,21,170,255,59,224,127,254,22,48,63,255,27,78,130,254,40,195,29,0,250,132,112,254,35,203,144,0,104,169,168,0,207,253,30,255,104,40,38,254,94,228,88,0,206,16,128,255,212,55,122,255,223,22,234,0,223,197,127,0,253,181,181,1,145,102,118,0,236,153,36,255,212,217,72,255,20,38,24,254,138,62,62,0,152,140,4,0,230,220,99,255,1,21,212,255,148,201,231,0,244,123,9,254,0,171,210,0,51,58,37,255,1,255,14,255,244,183,145,254,0,242,166,0,22,74,132,0,121,216,41,0,95,195,114,254,133,24,151,255,156,226,231,255,247,5,77,255,246,148,115,254,225,92,81,255,222,80,246,254,170,123,89,255,74,199,141,0,29,20,8,255,138,136,70,255,93,75,92,0,221,147,49,254,52,126,226,0,229,124,23,0,46,9,181,0,205,64,52,1,131,254,28,0,151,158,212,0,131,64,78,0,206,25,171,0,0,230,139,0,191,253,110,254,103,247,167,0,64,40,40,1,42,165,241,255,59,75,228,254,124,243,189,255,196,92,178,255,130,140,86,255,141,89,56,1,147,198,5,255,203,248,158,254,144,162,141,0,11,172,226,0,130,42,21,255,1,167,143,255,144,36,36,255,48,88,164,254,168,170,220,0,98,71,214,0,91,208,79,0,159,76,201,1,166,42,214,255,69,255,0,255,6,128,125,255,190,1,140,0,146,83,218,255,215,238,72,1,122,127,53,0,189,116,165,255,84,8,66,255,214,3,208,255,213,110,133,0,195,168,44,1,158,231,69,0,162,64,200,254,91,58,104,0,182,58,187,254,249,228,136,0,203,134,76,254,99,221,233,0,75,254,214,254,80,69,154,0,64,152,248,254,236,136,202,255,157,105,153,254,149,175,20,0,22,35,19,255,124,121,233,0,186,250,198,254,132,229,139,0,137,80,174,255,165,125,68,0,144,202,148,254,235,239,248,0,135,184,118,0,101,94,17,255,122,72,70,254,69,130,146,0,127,222,248,1,69,127,118,255,30,82,215,254,188,74,19,255,229,167,194,254,117,25,66,255,65,234,56,254,213,22,156,0,151,59,93,254,45,28,27,255,186,126,164,255,32,6,239,0,127,114,99,1,219,52,2,255,99,96,166,254,62,190,126,255,108,222,168,1,75,226,174,0,230,226,199,0,60,117,218,255,252,248,20,1,214,188,204,0,31,194,134,254,123,69,192,255,169,173,36,254,55,98,91,0,223,42,102,254,137,1,102,0,157,90,25,0,239,122,64,255,252,6,233,0,7,54,20,255,82,116,174,0,135,37,54,255,15,186,125,0,227,112,175,255,100,180,225,255,42,237,244,255,244,173,226,254,248,18,33,0,171,99,150,255,74,235,50,255,117,82,32,254,106,168,237,0,207,109,208,1,228,9,186,0,135,60,169,254,179,92,143,0,244,170,104,255,235,45,124,255,70,99,186,0,117,137,183,0,224,31,215,0,40,9,100,0,26,16,95,1,68,217,87,0,8,151,20,255,26,100,58,255,176,165,203,1,52,118,70,0,7,32,254,254,244,254,245,255,167,144,194,255,125,113,23,255,176,121,181,0,136,84,209,0,138,6,30,255,89,48,28,0,33,155,14,255,25,240,154,0,141,205,109,1,70,115,62,255,20,40,107,254,138,154,199,255,94,223,226,255,157,171,38,0,163,177,25,254,45,118,3,255,14,222,23,1,209,190,81,255,118,123,232,1,13,213,101,255,123,55,123,254,27,246,165,0,50,99,76,255,140,214,32,255,97,65,67,255,24,12,28,0,174,86,78,1,64,247,96,0,160,135,67,0,66,55,243,255,147,204,96,255,26,6,33,255,98,51,83,1,153,213,208,255,2,184,54,255,25,218,11,0,49,67,246,254,18,149,72,255,13,25,72,0,42,79,214,0,42,4,38,1,27,139,144,255,149,187,23,0,18,164,132,0,245,84,184,254,120,198,104,255,126,218,96,0,56,117,234,255,13,29,214,254,68,47,10,255,167,154,132,254,152,38,198,0,66,178,89,255,200,46,171,255,13,99,83,255,210,187,253,255,170,45,42,1,138,209,124,0,214,162,141,0,12,230,156,0,102,36,112,254,3,147,67,0,52,215,123,255,233,171,54,255,98,137,62,0,247,218,39,255,231,218,236,0,247,191,127,0,195,146,84,0,165,176,92,255,19,212,94,255,17,74,227,0,88,40,153,1,198,147,1,255,206,67,245,254,240,3,218,255,61,141,213,255,97,183,106,0,195,232,235,254,95,86,154,0,209,48,205,254,118,209,241,255,240,120,223,1,213,29,159,0,163,127,147,255,13,218,93,0,85,24,68,254,70,20,80,255,189,5,140,1,82,97,254,255,99,99,191,255,132,84,133,255,107,218,116,255,112,122,46,0,105,17,32,0,194,160,63,255,68,222,39,1,216,253,92,0,177,105,205,255,149,201,195,0,42,225,11,255,40,162,115,0,9,7,81,0,165,218,219,0,180,22,0,254,29,146,252,255,146,207,225,1,180,135,96,0,31,163,112,0,177,11,219,255,133,12,193,254,43,78,50,0,65,113,121,1,59,217,6,255,110,94,24,1,112,172,111,0,7,15,96,0,36,85,123,0,71,150,21,255,208,73,188,0,192,11,167,1,213,245,34,0,9,230,92,0,162,142,39,255,215,90,27,0,98,97,89,0,94,79,211,0,90,157,240,0,95,220,126,1,102,176,226,0,36,30,224,254,35,31,127,0,231,232,115,1,85,83,130,0,210,73,245,255,47,143,114,255,68,65,197,0,59,72,62,255,183,133,173,254,93,121,118,255,59,177,81,255,234,69,173,255,205,128,177,0,220,244,51,0,26,244,209,1,73,222,77,255,163,8,96,254,150,149,211,0,158,254,203,1,54,127,139,0,161,224,59,0,4,109,22,255,222,42,45,255,208,146,102,255,236,142,187,0,50,205,245,255,10,74,89,254,48,79,142,0,222,76,130,255,30,166,63,0,236,12,13,255,49,184,244,0,187,113,102,0,218,101,253,0,153,57,182,254,32,150,42,0,25,198,146,1,237,241,56,0,140,68,5,0,91,164,172,255,78,145,186,254,67,52,205,0,219,207,129,1,109,115,17,0,54,143,58,1,21,248,120,255,179,255,30,0,193,236,66,255,1,255,7,255,253,192,48,255,19,69,217,1,3,214,0,255,64,101,146,1,223,125,35,255,235,73,179,255,249,167,226,0,225,175,10,1,97,162,58,0,106,112,171,1,84,172,5,255,133,140,178,255,134,245,142,0,97,90,125,255,186,203,185,255,223,77,23,255,192,92,106,0,15,198,115,255,217,152,248,0,171,178,120,255,228,134,53,0,176,54,193,1,250,251,53,0,213,10,100,1,34,199,106,0,151,31,244,254,172,224,87,255,14,237,23,255,253,85,26,255,127,39,116,255,172,104,100,0,251,14,70,255,212,208,138,255,253,211,250,0,176,49,165,0,15,76,123,255,37,218,160,255,92,135,16,1,10,126,114,255,70,5,224,255,247,249,141,0,68,20,60,1,241,210,189,255,195,217,187,1,151,3,113,0,151,92,174,0,231,62,178,255,219,183,225,0,23,23,33,255,205,181,80,0,57,184,248,255,67,180,1,255,90,123,93,255,39,0,162,255,96,248,52,255,84,66,140,0,34,127,228,255,194,138,7,1,166,110,188,0,21,17,155,1,154,190,198,255,214,80,59,255,18,7,143,0,72,29,226,1,199,217,249,0,232,161,71,1,149,190,201,0,217,175,95,254,113,147,67,255,138,143,199,255,127,204,1,0,29,182,83,1,206,230,155,255,186,204,60,0,10,125,85,255,232,96,25,255,255,89,247,255,213,254,175,1,232,193,81,0,28,43,156,254,12,69,8,0,147,24,248,0,18,198,49,0,134,60,35,0,118,246,18,255,49,88,254,254,228,21,186,255,182,65,112,1,219,22,1,255,22,126,52,255,189,53,49,255,112,25,143,0,38,127,55,255,226,101,163,254,208,133,61,255,137,69,174,1,190,118,145,255,60,98,219,255,217,13,245,255,250,136,10,0,84,254,226,0,201,31,125,1,240,51,251,255,31,131,130,255,2,138,50,255,215,215,177,1,223,12,238,255,252,149,56,255,124,91,68,255,72,126,170,254,119,255,100,0,130,135,232,255,14,79,178,0,250,131,197,0,138,198,208,0,121,216,139,254,119,18,36,255,29,193,122,0,16,42,45,255,213,240,235,1,230,190,169,255,198,35,228,254,110,173,72,0,214,221,241,255,56,148,135,0,192,117,78,254,141,93,207,255,143,65,149,0,21,18,98,255,95,44,244,1,106,191,77,0,254,85,8,254,214,110,176,255,73,173,19,254,160,196,199,255,237,90,144,0,193,172,113,255,200,155,136,254,228,90,221,0,137,49,74,1,164,221,215,255,209,189,5,255,105,236,55,255,42,31,129,1,193,255,236,0,46,217,60,0,138,88,187,255,226,82,236,255,81,69,151,255,142,190,16,1,13,134,8,0,127,122,48,255,81,64,156,0,171,243,139,0,237,35,246,0,122,143,193,254,212,122,146,0,95,41,255,1,87,132,77,0,4,212,31,0,17,31,78,0,39,45,173,254,24,142,217,255,95,9,6,255,227,83,6,0,98,59,130,254,62,30,33,0,8,115,211,1,162,97,128,255,7,184,23,254,116,28,168,255,248,138,151,255,98,244,240,0,186,118,130,0,114,248,235,255,105,173,200,1,160,124,71,255,94,36,164,1,175,65,146,255,238,241,170,254,202,198,197,0,228,71,138,254,45,246,109,255,194,52,158,0,133,187,176,0,83,252,154,254,89,189,221,255,170,73,252,0,148,58,125,0,36,68,51,254,42,69,177,255,168,76,86,255,38,100,204,255,38,53,35,0,175,19,97,0,225,238,253,255,81,81,135,0,210,27,255,254,235,73,107,0,8,207,115,0,82,127,136,0,84,99,21,254,207,19,136,0,100,164,101,0,80,208,77,255,132,207,237,255,15,3,15,255,33,166,110,0,156,95,85,255,37,185,111,1,150,106,35,255,166,151,76,0,114,87,135,255,159,194,64,0,12,122,31,255,232,7,101,254,173,119,98,0,154,71,220,254,191,57,53,255,168,232,160,255,224,32,99,255,218,156,165,0,151,153,163,0,217,13,148,1,197,113,89,0,149,28,161,254,207,23,30,0,105,132,227,255,54,230,94,255,133,173,204,255,92,183,157,255,88,144,252,254,102,33,90,0,159,97,3,0,181,218,155,255,240,114,119,0,106,214,53,255,165,190,115,1,152,91,225,255,88,106,44,255,208,61,113,0,151,52,124,0,191,27,156,255,110,54,236,1,14,30,166,255,39,127,207,1,229,199,28,0,188,228,188,254,100,157,235,0,246,218,183,1,107,22,193,255,206,160,95,0,76,239,147,0,207,161,117,0,51,166,2,255,52,117,10,254,73,56,227,255,152,193,225,0,132,94,136,255,101,191,209,0,32,107,229,255,198,43,180,1,100,210,118,0,114,67,153,255,23,88,26,255,89,154,92,1,220,120,140,255,144,114,207,255,252,115,250,255,34,206,72,0,138,133,127,255,8,178,124,1,87,75,97,0,15,229,92,254,240,67,131,255,118,123,227,254,146,120,104,255,145,213,255,1,129,187,70,255,219,119,54,0,1,19,173,0,45,150,148,1,248,83,72,0,203,233,169,1,142,107,56,0,247,249,38,1,45,242,80,255,30,233,103,0,96,82,70,0,23,201,111,0,81,39,30,255,161,183,78,255,194,234,33,255,68,227,140,254,216,206,116,0,70,27,235,255,104,144,79,0,164,230,93,254,214,135,156,0,154,187,242,254,188,20,131,255,36,109,174,0,159,112,241,0,5,110,149,1,36,165,218,0,166,29,19,1,178,46,73,0,93,43,32,254,248,189,237,0,102,155,141,0,201,93,195,255,241,139,253,255,15,111,98,255,108,65,163,254,155,79,190,255,73,174,193,254,246,40,48,255,107,88,11,254,202,97,85,255,253,204,18,255,113,242,66,0,110,160,194,254,208,18,186,0,81,21,60,0,188,104,167,255,124,166,97,254,210,133,142,0,56,242,137,254,41,111,130,0,111,151,58,1,111,213,141,255,183,172,241,255,38,6,196,255,185,7,123,255,46,11,246,0,245,105,119,1,15,2,161,255,8,206,45,255,18,202,74,255,83,124,115,1,212,141,157,0,83,8,209,254,139,15,232,255,172,54,173,254,50,247,132,0,214,189,213,0,144,184,105,0,223,254,248,0,255,147,240,255,23,188,72,0,7,51,54,0,188,25,180,254,220,180,0,255,83,160,20,0,163,189,243,255,58,209,194,255,87,73,60,0,106,24,49,0,245,249,220,0,22,173,167,0,118,11,195,255,19,126,237,0,110,159,37,255,59,82,47,0,180,187,86,0,188,148,208,1,100,37,133,255,7,112,193,0,129,188,156,255,84,106,129,255,133,225,202,0,14,236,111,255,40,20,101,0,172,172,49,254,51,54,74,255,251,185,184,255,93,155,224,255,180,249,224,1,230,178,146,0,72,57,54,254,178,62,184,0,119,205,72,0,185,239,253,255,61,15,218,0,196,67,56,255,234,32,171,1,46,219,228,0,208,108,234,255,20,63,232,255,165,53,199,1,133,228,5,255,52,205,107,0,74,238,140,255,150,156,219,254,239,172,178,255,251,189,223,254,32,142,211,255,218,15,138,1,241,196,80,0,28,36,98,254,22,234,199,0,61,237,220,255,246,57,37,0,142,17,142,255,157,62,26,0,43,238,95,254,3,217,6,255,213,25,240,1,39,220,174,255,154,205,48,254,19,13,192,255,244,34,54,254,140,16,155,0,240,181,5,254,155,193,60,0,166,128,4,255,36,145,56,255,150,240,219,0,120,51,145,0,82,153,42,1,140,236,146,0,107,92,248,1,189,10,3,0,63,136,242,0,211,39,24,0,19,202,161,1,173,27,186,255,210,204,239,254,41,209,162,255,182,254,159,255,172,116,52,0,195,103,222,254,205,69,59,0,53,22,41,1,218,48,194,0,80,210,242,0,210,188,207,0,187,161,161,254,216,17,1,0,136,225,113,0,250,184,63,0,223,30,98,254,77,168,162,0,59,53,175,0,19,201,10,255,139,224,194,0,147,193,154,255,212,189,12,254,1,200,174,255,50,133,113,1,94,179,90,0,173,182,135,0,94,177,113,0,43,89,215,255,136,252,106,255,123,134,83,254,5,245,66,255,82,49,39,1,220,2,224,0,97,129,177,0,77,59,89,0,61,29,155,1,203,171,220,255,92,78,139,0,145,33,181,255,169,24,141,1,55,150,179,0,139,60,80,255,218,39,97,0,2,147,107,255,60,248,72,0,173,230,47,1,6,83,182,255,16,105,162,254,137,212,81,255,180,184,134,1,39,222,164,255,221,105,251,1,239,112,125,0,63,7,97,0,63,104,227,255,148,58,12,0,90,60,224,255,84,212,252,0,79,215,168,0,248,221,199,1,115,121,1,0,36,172,120,0,32,162,187,255,57,107,49,255,147,42,21,0,106,198,43,1,57,74,87,0,126,203,81,255,129,135,195,0,140,31,177,0,221,139,194,0,3,222,215,0,131,68,231,0,177,86,178,254,124,151,180,0,184,124,38,1,70,163,17,0,249,251,181,1,42,55,227,0,226,161,44,0,23,236,110,0,51,149,142,1,93,5,236,0,218,183,106,254,67,24,77,0,40,245,209,255,222,121,153,0,165,57,30,0,83,125,60,0,70,38,82,1,229,6,188,0,109,222,157,255,55,118,63,255,205,151,186,0,227,33,149,255,254,176,246,1,227,177,227,0,34,106,163,254,176,43,79,0,106,95,78,1,185,241,122,255,185,14,61,0,36,1,202,0,13,178,162,255,247,11,132,0,161,230,92,1,65,1,185,255,212,50,165,1,141,146,64,255,158,242,218,0,21,164,125,0,213,139,122,1,67,71,87,0,203,158,178,1,151,92,43,0,152,111,5,255,39,3,239,255,217,255,250,255,176,63,71,255,74,245,77,1,250,174,18,255,34,49,227,255,246,46,251,255,154,35,48,1,125,157,61,255,106,36,78,255,97,236,153,0,136,187,120,255,113,134,171,255,19,213,217,254,216,94,209,255,252,5,61,0,94,3,202,0,3,26,183,255,64,191,43,255,30,23,21,0,129,141,77,255,102,120,7,1,194,76,140,0,188,175,52,255,17,81,148,0,232,86,55,1,225,48,172,0,134,42,42,255,238,50,47,0,169,18,254,0,20,147,87,255,14,195,239,255,69,247,23,0,238,229,128,255,177,49,112,0,168,98,251,255,121,71,248,0,243,8,145,254,246,227,153,255,219,169,177,254,251,139,165,255,12,163,185,255,164,40,171,255,153,159,27,254,243,109,91,255,222,24,112,1,18,214,231,0,107,157,181,254,195,147,0,255,194,99,104,255,89,140,190,255,177,66,126,254,106,185,66,0,49,218,31,0,252,174,158,0,188,79,230,1,238,41,224,0,212,234,8,1,136,11,181,0,166,117,83,255,68,195,94,0,46,132,201,0,240,152,88,0,164,57,69,254,160,224,42,255,59,215,67,255,119,195,141,255,36,180,121,254,207,47,8,255,174,210,223,0,101,197,68,255,255,82,141,1,250,137,233,0,97,86,133,1,16,80,69,0,132,131,159,0,116,93,100,0,45,141,139,0,152,172,157,255,90,43,91,0,71,153,46,0,39,16,112,255,217,136,97,255,220,198,25,254,177,53,49,0,222,88,134,255,128,15,60,0,207,192,169,255,192,116,209,255,106,78,211,1,200,213,183,255,7,12,122,254,222,203,60,255,33,110,199,254,251,106,117,0,228,225,4,1,120,58,7,255,221,193,84,254,112,133,27,0,189,200,201,255,139,135,150,0,234,55,176,255,61,50,65,0,152,108,169,255,220,85,1,255,112,135,227,0,162,26,186,0,207,96,185,254,244,136,107,0,93,153,50,1,198,97,151,0,110,11,86,255,143,117,174,255,115,212,200,0,5,202,183,0,237,164,10,254,185,239,62,0,236,120,18,254,98,123,99,255,168,201,194,254,46,234,214,0,191,133,49,255,99,169,119,0,190,187,35,1,115,21,45,255,249,131,72,0,112,6,123,255,214,49,181,254,166,233,34,0,92,197,102,254,253,228,205,255,3,59,201,1,42,98,46,0,219,37,35,255,169,195,38,0,94,124,193,1,156,43,223,0,95,72,133,254,120,206,191,0,122,197,239,255,177,187,79,255,254,46,2,1,250,167,190,0,84,129,19,0,203,113,166,255,249,31,189,254,72,157,202,255,208,71,73,255,207,24,72,0,10,16,18,1,210,81,76,255,88,208,192,255,126,243,107,255,238,141,120,255,199,121,234,255,137,12,59,255,36,220,123,255,148,179,60,254,240,12,29,0,66,0,97,1,36,30,38,255,115,1,93,255,96,103,231,255], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([197,158,59,1,192,164,240,0,202,202,57,255,24,174,48,0,89,77,155,1,42,76,215,0,244,151,233,0,23,48,81,0,239,127,52,254,227,130,37,255,248,116,93,1,124,132,118,0,173,254,192,1,6,235,83,255,110,175,231,1,251,28,182,0,129,249,93,254,84,184,128,0,76,181,62,0,175,128,186,0,100,53,136,254,109,29,226,0,221,233,58,1,20,99,74,0,0,22,160,0,134,13,21,0,9,52,55,255,17,89,140,0,175,34,59,0,84,165,119,255,224,226,234,255,7,72,166,255,123,115,255,1,18,214,246,0,250,7,71,1,217,220,185,0,212,35,76,255,38,125,175,0,189,97,210,0,114,238,44,255,41,188,169,254,45,186,154,0,81,92,22,0,132,160,193,0,121,208,98,255,13,81,44,255,203,156,82,0,71,58,21,255,208,114,191,254,50,38,147,0,154,216,195,0,101,25,18,0,60,250,215,255,233,132,235,255,103,175,142,1,16,14,92,0,141,31,110,254,238,241,45,255,153,217,239,1,97,168,47,255,249,85,16,1,28,175,62,255,57,254,54,0,222,231,126,0,166,45,117,254,18,189,96,255,228,76,50,0,200,244,94,0,198,152,120,1,68,34,69,255,12,65,160,254,101,19,90,0,167,197,120,255,68,54,185,255,41,218,188,0,113,168,48,0,88,105,189,1,26,82,32,255,185,93,164,1,228,240,237,255,66,182,53,0,171,197,92,255,107,9,233,1,199,120,144,255,78,49,10,255,109,170,105,255,90,4,31,255,28,244,113,255,74,58,11,0,62,220,246,255,121,154,200,254,144,210,178,255,126,57,129,1,43,250,14,255,101,111,28,1,47,86,241,255,61,70,150,255,53,73,5,255,30,26,158,0,209,26,86,0,138,237,74,0,164,95,188,0,142,60,29,254,162,116,248,255,187,175,160,0,151,18,16,0,209,111,65,254,203,134,39,255,88,108,49,255,131,26,71,255,221,27,215,254,104,105,93,255,31,236,31,254,135,0,211,255,143,127,110,1,212,73,229,0,233,67,167,254,195,1,208,255,132,17,221,255,51,217,90,0,67,235,50,255,223,210,143,0,179,53,130,1,233,106,198,0,217,173,220,255,112,229,24,255,175,154,93,254,71,203,246,255,48,66,133,255,3,136,230,255,23,221,113,254,235,111,213,0,170,120,95,254,251,221,2,0,45,130,158,254,105,94,217,255,242,52,180,254,213,68,45,255,104,38,28,0,244,158,76,0,161,200,96,255,207,53,13,255,187,67,148,0,170,54,248,0,119,162,178,255,83,20,11,0,42,42,192,1,146,159,163,255,183,232,111,0,77,229,21,255,71,53,143,0,27,76,34,0,246,136,47,255,219,39,182,255,92,224,201,1,19,142,14,255,69,182,241,255,163,118,245,0,9,109,106,1,170,181,247,255,78,47,238,255,84,210,176,255,213,107,139,0,39,38,11,0,72,21,150,0,72,130,69,0,205,77,155,254,142,133,21,0,71,111,172,254,226,42,59,255,179,0,215,1,33,128,241,0,234,252,13,1,184,79,8,0,110,30,73,255,246,141,189,0,170,207,218,1,74,154,69,255,138,246,49,255,155,32,100,0,125,74,105,255,90,85,61,255,35,229,177,255,62,125,193,255,153,86,188,1,73,120,212,0,209,123,246,254,135,209,38,255,151,58,44,1,92,69,214,255,14,12,88,255,252,153,166,255,253,207,112,255,60,78,83,255,227,124,110,0,180,96,252,255,53,117,33,254,164,220,82,255,41,1,27,255,38,164,166,255,164,99,169,254,61,144,70,255,192,166,18,0,107,250,66,0,197,65,50,0,1,179,18,255,255,104,1,255,43,153,35,255,80,111,168,0,110,175,168,0,41,105,45,255,219,14,205,255,164,233,140,254,43,1,118,0,233,67,195,0,178,82,159,255,138,87,122,255,212,238,90,255,144,35,124,254,25,140,164,0,251,215,44,254,133,70,107,255,101,227,80,254,92,169,55,0,215,42,49,0,114,180,85,255,33,232,27,1,172,213,25,0,62,176,123,254,32,133,24,255,225,191,62,0,93,70,153,0,181,42,104,1,22,191,224,255,200,200,140,255,249,234,37,0,149,57,141,0,195,56,208,255,254,130,70,255,32,173,240,255,29,220,199,0,110,100,115,255,132,229,249,0,228,233,223,255,37,216,209,254,178,177,209,255,183,45,165,254,224,97,114,0,137,97,168,255,225,222,172,0,165,13,49,1,210,235,204,255,252,4,28,254,70,160,151,0,232,190,52,254,83,248,93,255,62,215,77,1,175,175,179,255,160,50,66,0,121,48,208,0,63,169,209,255,0,210,200,0,224,187,44,1,73,162,82,0,9,176,143,255,19,76,193,255,29,59,167,1,24,43,154,0,28,190,190,0,141,188,129,0,232,235,203,255,234,0,109,255,54,65,159,0,60,88,232,255,121,253,150,254,252,233,131,255,198,110,41,1,83,77,71,255,200,22,59,254,106,253,242,255,21,12,207,255,237,66,189,0,90,198,202,1,225,172,127,0,53,22,202,0,56,230,132,0,1,86,183,0,109,190,42,0,243,68,174,1,109,228,154,0,200,177,122,1,35,160,183,255,177,48,85,255,90,218,169,255,248,152,78,0,202,254,110,0,6,52,43,0,142,98,65,255,63,145,22,0,70,106,93,0,232,138,107,1,110,179,61,255,211,129,218,1,242,209,92,0,35,90,217,1,182,143,106,255,116,101,217,255,114,250,221,255,173,204,6,0,60,150,163,0,73,172,44,255,239,110,80,255,237,76,153,254,161,140,249,0,149,232,229,0,133,31,40,255,174,164,119,0,113,51,214,0,129,228,2,254,64,34,243,0,107,227,244,255,174,106,200,255,84,153,70,1,50,35,16,0,250,74,216,254,236,189,66,255,153,249,13,0,230,178,4,255,221,41,238,0,118,227,121,255,94,87,140,254,254,119,92,0,73,239,246,254,117,87,128,0,19,211,145,255,177,46,252,0,229,91,246,1,69,128,247,255,202,77,54,1,8,11,9,255,153,96,166,0,217,214,173,255,134,192,2,1,0,207,0,0,189,174,107,1,140,134,100,0,158,193,243,1,182,102,171,0,235,154,51,0,142,5,123,255,60,168,89,1,217,14,92,255,19,214,5,1,211,167,254,0,44,6,202,254,120,18,236,255,15,113,184,255,184,223,139,0,40,177,119,254,182,123,90,255,176,165,176,0,247,77,194,0,27,234,120,0,231,0,214,255,59,39,30,0,125,99,145,255,150,68,68,1,141,222,248,0,153,123,210,255,110,127,152,255,229,33,214,1,135,221,197,0,137,97,2,0,12,143,204,255,81,41,188,0,115,79,130,255,94,3,132,0,152,175,187,255,124,141,10,255,126,192,179,255,11,103,198,0,149,6,45,0,219,85,187,1,230,18,178,255,72,182,152,0,3,198,184,255,128,112,224,1,97,161,230,0,254,99,38,255,58,159,197,0,151,66,219,0,59,69,143,255,185,112,249,0,119,136,47,255,123,130,132,0,168,71,95,255,113,176,40,1,232,185,173,0,207,93,117,1,68,157,108,255,102,5,147,254,49,97,33,0,89,65,111,254,247,30,163,255,124,217,221,1,102,250,216,0,198,174,75,254,57,55,18,0,227,5,236,1,229,213,173,0,201,109,218,1,49,233,239,0,30,55,158,1,25,178,106,0,155,111,188,1,94,126,140,0,215,31,238,1,77,240,16,0,213,242,25,1,38,71,168,0,205,186,93,254,49,211,140,255,219,0,180,255,134,118,165,0,160,147,134,255,110,186,35,255,198,243,42,0,243,146,119,0,134,235,163,1,4,241,135,255,193,46,193,254,103,180,79,255,225,4,184,254,242,118,130,0,146,135,176,1,234,111,30,0,69,66,213,254,41,96,123,0,121,94,42,255,178,191,195,255,46,130,42,0,117,84,8,255,233,49,214,254,238,122,109,0,6,71,89,1,236,211,123,0,244,13,48,254,119,148,14,0,114,28,86,255,75,237,25,255,145,229,16,254,129,100,53,255,134,150,120,254,168,157,50,0,23,72,104,255,224,49,14,0,255,123,22,255,151,185,151,255,170,80,184,1,134,182,20,0,41,100,101,1,153,33,16,0,76,154,111,1,86,206,234,255,192,160,164,254,165,123,93,255,1,216,164,254,67,17,175,255,169,11,59,255,158,41,61,255,73,188,14,255,195,6,137,255,22,147,29,255,20,103,3,255,246,130,227,255,122,40,128,0,226,47,24,254,35,36,32,0,152,186,183,255,69,202,20,0,195,133,195,0,222,51,247,0,169,171,94,1,183,0,160,255,64,205,18,1,156,83,15,255,197,58,249,254,251,89,110,255,50,10,88,254,51,43,216,0,98,242,198,1,245,151,113,0,171,236,194,1,197,31,199,255,229,81,38,1,41,59,20,0,253,104,230,0,152,93,14,255,246,242,146,254,214,169,240,255,240,102,108,254,160,167,236,0,154,218,188,0,150,233,202,255,27,19,250,1,2,71,133,255,175,12,63,1,145,183,198,0,104,120,115,255,130,251,247,0,17,212,167,255,62,123,132,255,247,100,189,0,155,223,152,0,143,197,33,0,155,59,44,255,150,93,240,1,127,3,87,255,95,71,207,1,167,85,1,255,188,152,116,255,10,23,23,0,137,195,93,1,54,98,97,0,240,0,168,255,148,188,127,0,134,107,151,0,76,253,171,0,90,132,192,0,146,22,54,0,224,66,54,254,230,186,229,255,39,182,196,0,148,251,130,255,65,131,108,254,128,1,160,0,169,49,167,254,199,254,148,255,251,6,131,0,187,254,129,255,85,82,62,0,178,23,58,255,254,132,5,0,164,213,39,0,134,252,146,254,37,53,81,255,155,134,82,0,205,167,238,255,94,45,180,255,132,40,161,0,254,111,112,1,54,75,217,0,179,230,221,1,235,94,191,255,23,243,48,1,202,145,203,255,39,118,42,255,117,141,253,0,254,0,222,0,43,251,50,0,54,169,234,1,80,68,208,0,148,203,243,254,145,7,135,0,6,254,0,0,252,185,127,0,98,8,129,255,38,35,72,255,211,36,220,1,40,26,89,0,168,64,197,254,3,222,239,255,2,83,215,254,180,159,105,0,58,115,194,0,186,116,106,255,229,247,219,255,129,118,193,0,202,174,183,1,166,161,72,0,201,107,147,254,237,136,74,0,233,230,106,1,105,111,168,0,64,224,30,1,1,229,3,0,102,151,175,255,194,238,228,255,254,250,212,0,187,237,121,0,67,251,96,1,197,30,11,0,183,95,204,0,205,89,138,0,64,221,37,1,255,223,30,255,178,48,211,255,241,200,90,255,167,209,96,255,57,130,221,0,46,114,200,255,61,184,66,0,55,182,24,254,110,182,33,0,171,190,232,255,114,94,31,0,18,221,8,0,47,231,254,0,255,112,83,0,118,15,215,255,173,25,40,254,192,193,31,255,238,21,146,255,171,193,118,255,101,234,53,254,131,212,112,0,89,192,107,1,8,208,27,0,181,217,15,255,231,149,232,0,140,236,126,0,144,9,199,255,12,79,181,254,147,182,202,255,19,109,182,255,49,212,225,0,74,163,203,0,175,233,148,0,26,112,51,0,193,193,9,255,15,135,249,0,150,227,130,0,204,0,219,1,24,242,205,0,238,208,117,255,22,244,112,0,26,229,34,0,37,80,188,255,38,45,206,254,240,90,225,255,29,3,47,255,42,224,76,0,186,243,167,0,32,132,15,255,5,51,125,0,139,135,24,0,6,241,219,0,172,229,133,255,246,214,50,0,231,11,207,255,191,126,83,1,180,163,170,255,245,56,24,1,178,164,211,255,3,16,202,1,98,57,118,255,141,131,89,254,33,51,24,0,243,149,91,255,253,52,14,0,35,169,67,254,49,30,88,255,179,27,36,255,165,140,183,0,58,189,151,0,88,31,0,0,75,169,66,0,66,101,199,255,24,216,199,1,121,196,26,255,14,79,203,254,240,226,81,255,94,28,10,255,83,193,240,255,204,193,131,255,94,15,86,0,218,40,157,0,51,193,209,0,0,242,177,0,102,185,247,0,158,109,116,0,38,135,91,0,223,175,149,0,220,66,1,255,86,60,232,0,25,96,37,255,225,122,162,1,215,187,168,255,158,157,46,0,56,171,162,0,232,240,101,1,122,22,9,0,51,9,21,255,53,25,238,255,217,30,232,254,125,169,148,0,13,232,102,0,148,9,37,0,165,97,141,1,228,131,41,0,222,15,243,255,254,18,17,0,6,60,237,1,106,3,113,0,59,132,189,0,92,112,30,0,105,208,213,0,48,84,179,255,187,121,231,254,27,216,109,255,162,221,107,254,73,239,195,255,250,31,57,255,149,135,89,255,185,23,115,1,3,163,157,255,18,112,250,0,25,57,187,255,161,96,164,0,47,16,243,0,12,141,251,254,67,234,184,255,41,18,161,0,175,6,96,255,160,172,52,254,24,176,183,255,198,193,85,1,124,121,137,255,151,50,114,255,220,203,60,255,207,239,5,1,0,38,107,255,55,238,94,254,70,152,94,0,213,220,77,1,120,17,69,255,85,164,190,255,203,234,81,0,38,49,37,254,61,144,124,0,137,78,49,254,168,247,48,0,95,164,252,0,105,169,135,0,253,228,134,0,64,166,75,0,81,73,20,255,207,210,10,0,234,106,150,255,94,34,90,255,254,159,57,254,220,133,99,0,139,147,180,254,24,23,185,0,41,57,30,255,189,97,76,0,65,187,223,255,224,172,37,255,34,62,95,1,231,144,240,0,77,106,126,254,64,152,91,0,29,98,155,0,226,251,53,255,234,211,5,255,144,203,222,255,164,176,221,254,5,231,24,0,179,122,205,0,36,1,134,255,125,70,151,254,97,228,252,0,172,129,23,254,48,90,209,255,150,224,82,1,84,134,30,0,241,196,46,0,103,113,234,255,46,101,121,254,40,124,250,255,135,45,242,254,9,249,168,255,140,108,131,255,143,163,171,0,50,173,199,255,88,222,142,255,200,95,158,0,142,192,163,255,7,117,135,0,111,124,22,0,236,12,65,254,68,38,65,255,227,174,254,0,244,245,38,0,240,50,208,255,161,63,250,0,60,209,239,0,122,35,19,0,14,33,230,254,2,159,113,0,106,20,127,255,228,205,96,0,137,210,174,254,180,212,144,255,89,98,154,1,34,88,139,0,167,162,112,1,65,110,197,0,241,37,169,0,66,56,131,255,10,201,83,254,133,253,187,255,177,112,45,254,196,251,0,0,196,250,151,255,238,232,214,255,150,209,205,0,28,240,118,0,71,76,83,1,236,99,91,0,42,250,131,1,96,18,64,255,118,222,35,0,113,214,203,255,122,119,184,255,66,19,36,0,204,64,249,0,146,89,139,0,134,62,135,1,104,233,101,0,188,84,26,0,49,249,129,0,208,214,75,255,207,130,77,255,115,175,235,0,171,2,137,255,175,145,186,1,55,245,135,255,154,86,181,1,100,58,246,255,109,199,60,255,82,204,134,255,215,49,230,1,140,229,192,255,222,193,251,255,81,136,15,255,179,149,162,255,23,39,29,255,7,95,75,254,191,81,222,0,241,81,90,255,107,49,201,255,244,211,157,0,222,140,149,255,65,219,56,254,189,246,90,255,178,59,157,1,48,219,52,0,98,34,215,0,28,17,187,255,175,169,24,0,92,79,161,255,236,200,194,1,147,143,234,0,229,225,7,1,197,168,14,0,235,51,53,1,253,120,174,0,197,6,168,255,202,117,171,0,163,21,206,0,114,85,90,255,15,41,10,255,194,19,99,0,65,55,216,254,162,146,116,0,50,206,212,255,64,146,29,255,158,158,131,1,100,165,130,255,172,23,129,255,125,53,9,255,15,193,18,1,26,49,11,255,181,174,201,1,135,201,14,255,100,19,149,0,219,98,79,0,42,99,143,254,96,0,48,255,197,249,83,254,104,149,79,255,235,110,136,254,82,128,44,255,65,41,36,254,88,211,10,0,187,121,187,0,98,134,199,0,171,188,179,254,210,11,238,255,66,123,130,254,52,234,61,0,48,113,23,254,6,86,120,255,119,178,245,0,87,129,201,0,242,141,209,0,202,114,85,0,148,22,161,0,103,195,48,0,25,49,171,255,138,67,130,0,182,73,122,254,148,24,130,0,211,229,154,0,32,155,158,0,84,105,61,0,177,194,9,255,166,89,86,1,54,83,187,0,249,40,117,255,109,3,215,255,53,146,44,1,63,47,179,0,194,216,3,254,14,84,136,0,136,177,13,255,72,243,186,255,117,17,125,255,211,58,211,255,93,79,223,0,90,88,245,255,139,209,111,255,70,222,47,0,10,246,79,255,198,217,178,0,227,225,11,1,78,126,179,255,62,43,126,0,103,148,35,0,129,8,165,254,245,240,148,0,61,51,142,0,81,208,134,0,15,137,115,255,211,119,236,255,159,245,248,255,2,134,136,255,230,139,58,1,160,164,254,0,114,85,141,255,49,166,182,255,144,70,84,1,85,182,7,0,46,53,93,0,9,166,161,255,55,162,178,255,45,184,188,0,146,28,44,254,169,90,49,0,120,178,241,1,14,123,127,255,7,241,199,1,189,66,50,255,198,143,101,254,189,243,135,255,141,24,24,254,75,97,87,0,118,251,154,1,237,54,156,0,171,146,207,255,131,196,246,255,136,64,113,1,151,232,57,0,240,218,115,0,49,61,27,255,64,129,73,1,252,169,27,255,40,132,10,1,90,201,193,255,252,121,240,1,186,206,41,0,43,198,97,0,145,100,183,0,204,216,80,254,172,150,65,0,249,229,196,254,104,123,73,255,77,104,96,254,130,180,8,0,104,123,57,0,220,202,229,255,102,249,211,0,86,14,232,255,182,78,209,0,239,225,164,0,106,13,32,255,120,73,17,255,134,67,233,0,83,254,181,0,183,236,112,1,48,64,131,255,241,216,243,255,65,193,226,0,206,241,100,254,100,134,166,255,237,202,197,0,55,13,81,0,32,124,102,255,40,228,177,0,118,181,31,1,231,160,134,255,119,187,202,0,0,142,60,255,128,38,189,255,166,201,150,0,207,120,26,1,54,184,172,0,12,242,204,254,133,66,230,0,34,38,31,1,184,112,80,0,32,51,165,254,191,243,55,0,58,73,146,254,155,167,205,255,100,104,152,255,197,254,207,255,173,19,247,0,238,10,202,0,239,151,242,0,94,59,39,255,240,29,102,255,10,92,154,255,229,84,219,255,161,129,80,0,208,90,204,1,240,219,174,255,158,102,145,1,53,178,76,255,52,108,168,1,83,222,107,0,211,36,109,0,118,58,56,0,8,29,22,0,237,160,199,0,170,209,157,0,137,71,47,0,143,86,32,0,198,242,2,0,212,48,136,1,92,172,186,0,230,151,105,1,96,191,229,0,138,80,191,254,240,216,130,255,98,43,6,254,168,196,49,0,253,18,91,1,144,73,121,0,61,146,39,1,63,104,24,255,184,165,112,254,126,235,98,0,80,213,98,255,123,60,87,255,82,140,245,1,223,120,173,255,15,198,134,1,206,60,239,0,231,234,92,255,33,238,19,255,165,113,142,1,176,119,38,0,160,43,166,254,239,91,105,0,107,61,194,1,25,4,68,0,15,139,51,0,164,132,106,255,34,116,46,254,168,95,197,0,137,212,23,0,72,156,58,0,137,112,69,254,150,105,154,255,236,201,157,0,23,212,154,255,136,82,227,254,226,59,221,255,95,149,192,0,81,118,52,255,33,43,215,1,14,147,75,255,89,156,121,254,14,18,79,0,147,208,139,1,151,218,62,255,156,88,8,1,210,184,98,255,20,175,123,255,102,83,229,0,220,65,116,1,150,250,4,255,92,142,220,255,34,247,66,255,204,225,179,254,151,81,151,0,71,40,236,255,138,63,62,0,6,79,240,255,183,185,181,0,118,50,27,0,63,227,192,0,123,99,58,1,50,224,155,255,17,225,223,254,220,224,77,255,14,44,123,1,141,128,175,0,248,212,200,0,150,59,183,255,147,97,29,0,150,204,181,0,253,37,71,0,145,85,119,0,154,200,186,0,2,128,249,255,83,24,124,0,14,87,143,0,168,51,245,1,124,151,231,255,208,240,197,1,124,190,185,0,48,58,246,0,20,233,232,0,125,18,98,255,13,254,31,255,245,177,130,255,108,142,35,0,171,125,242,254,140,12,34,255,165,161,162,0,206,205,101,0,247,25,34,1,100,145,57,0,39,70,57,0,118,204,203,255,242,0,162,0,165,244,30,0,198,116,226,0,128,111,153,255,140,54,182,1,60,122,15,255,155,58,57,1,54,50,198,0,171,211,29,255,107,138,167,255,173,107,199,255,109,161,193,0,89,72,242,255,206,115,89,255,250,254,142,254,177,202,94,255,81,89,50,0,7,105,66,255,25,254,255,254,203,64,23,255,79,222,108,255,39,249,75,0,241,124,50,0,239,152,133,0,221,241,105,0,147,151,98,0,213,161,121,254,242,49,137,0,233,37,249,254,42,183,27,0,184,119,230,255,217,32,163,255,208,251,228,1,137,62,131,255,79,64,9,254,94,48,113,0,17,138,50,254,193,255,22,0,247,18,197,1,67,55,104,0,16,205,95,255,48,37,66,0,55,156,63,1,64,82,74,255,200,53,71,254,239,67,125,0,26,224,222,0,223,137,93,255,30,224,202,255,9,220,132,0,198,38,235,1,102,141,86,0,60,43,81,1,136,28,26,0,233,36,8,254,207,242,148,0,164,162,63,0,51,46,224,255,114,48,79,255,9,175,226,0,222,3,193,255,47,160,232,255,255,93,105,254,14,42,230,0,26,138,82,1,208,43,244,0,27,39,38,255,98,208,127,255,64,149,182,255,5,250,209,0,187,60,28,254,49,25,218,255,169,116,205,255,119,18,120,0,156,116,147,255,132,53,109,255,13,10,202,0,110,83,167,0,157,219,137,255,6,3,130,255,50,167,30,255,60,159,47,255,129,128,157,254,94,3,189,0,3,166,68,0,83,223,215,0,150,90,194,1,15,168,65,0,227,83,51,255,205,171,66,255,54,187,60,1,152,102,45,255,119,154,225,0,240,247,136,0,100,197,178,255,139,71,223,255,204,82,16,1,41,206,42,255,156,192,221,255,216,123,244,255,218,218,185,255,187,186,239,255,252,172,160,255,195,52,22,0,144,174,181,254,187,100,115,255,211,78,176,255,27,7,193,0,147,213,104,255,90,201,10,255,80,123,66,1,22,33,186,0,1,7,99,254,30,206,10,0,229,234,5,0,53,30,210,0,138,8,220,254,71,55,167,0,72,225,86,1,118,190,188,0,254,193,101,1,171,249,172,255,94,158,183,254,93,2,108,255,176,93,76,255,73,99,79,255,74,64,129,254,246,46,65,0,99,241,127,254,246,151,102,255,44,53,208,254,59,102,234,0,154,175,164,255,88,242,32,0,111,38,1,0,255,182,190,255,115,176,15,254,169,60,129,0,122,237,241,0,90,76,63,0,62,74,120,255,122,195,110,0,119,4,178,0,222,242,210,0,130,33,46,254,156,40,41,0,167,146,112,1,49,163,111,255,121,176,235,0,76,207,14,255,3,25,198,1,41,235,213,0,85,36,214,1,49,92,109,255,200,24,30,254,168,236,195,0,145,39,124,1,236,195,149,0,90,36,184,255,67,85,170,255,38,35,26,254,131,124,68,255,239,155,35,255,54,201,164,0,196,22,117,255,49,15,205,0,24,224,29,1,126,113,144,0,117,21,182,0,203,159,141,0,223,135,77,0,176,230,176,255,190,229,215,255,99,37,181,255,51,21,138,255,25,189,89,255,49,48,165,254,152,45,247,0,170,108,222,0,80,202,5,0,27,69,103,254,204,22,129,255,180,252,62,254,210,1,91,255,146,110,254,255,219,162,28,0,223,252,213,1,59,8,33,0,206,16,244,0,129,211,48,0,107,160,208,0,112,59,209,0,109,77,216,254,34,21,185,255,246,99,56,255,179,139,19,255,185,29,50,255,84,89,19,0,74,250,98,255,225,42,200,255,192,217,205,255,210,16,167,0,99,132,95,1,43,230,57,0,254,11,203,255,99,188,63,255,119,193,251,254,80,105,54,0,232,181,189,1,183,69,112,255,208,171,165,255,47,109,180,255,123,83,165,0,146,162,52,255,154,11,4,255,151,227,90,255,146,137,97,254,61,233,41,255,94,42,55,255,108,164,236,0,152,68,254,0,10,140,131,255,10,106,79,254,243,158,137,0,67,178,66,254,177,123,198,255,15,62,34,0,197,88,42,255,149,95,177,255,152,0,198,255,149,254,113,255,225,90,163,255,125,217,247,0,18,17,224,0,128,66,120,254,192,25,9,255,50,221,205,0,49,212,70,0,233,255,164,0,2,209,9,0,221,52,219,254,172,224,244,255,94,56,206,1,242,179,2,255,31,91,164,1,230,46,138,255,189,230,220,0,57,47,61,255,111,11,157,0,177,91,152,0,28,230,98,0,97,87,126,0,198,89,145,255,167,79,107,0,249,77,160,1,29,233,230,255,150,21,86,254,60,11,193,0,151,37,36,254,185,150,243,255,228,212,83,1,172,151,180,0,201,169,155,0,244,60,234,0,142,235,4,1,67,218,60,0,192,113,75,1,116,243,207,255,65,172,155,0,81,30,156,255,80,72,33,254,18,231,109,255,142,107,21,254,125,26,132,255,176,16,59,255,150,201,58,0,206,169,201,0,208,121,226,0,40,172,14,255,150,61,94,255,56,57,156,255,141,60,145,255,45,108,149,255,238,145,155,255,209,85,31,254,192,12,210,0,99,98,93,254,152,16,151,0,225,185,220,0,141,235,44,255,160,172,21,254,71,26,31,255,13,64,93,254,28,56,198,0,177,62,248,1,182,8,241,0,166,101,148,255,78,81,133,255,129,222,215,1,188,169,129,255,232,7,97,0,49,112,60,255,217,229,251,0,119,108,138,0,39,19,123,254,131,49,235,0,132,84,145,0,130,230,148,255,25,74,187,0,5,245,54,255,185,219,241,1,18,194,228,255,241,202,102,0,105,113,202,0,155,235,79,0,21,9,178,255,156,1,239,0,200,148,61,0,115,247,210,255,49,221,135,0,58,189,8,1,35,46,9,0,81,65,5,255,52,158,185,255,125,116,46,255,74,140,13,255,210,92,172,254,147,23,71,0,217,224,253,254,115,108,180,255,145,58,48,254,219,177,24,255,156,255,60,1,154,147,242,0,253,134,87,0,53,75,229,0,48,195,222,255,31,175,50,255,156,210,120,255,208,35,222,255,18,248,179,1,2,10,101,255,157,194,248,255,158,204,101,255,104,254,197,255,79,62,4,0,178,172,101,1,96,146,251,255,65,10,156,0,2,137,165,255,116,4,231,0,242,215,1,0,19,35,29,255,43,161,79,0,59,149,246,1,251,66,176,0,200,33,3,255,80,110,142,255,195,161,17,1,228,56,66,255,123,47,145,254,132,4,164,0,67,174,172,0,25,253,114,0,87,97,87,1,250,220,84,0,96,91,200,255,37,125,59,0,19,65,118,0,161,52,241,255,237,172,6,255,176,191,255,255,1,65,130,254,223,190,230,0,101,253,231,255,146,35,109,0,250,29,77,1,49,0,19,0,123,90,155,1,22,86,32,255,218,213,65,0,111,93,127,0,60,93,169,255,8,127,182,0,17,186,14,254,253,137,246,255,213,25,48,254,76,238,0,255,248,92,70,255,99,224,139,0,184,9,255,1,7,164,208,0,205,131,198,1,87,214,199,0,130,214,95,0,221,149,222,0,23,38,171,254,197,110,213,0,43,115,140,254,215,177,118,0,96,52,66,1,117,158,237,0,14,64,182,255,46,63,174,255,158,95,190,255,225,205,177,255,43,5,142,255,172,99,212,255,244,187,147,0,29,51,153,255,228,116,24,254,30,101,207,0,19,246,150,255,134,231,5,0,125,134,226,1,77,65,98,0,236,130,33,255,5,110,62,0,69,108,127,255,7,113,22,0,145,20,83,254,194,161,231,255,131,181,60,0,217,209,177,255,229,148,212,254,3,131,184,0,117,177,187,1,28,14,31,255,176,102,80,0,50,84,151,255,125,31,54,255,21,157,133,255,19,179,139,1,224,232,26,0,34,117,170,255,167,252,171,255,73,141,206,254,129,250,35,0,72,79,236,1,220,229,20,255,41,202,173,255,99,76,238,255,198,22,224,255,108,198,195,255,36,141,96,1,236,158,59,255,106,100,87,0,110,226,2,0,227,234,222,0,154,93,119,255,74,112,164,255,67,91,2,255,21,145,33,255,102,214,137,255,175,230,103,254,163,246,166,0,93,247,116,254,167,224,28,255,220,2,57,1,171,206,84,0,123,228,17,255,27,120,119,0,119,11,147,1,180,47,225,255,104,200,185,254,165,2,114,0,77,78,212,0,45,154,177,255,24,196,121,254,82,157,182,0,90,16,190,1,12,147,197,0,95,239,152,255,11,235,71,0,86,146,119,255,172,134,214,0,60,131,196,0,161,225,129,0,31,130,120,254,95,200,51,0,105,231,210,255,58,9,148,255,43,168,221,255,124,237,142,0,198,211,50,254,46,245,103,0,164,248,84,0,152,70,208,255,180,117,177,0,70,79,185,0,243,74,32,0,149,156,207,0,197,196,161,1,245,53,239,0,15,93,246,254,139,240,49,255,196,88,36,255,162,38,123,0,128,200,157,1,174,76,103,255,173,169,34,254,216,1,171,255,114,51,17,0,136,228,194,0,110,150,56,254,106,246,159,0,19,184,79,255,150,77,240,255,155,80,162,0,0,53,169,255,29,151,86,0,68,94,16,0,92,7,110,254,98,117,149,255,249,77,230,255,253,10,140,0,214,124,92,254,35,118,235,0,89,48,57,1,22,53,166,0,184,144,61,255,179,255,194,0,214,248,61,254,59,110,246,0,121,21,81,254,166,3,228,0,106,64,26,255,69,232,134,255,242,220,53,254,46,220,85,0,113,149,247,255,97,179,103,255,190,127,11,0,135,209,182,0,95,52,129,1,170,144,206,255,122,200,204,255,168,100,146,0,60,144,149,254,70,60,40,0,122,52,177,255,246,211,101,255,174,237,8,0,7,51,120,0,19,31,173,0,126,239,156,255,143,189,203,0,196,128,88,255,233,133,226,255,30,125,173,255,201,108,50,0,123,100,59,255,254,163,3,1,221,148,181,255,214,136,57,254,222,180,137,255,207,88,54,255,28,33,251,255,67,214,52,1,210,208,100,0,81,170,94,0,145,40,53,0,224,111,231,254,35,28,244,255,226,199,195,254,238,17,230,0,217,217,164,254,169,157,221,0,218,46,162,1,199,207,163,255,108,115,162,1,14,96,187,255,118,60,76,0,184,159,152,0,209,231,71,254,42,164,186,255,186,153,51,254,221,171,182,255,162,142,173,0,235,47,193,0,7,139,16,1,95,164,64,255,16,221,166,0,219,197,16,0,132,29,44,255,100,69,117,255,60,235,88,254,40,81,173,0,71,190,61,255,187,88,157,0,231,11,23,0,237,117,164,0,225,168,223,255,154,114,116,255,163,152,242,1,24,32,170,0,125,98,113,254,168,19,76,0,17,157,220,254,155,52,5,0,19,111,161,255,71,90,252,255,173,110,240,0,10,198,121,255,253,255,240,255,66,123,210,0,221,194,215,254,121,163,17,255,225,7,99,0,190,49,182,0,115,9,133,1,232,26,138,255,213,68,132,0,44,119,122,255,179,98,51,0,149,90,106,0,71,50,230,255,10,153,118,255,177,70,25,0,165,87,205,0,55,138,234,0,238,30,97,0,113,155,207,0,98,153,127,0,34,107,219,254,117,114,172,255,76,180,255,254,242,57,179,255,221,34,172,254,56,162,49,255,83,3,255,255,113,221,189,255,188,25,228,254,16,88,89,255,71,28,198,254,22,17,149,255,243,121,254,255,107,202,99,255,9,206,14,1,220,47,153,0,107,137,39,1,97,49,194,255,149,51,197,254,186,58,11,255,107,43,232,1,200,6,14,255,181,133,65,254,221,228,171,255,123,62,231,1,227,234,179,255,34,189,212,254,244,187,249,0,190,13,80,1,130,89,1,0,223,133,173,0,9,222,198,255,66,127,74,0,167,216,93,255,155,168,198,1,66,145,0,0,68,102,46,1,172,90,154,0,216,128,75,255,160,40,51,0,158,17,27,1,124,240,49,0,236,202,176,255,151,124,192,255,38,193,190,0,95,182,61,0,163,147,124,255,255,165,51,255,28,40,17,254,215,96,78,0,86,145,218,254,31,36,202,255,86,9,5,0,111,41,200,255,237,108,97,0,57,62,44,0,117,184,15,1,45,241,116,0,152,1,220,255,157,165,188,0,250,15,131,1,60,44,125,255,65,220,251,255,75,50,184,0,53,90,128,255,231,80,194,255,136,129,127,1,21,18,187,255,45,58,161,255,71,147,34,0,174,249,11,254,35,141,29,0,239,68,177,255,115,110,58,0,238,190,177,1,87,245,166,255,190,49,247,255,146,83,184,255,173,14,39,255,146,215,104,0,142,223,120,0,149,200,155,255,212,207,145,1,16,181,217,0,173,32,87,255,255,35,181,0,119,223,161,1,200,223,94,255,70,6,186,255,192,67,85,255,50,169,152,0,144,26,123,255,56,243,179,254,20,68,136,0,39,140,188,254,253,208,5,255,200,115,135,1,43,172,229,255,156,104,187,0,151,251,167,0,52,135,23,0,151,153,72,0,147,197,107,254,148,158,5,255,238,143,206,0,126,153,137,255,88,152,197,254,7,68,167,0,252,159,165,255,239,78,54,255,24,63,55,255,38,222,94,0,237,183,12,255,206,204,210,0,19,39,246,254,30,74,231,0,135,108,29,1,179,115,0,0,117,118,116,1,132,6,252,255,145,129,161,1,105,67,141,0,82,37,226,255,238,226,228,255,204,214,129,254,162,123,100,255,185,121,234,0,45,108,231,0,66,8,56,255,132,136,128,0,172,224,66,254,175,157,188,0,230,223,226,254,242,219,69,0,184,14,119,1,82,162,56,0,114,123,20,0,162,103,85,255,49,239,99,254,156,135,215,0,111,255,167,254,39,196,214,0,144,38,79,1,249,168,125,0,155,97,156,255,23,52,219,255,150,22,144,0,44,149,165,255,40,127,183,0,196,77,233,255,118,129,210,255,170,135,230,255,214,119,198,0,233,240,35,0,253,52,7,255,117,102,48,255,21,204,154,255,179,136,177,255,23,2,3,1,149,130,89,255,252,17,159,1,70,60,26,0,144,107,17,0,180,190,60,255,56,182,59,255,110,71,54,255,198,18,129,255,149,224,87,255,223,21,152,255,138,22,182,255,250,156,205,0,236,45,208,255,79,148,242,1,101,70,209,0,103,78,174,0,101,144,172,255,152,136,237,1,191,194,136,0,113,80,125,1,152,4,141,0,155,150,53,255,196,116,245,0,239,114,73,254,19,82,17,255,124,125,234,255,40,52,191,0,42,210,158,255,155,132,165,0,178,5,42,1,64,92,40,255,36,85,77,255,178,228,118,0,137,66,96,254,115,226,66,0,110,240,69,254,151,111,80,0,167,174,236,255,227,108,107,255,188,242,65,255,183,81,255,0,57,206,181,255,47,34,181,255,213,240,158,1,71,75,95,0,156,40,24,255,102,210,81,0,171,199,228,255,154,34,41,0,227,175,75,0,21,239,195,0,138,229,95,1,76,192,49,0,117,123,87,1,227,225,130,0,125,62,63,255,2,198,171,0,254,36,13,254,145,186,206,0,148,255,244,255,35,0,166,0,30,150,219,1,92,228,212,0,92,198,60,254,62,133,200,255,201,41,59,0,125,238,109,255,180,163,238,1,140,122,82,0,9,22,88,255,197,157,47,255,153,94,57,0,88,30,182,0,84,161,85,0,178,146,124,0,166,166,7,255,21,208,223,0,156,182,242,0,155,121,185,0,83,156,174,254,154,16,118,255,186,83,232,1,223,58,121,255,29,23,88,0,35,125,127,255,170,5,149,254,164,12,130,255,155,196,29,0,161,96,136,0,7,35,29,1,162,37,251,0,3,46,242,255,0,217,188,0,57,174,226,1,206,233,2,0,57,187,136,254,123,189,9,255,201,117,127,255,186,36,204,0,231,25,216,0,80,78,105,0,19,134,129,255,148,203,68,0,141,81,125,254,248,165,200,255,214,144,135,0,151,55,166,255,38,235,91,0,21,46,154,0,223,254,150,255,35,153,180,255,125,176,29,1,43,98,30,255,216,122,230,255,233,160,12,0,57,185,12,254,240,113,7,255,5,9,16,254,26,91,108,0,109,198,203,0,8,147,40,0,129,134,228,255,124,186,40,255,114,98,132,254,166,132,23,0,99,69,44,0,9,242,238,255,184,53,59,0,132,129,102,255,52,32,243,254,147,223,200,255,123,83,179,254,135,144,201,255,141,37,56,1,151,60,227,255,90,73,156,1,203,172,187,0,80,151,47,255,94,137,231,255,36,191,59,255,225,209,181,255,74,215,213,254,6,118,179,255,153,54,193,1,50,0,231,0,104,157,72,1,140,227,154,255,182,226,16,254,96,225,92,255,115,20,170,254,6,250,78,0,248,75,173,255,53,89,6,255,0,180,118,0,72,173,1,0,64,8,206,1,174,133,223,0,185,62,133,255,214,11,98,0,197,31,208,0,171,167,244,255,22,231,181,1,150,218,185,0,247,169,97,1,165,139,247,255,47,120,149,1,103,248,51,0,60,69,28,254,25,179,196,0,124,7,218,254,58,107,81,0,184,233,156,255,252,74,36,0,118,188,67,0,141,95,53,255,222,94,165,254,46,61,53,0,206,59,115,255,47,236,250,255,74,5,32,1,129,154,238,255,106,32,226,0,121,187,61,255,3,166,241,254,67,170,172,255,29,216,178,255,23,201,252,0,253,110,243,0,200,125,57,0,109,192,96,255,52,115,238,0,38,121,243,255,201,56,33,0,194,118,130,0,75,96,25,255,170,30,230,254,39,63,253,0,36,45,250,255,251,1,239,0,160,212,92,1,45,209,237,0,243,33,87,254,237,84,201,255,212,18,157,254,212,99,127,255,217,98,16,254,139,172,239,0,168,201,130,255,143,193,169,255,238,151,193,1,215,104,41,0,239,61,165,254,2,3,242,0,22,203,177,254,177,204,22,0,149,129,213,254,31,11,41,255,0,159,121,254,160,25,114,255,162,80,200,0,157,151,11,0,154,134,78,1,216,54,252,0,48,103,133,0,105,220,197,0,253,168,77,254,53,179,23,0,24,121,240,1,255,46,96,255,107,60,135,254,98,205,249,255,63,249,119,255,120,59,211,255,114,180,55,254,91,85,237,0,149,212,77,1,56,73,49,0,86,198,150,0,93,209,160,0,69,205,182,255,244,90,43,0,20,36,176,0,122,116,221,0,51,167,39,1,231,1,63,255,13,197,134,0,3,209,34,255,135,59,202,0,167,100,78,0,47,223,76,0,185,60,62,0,178,166,123,1,132,12,161,255,61,174,43,0,195,69,144,0,127,47,191,1,34,44,78,0,57,234,52,1,255,22,40,255,246,94,146,0,83,228,128,0,60,78,224,255,0,96,210,255,153,175,236,0,159,21,73,0,180,115,196,254,131,225,106,0,255,167,134,0,159,8,112,255,120,68,194,255,176,196,198,255,118,48,168,255,93,169,1,0,112,200,102,1,74,24,254,0,19,141,4,254,142,62,63,0,131,179,187,255,77,156,155,255,119,86,164,0,170,208,146,255,208,133,154,255,148,155,58,255,162,120,232,254,252,213,155,0,241,13,42,0,94,50,131,0,179,170,112,0,140,83,151,255,55,119,84,1,140,35,239,255,153,45,67,1,236,175,39,0,54,151,103,255,158,42,65,255,196,239,135,254,86,53,203,0,149,97,47,254,216,35,17,255,70,3,70,1,103,36,90,255,40,26,173,0,184,48,13,0,163,219,217,255,81,6,1,255,221,170,108,254,233,208,93,0,100,201,249,254,86,36,35,255,209,154,30,1,227,201,251,255,2,189,167,254,100,57,3,0,13,128,41,0,197,100,75,0,150,204,235,255,145,174,59,0,120,248,149,255,85,55,225,0,114,210,53,254,199,204,119,0,14,247,74,1,63,251,129,0,67,104,151,1,135,130,80,0,79,89,55,255,117,230,157,255,25,96,143,0,213,145,5,0,69,241,120,1,149,243,95,255,114,42,20,0,131,72,2,0,154,53,20,255,73,62,109,0,196,102,152,0,41,12,204,255,122,38,11,1,250,10,145,0,207,125,148,0,246,244,222,255,41,32,85,1,112,213,126,0,162,249,86,1,71,198,127,255,81,9,21,1,98,39,4,255,204,71,45,1,75,111,137,0,234,59,231,0,32,48,95,255,204,31,114,1,29,196,181,255,51,241,167,254,93,109,142,0,104,144,45,0,235,12,181,255,52,112,164,0,76,254,202,255,174,14,162,0,61,235,147,255,43,64,185,254,233,125,217,0,243,88,167,254,74,49,8,0,156,204,66,0,124,214,123,0,38,221,118,1,146,112,236,0,114,98,177,0,151,89,199,0,87,197,112,0,185,149,161,0,44,96,165,0,248,179,20,255,188,219,216,254,40,62,13,0,243,142,141,0,229,227,206,255,172,202,35,255,117,176,225,255,82,110,38,1,42,245,14,255,20,83,97,0,49,171,10,0,242,119,120,0,25,232,61,0,212,240,147,255,4,115,56,255,145,17,239,254,202,17,251,255,249,18,245,255,99,117,239,0,184,4,179,255,246,237,51,255,37,239,137,255,166,112,166,255,81,188,33,255,185,250,142,255,54,187,173,0,208,112,201,0,246,43,228,1,104,184,88,255,212,52,196,255,51,117,108,255,254,117,155,0,46,91,15,255,87,14,144,255,87,227,204,0,83,26,83,1,159,76,227,0,159,27,213,1,24,151,108,0,117,144,179,254,137,209,82,0,38,159,10,0,115,133,201,0,223,182,156,1,110,196,93,255,57,60,233,0,5,167,105,255,154,197,164,0,96,34,186,255,147,133,37,1,220,99,190,0,1,167,84,255,20,145,171,0,194,197,251,254,95,78,133,255,252,248,243,255,225,93,131,255,187,134,196,255,216,153,170,0,20,118,158,254,140,1,118,0,86,158,15,1,45,211,41,255,147,1,100,254,113,116,76,255,211,127,108,1,103,15,48,0,193,16,102,1,69,51,95,255,107,128,157,0,137,171,233,0,90,124,144,1,106,161,182,0,175,76,236,1,200,141,172,255,163,58,104,0,233,180,52,255,240,253,14,255,162,113,254,255,38,239,138,254,52,46,166,0,241,101,33,254,131,186,156,0,111,208,62,255,124,94,160,255,31,172,254,0,112,174,56,255,188,99,27,255,67,138,251,0,125,58,128,1,156,152,174,255,178,12,247,255,252,84,158,0,82,197,14,254,172,200,83,255,37,39,46,1,106,207,167,0,24,189,34,0,131,178,144,0,206,213,4,0,161,226,210,0,72,51,105,255,97,45,187,255,78,184,223,255,176,29,251,0,79,160,86,255,116,37,178,0,82,77,213,1,82,84,141,255,226,101,212,1,175,88,199,255,245,94,247,1,172,118,109,255,166,185,190,0,131,181,120,0,87,254,93,255,134,240,73,255,32,245,143,255,139,162,103,255,179,98,18,254,217,204,112,0,147,223,120,255,53,10,243,0,166,140,150,0,125,80,200,255,14,109,219,255,91,218,1,255,252,252,47,254,109,156,116,255,115,49,127,1,204,87,211,255,148,202,217,255,26,85,249,255,14,245,134,1,76,89,169,255,242,45,230,0,59,98,172,255,114,73,132,254,78,155,49,255,158,126,84,0,49,175,43,255,16,182,84,255,157,103,35,0,104,193,109,255,67,221,154,0,201,172,1,254,8,162,88,0,165,1,29,255,125,155,229,255,30,154,220,1,103,239,92,0,220,1,109,255,202,198,1,0,94,2,142,1,36,54,44,0,235,226,158,255,170,251,214,255,185,77,9,0,97,74,242,0,219,163,149,255,240,35,118,255,223,114,88,254,192,199,3,0,106,37,24,255,201,161,118,255,97,89,99,1,224,58,103,255,101,199,147,254,222,60,99,0,234,25,59,1,52,135,27,0,102,3,91,254,168,216,235,0,229,232,136,0,104,60,129,0,46,168,238,0,39,191,67,0,75,163,47,0,143,97,98,255,56,216,168,1,168,233,252,255,35,111,22,255,92,84,43,0,26,200,87,1,91,253,152,0,202,56,70,0,142,8,77,0,80,10,175,1,252,199,76,0,22,110,82,255,129,1,194,0,11,128,61,1,87,14,145,255,253,222,190,1,15,72,174,0,85,163,86,254,58,99,44,255,45,24,188,254,26,205,15,0,19,229,210,254,248,67,195,0,99,71,184,0,154,199,37,255,151,243,121,255,38,51,75,255,201,85,130,254,44,65,250,0,57,147,243,254,146,43,59,255,89,28,53,0,33,84,24,255,179,51,18,254,189,70,83,0,11,156,179,1,98,134,119,0,158,111,111,0,119,154,73,255,200,63,140,254,45,13,13,255,154,192,2,254,81,72,42,0,46,160,185,254,44,112,6,0,146,215,149,1,26,176,104,0,68,28,87,1,236,50,153,255,179,128,250,254,206,193,191,255,166,92,137,254,53,40,239,0,210,1,204,254,168,173,35,0,141,243,45,1,36,50,109,255,15,242,194,255,227,159,122,255,176,175,202,254,70,57,72,0,40,223,56,0,208,162,58,255,183,98,93,0,15,111,12,0,30,8,76,255,132,127,246,255,45,242,103,0,69,181,15,255,10,209,30,0,3,179,121,0,241,232,218,1,123,199,88,255,2,210,202,1,188,130,81,255,94,101,208,1,103,36,45], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([76,193,24,1,95,26,241,255,165,162,187,0,36,114,140,0,202,66,5,255,37,56,147,0,152,11,243,1,127,85,232,255,250,135,212,1,185,177,113,0,90,220,75,255,69,248,146,0,50,111,50,0,92,22,80,0,244,36,115,254,163,100,82,255,25,193,6,1,127,61,36,0,253,67,30,254,65,236,170,255,161,17,215,254,63,175,140,0,55,127,4,0,79,112,233,0,109,160,40,0,143,83,7,255,65,26,238,255,217,169,140,255,78,94,189,255,0,147,190,255,147,71,186,254,106,77,127,255,233,157,233,1,135,87,237,255,208,13,236,1,155,109,36,255,180,100,218,0,180,163,18,0,190,110,9,1,17,63,123,255,179,136,180,255,165,123,123,255,144,188,81,254,71,240,108,255,25,112,11,255,227,218,51,255,167,50,234,255,114,79,108,255,31,19,115,255,183,240,99,0,227,87,143,255,72,217,248,255,102,169,95,1,129,149,149,0,238,133,12,1,227,204,35,0,208,115,26,1,102,8,234,0,112,88,143,1,144,249,14,0,240,158,172,254,100,112,119,0,194,141,153,254,40,56,83,255,121,176,46,0,42,53,76,255,158,191,154,0,91,209,92,0,173,13,16,1,5,72,226,255,204,254,149,0,80,184,207,0,100,9,122,254,118,101,171,255,252,203,0,254,160,207,54,0,56,72,249,1,56,140,13,255,10,64,107,254,91,101,52,255,225,181,248,1,139,255,132,0,230,145,17,0,233,56,23,0,119,1,241,255,213,169,151,255,99,99,9,254,185,15,191,255,173,103,109,1,174,13,251,255,178,88,7,254,27,59,68,255,10,33,2,255,248,97,59,0,26,30,146,1,176,147,10,0,95,121,207,1,188,88,24,0,185,94,254,254,115,55,201,0,24,50,70,0,120,53,6,0,142,66,146,0,228,226,249,255,104,192,222,1,173,68,219,0,162,184,36,255,143,102,137,255,157,11,23,0,125,45,98,0,235,93,225,254,56,112,160,255,70,116,243,1,153,249,55,255,129,39,17,1,241,80,244,0,87,69,21,1,94,228,73,255,78,66,65,255,194,227,231,0,61,146,87,255,173,155,23,255,112,116,219,254,216,38,11,255,131,186,133,0,94,212,187,0,100,47,91,0,204,254,175,255,222,18,215,254,173,68,108,255,227,228,79,255,38,221,213,0,163,227,150,254,31,190,18,0,160,179,11,1,10,90,94,255,220,174,88,0,163,211,229,255,199,136,52,0,130,95,221,255,140,188,231,254,139,113,128,255,117,171,236,254,49,220,20,255,59,20,171,255,228,109,188,0,20,225,32,254,195,16,174,0,227,254,136,1,135,39,105,0,150,77,206,255,210,238,226,0,55,212,132,254,239,57,124,0,170,194,93,255,249,16,247,255,24,151,62,255,10,151,10,0,79,139,178,255,120,242,202,0,26,219,213,0,62,125,35,255,144,2,108,255,230,33,83,255,81,45,216,1,224,62,17,0,214,217,125,0,98,153,153,255,179,176,106,254,131,93,138,255,109,62,36,255,178,121,32,255,120,252,70,0,220,248,37,0,204,88,103,1,128,220,251,255,236,227,7,1,106,49,198,255,60,56,107,0,99,114,238,0,220,204,94,1,73,187,1,0,89,154,34,0,78,217,165,255,14,195,249,255,9,230,253,255,205,135,245,0,26,252,7,255,84,205,27,1,134,2,112,0,37,158,32,0,231,91,237,255,191,170,204,255,152,7,222,0,109,192,49,0,193,166,146,255,232,19,181,255,105,142,52,255,103,16,27,1,253,200,165,0,195,217,4,255,52,189,144,255,123,155,160,254,87,130,54,255,78,120,61,255,14,56,41,0,25,41,125,255,87,168,245,0,214,165,70,0,212,169,6,255,219,211,194,254,72,93,164,255,197,33,103,255,43,142,141,0,131,225,172,0,244,105,28,0,68,68,225,0,136,84,13,255,130,57,40,254,139,77,56,0,84,150,53,0,54,95,157,0,144,13,177,254,95,115,186,0,117,23,118,255,244,166,241,255,11,186,135,0,178,106,203,255,97,218,93,0,43,253,45,0,164,152,4,0,139,118,239,0,96,1,24,254,235,153,211,255,168,110,20,255,50,239,176,0,114,41,232,0,193,250,53,0,254,160,111,254,136,122,41,255,97,108,67,0,215,152,23,255,140,209,212,0,42,189,163,0,202,42,50,255,106,106,189,255,190,68,217,255,233,58,117,0,229,220,243,1,197,3,4,0,37,120,54,254,4,156,134,255,36,61,171,254,165,136,100,255,212,232,14,0,90,174,10,0,216,198,65,255,12,3,64,0,116,113,115,255,248,103,8,0,231,125,18,255,160,28,197,0,30,184,35,1,223,73,249,255,123,20,46,254,135,56,37,255,173,13,229,1,119,161,34,255,245,61,73,0,205,125,112,0,137,104,134,0,217,246,30,255,237,142,143,0,65,159,102,255,108,164,190,0,219,117,173,255,34,37,120,254,200,69,80,0,31,124,218,254,74,27,160,255,186,154,199,255,71,199,252,0,104,81,159,1,17,200,39,0,211,61,192,1,26,238,91,0,148,217,12,0,59,91,213,255,11,81,183,255,129,230,122,255,114,203,145,1,119,180,66,255,72,138,180,0,224,149,106,0,119,82,104,255,208,140,43,0,98,9,182,255,205,101,134,255,18,101,38,0,95,197,166,255,203,241,147,0,62,208,145,255,133,246,251,0,2,169,14,0,13,247,184,0,142,7,254,0,36,200,23,255,88,205,223,0,91,129,52,255,21,186,30,0,143,228,210,1,247,234,248,255,230,69,31,254,176,186,135,255,238,205,52,1,139,79,43,0,17,176,217,254,32,243,67,0,242,111,233,0,44,35,9,255,227,114,81,1,4,71,12,255,38,105,191,0,7,117,50,255,81,79,16,0,63,68,65,255,157,36,110,255,77,241,3,255,226,45,251,1,142,25,206,0,120,123,209,1,28,254,238,255,5,128,126,255,91,222,215,255,162,15,191,0,86,240,73,0,135,185,81,254,44,241,163,0,212,219,210,255,112,162,155,0,207,101,118,0,168,72,56,255,196,5,52,0,72,172,242,255,126,22,157,255,146,96,59,255,162,121,152,254,140,16,95,0,195,254,200,254,82,150,162,0,119,43,145,254,204,172,78,255,166,224,159,0,104,19,237,255,245,126,208,255,226,59,213,0,117,217,197,0,152,72,237,0,220,31,23,254,14,90,231,255,188,212,64,1,60,101,246,255,85,24,86,0,1,177,109,0,146,83,32,1,75,182,192,0,119,241,224,0,185,237,27,255,184,101,82,1,235,37,77,255,253,134,19,0,232,246,122,0,60,106,179,0,195,11,12,0,109,66,235,1,125,113,59,0,61,40,164,0,175,104,240,0,2,47,187,255,50,12,141,0,194,139,181,255,135,250,104,0,97,92,222,255,217,149,201,255,203,241,118,255,79,151,67,0,122,142,218,255,149,245,239,0,138,42,200,254,80,37,97,255,124,112,167,255,36,138,87,255,130,29,147,255,241,87,78,255,204,97,19,1,177,209,22,255,247,227,127,254,99,119,83,255,212,25,198,1,16,179,179,0,145,77,172,254,89,153,14,255,218,189,167,0,107,233,59,255,35,33,243,254,44,112,112,255,161,127,79,1,204,175,10,0,40,21,138,254,104,116,228,0,199,95,137,255,133,190,168,255,146,165,234,1,183,99,39,0,183,220,54,254,255,222,133,0,162,219,121,254,63,239,6,0,225,102,54,255,251,18,246,0,4,34,129,1,135,36,131,0,206,50,59,1,15,97,183,0,171,216,135,255,101,152,43,255,150,251,91,0,38,145,95,0,34,204,38,254,178,140,83,255,25,129,243,255,76,144,37,0,106,36,26,254,118,144,172,255,68,186,229,255,107,161,213,255,46,163,68,255,149,170,253,0,187,17,15,0,218,160,165,255,171,35,246,1,96,13,19,0,165,203,117,0,214,107,192,255,244,123,177,1,100,3,104,0,178,242,97,255,251,76,130,255,211,77,42,1,250,79,70,255,63,244,80,1,105,101,246,0,61,136,58,1,238,91,213,0,14,59,98,255,167,84,77,0,17,132,46,254,57,175,197,255,185,62,184,0,76,64,207,0,172,175,208,254,175,74,37,0,138,27,211,254,148,125,194,0,10,89,81,0,168,203,101,255,43,213,209,1,235,245,54,0,30,35,226,255,9,126,70,0,226,125,94,254,156,117,20,255,57,248,112,1,230,48,64,255,164,92,166,1,224,214,230,255,36,120,143,0,55,8,43,255,251,1,245,1,106,98,165,0,74,107,106,254,53,4,54,255,90,178,150,1,3,120,123,255,244,5,89,1,114,250,61,255,254,153,82,1,77,15,17,0,57,238,90,1,95,223,230,0,236,52,47,254,103,148,164,255,121,207,36,1,18,16,185,255,75,20,74,0,187,11,101,0,46,48,129,255,22,239,210,255,77,236,129,255,111,77,204,255,61,72,97,255,199,217,251,255,42,215,204,0,133,145,201,255,57,230,146,1,235,100,198,0,146,73,35,254,108,198,20,255,182,79,210,255,82,103,136,0,246,108,176,0,34,17,60,255,19,74,114,254,168,170,78,255,157,239,20,255,149,41,168,0,58,121,28,0,79,179,134,255,231,121,135,255,174,209,98,255,243,122,190,0,171,166,205,0,212,116,48,0,29,108,66,255,162,222,182,1,14,119,21,0,213,39,249,255,254,223,228,255,183,165,198,0,133,190,48,0,124,208,109,255,119,175,85,255,9,209,121,1,48,171,189,255,195,71,134,1,136,219,51,255,182,91,141,254,49,159,72,0,35,118,245,255,112,186,227,255,59,137,31,0,137,44,163,0,114,103,60,254,8,213,150,0,162,10,113,255,194,104,72,0,220,131,116,255,178,79,92,0,203,250,213,254,93,193,189,255,130,255,34,254,212,188,151,0,136,17,20,255,20,101,83,255,212,206,166,0,229,238,73,255,151,74,3,255,168,87,215,0,155,188,133,255,166,129,73,0,240,79,133,255,178,211,81,255,203,72,163,254,193,168,165,0,14,164,199,254,30,255,204,0,65,72,91,1,166,74,102,255,200,42,0,255,194,113,227,255,66,23,208,0,229,216,100,255,24,239,26,0,10,233,62,255,123,10,178,1,26,36,174,255,119,219,199,1,45,163,190,0,16,168,42,0,166,57,198,255,28,26,26,0,126,165,231,0,251,108,100,255,61,229,121,255,58,118,138,0,76,207,17,0,13,34,112,254,89,16,168,0,37,208,105,255,35,201,215,255,40,106,101,254,6,239,114,0,40,103,226,254,246,127,110,255,63,167,58,0,132,240,142,0,5,158,88,255,129,73,158,255,94,89,146,0,230,54,146,0,8,45,173,0,79,169,1,0,115,186,247,0,84,64,131,0,67,224,253,255,207,189,64,0,154,28,81,1,45,184,54,255,87,212,224,255,0,96,73,255,129,33,235,1,52,66,80,255,251,174,155,255,4,179,37,0,234,164,93,254,93,175,253,0,198,69,87,255,224,106,46,0,99,29,210,0,62,188,114,255,44,234,8,0,169,175,247,255,23,109,137,255,229,182,39,0,192,165,94,254,245,101,217,0,191,88,96,0,196,94,99,255,106,238,11,254,53,126,243,0,94,1,101,255,46,147,2,0,201,124,124,255,141,12,218,0,13,166,157,1,48,251,237,255,155,250,124,255,106,148,146,255,182,13,202,0,28,61,167,0,217,152,8,254,220,130,45,255,200,230,255,1,55,65,87,255,93,191,97,254,114,251,14,0,32,105,92,1,26,207,141,0,24,207,13,254,21,50,48,255,186,148,116,255,211,43,225,0,37,34,162,254,164,210,42,255,68,23,96,255,182,214,8,255,245,117,137,255,66,195,50,0,75,12,83,254,80,140,164,0,9,165,36,1,228,110,227,0,241,17,90,1,25,52,212,0,6,223,12,255,139,243,57,0,12,113,75,1,246,183,191,255,213,191,69,255,230,15,142,0,1,195,196,255,138,171,47,255,64,63,106,1,16,169,214,255,207,174,56,1,88,73,133,255,182,133,140,0,177,14,25,255,147,184,53,255,10,227,161,255,120,216,244,255,73,77,233,0,157,238,139,1,59,65,233,0,70,251,216,1,41,184,153,255,32,203,112,0,146,147,253,0,87,101,109,1,44,82,133,255,244,150,53,255,94,152,232,255,59,93,39,255,88,147,220,255,78,81,13,1,32,47,252,255,160,19,114,255,93,107,39,255,118,16,211,1,185,119,209,255,227,219,127,254,88,105,236,255,162,110,23,255,36,166,110,255,91,236,221,255,66,234,116,0,111,19,244,254,10,233,26,0,32,183,6,254,2,191,242,0,218,156,53,254,41,60,70,255,168,236,111,0,121,185,126,255,238,142,207,255,55,126,52,0,220,129,208,254,80,204,164,255,67,23,144,254,218,40,108,255,127,202,164,0,203,33,3,255,2,158,0,0,37,96,188,255,192,49,74,0,109,4,0,0,111,167,10,254,91,218,135,255,203,66,173,255,150,194,226,0,201,253,6,255,174,102,121,0,205,191,110,0,53,194,4,0,81,40,45,254,35,102,143,255,12,108,198,255,16,27,232,255,252,71,186,1,176,110,114,0,142,3,117,1,113,77,142,0,19,156,197,1,92,47,252,0,53,232,22,1,54,18,235,0,46,35,189,255,236,212,129,0,2,96,208,254,200,238,199,255,59,175,164,255,146,43,231,0,194,217,52,255,3,223,12,0,138,54,178,254,85,235,207,0,232,207,34,0,49,52,50,255,166,113,89,255,10,45,216,255,62,173,28,0,111,165,246,0,118,115,91,255,128,84,60,0,167,144,203,0,87,13,243,0,22,30,228,1,177,113,146,255,129,170,230,254,252,153,129,255,145,225,43,0,70,231,5,255,122,105,126,254,86,246,148,255,110,37,154,254,209,3,91,0,68,145,62,0,228,16,165,255,55,221,249,254,178,210,91,0,83,146,226,254,69,146,186,0,93,210,104,254,16,25,173,0,231,186,38,0,189,122,140,255,251,13,112,255,105,110,93,0,251,72,170,0,192,23,223,255,24,3,202,1,225,93,228,0,153,147,199,254,109,170,22,0,248,101,246,255,178,124,12,255,178,254,102,254,55,4,65,0,125,214,180,0,183,96,147,0,45,117,23,254,132,191,249,0,143,176,203,254,136,183,54,255,146,234,177,0,146,101,86,255,44,123,143,1,33,209,152,0,192,90,41,254,83,15,125,255,213,172,82,0,215,169,144,0,16,13,34,0,32,209,100,255,84,18,249,1,197,17,236,255,217,186,230,0,49,160,176,255,111,118,97,255,237,104,235,0,79,59,92,254,69,249,11,255,35,172,74,1,19,118,68,0,222,124,165,255,180,66,35,255,86,174,246,0,43,74,111,255,126,144,86,255,228,234,91,0,242,213,24,254,69,44,235,255,220,180,35,0,8,248,7,255,102,47,92,255,240,205,102,255,113,230,171,1,31,185,201,255,194,246,70,255,122,17,187,0,134,70,199,255,149,3,150,255,117,63,103,0,65,104,123,255,212,54,19,1,6,141,88,0,83,134,243,255,136,53,103,0,169,27,180,0,177,49,24,0,111,54,167,0,195,61,215,255,31,1,108,1,60,42,70,0,185,3,162,255,194,149,40,255,246,127,38,254,190,119,38,255,61,119,8,1,96,161,219,255,42,203,221,1,177,242,164,255,245,159,10,0,116,196,0,0,5,93,205,254,128,127,179,0,125,237,246,255,149,162,217,255,87,37,20,254,140,238,192,0,9,9,193,0,97,1,226,0,29,38,10,0,0,136,63,255,229,72,210,254,38,134,92,255,78,218,208,1,104,36,84,255,12,5,193,255,242,175,61,255,191,169,46,1,179,147,147,255,113,190,139,254,125,172,31,0,3,75,252,254,215,36,15,0,193,27,24,1,255,69,149,255,110,129,118,0,203,93,249,0,138,137,64,254,38,70,6,0,153,116,222,0,161,74,123,0,193,99,79,255,118,59,94,255,61,12,43,1,146,177,157,0,46,147,191,0,16,255,38,0,11,51,31,1,60,58,98,255,111,194,77,1,154,91,244,0,140,40,144,1,173,10,251,0,203,209,50,254,108,130,78,0,228,180,90,0,174,7,250,0,31,174,60,0,41,171,30,0,116,99,82,255,118,193,139,255,187,173,198,254,218,111,56,0,185,123,216,0,249,158,52,0,52,180,93,255,201,9,91,255,56,45,166,254,132,155,203,255,58,232,110,0,52,211,89,255,253,0,162,1,9,87,183,0,145,136,44,1,94,122,245,0,85,188,171,1,147,92,198,0,0,8,104,0,30,95,174,0,221,230,52,1,247,247,235,255,137,174,53,255,35,21,204,255,71,227,214,1,232,82,194,0,11,48,227,255,170,73,184,255,198,251,252,254,44,112,34,0,131,101,131,255,72,168,187,0,132,135,125,255,138,104,97,255,238,184,168,255,243,104,84,255,135,216,226,255,139,144,237,0,188,137,150,1,80,56,140,255,86,169,167,255,194,78,25,255,220,17,180,255,17,13,193,0,117,137,212,255,141,224,151,0,49,244,175,0,193,99,175,255,19,99,154,1,255,65,62,255,156,210,55,255,242,244,3,255,250,14,149,0,158,88,217,255,157,207,134,254,251,232,28,0,46,156,251,255,171,56,184,255,239,51,234,0,142,138,131,255,25,254,243,1,10,201,194,0,63,97,75,0,210,239,162,0,192,200,31,1,117,214,243,0,24,71,222,254,54,40,232,255,76,183,111,254,144,14,87,255,214,79,136,255,216,196,212,0,132,27,140,254,131,5,253,0,124,108,19,255,28,215,75,0,76,222,55,254,233,182,63,0,68,171,191,254,52,111,222,255,10,105,77,255,80,170,235,0,143,24,88,255,45,231,121,0,148,129,224,1,61,246,84,0,253,46,219,255,239,76,33,0,49,148,18,254,230,37,69,0,67,134,22,254,142,155,94,0,31,157,211,254,213,42,30,255,4,228,247,254,252,176,13,255,39,0,31,254,241,244,255,255,170,45,10,254,253,222,249,0,222,114,132,0,255,47,6,255,180,163,179,1,84,94,151,255,89,209,82,254,229,52,169,255,213,236,0,1,214,56,228,255,135,119,151,255,112,201,193,0,83,160,53,254,6,151,66,0,18,162,17,0,233,97,91,0,131,5,78,1,181,120,53,255,117,95,63,255,237,117,185,0,191,126,136,255,144,119,233,0,183,57,97,1,47,201,187,255,167,165,119,1,45,100,126,0,21,98,6,254,145,150,95,255,120,54,152,0,209,98,104,0,143,111,30,254,184,148,249,0,235,216,46,0,248,202,148,255,57,95,22,0,242,225,163,0,233,247,232,255,71,171,19,255,103,244,49,255,84,103,93,255,68,121,244,1,82,224,13,0,41,79,43,255,249,206,167,255,215,52,21,254,192,32,22,255,247,111,60,0,101,74,38,255,22,91,84,254,29,28,13,255,198,231,215,254,244,154,200,0,223,137,237,0,211,132,14,0,95,64,206,255,17,62,247,255,233,131,121,1,93,23,77,0,205,204,52,254,81,189,136,0,180,219,138,1,143,18,94,0,204,43,140,254,188,175,219,0,111,98,143,255,151,63,162,255,211,50,71,254,19,146,53,0,146,45,83,254,178,82,238,255,16,133,84,255,226,198,93,255,201,97,20,255,120,118,35,255,114,50,231,255,162,229,156,255,211,26,12,0,114,39,115,255,206,212,134,0,197,217,160,255,116,129,94,254,199,215,219,255,75,223,249,1,253,116,181,255,232,215,104,255,228,130,246,255,185,117,86,0,14,5,8,0,239,29,61,1,237,87,133,255,125,146,137,254,204,168,223,0,46,168,245,0,154,105,22,0,220,212,161,255,107,69,24,255,137,218,181,255,241,84,198,255,130,122,211,255,141,8,153,255,190,177,118,0,96,89,178,0,255,16,48,254,122,96,105,255,117,54,232,255,34,126,105,255,204,67,166,0,232,52,138,255,211,147,12,0,25,54,7,0,44,15,215,254,51,236,45,0,190,68,129,1,106,147,225,0,28,93,45,254,236,141,15,255,17,61,161,0,220,115,192,0,236,145,24,254,111,168,169,0,224,58,63,255,127,164,188,0,82,234,75,1,224,158,134,0,209,68,110,1,217,166,217,0,70,225,166,1,187,193,143,255,16,7,88,255,10,205,140,0,117,192,156,1,17,56,38,0,27,124,108,1,171,215,55,255,95,253,212,0,155,135,168,255,246,178,153,254,154,68,74,0,232,61,96,254,105,132,59,0,33,76,199,1,189,176,130,255,9,104,25,254,75,198,102,255,233,1,112,0,108,220,20,255,114,230,70,0,140,194,133,255,57,158,164,254,146,6,80,255,169,196,97,1,85,183,130,0,70,158,222,1,59,237,234,255,96,25,26,255,232,175,97,255,11,121,248,254,88,35,194,0,219,180,252,254,74,8,227,0,195,227,73,1,184,110,161,255,49,233,164,1,128,53,47,0,82,14,121,255,193,190,58,0,48,174,117,255,132,23,32,0,40,10,134,1,22,51,25,255,240,11,176,255,110,57,146,0,117,143,239,1,157,101,118,255,54,84,76,0,205,184,18,255,47,4,72,255,78,112,85,255,193,50,66,1,93,16,52,255,8,105,134,0,12,109,72,255,58,156,251,0,144,35,204,0,44,160,117,254,50,107,194,0,1,68,165,255,111,110,162,0,158,83,40,254,76,214,234,0,58,216,205,255,171,96,147,255,40,227,114,1,176,227,241,0,70,249,183,1,136,84,139,255,60,122,247,254,143,9,117,255,177,174,137,254,73,247,143,0,236,185,126,255,62,25,247,255,45,64,56,255,161,244,6,0,34,57,56,1,105,202,83,0,128,147,208,0,6,103,10,255,74,138,65,255,97,80,100,255,214,174,33,255,50,134,74,255,110,151,130,254,111,84,172,0,84,199,75,254,248,59,112,255,8,216,178,1,9,183,95,0,238,27,8,254,170,205,220,0,195,229,135,0,98,76,237,255,226,91,26,1,82,219,39,255,225,190,199,1,217,200,121,255,81,179,8,255,140,65,206,0,178,207,87,254,250,252,46,255,104,89,110,1,253,189,158,255,144,214,158,255,160,245,54,255,53,183,92,1,21,200,194,255,146,33,113,1,209,1,255,0,235,106,43,255,167,52,232,0,157,229,221,0,51,30,25,0,250,221,27,1,65,147,87,255,79,123,196,0,65,196,223,255,76,44,17,1,85,241,68,0,202,183,249,255,65,212,212,255,9,33,154,1,71,59,80,0,175,194,59,255,141,72,9,0,100,160,244,0,230,208,56,0,59,25,75,254,80,194,194,0,18,3,200,254,160,159,115,0,132,143,247,1,111,93,57,255,58,237,11,1,134,222,135,255,122,163,108,1,123,43,190,255,251,189,206,254,80,182,72,255,208,246,224,1,17,60,9,0,161,207,38,0,141,109,91,0,216,15,211,255,136,78,110,0,98,163,104,255,21,80,121,255,173,178,183,1,127,143,4,0,104,60,82,254,214,16,13,255,96,238,33,1,158,148,230,255,127,129,62,255,51,255,210,255,62,141,236,254,157,55,224,255,114,39,244,0,192,188,250,255,228,76,53,0,98,84,81,255,173,203,61,254,147,50,55,255,204,235,191,0,52,197,244,0,88,43,211,254,27,191,119,0,188,231,154,0,66,81,161,0,92,193,160,1,250,227,120,0,123,55,226,0,184,17,72,0,133,168,10,254,22,135,156,255,41,25,103,255,48,202,58,0,186,149,81,255,188,134,239,0,235,181,189,254,217,139,188,255,74,48,82,0,46,218,229,0,189,253,251,0,50,229,12,255,211,141,191,1,128,244,25,255,169,231,122,254,86,47,189,255,132,183,23,255,37,178,150,255,51,137,253,0,200,78,31,0,22,105,50,0,130,60,0,0,132,163,91,254,23,231,187,0,192,79,239,0,157,102,164,255,192,82,20,1,24,181,103,255,240,9,234,0,1,123,164,255,133,233,0,255,202,242,242,0,60,186,245,0,241,16,199,255,224,116,158,254,191,125,91,255,224,86,207,0,121,37,231,255,227,9,198,255,15,153,239,255,121,232,217,254,75,112,82,0,95,12,57,254,51,214,105,255,148,220,97,1,199,98,36,0,156,209,12,254,10,212,52,0,217,180,55,254,212,170,232,255,216,20,84,255,157,250,135,0,157,99,127,254,1,206,41,0,149,36,70,1,54,196,201,255,87,116,0,254,235,171,150,0,27,163,234,0,202,135,180,0,208,95,0,254,123,156,93,0,183,62,75,0,137,235,182,0,204,225,255,255,214,139,210,255,2,115,8,255,29,12,111,0,52,156,1,0,253,21,251,255,37,165,31,254,12,130,211,0,106,18,53,254,42,99,154,0,14,217,61,254,216,11,92,255,200,197,112,254,147,38,199,0,36,252,120,254,107,169,77,0,1,123,159,255,207,75,102,0,163,175,196,0,44,1,240,0,120,186,176,254,13,98,76,255,237,124,241,255,232,146,188,255,200,96,224,0,204,31,41,0,208,200,13,0,21,225,96,255,175,156,196,0,247,208,126,0,62,184,244,254,2,171,81,0,85,115,158,0,54,64,45,255,19,138,114,0,135,71,205,0,227,47,147,1,218,231,66,0,253,209,28,0,244,15,173,255,6,15,118,254,16,150,208,255,185,22,50,255,86,112,207,255,75,113,215,1,63,146,43,255,4,225,19,254,227,23,62,255,14,255,214,254,45,8,205,255,87,197,151,254,210,82,215,255,245,248,247,255,128,248,70,0,225,247,87,0,90,120,70,0,213,245,92,0,13,133,226,0,47,181,5,1,92,163,105,255,6,30,133,254,232,178,61,255,230,149,24,255,18,49,158,0,228,100,61,254,116,243,251,255,77,75,92,1,81,219,147,255,76,163,254,254,141,213,246,0,232,37,152,254,97,44,100,0,201,37,50,1,212,244,57,0,174,171,183,255,249,74,112,0,166,156,30,0,222,221,97,255,243,93,73,254,251,101,100,255,216,217,93,255,254,138,187,255,142,190,52,255,59,203,177,255,200,94,52,0,115,114,158,255,165,152,104,1,126,99,226,255,118,157,244,1,107,200,16,0,193,90,229,0,121,6,88,0,156,32,93,254,125,241,211,255,14,237,157,255,165,154,21,255,184,224,22,255,250,24,152,255,113,77,31,0,247,171,23,255,237,177,204,255,52,137,145,255,194,182,114,0,224,234,149,0,10,111,103,1,201,129,4,0,238,142,78,0,52,6,40,255,110,213,165,254,60,207,253,0,62,215,69,0,96,97,0,255,49,45,202,0,120,121,22,255,235,139,48,1,198,45,34,255,182,50,27,1,131,210,91,255,46,54,128,0,175,123,105,255,198,141,78,254,67,244,239,255,245,54,103,254,78,38,242,255,2,92,249,254,251,174,87,255,139,63,144,0,24,108,27,255,34,102,18,1,34,22,152,0,66,229,118,254,50,143,99,0,144,169,149,1,118,30,152,0,178,8,121,1,8,159,18,0,90,101,230,255,129,29,119,0,68,36,11,1,232,183,55,0,23,255,96,255,161,41,193,255,63,139,222,0,15,179,243,0,255,100,15,255,82,53,135,0,137,57,149,1,99,240,170,255,22,230,228,254,49,180,82,255,61,82,43,0,110,245,217,0,199,125,61,0,46,253,52,0,141,197,219,0,211,159,193,0,55,121,105,254,183,20,129,0,169,119,170,255,203,178,139,255,135,40,182,255,172,13,202,255,65,178,148,0,8,207,43,0,122,53,127,1,74,161,48,0,227,214,128,254,86,11,243,255,100,86,7,1,245,68,134,255,61,43,21,1,152,84,94,255,190,60,250,254,239,118,232,255,214,136,37,1,113,76,107,255,93,104,100,1,144,206,23,255,110,150,154,1,228,103,185,0,218,49,50,254,135,77,139,255,185,1,78,0,0,161,148,255,97,29,233,255,207,148,149,255,160,168,0,0,91,128,171,255,6,28,19,254,11,111,247,0,39,187,150,255,138,232,149,0,117,62,68,255,63,216,188,255,235,234,32,254,29,57,160,255,25,12,241,1,169,60,191,0,32,131,141,255,237,159,123,255,94,197,94,254,116,254,3,255,92,179,97,254,121,97,92,255,170,112,14,0,21,149,248,0,248,227,3,0,80,96,109,0,75,192,74,1,12,90,226,255,161,106,68,1,208,114,127,255,114,42,255,254,74,26,74,255,247,179,150,254,121,140,60,0,147,70,200,255,214,40,161,255,161,188,201,255,141,65,135,255,242,115,252,0,62,47,202,0,180,149,255,254,130,55,237,0,165,17,186,255,10,169,194,0,156,109,218,255,112,140,123,255,104,128,223,254,177,142,108,255,121,37,219,255,128,77,18,255,111,108,23,1,91,192,75,0,174,245,22,255,4,236,62,255,43,64,153,1,227,173,254,0,237,122,132,1,127,89,186,255,142,82,128,254,252,84,174,0,90,179,177,1,243,214,87,255,103,60,162,255,208,130,14,255,11,130,139,0,206,129,219,255,94,217,157,255,239,230,230,255,116,115,159,254,164,107,95,0,51,218,2,1,216,125,198,255,140,202,128,254,11,95,68,255,55,9,93,254,174,153,6,255,204,172,96,0,69,160,110,0,213,38,49,254,27,80,213,0,118,125,114,0,70,70,67,255,15,142,73,255,131,122,185,255,243,20,50,254,130,237,40,0,210,159,140,1,197,151,65,255,84,153,66,0,195,126,90,0,16,238,236,1,118,187,102,255,3,24,133,255,187,69,230,0,56,197,92,1,213,69,94,255,80,138,229,1,206,7,230,0,222,111,230,1,91,233,119,255,9,89,7,1,2,98,1,0,148,74,133,255,51,246,180,255,228,177,112,1,58,189,108,255,194,203,237,254,21,209,195,0,147,10,35,1,86,157,226,0,31,163,139,254,56,7,75,255,62,90,116,0,181,60,169,0,138,162,212,254,81,167,31,0,205,90,112,255,33,112,227,0,83,151,117,1,177,224,73,255,174,144,217,255,230,204,79,255,22,77,232,255,114,78,234,0,224,57,126,254,9,49,141,0,242,147,165,1,104,182,140,255,167,132,12,1,123,68,127,0,225,87,39,1,251,108,8,0,198,193,143,1,121,135,207,255,172,22,70,0,50,68,116,255,101,175,40,255,248,105,233,0,166,203,7,0,110,197,218,0,215,254,26,254,168,226,253,0,31,143,96,0,11,103,41,0,183,129,203,254,100,247,74,255,213,126,132,0,210,147,44,0,199,234,27,1,148,47,181,0,155,91,158,1,54,105,175,255,2,78,145,254,102,154,95,0,128,207,127,254,52,124,236,255,130,84,71,0,221,243,211,0,152,170,207,0,222,106,199,0,183,84,94,254,92,200,56,255,138,182,115,1,142,96,146,0,133,136,228,0,97,18,150,0,55,251,66,0,140,102,4,0,202,103,151,0,30,19,248,255,51,184,207,0,202,198,89,0,55,197,225,254,169,95,249,255,66,65,68,255,188,234,126,0,166,223,100,1,112,239,244,0,144,23,194,0,58,39,182,0,244,44,24,254,175,68,179,255,152,118,154,1,176,162,130,0,217,114,204,254,173,126,78,255,33,222,30,255,36,2,91,255,2,143,243,0,9,235,215,0,3,171,151,1,24,215,245,255,168,47,164,254,241,146,207,0,69,129,180,0,68,243,113,0,144,53,72,254,251,45,14,0,23,110,168,0,68,68,79,255,110,70,95,254,174,91,144,255,33,206,95,255,137,41,7,255,19,187,153,254,35,255,112,255,9,145,185,254,50,157,37,0,11,112,49,1,102,8,190,255,234,243,169,1,60,85,23,0,74,39,189,0,116,49,239,0,173,213,210,0,46,161,108,255,159,150,37,0,196,120,185,255,34,98,6,255,153,195,62,255,97,230,71,255,102,61,76,0,26,212,236,255,164,97,16,0,198,59,146,0,163,23,196,0,56,24,61,0,181,98,193,0,251,147,229,255,98,189,24,255,46,54,206,255,234,82,246,0,183,103,38,1,109,62,204,0,10,240,224,0,146,22,117,255,142,154,120,0,69,212,35,0,208,99,118,1,121,255,3,255,72,6,194,0,117,17,197,255,125,15,23,0,154,79,153,0,214,94,197,255,185,55,147,255,62,254,78,254,127,82,153,0,110,102,63,255,108,82,161,255,105,187,212,1,80,138,39,0,60,255,93,255,72,12,186,0,210,251,31,1,190,167,144,255,228,44,19,254,128,67,232,0,214,249,107,254,136,145,86,255,132,46,176,0,189,187,227,255,208,22,140,0,217,211,116,0,50,81,186,254,139,250,31,0,30,64,198,1,135,155,100,0,160,206,23,254,187,162,211,255,16,188,63,0,254,208,49,0,85,84,191,0,241,192,242,255,153,126,145,1,234,162,162,255,230,97,216,1,64,135,126,0,190,148,223,1,52,0,43,255,28,39,189,1,64,136,238,0,175,196,185,0,98,226,213,255,127,159,244,1,226,175,60,0,160,233,142,1,180,243,207,255,69,152,89,1,31,101,21,0,144,25,164,254,139,191,209,0,91,25,121,0,32,147,5,0,39,186,123,255,63,115,230,255,93,167,198,255,143,213,220,255,179,156,19,255,25,66,122,0,214,160,217,255,2,45,62,255,106,79,146,254,51,137,99,255,87,100,231,255,175,145,232,255,101,184,1,255,174,9,125,0,82,37,161,1,36,114,141,255,48,222,142,255,245,186,154,0,5,174,221,254,63,114,155,255,135,55,160,1,80,31,135,0,126,250,179,1,236,218,45,0,20,28,145,1,16,147,73,0,249,189,132,1,17,189,192,255,223,142,198,255,72,20,15,255,250,53,237,254,15,11,18,0,27,211,113,254,213,107,56,255,174,147,146,255,96,126,48,0,23,193,109,1,37,162,94,0,199,157,249,254,24,128,187,255,205,49,178,254,93,164,42,255,43,119,235,1,88,183,237,255,218,210,1,255,107,254,42,0,230,10,99,255,162,0,226,0,219,237,91,0,129,178,203,0,208,50,95,254,206,208,95,255,247,191,89,254,110,234,79,255,165,61,243,0,20,122,112,255,246,246,185,254,103,4,123,0,233,99,230,1,219,91,252,255,199,222,22,255,179,245,233,255,211,241,234,0,111,250,192,255,85,84,136,0,101,58,50,255,131,173,156,254,119,45,51,255,118,233,16,254,242,90,214,0,94,159,219,1,3,3,234,255,98,76,92,254,80,54,230,0,5,228,231,254,53,24,223,255,113,56,118,1,20,132,1,255,171,210,236,0,56,241,158,255,186,115,19,255,8,229,174,0,48,44,0,1,114,114,166,255,6,73,226,255,205,89,244,0,137,227,75,1,248,173,56,0,74,120,246,254,119,3,11,255,81,120,198,255,136,122,98,255,146,241,221,1,109,194,78,255,223,241,70,1,214,200,169,255,97,190,47,255,47,103,174,255,99,92,72,254,118,233,180,255,193,35,233,254,26,229,32,255,222,252,198,0,204,43,71,255,199,84,172,0,134,102,190,0,111,238,97,254,230,40,230,0,227,205,64,254,200,12,225,0,166,25,222,0,113,69,51,255,143,159,24,0,167,184,74,0,29,224,116,254,158,208,233,0,193,116,126,255,212,11,133,255,22,58,140,1,204,36,51,255,232,30,43,0,235,70,181,255,64,56,146,254,169,18,84,255,226,1,13,255,200,50,176,255,52,213,245,254,168,209,97,0,191,71,55,0,34,78,156,0,232,144,58,1,185,74,189,0,186,142,149,254,64,69,127,255,161,203,147,255,176,151,191,0,136,231,203,254,163,182,137,0,161,126,251,254,233,32,66,0,68,207,66,0,30,28,37,0,93,114,96,1,254,92,247,255,44,171,69,0,202,119,11,255,188,118,50,1,255,83,136,255,71,82,26,0,70,227,2,0,32,235,121,1,181,41,154,0,71,134,229,254,202,255,36,0,41,152,5,0,154,63,73,255,34,182,124,0,121,221,150,255,26,204,213,1,41,172,87,0,90,157,146,255,109,130,20,0,71,107,200,255,243,102,189,0,1,195,145,254,46,88,117,0,8,206,227,0,191,110,253,255,109,128,20,254,134,85,51,255,137,177,112,1,216,34,22,255,131,16,208,255,121,149,170,0,114,19,23,1,166,80,31,255,113,240,122,0,232,179,250,0,68,110,180,254,210,170,119,0,223,108,164,255,207,79,233,255,27,229,226,254,209,98,81,255,79,68,7,0,131,185,100,0,170,29,162,255,17,162,107,255,57,21,11,1,100,200,181,255,127,65,166,1,165,134,204,0,104,167,168,0,1,164,79,0,146,135,59,1,70,50,128,255,102,119,13,254,227,6,135,0,162,142,179,255,160,100,222,0,27,224,219,1,158,93,195,255,234,141,137,0,16,24,125,255,238,206,47,255,97,17,98,255,116,110,12,255,96,115,77,0,91,227,232,255,248,254,79,255,92,229,6,254,88,198,139,0,206,75,129,0,250,77,206,255,141,244,123,1,138,69,220,0,32,151,6,1,131,167,22,255,237,68,167,254,199,189,150,0,163,171,138,255,51,188,6,255,95,29,137,254,148,226,179,0,181,107,208,255,134,31,82,255,151,101,45,255,129,202,225,0,224,72,147,0,48,138,151,255,195,64,206,254,237,218,158,0,106,29,137,254,253,189,233,255,103,15,17,255,194,97,255,0,178,45,169,254,198,225,155,0,39,48,117,255,135,106,115,0,97,38,181,0,150,47,65,255,83,130,229,254,246,38,129,0,92,239,154,254,91,99,127,0,161,111,33,255,238,217,242,255,131,185,195,255,213,191,158,255,41,150,218,0,132,169,131,0,89,84,252,1,171,70,128,255,163,248,203,254,1,50,180,255,124,76,85,1,251,111,80,0,99,66,239,255,154,237,182,255,221,126,133,254,74,204,99,255,65,147,119,255,99,56,167,255,79,248,149,255,116,155,228,255,237,43,14,254,69,137,11,255,22,250,241,1,91,122,143,255,205,249,243,0,212,26,60,255,48,182,176,1,48,23,191,255,203,121,152,254,45,74,213,255,62,90,18,254,245,163,230,255,185,106,116,255,83,35,159,0,12,33,2,255,80,34,62,0,16,87,174,255,173,101,85,0,202,36,81,254,160,69,204,255,64,225,187,0,58,206,94,0,86,144,47,0,229,86,245,0,63,145,190,1,37,5,39,0,109,251,26,0,137,147,234,0,162,121,145,255,144,116,206,255,197,232,185,255,183,190,140,255,73,12,254,255,139,20,242,255,170,90,239,255,97,66,187,255,245,181,135,254,222,136,52,0,245,5,51,254,203,47,78,0,152,101,216,0,73,23,125,0,254,96,33,1,235,210,73,255,43,209,88,1,7,129,109,0,122,104,228,254,170,242,203,0,242,204,135,255,202,28,233,255,65,6,127,0,159,144,71,0,100,140,95,0,78,150,13,0,251,107,118,1,182,58,125,255,1,38,108,255,141,189,209,255,8,155,125,1,113,163,91,255,121,79,190,255,134,239,108,255,76,47,248,0,163,228,239,0,17,111,10,0,88,149,75,255,215,235,239,0,167,159,24,255,47,151,108,255,107,209,188,0,233,231,99,254,28,202,148,255,174,35,138,255,110,24,68,255,2,69,181,0,107,102,82,0,102,237,7,0,92,36,237,255,221,162,83,1,55,202,6,255,135,234,135,255,24,250,222,0,65,94,168,254,245,248,210,255,167,108,201,254,255,161,111,0,205,8,254,0,136,13,116,0,100,176,132,255,43,215,126,255,177,133,130,255,158,79,148,0,67,224,37,1,12,206,21,255,62,34,110,1,237,104,175,255,80,132,111,255,142,174,72,0,84,229,180,254,105,179,140,0,64,248,15,255,233,138,16,0,245,67,123,254,218,121,212,255,63,95,218,1,213,133,137,255,143,182,82,255,48,28,11,0,244,114,141,1,209,175,76,255,157,181,150,255,186,229,3,255,164,157,111,1,231,189,139,0,119,202,190,255,218,106,64,255,68,235,63,254,96,26,172,255,187,47,11,1,215,18,251,255,81,84,89,0,68,58,128,0,94,113,5,1,92,129,208,255,97,15,83,254,9,28,188,0,239,9,164,0,60,205,152,0,192,163,98,255,184,18,60,0,217,182,139,0,109,59,120,255,4,192,251,0,169,210,240,255,37,172,92,254,148,211,245,255,179,65,52,0,253,13,115,0,185,174,206,1,114,188,149,255,237,90,173,0,43,199,192,255,88,108,113,0,52,35,76,0,66,25,148,255,221,4,7,255,151,241,114,255,190,209,232,0,98,50,199,0,151,150,213,255,18,74,36,1,53,40,7,0,19,135,65,255,26,172,69,0,174,237,85,0,99,95,41,0,3,56,16,0,39,160,177,255,200,106,218,254,185,68,84,255,91,186,61,254,67,143,141,255,13,244,166,255,99,114,198,0,199,110,163,255,193,18,186,0,124,239,246,1,110,68,22,0,2,235,46,1,212,60,107,0,105,42,105,1,14,230,152,0,7,5,131,0,141,104,154,255,213,3,6,0,131,228,162,255,179,100,28,1,231,123,85,255,206,14,223,1,253,96,230,0,38,152,149,1,98,137,122,0,214,205,3,255,226,152,179,255,6,133,137,0,158,69,140,255,113,162,154,255,180,243,172,255,27,189,115,255,143,46,220,255,213,134,225,255,126,29,69,0,188,43,137,1,242,70,9,0,90,204,255,255,231,170,147,0,23,56,19,254,56,125,157,255,48,179,218,255,79,182,253,255,38,212,191,1,41,235,124,0,96,151,28,0,135,148,190,0,205,249,39,254,52,96,136,255,212,44,136,255,67,209,131,255,252,130,23,255,219,128,20,255,198,129,118,0,108,101,11,0,178,5,146,1,62,7,100,255,181,236,94,254,28,26,164,0,76,22,112,255,120,102,79,0,202,192,229,1,200,176,215,0,41,64,244,255,206,184,78,0,167,45,63,1,160,35,0,255,59,12,142,255,204,9,144,255,219,94,229,1,122,27,112,0,189,105,109,255,64,208,74,255,251,127,55,1,2,226,198,0,44,76,209,0,151,152,77,255,210,23,46,1,201,171,69,255,44,211,231,0,190,37,224,255,245,196,62,255,169,181,222,255,34,211,17,0,119,241,197,255,229,35,152,1,21,69,40,255,178,226,161,0,148,179,193,0,219,194,254,1,40,206,51,255,231,92,250,1,67,153,170,0,21,148,241,0,170,69,82,255,121,18,231,255,92,114,3,0,184,62,230,0,225,201,87,255,146,96,162,255,181,242,220,0,173,187,221,1,226,62,170,255,56,126,217,1,117,13,227,255,179,44,239,0,157,141,155,255,144,221,83,0,235,209,208,0,42,17,165,1,251,81,133,0,124,245,201,254,97,211,24,255,83,214,166,0,154,36,9,255,248,47,127,0,90,219,140,255,161,217,38,254,212,147,63,255,66,84,148,1,207,3,1,0,230,134,89,1,127,78,122,255,224,155,1,255,82,136,74,0,178,156,208,255,186,25,49,255,222,3,210,1,229,150,190,255,85,162,52,255,41,84,141,255,73,123,84,254,93,17,150,0,119,19,28,1,32,22,215,255,28,23,204,255,142,241,52,255,228,52,125,0,29,76,207,0,215,167,250,254,175,164,230,0,55,207,105,1,109,187,245,255,161,44,220,1,41,101,128,255,167,16,94,0,93,214,107,255,118,72,0,254,80,61,234,255,121,175,125,0,139,169,251,0,97,39,147,254,250,196,49,255,165,179,110,254,223,70,187,255,22,142,125,1,154,179,138,255,118,176,42,1,10,174,153,0,156,92,102,0,168,13,161,255,143,16,32,0,250,197,180,255,203,163,44,1,87,32,36,0,161,153,20,255,123,252,15,0,25,227,80,0,60,88,142,0,17,22,201,1,154,205,77,255,39,63,47,0,8,122,141,0,128,23,182,254,204,39,19,255,4,112,29,255,23,36,140,255,210,234,116,254,53,50,63,255,121,171,104,255,160,219,94,0,87,82,14,254,231,42,5,0,165,139,127,254,86,78,38,0,130,60,66,254,203,30,45,255,46,196,122,1,249,53,162,255,136,143,103,254,215,210,114,0,231,7,160,254,169,152,42,255,111,45,246,0,142,131,135,255,131,71,204,255,36,226,11,0,0,28,242,255,225,138,213,255,247,46,216,254,245,3,183,0,108,252,74,1,206,26,48,255,205,54,246,255,211,198,36,255,121,35,50,0,52,216,202,255,38,139,129,254,242,73,148,0,67,231,141,255,42,47,204,0,78,116,25,1,4,225,191,255,6,147,228,0,58,88,177,0,122,165,229,255,252,83,201,255,224,167,96,1,177,184,158,255,242,105,179,1,248,198,240,0,133,66,203,1,254,36,47,0,45,24,115,255,119,62,254,0,196,225,186,254,123,141,172,0,26,85,41,255,226,111,183,0,213,231,151,0,4,59,7,255,238,138,148,0,66,147,33,255,31,246,141,255,209,141,116,255,104,112,31,0,88,161,172,0,83,215,230,254,47,111,151,0,45,38,52,1,132,45,204,0,138,128,109,254,233,117,134,255,243,190,173,254,241,236,240,0,82,127,236,254,40,223,161,255,110,182,225,255,123,174,239,0,135,242,145,1,51,209,154,0,150,3,115,254,217,164,252,255,55,156,69,1,84,94,255,255,232,73,45,1,20,19,212,255,96,197,59,254,96,251,33,0,38,199,73,1,64,172,247,255,117,116,56,255,228,17,18,0,62,138,103,1,246,229,164,255,244,118,201,254,86,32,159,255,109,34,137,1,85,211,186,0,10,193,193,254,122,194,177,0,122,238,102,255,162,218,171,0,108,217,161,1,158,170,34,0,176,47,155,1,181,228,11,255,8,156,0,0,16,75,93,0,206,98,255,1,58,154,35,0,12,243,184,254,67,117,66,255,230,229,123,0,201,42,110], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+20480);
/* memory initializer */ allocate([134,228,178,254,186,108,118,255,58,19,154,255,82,169,62,255,114,143,115,1,239,196,50,255,173,48,193,255,147,2,84,255,150,134,147,254,95,232,73,0,109,227,52,254,191,137,10,0,40,204,30,254,76,52,97,255,164,235,126,0,254,124,188,0,74,182,21,1,121,29,35,255,241,30,7,254,85,218,214,255,7,84,150,254,81,27,117,255,160,159,152,254,66,24,221,255,227,10,60,1,141,135,102,0,208,189,150,1,117,179,92,0,132,22,136,255,120,199,28,0,21,129,79,254,182,9,65,0,218,163,169,0,246,147,198,255,107,38,144,1,78,175,205,255,214,5,250,254,47,88,29,255,164,47,204,255,43,55,6,255,131,134,207,254,116,100,214,0,96,140,75,1,106,220,144,0,195,32,28,1,172,81,5,255,199,179,52,255,37,84,203,0,170,112,174,0,11,4,91,0,69,244,27,1,117,131,92,0,33,152,175,255,140,153,107,255,251,135,43,254,87,138,4,255,198,234,147,254,121,152,84,255,205,101,155,1,157,9,25,0,72,106,17,254,108,153,0,255,189,229,186,0,193,8,176,255,174,149,209,0,238,130,29,0,233,214,126,1,61,226,102,0,57,163,4,1,198,111,51,255,45,79,78,1,115,210,10,255,218,9,25,255,158,139,198,255,211,82,187,254,80,133,83,0,157,129,230,1,243,133,134,255,40,136,16,0,77,107,79,255,183,85,92,1,177,204,202,0,163,71,147,255,152,69,190,0,172,51,188,1,250,210,172,255,211,242,113,1,89,89,26,255,64,66,111,254,116,152,42,0,161,39,27,255,54,80,254,0,106,209,115,1,103,124,97,0,221,230,98,255,31,231,6,0,178,192,120,254,15,217,203,255,124,158,79,0,112,145,247,0,92,250,48,1,163,181,193,255,37,47,142,254,144,189,165,255,46,146,240,0,6,75,128,0,41,157,200,254,87,121,213,0,1,113,236,0,5,45,250,0,144,12,82,0,31,108,231,0,225,239,119,255,167,7,189,255,187,228,132,255,110,189,34,0,94,44,204,1,162,52,197,0,78,188,241,254,57,20,141,0,244,146,47,1,206,100,51,0,125,107,148,254,27,195,77,0,152,253,90,1,7,143,144,255,51,37,31,0,34,119,38,255,7,197,118,0,153,188,211,0,151,20,116,254,245,65,52,255,180,253,110,1,47,177,209,0,161,99,17,255,118,222,202,0,125,179,252,1,123,54,126,255,145,57,191,0,55,186,121,0,10,243,138,0,205,211,229,255,125,156,241,254,148,156,185,255,227,19,188,255,124,41,32,255,31,34,206,254,17,57,83,0,204,22,37,255,42,96,98,0,119,102,184,1,3,190,28,0,110,82,218,255,200,204,192,255,201,145,118,0,117,204,146,0,132,32,98,1,192,194,121,0,106,161,248,1,237,88,124,0,23,212,26,0,205,171,90,255,248,48,216,1,141,37,230,255,124,203,0,254,158,168,30,255,214,248,21,0,112,187,7,255,75,133,239,255,74,227,243,255,250,147,70,0,214,120,162,0,167,9,179,255,22,158,18,0,218,77,209,1,97,109,81,255,244,33,179,255,57,52,57,255,65,172,210,255,249,71,209,255,142,169,238,0,158,189,153,255,174,254,103,254,98,33,14,0,141,76,230,255,113,139,52,255,15,58,212,0,168,215,201,255,248,204,215,1,223,68,160,255,57,154,183,254,47,231,121,0,106,166,137,0,81,136,138,0,165,43,51,0,231,139,61,0,57,95,59,254,118,98,25,255,151,63,236,1,94,190,250,255,169,185,114,1,5,250,58,255,75,105,97,1,215,223,134,0,113,99,163,1,128,62,112,0,99,106,147,0,163,195,10,0,33,205,182,0,214,14,174,255,129,38,231,255,53,182,223,0,98,42,159,255,247,13,40,0,188,210,177,1,6,21,0,255,255,61,148,254,137,45,129,255,89,26,116,254,126,38,114,0,251,50,242,254,121,134,128,255,204,249,167,254,165,235,215,0,202,177,243,0,133,141,62,0,240,130,190,1,110,175,255,0,0,20,146,1,37,210,121,255,7,39,130,0,142,250,84,255,141,200,207,0,9,95,104,255,11,244,174,0,134,232,126,0,167,1,123,254,16,193,149,255,232,233,239,1,213,70,112,255,252,116,160,254,242,222,220,255,205,85,227,0,7,185,58,0,118,247,63,1,116,77,177,255,62,245,200,254,63,18,37,255,107,53,232,254,50,221,211,0,162,219,7,254,2,94,43,0,182,62,182,254,160,78,200,255,135,140,170,0,235,184,228,0,175,53,138,254,80,58,77,255,152,201,2,1,63,196,34,0,5,30,184,0,171,176,154,0,121,59,206,0,38,99,39,0,172,80,77,254,0,134,151,0,186,33,241,254,94,253,223,255,44,114,252,0,108,126,57,255,201,40,13,255,39,229,27,255,39,239,23,1,151,121,51,255,153,150,248,0,10,234,174,255,118,246,4,254,200,245,38,0,69,161,242,1,16,178,150,0,113,56,130,0,171,31,105,0,26,88,108,255,49,42,106,0,251,169,66,0,69,93,149,0,20,57,254,0,164,25,111,0,90,188,90,255,204,4,197,0,40,213,50,1,212,96,132,255,88,138,180,254,228,146,124,255,184,246,247,0,65,117,86,255,253,102,210,254,254,121,36,0,137,115,3,255,60,24,216,0,134,18,29,0,59,226,97,0,176,142,71,0,7,209,161,0,189,84,51,254,155,250,72,0,213,84,235,255,45,222,224,0,238,148,143,255,170,42,53,255,78,167,117,0,186,0,40,255,125,177,103,255,69,225,66,0,227,7,88,1,75,172,6,0,169,45,227,1,16,36,70,255,50,2,9,255,139,193,22,0,143,183,231,254,218,69,50,0,236,56,161,1,213,131,42,0,138,145,44,254,136,229,40,255,49,63,35,255,61,145,245,255,101,192,2,254,232,167,113,0,152,104,38,1,121,185,218,0,121,139,211,254,119,240,35,0,65,189,217,254,187,179,162,255,160,187,230,0,62,248,14,255,60,78,97,0,255,247,163,255,225,59,91,255,107,71,58,255,241,47,33,1,50,117,236,0,219,177,63,254,244,90,179,0,35,194,215,255,189,67,50,255,23,135,129,0,104,189,37,255,185,57,194,0,35,62,231,255,220,248,108,0,12,231,178,0,143,80,91,1,131,93,101,255,144,39,2,1,255,250,178,0,5,17,236,254,139,32,46,0,204,188,38,254,245,115,52,255,191,113,73,254,191,108,69,255,22,69,245,1,23,203,178,0,170,99,170,0,65,248,111,0,37,108,153,255,64,37,69,0,0,88,62,254,89,148,144,255,191,68,224,1,241,39,53,0,41,203,237,255,145,126,194,255,221,42,253,255,25,99,151,0,97,253,223,1,74,115,49,255,6,175,72,255,59,176,203,0,124,183,249,1,228,228,99,0,129,12,207,254,168,192,195,255,204,176,16,254,152,234,171,0,77,37,85,255,33,120,135,255,142,194,227,1,31,214,58,0,213,187,125,255,232,46,60,255,190,116,42,254,151,178,19,255,51,62,237,254,204,236,193,0,194,232,60,0,172,34,157,255,189,16,184,254,103,3,95,255,141,233,36,254,41,25,11,255,21,195,166,0,118,245,45,0,67,213,149,255,159,12,18,255,187,164,227,1,160,25,5,0,12,78,195,1,43,197,225,0,48,142,41,254,196,155,60,255,223,199,18,1,145,136,156,0,252,117,169,254,145,226,238,0,239,23,107,0,109,181,188,255,230,112,49,254,73,170,237,255,231,183,227,255,80,220,20,0,194,107,127,1,127,205,101,0,46,52,197,1,210,171,36,255,88,3,90,255,56,151,141,0,96,187,255,255,42,78,200,0,254,70,70,1,244,125,168,0,204,68,138,1,124,215,70,0,102,66,200,254,17,52,228,0,117,220,143,254,203,248,123,0,56,18,174,255,186,151,164,255,51,232,208,1,160,228,43,255,249,29,25,1,68,190,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,144,130,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,2,0,0,0,220,130,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,244,127,0,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+30720);





/* no memory initializer */
var tempDoublePtr = STATICTOP; STATICTOP += 16;

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_bitshift64Ashr"] = _bitshift64Ashr;

   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

   
  Module["_memset"] = _memset;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function ___lock() {}

  function ___unlock() {}

  
  var SYSCALLS={varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  
   
  Module["___muldsi3"] = ___muldsi3; 
  Module["___muldi3"] = ___muldi3;

  function _llvm_stackrestore(p) {
      var self = _llvm_stacksave;
      var ret = self.LLVM_SAVEDSTACKS[p];
      self.LLVM_SAVEDSTACKS.splice(p, 1);
      Runtime.stackRestore(ret);
    }

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    } 
  Module["_sbrk"] = _sbrk;

  function _llvm_stacksave() {
      var self = _llvm_stacksave;
      if (!self.LLVM_SAVEDSTACKS) {
        self.LLVM_SAVEDSTACKS = [];
      }
      self.LLVM_SAVEDSTACKS.push(Runtime.stackSave());
      return self.LLVM_SAVEDSTACKS.length-1;
    }

  
  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy; 
  Module["_memmove"] = _memmove;


  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      // NOTE: offset_high is unused - Emscripten's off_t is 32-bit
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      // hack to support printf in NO_FILESYSTEM
      var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffer) {
        ___syscall146.buffers = [null, [], []]; // 1 => stdout, 2 => stderr
        ___syscall146.printChar = function(stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module['print'] : Module['printErr'])(UTF8ArrayToString(buffer, 0));
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(((iov)+(i*8))>>2)];
        var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr+j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
/* flush anything remaining in the buffer during shutdown */ __ATEXIT__.push(function() { var fflush = Module["_fflush"]; if (fflush) fflush(0); var printChar = ___syscall146.printChar; if (!printChar) return; var buffers = ___syscall146.buffers; if (buffers[1].length) printChar(1, 10); if (buffers[2].length) printChar(2, 10); });;
DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);

STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;

staticSealed = true; // seal the static portion of memory


function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    Module["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "enlargeMemory": enlargeMemory, "getTotalMemory": getTotalMemory, "abortOnCannotGrowMemory": abortOnCannotGrowMemory, "invoke_ii": invoke_ii, "invoke_iiii": invoke_iiii, "___lock": ___lock, "___syscall6": ___syscall6, "___setErrNo": ___setErrNo, "_llvm_stacksave": _llvm_stacksave, "___syscall140": ___syscall140, "_emscripten_memcpy_big": _emscripten_memcpy_big, "___syscall54": ___syscall54, "___unlock": ___unlock, "_llvm_stackrestore": _llvm_stackrestore, "___syscall146": ___syscall146, "DYNAMICTOP_PTR": DYNAMICTOP_PTR, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
'use asm';


  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);

  var DYNAMICTOP_PTR=env.DYNAMICTOP_PTR|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntS = 0, tempValue = 0, tempDouble = 0.0;
  var tempRet0 = 0;

  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_max=global.Math.max;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var enlargeMemory=env.enlargeMemory;
  var getTotalMemory=env.getTotalMemory;
  var abortOnCannotGrowMemory=env.abortOnCannotGrowMemory;
  var invoke_ii=env.invoke_ii;
  var invoke_iiii=env.invoke_iiii;
  var ___lock=env.___lock;
  var ___syscall6=env.___syscall6;
  var ___setErrNo=env.___setErrNo;
  var _llvm_stacksave=env._llvm_stacksave;
  var ___syscall140=env.___syscall140;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var _llvm_stackrestore=env._llvm_stackrestore;
  var ___syscall146=env.___syscall146;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS

function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _crypto_verify_32_ref($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $7 = 0, $8 = 0, $9 = 0, $and = 0, $arrayidx101 = 0, $arrayidx105 = 0, $arrayidx107 = 0, $arrayidx11 = 0, $arrayidx111 = 0, $arrayidx113 = 0, $arrayidx117 = 0, $arrayidx119 = 0, $arrayidx123 = 0, $arrayidx125 = 0, $arrayidx129 = 0, $arrayidx131 = 0, $arrayidx135 = 0, $arrayidx137 = 0, $arrayidx141 = 0;
 var $arrayidx143 = 0, $arrayidx147 = 0, $arrayidx149 = 0, $arrayidx15 = 0, $arrayidx153 = 0, $arrayidx155 = 0, $arrayidx159 = 0, $arrayidx161 = 0, $arrayidx165 = 0, $arrayidx167 = 0, $arrayidx17 = 0, $arrayidx171 = 0, $arrayidx173 = 0, $arrayidx177 = 0, $arrayidx179 = 0, $arrayidx183 = 0, $arrayidx185 = 0, $arrayidx21 = 0, $arrayidx23 = 0, $arrayidx27 = 0;
 var $arrayidx29 = 0, $arrayidx3 = 0, $arrayidx33 = 0, $arrayidx35 = 0, $arrayidx39 = 0, $arrayidx41 = 0, $arrayidx45 = 0, $arrayidx47 = 0, $arrayidx5 = 0, $arrayidx51 = 0, $arrayidx53 = 0, $arrayidx57 = 0, $arrayidx59 = 0, $arrayidx63 = 0, $arrayidx65 = 0, $arrayidx69 = 0, $arrayidx71 = 0, $arrayidx75 = 0, $arrayidx77 = 0, $arrayidx81 = 0;
 var $arrayidx83 = 0, $arrayidx87 = 0, $arrayidx89 = 0, $arrayidx9 = 0, $arrayidx93 = 0, $arrayidx95 = 0, $arrayidx99 = 0, $or104130 = 0, $or110132 = 0, $or116134 = 0, $or122136 = 0, $or128138 = 0, $or134140 = 0, $or140142 = 0, $or14100 = 0, $or146144 = 0, $or152146 = 0, $or158148 = 0, $or164150 = 0, $or170152 = 0;
 var $or176154 = 0, $or182156 = 0, $or188 = 0, $or188158 = 0, $or20102 = 0, $or26104 = 0, $or32106 = 0, $or38108 = 0, $or44110 = 0, $or50112 = 0, $or56114 = 0, $or62116 = 0, $or68118 = 0, $or74120 = 0, $or80122 = 0, $or86124 = 0, $or898 = 0, $or92126 = 0, $or98128 = 0, $shr = 0;
 var $sub = 0, $sub189 = 0, $xor103129 = 0, $xor109131 = 0, $xor115133 = 0, $xor121135 = 0, $xor127137 = 0, $xor133139 = 0, $xor139141 = 0, $xor1399 = 0, $xor145143 = 0, $xor151145 = 0, $xor157147 = 0, $xor163149 = 0, $xor169151 = 0, $xor175153 = 0, $xor181155 = 0, $xor187157 = 0, $xor19101 = 0, $xor25103 = 0;
 var $xor31105 = 0, $xor37107 = 0, $xor43109 = 0, $xor49111 = 0, $xor55113 = 0, $xor61115 = 0, $xor67117 = 0, $xor73119 = 0, $xor79121 = 0, $xor797 = 0, $xor85123 = 0, $xor91125 = 0, $xor96 = 0, $xor97127 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$x>>0]|0;
 $1 = HEAP8[$y>>0]|0;
 $xor96 = $1 ^ $0;
 $arrayidx3 = ((($x)) + 1|0);
 $2 = HEAP8[$arrayidx3>>0]|0;
 $arrayidx5 = ((($y)) + 1|0);
 $3 = HEAP8[$arrayidx5>>0]|0;
 $xor797 = $3 ^ $2;
 $or898 = $xor797 | $xor96;
 $arrayidx9 = ((($x)) + 2|0);
 $4 = HEAP8[$arrayidx9>>0]|0;
 $arrayidx11 = ((($y)) + 2|0);
 $5 = HEAP8[$arrayidx11>>0]|0;
 $xor1399 = $5 ^ $4;
 $or14100 = $or898 | $xor1399;
 $arrayidx15 = ((($x)) + 3|0);
 $6 = HEAP8[$arrayidx15>>0]|0;
 $arrayidx17 = ((($y)) + 3|0);
 $7 = HEAP8[$arrayidx17>>0]|0;
 $xor19101 = $7 ^ $6;
 $or20102 = $or14100 | $xor19101;
 $arrayidx21 = ((($x)) + 4|0);
 $8 = HEAP8[$arrayidx21>>0]|0;
 $arrayidx23 = ((($y)) + 4|0);
 $9 = HEAP8[$arrayidx23>>0]|0;
 $xor25103 = $9 ^ $8;
 $or26104 = $or20102 | $xor25103;
 $arrayidx27 = ((($x)) + 5|0);
 $10 = HEAP8[$arrayidx27>>0]|0;
 $arrayidx29 = ((($y)) + 5|0);
 $11 = HEAP8[$arrayidx29>>0]|0;
 $xor31105 = $11 ^ $10;
 $or32106 = $or26104 | $xor31105;
 $arrayidx33 = ((($x)) + 6|0);
 $12 = HEAP8[$arrayidx33>>0]|0;
 $arrayidx35 = ((($y)) + 6|0);
 $13 = HEAP8[$arrayidx35>>0]|0;
 $xor37107 = $13 ^ $12;
 $or38108 = $or32106 | $xor37107;
 $arrayidx39 = ((($x)) + 7|0);
 $14 = HEAP8[$arrayidx39>>0]|0;
 $arrayidx41 = ((($y)) + 7|0);
 $15 = HEAP8[$arrayidx41>>0]|0;
 $xor43109 = $15 ^ $14;
 $or44110 = $or38108 | $xor43109;
 $arrayidx45 = ((($x)) + 8|0);
 $16 = HEAP8[$arrayidx45>>0]|0;
 $arrayidx47 = ((($y)) + 8|0);
 $17 = HEAP8[$arrayidx47>>0]|0;
 $xor49111 = $17 ^ $16;
 $or50112 = $or44110 | $xor49111;
 $arrayidx51 = ((($x)) + 9|0);
 $18 = HEAP8[$arrayidx51>>0]|0;
 $arrayidx53 = ((($y)) + 9|0);
 $19 = HEAP8[$arrayidx53>>0]|0;
 $xor55113 = $19 ^ $18;
 $or56114 = $or50112 | $xor55113;
 $arrayidx57 = ((($x)) + 10|0);
 $20 = HEAP8[$arrayidx57>>0]|0;
 $arrayidx59 = ((($y)) + 10|0);
 $21 = HEAP8[$arrayidx59>>0]|0;
 $xor61115 = $21 ^ $20;
 $or62116 = $or56114 | $xor61115;
 $arrayidx63 = ((($x)) + 11|0);
 $22 = HEAP8[$arrayidx63>>0]|0;
 $arrayidx65 = ((($y)) + 11|0);
 $23 = HEAP8[$arrayidx65>>0]|0;
 $xor67117 = $23 ^ $22;
 $or68118 = $or62116 | $xor67117;
 $arrayidx69 = ((($x)) + 12|0);
 $24 = HEAP8[$arrayidx69>>0]|0;
 $arrayidx71 = ((($y)) + 12|0);
 $25 = HEAP8[$arrayidx71>>0]|0;
 $xor73119 = $25 ^ $24;
 $or74120 = $or68118 | $xor73119;
 $arrayidx75 = ((($x)) + 13|0);
 $26 = HEAP8[$arrayidx75>>0]|0;
 $arrayidx77 = ((($y)) + 13|0);
 $27 = HEAP8[$arrayidx77>>0]|0;
 $xor79121 = $27 ^ $26;
 $or80122 = $or74120 | $xor79121;
 $arrayidx81 = ((($x)) + 14|0);
 $28 = HEAP8[$arrayidx81>>0]|0;
 $arrayidx83 = ((($y)) + 14|0);
 $29 = HEAP8[$arrayidx83>>0]|0;
 $xor85123 = $29 ^ $28;
 $or86124 = $or80122 | $xor85123;
 $arrayidx87 = ((($x)) + 15|0);
 $30 = HEAP8[$arrayidx87>>0]|0;
 $arrayidx89 = ((($y)) + 15|0);
 $31 = HEAP8[$arrayidx89>>0]|0;
 $xor91125 = $31 ^ $30;
 $or92126 = $or86124 | $xor91125;
 $arrayidx93 = ((($x)) + 16|0);
 $32 = HEAP8[$arrayidx93>>0]|0;
 $arrayidx95 = ((($y)) + 16|0);
 $33 = HEAP8[$arrayidx95>>0]|0;
 $xor97127 = $33 ^ $32;
 $or98128 = $or92126 | $xor97127;
 $arrayidx99 = ((($x)) + 17|0);
 $34 = HEAP8[$arrayidx99>>0]|0;
 $arrayidx101 = ((($y)) + 17|0);
 $35 = HEAP8[$arrayidx101>>0]|0;
 $xor103129 = $35 ^ $34;
 $or104130 = $or98128 | $xor103129;
 $arrayidx105 = ((($x)) + 18|0);
 $36 = HEAP8[$arrayidx105>>0]|0;
 $arrayidx107 = ((($y)) + 18|0);
 $37 = HEAP8[$arrayidx107>>0]|0;
 $xor109131 = $37 ^ $36;
 $or110132 = $or104130 | $xor109131;
 $arrayidx111 = ((($x)) + 19|0);
 $38 = HEAP8[$arrayidx111>>0]|0;
 $arrayidx113 = ((($y)) + 19|0);
 $39 = HEAP8[$arrayidx113>>0]|0;
 $xor115133 = $39 ^ $38;
 $or116134 = $or110132 | $xor115133;
 $arrayidx117 = ((($x)) + 20|0);
 $40 = HEAP8[$arrayidx117>>0]|0;
 $arrayidx119 = ((($y)) + 20|0);
 $41 = HEAP8[$arrayidx119>>0]|0;
 $xor121135 = $41 ^ $40;
 $or122136 = $or116134 | $xor121135;
 $arrayidx123 = ((($x)) + 21|0);
 $42 = HEAP8[$arrayidx123>>0]|0;
 $arrayidx125 = ((($y)) + 21|0);
 $43 = HEAP8[$arrayidx125>>0]|0;
 $xor127137 = $43 ^ $42;
 $or128138 = $or122136 | $xor127137;
 $arrayidx129 = ((($x)) + 22|0);
 $44 = HEAP8[$arrayidx129>>0]|0;
 $arrayidx131 = ((($y)) + 22|0);
 $45 = HEAP8[$arrayidx131>>0]|0;
 $xor133139 = $45 ^ $44;
 $or134140 = $or128138 | $xor133139;
 $arrayidx135 = ((($x)) + 23|0);
 $46 = HEAP8[$arrayidx135>>0]|0;
 $arrayidx137 = ((($y)) + 23|0);
 $47 = HEAP8[$arrayidx137>>0]|0;
 $xor139141 = $47 ^ $46;
 $or140142 = $or134140 | $xor139141;
 $arrayidx141 = ((($x)) + 24|0);
 $48 = HEAP8[$arrayidx141>>0]|0;
 $arrayidx143 = ((($y)) + 24|0);
 $49 = HEAP8[$arrayidx143>>0]|0;
 $xor145143 = $49 ^ $48;
 $or146144 = $or140142 | $xor145143;
 $arrayidx147 = ((($x)) + 25|0);
 $50 = HEAP8[$arrayidx147>>0]|0;
 $arrayidx149 = ((($y)) + 25|0);
 $51 = HEAP8[$arrayidx149>>0]|0;
 $xor151145 = $51 ^ $50;
 $or152146 = $or146144 | $xor151145;
 $arrayidx153 = ((($x)) + 26|0);
 $52 = HEAP8[$arrayidx153>>0]|0;
 $arrayidx155 = ((($y)) + 26|0);
 $53 = HEAP8[$arrayidx155>>0]|0;
 $xor157147 = $53 ^ $52;
 $or158148 = $or152146 | $xor157147;
 $arrayidx159 = ((($x)) + 27|0);
 $54 = HEAP8[$arrayidx159>>0]|0;
 $arrayidx161 = ((($y)) + 27|0);
 $55 = HEAP8[$arrayidx161>>0]|0;
 $xor163149 = $55 ^ $54;
 $or164150 = $or158148 | $xor163149;
 $arrayidx165 = ((($x)) + 28|0);
 $56 = HEAP8[$arrayidx165>>0]|0;
 $arrayidx167 = ((($y)) + 28|0);
 $57 = HEAP8[$arrayidx167>>0]|0;
 $xor169151 = $57 ^ $56;
 $or170152 = $or164150 | $xor169151;
 $arrayidx171 = ((($x)) + 29|0);
 $58 = HEAP8[$arrayidx171>>0]|0;
 $arrayidx173 = ((($y)) + 29|0);
 $59 = HEAP8[$arrayidx173>>0]|0;
 $xor175153 = $59 ^ $58;
 $or176154 = $or170152 | $xor175153;
 $arrayidx177 = ((($x)) + 30|0);
 $60 = HEAP8[$arrayidx177>>0]|0;
 $arrayidx179 = ((($y)) + 30|0);
 $61 = HEAP8[$arrayidx179>>0]|0;
 $xor181155 = $61 ^ $60;
 $or182156 = $or176154 | $xor181155;
 $arrayidx183 = ((($x)) + 31|0);
 $62 = HEAP8[$arrayidx183>>0]|0;
 $arrayidx185 = ((($y)) + 31|0);
 $63 = HEAP8[$arrayidx185>>0]|0;
 $xor187157 = $63 ^ $62;
 $or188158 = $or182156 | $xor187157;
 $or188 = $or188158&255;
 $sub = (($or188) + 511)|0;
 $shr = $sub >>> 8;
 $and = $shr & 1;
 $sub189 = (($and) + -1)|0;
 return ($sub189|0);
}
function _curve25519_sign($signature_out,$curve25519_privkey,$msg,$msg_len) {
 $signature_out = $signature_out|0;
 $curve25519_privkey = $curve25519_privkey|0;
 $msg = $msg|0;
 $msg_len = $msg_len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $add = 0, $add$ptr = 0, $arrayidx = 0, $arrayidx6 = 0, $ed_keypair = 0, $ed_pubkey_point = 0, $or4 = 0, $sigbuf_out_len = 0, $vla = 0, $vla$alloca_mul = 0, dest = 0, label = 0;
 var sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 240|0;
 $ed_pubkey_point = sp + 8|0;
 $ed_keypair = sp + 168|0;
 $sigbuf_out_len = sp;
 $add = (($msg_len) + 64)|0;
 $0 = (_llvm_stacksave()|0);
 $vla$alloca_mul = $add;
 $vla = STACKTOP; STACKTOP = STACKTOP + ((((1*$vla$alloca_mul)|0)+15)&-16)|0;;
 $1 = $sigbuf_out_len;
 $2 = $1;
 HEAP32[$2>>2] = 0;
 $3 = (($1) + 4)|0;
 $4 = $3;
 HEAP32[$4>>2] = 0;
 dest=$ed_keypair; src=$curve25519_privkey; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 _crypto_sign_ed25519_ref10_ge_scalarmult_base($ed_pubkey_point,$curve25519_privkey);
 $add$ptr = ((($ed_keypair)) + 32|0);
 _crypto_sign_ed25519_ref10_ge_p3_tobytes($add$ptr,$ed_pubkey_point);
 $arrayidx = ((($ed_keypair)) + 63|0);
 $5 = HEAP8[$arrayidx>>0]|0;
 $6 = $5 & -128;
 (_crypto_sign_modified($vla,$sigbuf_out_len,$msg,$msg_len,0,$ed_keypair)|0);
 dest=$signature_out; src=$vla; stop=dest+64|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 $arrayidx6 = ((($signature_out)) + 63|0);
 $7 = HEAP8[$arrayidx6>>0]|0;
 $or4 = $7 | $6;
 HEAP8[$arrayidx6>>0] = $or4;
 _llvm_stackrestore(($0|0));
 STACKTOP = sp;return;
}
function _curve25519_verify($signature,$curve25519_pubkey,$msg,$msg_len) {
 $signature = $signature|0;
 $curve25519_pubkey = $curve25519_pubkey|0;
 $msg = $msg|0;
 $msg_len = $msg_len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $add = 0, $add$ptr = 0, $arrayidx = 0, $arrayidx17 = 0, $ed_pubkey = 0, $ed_y = 0, $inv_mont_x_plus_one = 0, $mont_x = 0, $mont_x_minus_one = 0, $mont_x_plus_one = 0, $one = 0, $or6 = 0, $some_retval = 0, $vla = 0;
 var $vla$alloca_mul = 0, $vla2 = 0, $vla2$alloca_mul = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 288|0;
 $mont_x = sp + 208|0;
 $mont_x_minus_one = sp + 168|0;
 $mont_x_plus_one = sp + 128|0;
 $inv_mont_x_plus_one = sp + 88|0;
 $one = sp + 48|0;
 $ed_y = sp + 8|0;
 $ed_pubkey = sp + 248|0;
 $some_retval = sp;
 $add = (($msg_len) + 64)|0;
 $0 = (_llvm_stacksave()|0);
 $vla$alloca_mul = $add;
 $vla = STACKTOP; STACKTOP = STACKTOP + ((((1*$vla$alloca_mul)|0)+15)&-16)|0;;
 $vla2$alloca_mul = $add;
 $vla2 = STACKTOP; STACKTOP = STACKTOP + ((((1*$vla2$alloca_mul)|0)+15)&-16)|0;;
 _crypto_sign_ed25519_ref10_fe_frombytes($mont_x,$curve25519_pubkey);
 _crypto_sign_ed25519_ref10_fe_1($one);
 _crypto_sign_ed25519_ref10_fe_sub($mont_x_minus_one,$mont_x,$one);
 _crypto_sign_ed25519_ref10_fe_add($mont_x_plus_one,$mont_x,$one);
 _crypto_sign_ed25519_ref10_fe_invert($inv_mont_x_plus_one,$mont_x_plus_one);
 _crypto_sign_ed25519_ref10_fe_mul($ed_y,$mont_x_minus_one,$inv_mont_x_plus_one);
 _crypto_sign_ed25519_ref10_fe_tobytes($ed_pubkey,$ed_y);
 $arrayidx = ((($signature)) + 63|0);
 $1 = HEAP8[$arrayidx>>0]|0;
 $2 = $1 & -128;
 $arrayidx17 = ((($ed_pubkey)) + 31|0);
 $3 = HEAP8[$arrayidx17>>0]|0;
 $or6 = $3 | $2;
 HEAP8[$arrayidx17>>0] = $or6;
 $4 = $1 & 127;
 HEAP8[$arrayidx>>0] = $4;
 dest=$vla; src=$signature; stop=dest+64|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 $add$ptr = ((($vla)) + 64|0);
 _memcpy(($add$ptr|0),($msg|0),($msg_len|0))|0;
 $5 = (_crypto_sign_edwards25519sha512batch_ref10_open($vla2,$some_retval,$vla,$add,0,$ed_pubkey)|0);
 _llvm_stackrestore(($0|0));
 STACKTOP = sp;return ($5|0);
}
function _crypto_hash_sha512_ref($output,$input,$0,$1) {
 $output = $output|0;
 $input = $input|0;
 $0 = $0|0;
 $1 = $1|0;
 var $ctx = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $ctx = sp;
 _sph_sha512_init($ctx);
 _sph_sha384($ctx,$input,$0);
 _sph_sha512_close($ctx,$output);
 STACKTOP = sp;return 0;
}
function _crypto_sign_modified($sm,$smlen,$m,$0,$1,$sk) {
 $sm = $sm|0;
 $smlen = $smlen|0;
 $m = $m|0;
 $0 = $0|0;
 $1 = $1|0;
 $sk = $sk|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $R = 0, $add$ptr = 0, $add$ptr1 = 0, $add$ptr2 = 0, $hram = 0, $nonce = 0, $pk = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 320|0;
 $pk = sp + 288|0;
 $nonce = sp + 224|0;
 $hram = sp + 160|0;
 $R = sp;
 $add$ptr = ((($sk)) + 32|0);
 dest=$pk; src=$add$ptr; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 $2 = (_i64Add(($0|0),($1|0),64,0)|0);
 $3 = tempRet0;
 $4 = $smlen;
 $5 = $4;
 HEAP32[$5>>2] = $2;
 $6 = (($4) + 4)|0;
 $7 = $6;
 HEAP32[$7>>2] = $3;
 $add$ptr1 = ((($sm)) + 64|0);
 _memmove(($add$ptr1|0),($m|0),($0|0))|0;
 $add$ptr2 = ((($sm)) + 32|0);
 _memmove(($add$ptr2|0),($sk|0),32)|0;
 $8 = (_i64Add(($0|0),($1|0),32,0)|0);
 $9 = tempRet0;
 (_crypto_hash_sha512_ref($nonce,$add$ptr2,$8,$9)|0);
 dest=$add$ptr2; src=$pk; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 _crypto_sign_ed25519_ref10_sc_reduce($nonce);
 _crypto_sign_ed25519_ref10_ge_scalarmult_base($R,$nonce);
 _crypto_sign_ed25519_ref10_ge_p3_tobytes($sm,$R);
 (_crypto_hash_sha512_ref($hram,$sm,$2,$3)|0);
 _crypto_sign_ed25519_ref10_sc_reduce($hram);
 _crypto_sign_ed25519_ref10_sc_muladd($add$ptr2,$hram,$sk,$nonce);
 STACKTOP = sp;return 0;
}
function _curve25519_donna($mypublic,$secret,$basepoint) {
 $mypublic = $mypublic|0;
 $secret = $secret|0;
 $basepoint = $basepoint|0;
 var $bp = 0, $e = 0, $x = 0, $z = 0, $zmone = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 368|0;
 $bp = sp + 248|0;
 $x = sp + 168|0;
 $z = sp + 80|0;
 $zmone = sp;
 $e = sp + 328|0;
 dest=$e; src=$secret; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
 _fexpand($bp,$basepoint);
 _cmult($x,$z,$e,$bp);
 _crecip($zmone,$z);
 _fmul($z,$x,$zmone);
 _fcontract($mypublic,$z);
 STACKTOP = sp;return 0;
}
function _fexpand($output,$input) {
 $output = $output|0;
 $input = $input|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0;
 var $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0;
 var $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0;
 var $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0;
 var $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arrayidx1 = 0, $arrayidx103 = 0, $arrayidx107 = 0, $arrayidx113 = 0, $arrayidx116 = 0, $arrayidx120 = 0;
 var $arrayidx124 = 0, $arrayidx130 = 0, $arrayidx133 = 0, $arrayidx137 = 0, $arrayidx14 = 0, $arrayidx141 = 0, $arrayidx147 = 0, $arrayidx150 = 0, $arrayidx154 = 0, $arrayidx158 = 0, $arrayidx164 = 0, $arrayidx18 = 0, $arrayidx22 = 0, $arrayidx28 = 0, $arrayidx3 = 0, $arrayidx31 = 0, $arrayidx35 = 0, $arrayidx39 = 0, $arrayidx45 = 0, $arrayidx48 = 0;
 var $arrayidx52 = 0, $arrayidx56 = 0, $arrayidx62 = 0, $arrayidx65 = 0, $arrayidx69 = 0, $arrayidx7 = 0, $arrayidx73 = 0, $arrayidx79 = 0, $arrayidx80 = 0, $arrayidx82 = 0, $arrayidx86 = 0, $arrayidx90 = 0, $arrayidx96 = 0, $arrayidx99 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$input>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($input)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($input)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 $arrayidx7 = ((($input)) + 3|0);
 $13 = HEAP8[$arrayidx7>>0]|0;
 $14 = $13&255;
 $15 = (_bitshift64Shl(($14|0),0,24)|0);
 $16 = tempRet0;
 $17 = $15 & 50331648;
 $18 = $11 | $17;
 $19 = $output;
 $20 = $19;
 HEAP32[$20>>2] = $18;
 $21 = (($19) + 4)|0;
 $22 = $21;
 HEAP32[$22>>2] = $12;
 $23 = HEAP8[$arrayidx7>>0]|0;
 $24 = $23&255;
 $arrayidx14 = ((($input)) + 4|0);
 $25 = HEAP8[$arrayidx14>>0]|0;
 $26 = $25&255;
 $27 = (_bitshift64Shl(($26|0),0,8)|0);
 $28 = tempRet0;
 $29 = $27 | $24;
 $arrayidx18 = ((($input)) + 5|0);
 $30 = HEAP8[$arrayidx18>>0]|0;
 $31 = $30&255;
 $32 = (_bitshift64Shl(($31|0),0,16)|0);
 $33 = tempRet0;
 $34 = $29 | $32;
 $35 = $28 | $33;
 $arrayidx22 = ((($input)) + 6|0);
 $36 = HEAP8[$arrayidx22>>0]|0;
 $37 = $36&255;
 $38 = (_bitshift64Shl(($37|0),0,24)|0);
 $39 = tempRet0;
 $40 = $34 | $38;
 $41 = $35 | $39;
 $42 = (_bitshift64Lshr(($40|0),($41|0),2)|0);
 $43 = tempRet0;
 $44 = $42 & 33554431;
 $arrayidx28 = ((($output)) + 8|0);
 $45 = $arrayidx28;
 $46 = $45;
 HEAP32[$46>>2] = $44;
 $47 = (($45) + 4)|0;
 $48 = $47;
 HEAP32[$48>>2] = 0;
 $49 = HEAP8[$arrayidx22>>0]|0;
 $50 = $49&255;
 $arrayidx31 = ((($input)) + 7|0);
 $51 = HEAP8[$arrayidx31>>0]|0;
 $52 = $51&255;
 $53 = (_bitshift64Shl(($52|0),0,8)|0);
 $54 = tempRet0;
 $55 = $53 | $50;
 $arrayidx35 = ((($input)) + 8|0);
 $56 = HEAP8[$arrayidx35>>0]|0;
 $57 = $56&255;
 $58 = (_bitshift64Shl(($57|0),0,16)|0);
 $59 = tempRet0;
 $60 = $55 | $58;
 $61 = $54 | $59;
 $arrayidx39 = ((($input)) + 9|0);
 $62 = HEAP8[$arrayidx39>>0]|0;
 $63 = $62&255;
 $64 = (_bitshift64Shl(($63|0),0,24)|0);
 $65 = tempRet0;
 $66 = $60 | $64;
 $67 = $61 | $65;
 $68 = (_bitshift64Lshr(($66|0),($67|0),3)|0);
 $69 = tempRet0;
 $70 = $68 & 67108863;
 $arrayidx45 = ((($output)) + 16|0);
 $71 = $arrayidx45;
 $72 = $71;
 HEAP32[$72>>2] = $70;
 $73 = (($71) + 4)|0;
 $74 = $73;
 HEAP32[$74>>2] = 0;
 $75 = HEAP8[$arrayidx39>>0]|0;
 $76 = $75&255;
 $arrayidx48 = ((($input)) + 10|0);
 $77 = HEAP8[$arrayidx48>>0]|0;
 $78 = $77&255;
 $79 = (_bitshift64Shl(($78|0),0,8)|0);
 $80 = tempRet0;
 $81 = $79 | $76;
 $arrayidx52 = ((($input)) + 11|0);
 $82 = HEAP8[$arrayidx52>>0]|0;
 $83 = $82&255;
 $84 = (_bitshift64Shl(($83|0),0,16)|0);
 $85 = tempRet0;
 $86 = $81 | $84;
 $87 = $80 | $85;
 $arrayidx56 = ((($input)) + 12|0);
 $88 = HEAP8[$arrayidx56>>0]|0;
 $89 = $88&255;
 $90 = (_bitshift64Shl(($89|0),0,24)|0);
 $91 = tempRet0;
 $92 = $86 | $90;
 $93 = $87 | $91;
 $94 = (_bitshift64Lshr(($92|0),($93|0),5)|0);
 $95 = tempRet0;
 $96 = $94 & 33554431;
 $arrayidx62 = ((($output)) + 24|0);
 $97 = $arrayidx62;
 $98 = $97;
 HEAP32[$98>>2] = $96;
 $99 = (($97) + 4)|0;
 $100 = $99;
 HEAP32[$100>>2] = 0;
 $101 = HEAP8[$arrayidx56>>0]|0;
 $102 = $101&255;
 $arrayidx65 = ((($input)) + 13|0);
 $103 = HEAP8[$arrayidx65>>0]|0;
 $104 = $103&255;
 $105 = (_bitshift64Shl(($104|0),0,8)|0);
 $106 = tempRet0;
 $107 = $105 | $102;
 $arrayidx69 = ((($input)) + 14|0);
 $108 = HEAP8[$arrayidx69>>0]|0;
 $109 = $108&255;
 $110 = (_bitshift64Shl(($109|0),0,16)|0);
 $111 = tempRet0;
 $112 = $107 | $110;
 $113 = $106 | $111;
 $arrayidx73 = ((($input)) + 15|0);
 $114 = HEAP8[$arrayidx73>>0]|0;
 $115 = $114&255;
 $116 = (_bitshift64Shl(($115|0),0,24)|0);
 $117 = tempRet0;
 $118 = $112 | $116;
 $119 = $113 | $117;
 $120 = (_bitshift64Lshr(($118|0),($119|0),6)|0);
 $121 = tempRet0;
 $122 = $120 & 67108863;
 $arrayidx79 = ((($output)) + 32|0);
 $123 = $arrayidx79;
 $124 = $123;
 HEAP32[$124>>2] = $122;
 $125 = (($123) + 4)|0;
 $126 = $125;
 HEAP32[$126>>2] = 0;
 $arrayidx80 = ((($input)) + 16|0);
 $127 = HEAP8[$arrayidx80>>0]|0;
 $128 = $127&255;
 $arrayidx82 = ((($input)) + 17|0);
 $129 = HEAP8[$arrayidx82>>0]|0;
 $130 = $129&255;
 $131 = (_bitshift64Shl(($130|0),0,8)|0);
 $132 = tempRet0;
 $133 = $131 | $128;
 $arrayidx86 = ((($input)) + 18|0);
 $134 = HEAP8[$arrayidx86>>0]|0;
 $135 = $134&255;
 $136 = (_bitshift64Shl(($135|0),0,16)|0);
 $137 = tempRet0;
 $138 = $133 | $136;
 $139 = $132 | $137;
 $arrayidx90 = ((($input)) + 19|0);
 $140 = HEAP8[$arrayidx90>>0]|0;
 $141 = $140&255;
 $142 = (_bitshift64Shl(($141|0),0,24)|0);
 $143 = tempRet0;
 $144 = $142 & 16777216;
 $145 = $138 | $144;
 $arrayidx96 = ((($output)) + 40|0);
 $146 = $arrayidx96;
 $147 = $146;
 HEAP32[$147>>2] = $145;
 $148 = (($146) + 4)|0;
 $149 = $148;
 HEAP32[$149>>2] = $139;
 $150 = HEAP8[$arrayidx90>>0]|0;
 $151 = $150&255;
 $arrayidx99 = ((($input)) + 20|0);
 $152 = HEAP8[$arrayidx99>>0]|0;
 $153 = $152&255;
 $154 = (_bitshift64Shl(($153|0),0,8)|0);
 $155 = tempRet0;
 $156 = $154 | $151;
 $arrayidx103 = ((($input)) + 21|0);
 $157 = HEAP8[$arrayidx103>>0]|0;
 $158 = $157&255;
 $159 = (_bitshift64Shl(($158|0),0,16)|0);
 $160 = tempRet0;
 $161 = $156 | $159;
 $162 = $155 | $160;
 $arrayidx107 = ((($input)) + 22|0);
 $163 = HEAP8[$arrayidx107>>0]|0;
 $164 = $163&255;
 $165 = (_bitshift64Shl(($164|0),0,24)|0);
 $166 = tempRet0;
 $167 = $161 | $165;
 $168 = $162 | $166;
 $169 = (_bitshift64Lshr(($167|0),($168|0),1)|0);
 $170 = tempRet0;
 $171 = $169 & 67108863;
 $arrayidx113 = ((($output)) + 48|0);
 $172 = $arrayidx113;
 $173 = $172;
 HEAP32[$173>>2] = $171;
 $174 = (($172) + 4)|0;
 $175 = $174;
 HEAP32[$175>>2] = 0;
 $176 = HEAP8[$arrayidx107>>0]|0;
 $177 = $176&255;
 $arrayidx116 = ((($input)) + 23|0);
 $178 = HEAP8[$arrayidx116>>0]|0;
 $179 = $178&255;
 $180 = (_bitshift64Shl(($179|0),0,8)|0);
 $181 = tempRet0;
 $182 = $180 | $177;
 $arrayidx120 = ((($input)) + 24|0);
 $183 = HEAP8[$arrayidx120>>0]|0;
 $184 = $183&255;
 $185 = (_bitshift64Shl(($184|0),0,16)|0);
 $186 = tempRet0;
 $187 = $182 | $185;
 $188 = $181 | $186;
 $arrayidx124 = ((($input)) + 25|0);
 $189 = HEAP8[$arrayidx124>>0]|0;
 $190 = $189&255;
 $191 = (_bitshift64Shl(($190|0),0,24)|0);
 $192 = tempRet0;
 $193 = $187 | $191;
 $194 = $188 | $192;
 $195 = (_bitshift64Lshr(($193|0),($194|0),3)|0);
 $196 = tempRet0;
 $197 = $195 & 33554431;
 $arrayidx130 = ((($output)) + 56|0);
 $198 = $arrayidx130;
 $199 = $198;
 HEAP32[$199>>2] = $197;
 $200 = (($198) + 4)|0;
 $201 = $200;
 HEAP32[$201>>2] = 0;
 $202 = HEAP8[$arrayidx124>>0]|0;
 $203 = $202&255;
 $arrayidx133 = ((($input)) + 26|0);
 $204 = HEAP8[$arrayidx133>>0]|0;
 $205 = $204&255;
 $206 = (_bitshift64Shl(($205|0),0,8)|0);
 $207 = tempRet0;
 $208 = $206 | $203;
 $arrayidx137 = ((($input)) + 27|0);
 $209 = HEAP8[$arrayidx137>>0]|0;
 $210 = $209&255;
 $211 = (_bitshift64Shl(($210|0),0,16)|0);
 $212 = tempRet0;
 $213 = $208 | $211;
 $214 = $207 | $212;
 $arrayidx141 = ((($input)) + 28|0);
 $215 = HEAP8[$arrayidx141>>0]|0;
 $216 = $215&255;
 $217 = (_bitshift64Shl(($216|0),0,24)|0);
 $218 = tempRet0;
 $219 = $213 | $217;
 $220 = $214 | $218;
 $221 = (_bitshift64Lshr(($219|0),($220|0),4)|0);
 $222 = tempRet0;
 $223 = $221 & 67108863;
 $arrayidx147 = ((($output)) + 64|0);
 $224 = $arrayidx147;
 $225 = $224;
 HEAP32[$225>>2] = $223;
 $226 = (($224) + 4)|0;
 $227 = $226;
 HEAP32[$227>>2] = 0;
 $228 = HEAP8[$arrayidx141>>0]|0;
 $229 = $228&255;
 $arrayidx150 = ((($input)) + 29|0);
 $230 = HEAP8[$arrayidx150>>0]|0;
 $231 = $230&255;
 $232 = (_bitshift64Shl(($231|0),0,8)|0);
 $233 = tempRet0;
 $234 = $232 | $229;
 $arrayidx154 = ((($input)) + 30|0);
 $235 = HEAP8[$arrayidx154>>0]|0;
 $236 = $235&255;
 $237 = (_bitshift64Shl(($236|0),0,16)|0);
 $238 = tempRet0;
 $239 = $234 | $237;
 $240 = $233 | $238;
 $arrayidx158 = ((($input)) + 31|0);
 $241 = HEAP8[$arrayidx158>>0]|0;
 $242 = $241&255;
 $243 = (_bitshift64Shl(($242|0),0,24)|0);
 $244 = tempRet0;
 $245 = $239 | $243;
 $246 = $240 | $244;
 $247 = (_bitshift64Lshr(($245|0),($246|0),6)|0);
 $248 = tempRet0;
 $249 = $247 & 33554431;
 $arrayidx164 = ((($output)) + 72|0);
 $250 = $arrayidx164;
 $251 = $250;
 HEAP32[$251>>2] = $249;
 $252 = (($250) + 4)|0;
 $253 = $252;
 HEAP32[$253>>2] = 0;
 return;
}
function _cmult($resultx,$resultz,$n,$q) {
 $resultx = $resultx|0;
 $resultz = $resultz|0;
 $n = $n|0;
 $q = $q|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $a = 0, $arrayidx = 0, $b = 0, $byte$053 = 0, $c = 0, $conv = 0, $conv13 = 0, $d = 0, $e = 0, $exitcond = 0, $exitcond64 = 0, $f = 0, $g = 0, $h = 0, $i$062 = 0, $inc = 0, $inc15 = 0, $j$052 = 0;
 var $nqpqx$063 = 0, $nqpqx$154 = 0, $nqpqx$154$phi = 0, $nqpqx2$058 = 0, $nqpqx2$148 = 0, $nqpqx2$148$phi = 0, $nqpqz$057 = 0, $nqpqz$147 = 0, $nqpqz$147$phi = 0, $nqpqz2$059 = 0, $nqpqz2$149 = 0, $nqpqz2$149$phi = 0, $nqx$055 = 0, $nqx$145 = 0, $nqx$145$phi = 0, $nqx2$060 = 0, $nqx2$150 = 0, $nqx2$150$phi = 0, $nqz$056 = 0, $nqz$146 = 0;
 var $nqz$146$phi = 0, $nqz2$061 = 0, $nqz2$151 = 0, $nqz2$151$phi = 0, $shl = 0, $shr43 = 0, $sub = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1216|0;
 $a = sp + 1064|0;
 $b = sp + 912|0;
 $c = sp + 760|0;
 $d = sp + 608|0;
 $e = sp + 456|0;
 $f = sp + 304|0;
 $g = sp + 152|0;
 $h = sp;
 $0 = ((($b)) + 8|0);
 _memset(($0|0),0,144)|0;
 $1 = $b;
 $2 = $1;
 HEAP32[$2>>2] = 1;
 $3 = (($1) + 4)|0;
 $4 = $3;
 HEAP32[$4>>2] = 0;
 $5 = ((($c)) + 8|0);
 _memset(($5|0),0,144)|0;
 $6 = $c;
 $7 = $6;
 HEAP32[$7>>2] = 1;
 $8 = (($6) + 4)|0;
 $9 = $8;
 HEAP32[$9>>2] = 0;
 _memset(($d|0),0,152)|0;
 _memset(($e|0),0,152)|0;
 $10 = ((($f)) + 8|0);
 _memset(($10|0),0,144)|0;
 $11 = $f;
 $12 = $11;
 HEAP32[$12>>2] = 1;
 $13 = (($11) + 4)|0;
 $14 = $13;
 HEAP32[$14>>2] = 0;
 _memset(($g|0),0,152)|0;
 $15 = ((($h)) + 8|0);
 _memset(($15|0),0,144)|0;
 $16 = $h;
 $17 = $16;
 HEAP32[$17>>2] = 1;
 $18 = (($16) + 4)|0;
 $19 = $18;
 HEAP32[$19>>2] = 0;
 $20 = ((($a)) + 80|0);
 dest=$20; stop=dest+72|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 dest=$a; src=$q; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $i$062 = 0;$nqpqx$063 = $a;$nqpqx2$058 = $e;$nqpqz$057 = $b;$nqpqz2$059 = $f;$nqx$055 = $c;$nqx2$060 = $g;$nqz$056 = $d;$nqz2$061 = $h;
 while(1) {
  $sub = (31 - ($i$062))|0;
  $arrayidx = (($n) + ($sub)|0);
  $21 = HEAP8[$arrayidx>>0]|0;
  $byte$053 = $21;$j$052 = 0;$nqpqx$154 = $nqpqx$063;$nqpqx2$148 = $nqpqx2$058;$nqpqz$147 = $nqpqz$057;$nqpqz2$149 = $nqpqz2$059;$nqx$145 = $nqx$055;$nqx2$150 = $nqx2$060;$nqz$146 = $nqz$056;$nqz2$151 = $nqz2$061;
  while(1) {
   $conv = $byte$053&255;
   $shr43 = $conv >>> 7;
   _swap_conditional($nqx$145,$nqpqx$154,$shr43,0);
   _swap_conditional($nqz$146,$nqpqz$147,$shr43,0);
   _fmonty($nqx2$150,$nqz2$151,$nqpqx2$148,$nqpqz2$149,$nqx$145,$nqz$146,$nqpqx$154,$nqpqz$147,$q);
   _swap_conditional($nqx2$150,$nqpqx2$148,$shr43,0);
   _swap_conditional($nqz2$151,$nqpqz2$149,$shr43,0);
   $shl = $conv << 1;
   $conv13 = $shl&255;
   $inc = (($j$052) + 1)|0;
   $exitcond = ($inc|0)==(8);
   if ($exitcond) {
    break;
   } else {
    $nqz2$151$phi = $nqz$146;$nqz$146$phi = $nqz2$151;$nqx2$150$phi = $nqx$145;$nqx$145$phi = $nqx2$150;$nqpqz2$149$phi = $nqpqz$147;$nqpqz$147$phi = $nqpqz2$149;$nqpqx2$148$phi = $nqpqx$154;$nqpqx$154$phi = $nqpqx2$148;$byte$053 = $conv13;$j$052 = $inc;$nqz2$151 = $nqz2$151$phi;$nqz$146 = $nqz$146$phi;$nqx2$150 = $nqx2$150$phi;$nqx$145 = $nqx$145$phi;$nqpqz2$149 = $nqpqz2$149$phi;$nqpqz$147 = $nqpqz$147$phi;$nqpqx2$148 = $nqpqx2$148$phi;$nqpqx$154 = $nqpqx$154$phi;
   }
  }
  $inc15 = (($i$062) + 1)|0;
  $exitcond64 = ($inc15|0)==(32);
  if ($exitcond64) {
   break;
  } else {
   $i$062 = $inc15;$nqpqx$063 = $nqpqx2$148;$nqpqx2$058 = $nqpqx$154;$nqpqz$057 = $nqpqz2$149;$nqpqz2$059 = $nqpqz$147;$nqx$055 = $nqx2$150;$nqx2$060 = $nqx$145;$nqz$056 = $nqz2$151;$nqz2$061 = $nqz$146;
  }
 }
 dest=$resultx; src=$nqx2$150; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 dest=$resultz; src=$nqz2$151; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 STACKTOP = sp;return;
}
function _crecip($out,$z) {
 $out = $out|0;
 $z = $z|0;
 var $add102 = 0, $add119 = 0, $add85 = 0, $cmp112 = 0, $cmp78 = 0, $cmp95 = 0, $i$316 = 0, $i$415 = 0, $i$514 = 0, $t0 = 0, $t1 = 0, $z11 = 0, $z2 = 0, $z2_100_0 = 0, $z2_10_0 = 0, $z2_20_0 = 0, $z2_50_0 = 0, $z2_5_0 = 0, $z9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 800|0;
 $z2 = sp + 720|0;
 $z9 = sp + 640|0;
 $z11 = sp + 560|0;
 $z2_5_0 = sp + 480|0;
 $z2_10_0 = sp + 400|0;
 $z2_20_0 = sp + 320|0;
 $z2_50_0 = sp + 240|0;
 $z2_100_0 = sp + 160|0;
 $t0 = sp + 80|0;
 $t1 = sp;
 _fsquare($z2,$z);
 _fsquare($t1,$z2);
 _fsquare($t0,$t1);
 _fmul($z9,$t0,$z);
 _fmul($z11,$z9,$z2);
 _fsquare($t0,$z11);
 _fmul($z2_5_0,$t0,$z9);
 _fsquare($t0,$z2_5_0);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fmul($z2_10_0,$t0,$z2_5_0);
 _fsquare($t0,$z2_10_0);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fmul($z2_20_0,$t1,$z2_10_0);
 _fsquare($t0,$z2_20_0);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fmul($t0,$t1,$z2_20_0);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fmul($z2_50_0,$t0,$z2_10_0);
 _fsquare($t0,$z2_50_0);
 _fsquare($t1,$t0);
 $i$316 = 2;
 while(1) {
  _fsquare($t0,$t1);
  _fsquare($t1,$t0);
  $add85 = (($i$316) + 2)|0;
  $cmp78 = ($add85|0)<(50);
  if ($cmp78) {
   $i$316 = $add85;
  } else {
   break;
  }
 }
 _fmul($z2_100_0,$t1,$z2_50_0);
 _fsquare($t1,$z2_100_0);
 _fsquare($t0,$t1);
 $i$415 = 2;
 while(1) {
  _fsquare($t1,$t0);
  _fsquare($t0,$t1);
  $add102 = (($i$415) + 2)|0;
  $cmp95 = ($add102|0)<(100);
  if ($cmp95) {
   $i$415 = $add102;
  } else {
   break;
  }
 }
 _fmul($t1,$t0,$z2_100_0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 $i$514 = 2;
 while(1) {
  _fsquare($t0,$t1);
  _fsquare($t1,$t0);
  $add119 = (($i$514) + 2)|0;
  $cmp112 = ($add119|0)<(50);
  if ($cmp112) {
   $i$514 = $add119;
  } else {
   break;
  }
 }
 _fmul($t0,$t1,$z2_50_0);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fsquare($t0,$t1);
 _fsquare($t1,$t0);
 _fmul($out,$t1,$z11);
 STACKTOP = sp;return;
}
function _fmul($output,$in,$in2) {
 $output = $output|0;
 $in = $in|0;
 $in2 = $in2|0;
 var $t = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $t = sp;
 _fproduct($t,$in,$in2);
 _freduce_degree($t);
 _freduce_coefficients($t);
 dest=$output; src=$t; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 STACKTOP = sp;return;
}
function _fcontract($output,$input_limbs) {
 $output = $output|0;
 $input_limbs = $input_limbs|0;
 var $$promoted = 0, $$promoted153 = 0, $$promoted155 = 0, $$promoted156 = 0, $$promoted157 = 0, $$promoted158 = 0, $$promoted159 = 0, $$promoted160 = 0, $$promoted161 = 0, $$promoted162 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0;
 var $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0;
 var $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0;
 var $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0;
 var $161 = 0, $162 = 0, $163 = 0, $164 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $add = 0, $add$1 = 0, $add$1$1 = 0, $add$1168 = 0, $add$2 = 0;
 var $add$2$1 = 0, $add$3 = 0, $add$3$1 = 0, $add$4 = 0, $add$4$1 = 0, $add$5 = 0, $add$5$1 = 0, $add$6 = 0, $add$6$1 = 0, $add$7 = 0, $add$7$1 = 0, $add$8 = 0, $add$8$1 = 0, $add117 = 0, $add117$1 = 0, $add54 = 0, $add54$1 = 0, $add72 = 0, $add96 = 0, $add96$1 = 0;
 var $add96$1$1 = 0, $add96$1149 = 0, $add96$2 = 0, $add96$2$1 = 0, $add96$3 = 0, $add96$3$1 = 0, $add96$4 = 0, $add96$4$1 = 0, $add96$5 = 0, $add96$5$1 = 0, $add96$6 = 0, $add96$6$1 = 0, $add96$7 = 0, $add96$7$1 = 0, $add96$8 = 0, $add96$8$1 = 0, $and114 = 0, $and114$1 = 0, $and126 = 0, $and141 = 0;
 var $and15 = 0, $and15$1 = 0, $and15$1$1 = 0, $and15$1164 = 0, $and15$2 = 0, $and15$2$1 = 0, $and15$3 = 0, $and15$3$1 = 0, $and15$4 = 0, $and15$4$1 = 0, $and15$5 = 0, $and15$5$1 = 0, $and15$6 = 0, $and15$6$1 = 0, $and15$7 = 0, $and15$7$1 = 0, $and15$8 = 0, $and15$8$1 = 0, $and156$sink = 0, $and156$sink$1 = 0;
 var $and156$sink$2 = 0, $and156$sink$3 = 0, $and156$sink$4 = 0, $and156$sink$5 = 0, $and156$sink$6 = 0, $and156$sink$7 = 0, $and156$sink$8 = 0, $and49 = 0, $and49$1 = 0, $and67 = 0, $and93 = 0, $and93$1 = 0, $and93$1$1 = 0, $and93$1148 = 0, $and93$2 = 0, $and93$2$1 = 0, $and93$3 = 0, $and93$3$1 = 0, $and93$4 = 0, $and93$4$1 = 0;
 var $and93$5 = 0, $and93$5$1 = 0, $and93$6 = 0, $and93$6$1 = 0, $and93$7 = 0, $and93$7$1 = 0, $and93$8 = 0, $and93$8$1 = 0, $arrayidx$1 = 0, $arrayidx$2 = 0, $arrayidx$3 = 0, $arrayidx$4 = 0, $arrayidx$5 = 0, $arrayidx$6 = 0, $arrayidx$7 = 0, $arrayidx$8 = 0, $arrayidx$9 = 0, $arrayidx1$1 = 0, $arrayidx1$2 = 0, $arrayidx1$3 = 0;
 var $arrayidx1$4 = 0, $arrayidx1$5 = 0, $arrayidx1$6 = 0, $arrayidx1$7 = 0, $arrayidx1$8 = 0, $arrayidx1$9 = 0, $arrayidx111 = 0, $arrayidx130 = 0, $arrayidx157 = 0, $arrayidx157$1 = 0, $arrayidx157$2 = 0, $arrayidx157$3 = 0, $arrayidx157$4 = 0, $arrayidx157$5 = 0, $arrayidx157$6 = 0, $arrayidx157$7 = 0, $arrayidx157$8 = 0, $arrayidx165 = 0, $arrayidx167 = 0, $arrayidx169 = 0;
 var $arrayidx171 = 0, $arrayidx173 = 0, $arrayidx175 = 0, $arrayidx177 = 0, $arrayidx180 = 0, $arrayidx190 = 0, $arrayidx195 = 0, $arrayidx200 = 0, $arrayidx211 = 0, $arrayidx216 = 0, $arrayidx221 = 0, $arrayidx232 = 0, $arrayidx237 = 0, $arrayidx242 = 0, $arrayidx253 = 0, $arrayidx258 = 0, $arrayidx263 = 0, $arrayidx274 = 0, $arrayidx279 = 0, $arrayidx284 = 0;
 var $arrayidx285 = 0, $arrayidx295 = 0, $arrayidx300 = 0, $arrayidx305 = 0, $arrayidx316 = 0, $arrayidx321 = 0, $arrayidx326 = 0, $arrayidx337 = 0, $arrayidx342 = 0, $arrayidx347 = 0, $arrayidx358 = 0, $arrayidx363 = 0, $arrayidx368 = 0, $arrayidx379 = 0, $arrayidx384 = 0, $arrayidx389 = 0, $arrayidx74 = 0, $call = 0, $call131 = 0, $conv185 = 0;
 var $conv189 = 0, $conv194 = 0, $conv206 = 0, $conv210 = 0, $conv215 = 0, $conv227 = 0, $conv231 = 0, $conv236 = 0, $conv248 = 0, $conv252 = 0, $conv257 = 0, $conv269 = 0, $conv273 = 0, $conv278 = 0, $conv283 = 0, $conv288 = 0, $conv290 = 0, $conv294 = 0, $conv299 = 0, $conv311 = 0;
 var $conv315 = 0, $conv320 = 0, $conv332 = 0, $conv336 = 0, $conv341 = 0, $conv353 = 0, $conv357 = 0, $conv362 = 0, $conv374 = 0, $conv378 = 0, $conv383 = 0, $conv388 = 0, $exitcond = 0, $i$3139 = 0, $inc139 = 0, $input = 0, $mask$0138 = 0, $mask$1 = 0, $mul115 = 0, $mul115$1 = 0;
 var $or205 = 0, $or226 = 0, $or247 = 0, $or268 = 0, $or289 = 0, $or310 = 0, $or331 = 0, $or352 = 0, $or373 = 0, $shl = 0, $shl$1 = 0, $shl$1$1 = 0, $shl$1167 = 0, $shl$2 = 0, $shl$2$1 = 0, $shl$3 = 0, $shl$3$1 = 0, $shl$4 = 0, $shl$4$1 = 0, $shl$5 = 0;
 var $shl$5$1 = 0, $shl$6 = 0, $shl$6$1 = 0, $shl$7 = 0, $shl$7$1 = 0, $shl$8 = 0, $shl$8$1 = 0, $shl164 = 0, $shl166 = 0, $shl168 = 0, $shl170 = 0, $shl172 = 0, $shl174 = 0, $shl176 = 0, $shl178 = 0, $shl53 = 0, $shl53$1 = 0, $shl71 = 0, $shr = 0, $shr$1 = 0;
 var $shr$1$1 = 0, $shr$1163 = 0, $shr$2 = 0, $shr$2$1 = 0, $shr$3 = 0, $shr$3$1 = 0, $shr$4 = 0, $shr$4$1 = 0, $shr$5 = 0, $shr$5$1 = 0, $shr$6 = 0, $shr$6$1 = 0, $shr$7 = 0, $shr$7$1 = 0, $shr$8 = 0, $shr$8$1 = 0, $shr112 = 0, $shr112$1 = 0, $shr16$sink133 = 0, $shr16$sink133$1 = 0;
 var $shr16$sink133$1$1 = 0, $shr16$sink133$1165 = 0, $shr16$sink133$2 = 0, $shr16$sink133$2$1 = 0, $shr16$sink133$3 = 0, $shr16$sink133$3$1 = 0, $shr16$sink133$4 = 0, $shr16$sink133$4$1 = 0, $shr16$sink133$5 = 0, $shr16$sink133$5$1 = 0, $shr16$sink133$6 = 0, $shr16$sink133$6$1 = 0, $shr16$sink133$7 = 0, $shr16$sink133$7$1 = 0, $shr16$sink133$8 = 0, $shr16$sink133$8$1 = 0, $shr187103 = 0, $shr192104 = 0, $shr197105 = 0, $shr208106 = 0;
 var $shr213107 = 0, $shr218108 = 0, $shr229109 = 0, $shr234110 = 0, $shr239111 = 0, $shr250112 = 0, $shr255113 = 0, $shr260114 = 0, $shr271115 = 0, $shr276116 = 0, $shr281117 = 0, $shr292118 = 0, $shr297119 = 0, $shr302120 = 0, $shr313121 = 0, $shr318122 = 0, $shr323123 = 0, $shr334124 = 0, $shr339125 = 0, $shr344126 = 0;
 var $shr355127 = 0, $shr360128 = 0, $shr365129 = 0, $shr376130 = 0, $shr381131 = 0, $shr386132 = 0, $shr46 = 0, $shr46$1 = 0, $shr50 = 0, $shr50$1 = 0, $shr64 = 0, $shr68 = 0, $shr91 = 0, $shr91$1 = 0, $shr91$1$1 = 0, $shr91$1147 = 0, $shr91$2 = 0, $shr91$2$1 = 0, $shr91$3 = 0, $shr91$3$1 = 0;
 var $shr91$4 = 0, $shr91$4$1 = 0, $shr91$5 = 0, $shr91$5$1 = 0, $shr91$6 = 0, $shr91$6$1 = 0, $shr91$7 = 0, $shr91$7$1 = 0, $shr91$8 = 0, $shr91$8$1 = 0, $sub = 0, $sub$1 = 0, $sub$1$1 = 0, $sub$1166 = 0, $sub$2 = 0, $sub$2$1 = 0, $sub$3 = 0, $sub$3$1 = 0, $sub$4 = 0, $sub$4$1 = 0;
 var $sub$5 = 0, $sub$5$1 = 0, $sub$6 = 0, $sub$6$1 = 0, $sub$7 = 0, $sub$7$1 = 0, $sub$8 = 0, $sub$8$1 = 0, $sub143 = 0, $sub158 = 0, $sub158$1 = 0, $sub158$2 = 0, $sub158$3 = 0, $sub158$4 = 0, $sub158$5 = 0, $sub158$6 = 0, $sub158$7 = 0, $sub158$8 = 0, $sub21 = 0, $sub21$1 = 0;
 var $sub21$1$1 = 0, $sub21$1169 = 0, $sub21$2 = 0, $sub21$2$1 = 0, $sub21$3 = 0, $sub21$3$1 = 0, $sub21$4 = 0, $sub21$4$1 = 0, $sub21$5 = 0, $sub21$5$1 = 0, $sub21$6 = 0, $sub21$6$1 = 0, $sub21$7 = 0, $sub21$7$1 = 0, $sub21$8 = 0, $sub21$8$1 = 0, $sub57 = 0, $sub57$1 = 0, $sub75 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $input = sp;
 $0 = $input_limbs;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$input>>2] = $2;
 $arrayidx$1 = ((($input_limbs)) + 8|0);
 $6 = $arrayidx$1;
 $7 = $6;
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) + 4)|0;
 $10 = $9;
 $11 = HEAP32[$10>>2]|0;
 $arrayidx1$1 = ((($input)) + 4|0);
 HEAP32[$arrayidx1$1>>2] = $8;
 $arrayidx$2 = ((($input_limbs)) + 16|0);
 $12 = $arrayidx$2;
 $13 = $12;
 $14 = HEAP32[$13>>2]|0;
 $15 = (($12) + 4)|0;
 $16 = $15;
 $17 = HEAP32[$16>>2]|0;
 $arrayidx1$2 = ((($input)) + 8|0);
 HEAP32[$arrayidx1$2>>2] = $14;
 $arrayidx$3 = ((($input_limbs)) + 24|0);
 $18 = $arrayidx$3;
 $19 = $18;
 $20 = HEAP32[$19>>2]|0;
 $21 = (($18) + 4)|0;
 $22 = $21;
 $23 = HEAP32[$22>>2]|0;
 $arrayidx1$3 = ((($input)) + 12|0);
 HEAP32[$arrayidx1$3>>2] = $20;
 $arrayidx$4 = ((($input_limbs)) + 32|0);
 $24 = $arrayidx$4;
 $25 = $24;
 $26 = HEAP32[$25>>2]|0;
 $27 = (($24) + 4)|0;
 $28 = $27;
 $29 = HEAP32[$28>>2]|0;
 $arrayidx1$4 = ((($input)) + 16|0);
 HEAP32[$arrayidx1$4>>2] = $26;
 $arrayidx$5 = ((($input_limbs)) + 40|0);
 $30 = $arrayidx$5;
 $31 = $30;
 $32 = HEAP32[$31>>2]|0;
 $33 = (($30) + 4)|0;
 $34 = $33;
 $35 = HEAP32[$34>>2]|0;
 $arrayidx1$5 = ((($input)) + 20|0);
 HEAP32[$arrayidx1$5>>2] = $32;
 $arrayidx$6 = ((($input_limbs)) + 48|0);
 $36 = $arrayidx$6;
 $37 = $36;
 $38 = HEAP32[$37>>2]|0;
 $39 = (($36) + 4)|0;
 $40 = $39;
 $41 = HEAP32[$40>>2]|0;
 $arrayidx1$6 = ((($input)) + 24|0);
 HEAP32[$arrayidx1$6>>2] = $38;
 $arrayidx$7 = ((($input_limbs)) + 56|0);
 $42 = $arrayidx$7;
 $43 = $42;
 $44 = HEAP32[$43>>2]|0;
 $45 = (($42) + 4)|0;
 $46 = $45;
 $47 = HEAP32[$46>>2]|0;
 $arrayidx1$7 = ((($input)) + 28|0);
 HEAP32[$arrayidx1$7>>2] = $44;
 $arrayidx$8 = ((($input_limbs)) + 64|0);
 $48 = $arrayidx$8;
 $49 = $48;
 $50 = HEAP32[$49>>2]|0;
 $51 = (($48) + 4)|0;
 $52 = $51;
 $53 = HEAP32[$52>>2]|0;
 $arrayidx1$8 = ((($input)) + 32|0);
 HEAP32[$arrayidx1$8>>2] = $50;
 $arrayidx$9 = ((($input_limbs)) + 72|0);
 $54 = $arrayidx$9;
 $55 = $54;
 $56 = HEAP32[$55>>2]|0;
 $57 = (($54) + 4)|0;
 $58 = $57;
 $59 = HEAP32[$58>>2]|0;
 $arrayidx1$9 = ((($input)) + 36|0);
 HEAP32[$arrayidx1$9>>2] = $56;
 $60 = ((($input)) + 4|0);
 $61 = ((($input)) + 8|0);
 $62 = ((($input)) + 12|0);
 $63 = ((($input)) + 16|0);
 $64 = ((($input)) + 20|0);
 $65 = ((($input)) + 24|0);
 $66 = ((($input)) + 28|0);
 $67 = ((($input)) + 32|0);
 $68 = ((($input)) + 36|0);
 $$promoted153 = HEAP32[$input>>2]|0;
 $$promoted162 = HEAP32[$68>>2]|0;
 $$promoted161 = HEAP32[$67>>2]|0;
 $$promoted160 = HEAP32[$66>>2]|0;
 $$promoted159 = HEAP32[$65>>2]|0;
 $$promoted158 = HEAP32[$64>>2]|0;
 $$promoted157 = HEAP32[$63>>2]|0;
 $$promoted156 = HEAP32[$62>>2]|0;
 $$promoted155 = HEAP32[$61>>2]|0;
 $$promoted = HEAP32[$60>>2]|0;
 $shr = $$promoted153 >> 31;
 $and15 = $shr & $$promoted153;
 $shr16$sink133 = $and15 >> 26;
 $sub = (0 - ($shr16$sink133))|0;
 $shl = $sub << 26;
 $add = (($shl) + ($$promoted153))|0;
 $sub21 = (($shr16$sink133) + ($$promoted))|0;
 $shr$1 = $sub21 >> 31;
 $and15$1 = $shr$1 & $sub21;
 $shr16$sink133$1 = $and15$1 >> 25;
 $sub$1 = (0 - ($shr16$sink133$1))|0;
 $shl$1 = $sub$1 << 25;
 $add$1 = (($shl$1) + ($sub21))|0;
 $sub21$1 = (($shr16$sink133$1) + ($$promoted155))|0;
 $shr$2 = $sub21$1 >> 31;
 $and15$2 = $shr$2 & $sub21$1;
 $shr16$sink133$2 = $and15$2 >> 26;
 $sub$2 = (0 - ($shr16$sink133$2))|0;
 $shl$2 = $sub$2 << 26;
 $add$2 = (($shl$2) + ($sub21$1))|0;
 $sub21$2 = (($shr16$sink133$2) + ($$promoted156))|0;
 $shr$3 = $sub21$2 >> 31;
 $and15$3 = $shr$3 & $sub21$2;
 $shr16$sink133$3 = $and15$3 >> 25;
 $sub$3 = (0 - ($shr16$sink133$3))|0;
 $shl$3 = $sub$3 << 25;
 $add$3 = (($shl$3) + ($sub21$2))|0;
 $sub21$3 = (($shr16$sink133$3) + ($$promoted157))|0;
 $shr$4 = $sub21$3 >> 31;
 $and15$4 = $shr$4 & $sub21$3;
 $shr16$sink133$4 = $and15$4 >> 26;
 $sub$4 = (0 - ($shr16$sink133$4))|0;
 $shl$4 = $sub$4 << 26;
 $add$4 = (($shl$4) + ($sub21$3))|0;
 $sub21$4 = (($shr16$sink133$4) + ($$promoted158))|0;
 $shr$5 = $sub21$4 >> 31;
 $and15$5 = $shr$5 & $sub21$4;
 $shr16$sink133$5 = $and15$5 >> 25;
 $sub$5 = (0 - ($shr16$sink133$5))|0;
 $shl$5 = $sub$5 << 25;
 $add$5 = (($shl$5) + ($sub21$4))|0;
 $sub21$5 = (($shr16$sink133$5) + ($$promoted159))|0;
 $shr$6 = $sub21$5 >> 31;
 $and15$6 = $shr$6 & $sub21$5;
 $shr16$sink133$6 = $and15$6 >> 26;
 $sub$6 = (0 - ($shr16$sink133$6))|0;
 $shl$6 = $sub$6 << 26;
 $add$6 = (($shl$6) + ($sub21$5))|0;
 $sub21$6 = (($shr16$sink133$6) + ($$promoted160))|0;
 $shr$7 = $sub21$6 >> 31;
 $and15$7 = $shr$7 & $sub21$6;
 $shr16$sink133$7 = $and15$7 >> 25;
 $sub$7 = (0 - ($shr16$sink133$7))|0;
 $shl$7 = $sub$7 << 25;
 $add$7 = (($shl$7) + ($sub21$6))|0;
 $sub21$7 = (($shr16$sink133$7) + ($$promoted161))|0;
 $shr$8 = $sub21$7 >> 31;
 $and15$8 = $shr$8 & $sub21$7;
 $shr16$sink133$8 = $and15$8 >> 26;
 $sub$8 = (0 - ($shr16$sink133$8))|0;
 $shl$8 = $sub$8 << 26;
 $add$8 = (($shl$8) + ($sub21$7))|0;
 $sub21$8 = (($shr16$sink133$8) + ($$promoted162))|0;
 $shr46 = $sub21$8 >> 31;
 $and49 = $shr46 & $sub21$8;
 $shr50 = $and49 >> 25;
 $shl53 = Math_imul($shr50, -33554432)|0;
 $add54 = (($shl53) + ($sub21$8))|0;
 $69 = ($shr50*19)|0;
 $sub57 = (($69) + ($add))|0;
 $shr$1163 = $sub57 >> 31;
 $and15$1164 = $shr$1163 & $sub57;
 $shr16$sink133$1165 = $and15$1164 >> 26;
 $sub$1166 = (0 - ($shr16$sink133$1165))|0;
 $shl$1167 = $sub$1166 << 26;
 $add$1168 = (($shl$1167) + ($sub57))|0;
 $sub21$1169 = (($shr16$sink133$1165) + ($add$1))|0;
 $shr$1$1 = $sub21$1169 >> 31;
 $and15$1$1 = $shr$1$1 & $sub21$1169;
 $shr16$sink133$1$1 = $and15$1$1 >> 25;
 $sub$1$1 = (0 - ($shr16$sink133$1$1))|0;
 $shl$1$1 = $sub$1$1 << 25;
 $add$1$1 = (($shl$1$1) + ($sub21$1169))|0;
 $sub21$1$1 = (($shr16$sink133$1$1) + ($add$2))|0;
 $shr$2$1 = $sub21$1$1 >> 31;
 $and15$2$1 = $shr$2$1 & $sub21$1$1;
 $shr16$sink133$2$1 = $and15$2$1 >> 26;
 $sub$2$1 = (0 - ($shr16$sink133$2$1))|0;
 $shl$2$1 = $sub$2$1 << 26;
 $add$2$1 = (($shl$2$1) + ($sub21$1$1))|0;
 $sub21$2$1 = (($shr16$sink133$2$1) + ($add$3))|0;
 $shr$3$1 = $sub21$2$1 >> 31;
 $and15$3$1 = $shr$3$1 & $sub21$2$1;
 $shr16$sink133$3$1 = $and15$3$1 >> 25;
 $sub$3$1 = (0 - ($shr16$sink133$3$1))|0;
 $shl$3$1 = $sub$3$1 << 25;
 $add$3$1 = (($shl$3$1) + ($sub21$2$1))|0;
 $sub21$3$1 = (($shr16$sink133$3$1) + ($add$4))|0;
 $shr$4$1 = $sub21$3$1 >> 31;
 $and15$4$1 = $shr$4$1 & $sub21$3$1;
 $shr16$sink133$4$1 = $and15$4$1 >> 26;
 $sub$4$1 = (0 - ($shr16$sink133$4$1))|0;
 $shl$4$1 = $sub$4$1 << 26;
 $add$4$1 = (($shl$4$1) + ($sub21$3$1))|0;
 $sub21$4$1 = (($shr16$sink133$4$1) + ($add$5))|0;
 $shr$5$1 = $sub21$4$1 >> 31;
 $and15$5$1 = $shr$5$1 & $sub21$4$1;
 $shr16$sink133$5$1 = $and15$5$1 >> 25;
 $sub$5$1 = (0 - ($shr16$sink133$5$1))|0;
 $shl$5$1 = $sub$5$1 << 25;
 $add$5$1 = (($shl$5$1) + ($sub21$4$1))|0;
 $sub21$5$1 = (($shr16$sink133$5$1) + ($add$6))|0;
 $shr$6$1 = $sub21$5$1 >> 31;
 $and15$6$1 = $shr$6$1 & $sub21$5$1;
 $shr16$sink133$6$1 = $and15$6$1 >> 26;
 $sub$6$1 = (0 - ($shr16$sink133$6$1))|0;
 $shl$6$1 = $sub$6$1 << 26;
 $add$6$1 = (($shl$6$1) + ($sub21$5$1))|0;
 $sub21$6$1 = (($shr16$sink133$6$1) + ($add$7))|0;
 $shr$7$1 = $sub21$6$1 >> 31;
 $and15$7$1 = $shr$7$1 & $sub21$6$1;
 $shr16$sink133$7$1 = $and15$7$1 >> 25;
 $sub$7$1 = (0 - ($shr16$sink133$7$1))|0;
 $shl$7$1 = $sub$7$1 << 25;
 $add$7$1 = (($shl$7$1) + ($sub21$6$1))|0;
 $sub21$7$1 = (($shr16$sink133$7$1) + ($add$8))|0;
 $shr$8$1 = $sub21$7$1 >> 31;
 $and15$8$1 = $shr$8$1 & $sub21$7$1;
 $shr16$sink133$8$1 = $and15$8$1 >> 26;
 $sub$8$1 = (0 - ($shr16$sink133$8$1))|0;
 $shl$8$1 = $sub$8$1 << 26;
 $add$8$1 = (($shl$8$1) + ($sub21$7$1))|0;
 $sub21$8$1 = (($shr16$sink133$8$1) + ($add54))|0;
 $shr46$1 = $sub21$8$1 >> 31;
 $and49$1 = $shr46$1 & $sub21$8$1;
 $shr50$1 = $and49$1 >> 25;
 $shl53$1 = Math_imul($shr50$1, -33554432)|0;
 $add54$1 = (($shl53$1) + ($sub21$8$1))|0;
 $70 = ($shr50$1*19)|0;
 $sub57$1 = (($70) + ($add$1168))|0;
 HEAP32[$60>>2] = $add$1$1;
 HEAP32[$input>>2] = $sub57$1;
 HEAP32[$61>>2] = $add$2$1;
 HEAP32[$62>>2] = $add$3$1;
 HEAP32[$63>>2] = $add$4$1;
 HEAP32[$64>>2] = $add$5$1;
 HEAP32[$65>>2] = $add$6$1;
 HEAP32[$66>>2] = $add$7$1;
 HEAP32[$67>>2] = $add$8$1;
 HEAP32[$68>>2] = $add54$1;
 $71 = HEAP32[$input>>2]|0;
 $shr64 = $71 >> 31;
 $and67 = $shr64 & $71;
 $shr68 = $and67 >> 26;
 $shl71 = Math_imul($shr68, -67108864)|0;
 $add72 = (($shl71) + ($71))|0;
 HEAP32[$input>>2] = $add72;
 $arrayidx74 = ((($input)) + 4|0);
 $72 = HEAP32[$arrayidx74>>2]|0;
 $sub75 = (($shr68) + ($72))|0;
 HEAP32[$arrayidx74>>2] = $sub75;
 $arrayidx111 = ((($input)) + 36|0);
 $73 = HEAP32[$input>>2]|0;
 $shr91 = $73 >> 26;
 $and93 = $73 & 67108863;
 HEAP32[$input>>2] = $and93;
 $add96 = (($sub75) + ($shr91))|0;
 $74 = ((($input)) + 4|0);
 $75 = ((($input)) + 8|0);
 $76 = HEAP32[$75>>2]|0;
 $shr91$1 = $add96 >> 25;
 $and93$1 = $add96 & 33554431;
 HEAP32[$74>>2] = $and93$1;
 $add96$1 = (($76) + ($shr91$1))|0;
 $77 = ((($input)) + 8|0);
 $78 = ((($input)) + 12|0);
 $79 = HEAP32[$78>>2]|0;
 $shr91$2 = $add96$1 >> 26;
 $and93$2 = $add96$1 & 67108863;
 HEAP32[$77>>2] = $and93$2;
 $add96$2 = (($79) + ($shr91$2))|0;
 $80 = ((($input)) + 12|0);
 $81 = ((($input)) + 16|0);
 $82 = HEAP32[$81>>2]|0;
 $shr91$3 = $add96$2 >> 25;
 $and93$3 = $add96$2 & 33554431;
 HEAP32[$80>>2] = $and93$3;
 $add96$3 = (($82) + ($shr91$3))|0;
 $83 = ((($input)) + 16|0);
 $84 = ((($input)) + 20|0);
 $85 = HEAP32[$84>>2]|0;
 $shr91$4 = $add96$3 >> 26;
 $and93$4 = $add96$3 & 67108863;
 HEAP32[$83>>2] = $and93$4;
 $add96$4 = (($85) + ($shr91$4))|0;
 $86 = ((($input)) + 20|0);
 $87 = ((($input)) + 24|0);
 $88 = HEAP32[$87>>2]|0;
 $shr91$5 = $add96$4 >> 25;
 $and93$5 = $add96$4 & 33554431;
 HEAP32[$86>>2] = $and93$5;
 $add96$5 = (($88) + ($shr91$5))|0;
 $89 = ((($input)) + 24|0);
 $90 = ((($input)) + 28|0);
 $91 = HEAP32[$90>>2]|0;
 $shr91$6 = $add96$5 >> 26;
 $and93$6 = $add96$5 & 67108863;
 HEAP32[$89>>2] = $and93$6;
 $add96$6 = (($91) + ($shr91$6))|0;
 $92 = ((($input)) + 28|0);
 $93 = ((($input)) + 32|0);
 $94 = HEAP32[$93>>2]|0;
 $shr91$7 = $add96$6 >> 25;
 $and93$7 = $add96$6 & 33554431;
 HEAP32[$92>>2] = $and93$7;
 $add96$7 = (($94) + ($shr91$7))|0;
 $95 = ((($input)) + 32|0);
 $96 = ((($input)) + 36|0);
 $97 = HEAP32[$96>>2]|0;
 $shr91$8 = $add96$7 >> 26;
 $and93$8 = $add96$7 & 67108863;
 HEAP32[$95>>2] = $and93$8;
 $add96$8 = (($97) + ($shr91$8))|0;
 $shr112 = $add96$8 >> 25;
 $and114 = $add96$8 & 33554431;
 HEAP32[$arrayidx111>>2] = $and114;
 $mul115 = ($shr112*19)|0;
 $98 = HEAP32[$input>>2]|0;
 $add117 = (($98) + ($mul115))|0;
 HEAP32[$input>>2] = $add117;
 $99 = ((($input)) + 4|0);
 $100 = HEAP32[$99>>2]|0;
 $shr91$1147 = $add117 >> 26;
 $and93$1148 = $add117 & 67108863;
 HEAP32[$input>>2] = $and93$1148;
 $add96$1149 = (($100) + ($shr91$1147))|0;
 $101 = ((($input)) + 4|0);
 $102 = ((($input)) + 8|0);
 $103 = HEAP32[$102>>2]|0;
 $shr91$1$1 = $add96$1149 >> 25;
 $and93$1$1 = $add96$1149 & 33554431;
 HEAP32[$101>>2] = $and93$1$1;
 $add96$1$1 = (($103) + ($shr91$1$1))|0;
 $104 = ((($input)) + 8|0);
 $105 = ((($input)) + 12|0);
 $106 = HEAP32[$105>>2]|0;
 $shr91$2$1 = $add96$1$1 >> 26;
 $and93$2$1 = $add96$1$1 & 67108863;
 HEAP32[$104>>2] = $and93$2$1;
 $add96$2$1 = (($106) + ($shr91$2$1))|0;
 $107 = ((($input)) + 12|0);
 $108 = ((($input)) + 16|0);
 $109 = HEAP32[$108>>2]|0;
 $shr91$3$1 = $add96$2$1 >> 25;
 $and93$3$1 = $add96$2$1 & 33554431;
 HEAP32[$107>>2] = $and93$3$1;
 $add96$3$1 = (($109) + ($shr91$3$1))|0;
 $110 = ((($input)) + 16|0);
 $111 = ((($input)) + 20|0);
 $112 = HEAP32[$111>>2]|0;
 $shr91$4$1 = $add96$3$1 >> 26;
 $and93$4$1 = $add96$3$1 & 67108863;
 HEAP32[$110>>2] = $and93$4$1;
 $add96$4$1 = (($112) + ($shr91$4$1))|0;
 $113 = ((($input)) + 20|0);
 $114 = ((($input)) + 24|0);
 $115 = HEAP32[$114>>2]|0;
 $shr91$5$1 = $add96$4$1 >> 25;
 $and93$5$1 = $add96$4$1 & 33554431;
 HEAP32[$113>>2] = $and93$5$1;
 $add96$5$1 = (($115) + ($shr91$5$1))|0;
 $116 = ((($input)) + 24|0);
 $117 = ((($input)) + 28|0);
 $118 = HEAP32[$117>>2]|0;
 $shr91$6$1 = $add96$5$1 >> 26;
 $and93$6$1 = $add96$5$1 & 67108863;
 HEAP32[$116>>2] = $and93$6$1;
 $add96$6$1 = (($118) + ($shr91$6$1))|0;
 $119 = ((($input)) + 28|0);
 $120 = ((($input)) + 32|0);
 $121 = HEAP32[$120>>2]|0;
 $shr91$7$1 = $add96$6$1 >> 25;
 $and93$7$1 = $add96$6$1 & 33554431;
 HEAP32[$119>>2] = $and93$7$1;
 $add96$7$1 = (($121) + ($shr91$7$1))|0;
 $122 = ((($input)) + 32|0);
 $123 = ((($input)) + 36|0);
 $124 = HEAP32[$123>>2]|0;
 $shr91$8$1 = $add96$7$1 >> 26;
 $and93$8$1 = $add96$7$1 & 67108863;
 HEAP32[$122>>2] = $and93$8$1;
 $add96$8$1 = (($124) + ($shr91$8$1))|0;
 $shr112$1 = $add96$8$1 >> 25;
 $and114$1 = $add96$8$1 & 33554431;
 HEAP32[$arrayidx111>>2] = $and114$1;
 $mul115$1 = ($shr112$1*19)|0;
 $125 = HEAP32[$input>>2]|0;
 $add117$1 = (($125) + ($mul115$1))|0;
 HEAP32[$input>>2] = $add117$1;
 $call = (_s32_gte($add117$1)|0);
 $i$3139 = 1;$mask$0138 = $call;
 while(1) {
  $arrayidx130 = (($input) + ($i$3139<<2)|0);
  $126 = HEAP32[$arrayidx130>>2]|0;
  $and126 = $i$3139 << 25;
  $127 = $and126 & 33554432;
  $128 = $127 ^ 67108863;
  $call131 = (_s32_eq($126,$128)|0);
  $mask$1 = $call131 & $mask$0138;
  $inc139 = (($i$3139) + 1)|0;
  $exitcond = ($inc139|0)==(10);
  if ($exitcond) {
   break;
  } else {
   $i$3139 = $inc139;$mask$0138 = $mask$1;
  }
 }
 $and141 = $mask$1 & 67108845;
 $129 = HEAP32[$input>>2]|0;
 $sub143 = (($129) - ($and141))|0;
 HEAP32[$input>>2] = $sub143;
 $and156$sink = $mask$1 & 33554431;
 $arrayidx157 = ((($input)) + 4|0);
 $130 = HEAP32[$arrayidx157>>2]|0;
 $sub158 = (($130) - ($and156$sink))|0;
 HEAP32[$arrayidx157>>2] = $sub158;
 $and156$sink$1 = $mask$1 & 67108863;
 $arrayidx157$1 = ((($input)) + 8|0);
 $131 = HEAP32[$arrayidx157$1>>2]|0;
 $sub158$1 = (($131) - ($and156$sink$1))|0;
 HEAP32[$arrayidx157$1>>2] = $sub158$1;
 $and156$sink$2 = $mask$1 & 33554431;
 $arrayidx157$2 = ((($input)) + 12|0);
 $132 = HEAP32[$arrayidx157$2>>2]|0;
 $sub158$2 = (($132) - ($and156$sink$2))|0;
 HEAP32[$arrayidx157$2>>2] = $sub158$2;
 $and156$sink$3 = $mask$1 & 67108863;
 $arrayidx157$3 = ((($input)) + 16|0);
 $133 = HEAP32[$arrayidx157$3>>2]|0;
 $sub158$3 = (($133) - ($and156$sink$3))|0;
 HEAP32[$arrayidx157$3>>2] = $sub158$3;
 $and156$sink$4 = $mask$1 & 33554431;
 $arrayidx157$4 = ((($input)) + 20|0);
 $134 = HEAP32[$arrayidx157$4>>2]|0;
 $sub158$4 = (($134) - ($and156$sink$4))|0;
 HEAP32[$arrayidx157$4>>2] = $sub158$4;
 $and156$sink$5 = $mask$1 & 67108863;
 $arrayidx157$5 = ((($input)) + 24|0);
 $135 = HEAP32[$arrayidx157$5>>2]|0;
 $sub158$5 = (($135) - ($and156$sink$5))|0;
 HEAP32[$arrayidx157$5>>2] = $sub158$5;
 $and156$sink$6 = $mask$1 & 33554431;
 $arrayidx157$6 = ((($input)) + 28|0);
 $136 = HEAP32[$arrayidx157$6>>2]|0;
 $sub158$6 = (($136) - ($and156$sink$6))|0;
 HEAP32[$arrayidx157$6>>2] = $sub158$6;
 $and156$sink$7 = $mask$1 & 67108863;
 $arrayidx157$7 = ((($input)) + 32|0);
 $137 = HEAP32[$arrayidx157$7>>2]|0;
 $sub158$7 = (($137) - ($and156$sink$7))|0;
 HEAP32[$arrayidx157$7>>2] = $sub158$7;
 $and156$sink$8 = $mask$1 & 33554431;
 $arrayidx157$8 = ((($input)) + 36|0);
 $138 = HEAP32[$arrayidx157$8>>2]|0;
 $sub158$8 = (($138) - ($and156$sink$8))|0;
 HEAP32[$arrayidx157$8>>2] = $sub158$8;
 $139 = HEAP32[$arrayidx74>>2]|0;
 $shl164 = $139 << 2;
 HEAP32[$arrayidx74>>2] = $shl164;
 $arrayidx165 = ((($input)) + 8|0);
 $140 = HEAP32[$arrayidx165>>2]|0;
 $shl166 = $140 << 3;
 HEAP32[$arrayidx165>>2] = $shl166;
 $arrayidx167 = ((($input)) + 12|0);
 $141 = HEAP32[$arrayidx167>>2]|0;
 $shl168 = $141 << 5;
 HEAP32[$arrayidx167>>2] = $shl168;
 $arrayidx169 = ((($input)) + 16|0);
 $142 = HEAP32[$arrayidx169>>2]|0;
 $shl170 = $142 << 6;
 HEAP32[$arrayidx169>>2] = $shl170;
 $arrayidx171 = ((($input)) + 24|0);
 $143 = HEAP32[$arrayidx171>>2]|0;
 $shl172 = $143 << 1;
 HEAP32[$arrayidx171>>2] = $shl172;
 $arrayidx173 = ((($input)) + 28|0);
 $144 = HEAP32[$arrayidx173>>2]|0;
 $shl174 = $144 << 3;
 HEAP32[$arrayidx173>>2] = $shl174;
 $arrayidx175 = ((($input)) + 32|0);
 $145 = HEAP32[$arrayidx175>>2]|0;
 $shl176 = $145 << 4;
 HEAP32[$arrayidx175>>2] = $shl176;
 $arrayidx177 = ((($input)) + 36|0);
 $146 = HEAP32[$arrayidx177>>2]|0;
 $shl178 = $146 << 6;
 HEAP32[$arrayidx177>>2] = $shl178;
 $arrayidx180 = ((($output)) + 16|0);
 HEAP8[$arrayidx180>>0] = 0;
 $147 = HEAP32[$input>>2]|0;
 $conv185 = $147&255;
 HEAP8[$output>>0] = $conv185;
 $shr187103 = $147 >>> 8;
 $conv189 = $shr187103&255;
 $arrayidx190 = ((($output)) + 1|0);
 HEAP8[$arrayidx190>>0] = $conv189;
 $shr192104 = $147 >>> 16;
 $conv194 = $shr192104&255;
 $arrayidx195 = ((($output)) + 2|0);
 HEAP8[$arrayidx195>>0] = $conv194;
 $shr197105 = $147 >>> 24;
 $arrayidx200 = ((($output)) + 3|0);
 $148 = HEAP32[$arrayidx74>>2]|0;
 $or205 = $148 | $shr197105;
 $conv206 = $or205&255;
 HEAP8[$arrayidx200>>0] = $conv206;
 $shr208106 = $148 >>> 8;
 $conv210 = $shr208106&255;
 $arrayidx211 = ((($output)) + 4|0);
 HEAP8[$arrayidx211>>0] = $conv210;
 $shr213107 = $148 >>> 16;
 $conv215 = $shr213107&255;
 $arrayidx216 = ((($output)) + 5|0);
 HEAP8[$arrayidx216>>0] = $conv215;
 $shr218108 = $148 >>> 24;
 $arrayidx221 = ((($output)) + 6|0);
 $149 = HEAP32[$arrayidx165>>2]|0;
 $or226 = $149 | $shr218108;
 $conv227 = $or226&255;
 HEAP8[$arrayidx221>>0] = $conv227;
 $shr229109 = $149 >>> 8;
 $conv231 = $shr229109&255;
 $arrayidx232 = ((($output)) + 7|0);
 HEAP8[$arrayidx232>>0] = $conv231;
 $shr234110 = $149 >>> 16;
 $conv236 = $shr234110&255;
 $arrayidx237 = ((($output)) + 8|0);
 HEAP8[$arrayidx237>>0] = $conv236;
 $shr239111 = $149 >>> 24;
 $arrayidx242 = ((($output)) + 9|0);
 $150 = HEAP32[$arrayidx167>>2]|0;
 $or247 = $150 | $shr239111;
 $conv248 = $or247&255;
 HEAP8[$arrayidx242>>0] = $conv248;
 $shr250112 = $150 >>> 8;
 $conv252 = $shr250112&255;
 $arrayidx253 = ((($output)) + 10|0);
 HEAP8[$arrayidx253>>0] = $conv252;
 $151 = HEAP32[$arrayidx167>>2]|0;
 $shr255113 = $151 >>> 16;
 $conv257 = $shr255113&255;
 $arrayidx258 = ((($output)) + 11|0);
 HEAP8[$arrayidx258>>0] = $conv257;
 $shr260114 = $151 >>> 24;
 $arrayidx263 = ((($output)) + 12|0);
 $152 = HEAP32[$arrayidx169>>2]|0;
 $or268 = $152 | $shr260114;
 $conv269 = $or268&255;
 HEAP8[$arrayidx263>>0] = $conv269;
 $shr271115 = $152 >>> 8;
 $conv273 = $shr271115&255;
 $arrayidx274 = ((($output)) + 13|0);
 HEAP8[$arrayidx274>>0] = $conv273;
 $153 = HEAP32[$arrayidx169>>2]|0;
 $shr276116 = $153 >>> 16;
 $conv278 = $shr276116&255;
 $arrayidx279 = ((($output)) + 14|0);
 HEAP8[$arrayidx279>>0] = $conv278;
 $shr281117 = $153 >>> 24;
 $conv283 = $shr281117&255;
 $arrayidx284 = ((($output)) + 15|0);
 HEAP8[$arrayidx284>>0] = $conv283;
 $arrayidx285 = ((($input)) + 20|0);
 $154 = HEAP32[$arrayidx285>>2]|0;
 $155 = HEAP8[$arrayidx180>>0]|0;
 $conv288 = $155&255;
 $or289 = $conv288 | $154;
 $conv290 = $or289&255;
 HEAP8[$arrayidx180>>0] = $conv290;
 $shr292118 = $154 >>> 8;
 $conv294 = $shr292118&255;
 $arrayidx295 = ((($output)) + 17|0);
 HEAP8[$arrayidx295>>0] = $conv294;
 $156 = HEAP32[$arrayidx285>>2]|0;
 $shr297119 = $156 >>> 16;
 $conv299 = $shr297119&255;
 $arrayidx300 = ((($output)) + 18|0);
 HEAP8[$arrayidx300>>0] = $conv299;
 $shr302120 = $156 >>> 24;
 $arrayidx305 = ((($output)) + 19|0);
 $157 = HEAP32[$arrayidx171>>2]|0;
 $or310 = $157 | $shr302120;
 $conv311 = $or310&255;
 HEAP8[$arrayidx305>>0] = $conv311;
 $shr313121 = $157 >>> 8;
 $conv315 = $shr313121&255;
 $arrayidx316 = ((($output)) + 20|0);
 HEAP8[$arrayidx316>>0] = $conv315;
 $158 = HEAP32[$arrayidx171>>2]|0;
 $shr318122 = $158 >>> 16;
 $conv320 = $shr318122&255;
 $arrayidx321 = ((($output)) + 21|0);
 HEAP8[$arrayidx321>>0] = $conv320;
 $shr323123 = $158 >>> 24;
 $arrayidx326 = ((($output)) + 22|0);
 $159 = HEAP32[$arrayidx173>>2]|0;
 $or331 = $159 | $shr323123;
 $conv332 = $or331&255;
 HEAP8[$arrayidx326>>0] = $conv332;
 $shr334124 = $159 >>> 8;
 $conv336 = $shr334124&255;
 $arrayidx337 = ((($output)) + 23|0);
 HEAP8[$arrayidx337>>0] = $conv336;
 $160 = HEAP32[$arrayidx173>>2]|0;
 $shr339125 = $160 >>> 16;
 $conv341 = $shr339125&255;
 $arrayidx342 = ((($output)) + 24|0);
 HEAP8[$arrayidx342>>0] = $conv341;
 $shr344126 = $160 >>> 24;
 $arrayidx347 = ((($output)) + 25|0);
 $161 = HEAP32[$arrayidx175>>2]|0;
 $or352 = $161 | $shr344126;
 $conv353 = $or352&255;
 HEAP8[$arrayidx347>>0] = $conv353;
 $shr355127 = $161 >>> 8;
 $conv357 = $shr355127&255;
 $arrayidx358 = ((($output)) + 26|0);
 HEAP8[$arrayidx358>>0] = $conv357;
 $162 = HEAP32[$arrayidx175>>2]|0;
 $shr360128 = $162 >>> 16;
 $conv362 = $shr360128&255;
 $arrayidx363 = ((($output)) + 27|0);
 HEAP8[$arrayidx363>>0] = $conv362;
 $shr365129 = $162 >>> 24;
 $arrayidx368 = ((($output)) + 28|0);
 $163 = HEAP32[$arrayidx177>>2]|0;
 $or373 = $163 | $shr365129;
 $conv374 = $or373&255;
 HEAP8[$arrayidx368>>0] = $conv374;
 $shr376130 = $163 >>> 8;
 $conv378 = $shr376130&255;
 $arrayidx379 = ((($output)) + 29|0);
 HEAP8[$arrayidx379>>0] = $conv378;
 $164 = HEAP32[$arrayidx177>>2]|0;
 $shr381131 = $164 >>> 16;
 $conv383 = $shr381131&255;
 $arrayidx384 = ((($output)) + 30|0);
 HEAP8[$arrayidx384>>0] = $conv383;
 $shr386132 = $164 >>> 24;
 $conv388 = $shr386132&255;
 $arrayidx389 = ((($output)) + 31|0);
 HEAP8[$arrayidx389>>0] = $conv388;
 STACKTOP = sp;return;
}
function _s32_gte($a) {
 $a = $a|0;
 var $neg = 0, $shr = 0, $sub = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $sub = (($a) + -67108845)|0;
 $shr = $sub >> 31;
 $neg = $shr ^ -1;
 return ($neg|0);
}
function _s32_eq($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $and = 0, $and2 = 0, $and4 = 0, $and6 = 0, $and8 = 0, $neg = 0, $shl = 0, $shl1 = 0, $shl3 = 0, $shl5 = 0, $shl7 = 0, $shr = 0, $xor = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $xor = $a ^ -1;
 $neg = $xor ^ $b;
 $shl = $neg << 16;
 $and = $shl & $neg;
 $shl1 = $and << 8;
 $and2 = $shl1 & $and;
 $shl3 = $and2 << 4;
 $and4 = $shl3 & $and2;
 $shl5 = $and4 << 2;
 $and6 = $shl5 & $and4;
 $shl7 = $and6 << 1;
 $and8 = $shl7 & $and6;
 $shr = $and8 >> 31;
 return ($shr|0);
}
function _fproduct($output,$in2,$in) {
 $output = $output|0;
 $in2 = $in2|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0;
 var $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0;
 var $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0;
 var $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0;
 var $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0;
 var $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0;
 var $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0;
 var $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0, $1159 = 0;
 var $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0, $1177 = 0;
 var $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0, $1193 = 0, $1194 = 0, $1195 = 0;
 var $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0, $1210 = 0, $1211 = 0, $1212 = 0;
 var $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0, $1229 = 0, $123 = 0, $1230 = 0;
 var $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0, $1247 = 0, $1248 = 0, $1249 = 0;
 var $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0, $1265 = 0, $1266 = 0, $1267 = 0;
 var $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0, $1283 = 0, $1284 = 0, $1285 = 0;
 var $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0, $1300 = 0, $1301 = 0, $1302 = 0;
 var $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0, $1319 = 0, $132 = 0, $1320 = 0;
 var $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0, $1337 = 0, $1338 = 0, $1339 = 0;
 var $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0, $1355 = 0, $1356 = 0, $1357 = 0;
 var $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0, $1373 = 0, $1374 = 0, $1375 = 0;
 var $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0, $1391 = 0, $1392 = 0, $1393 = 0;
 var $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0, $1409 = 0, $141 = 0, $1410 = 0;
 var $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0, $1427 = 0, $1428 = 0, $1429 = 0;
 var $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0, $1445 = 0, $1446 = 0, $1447 = 0;
 var $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0, $1463 = 0, $1464 = 0, $1465 = 0;
 var $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0, $1481 = 0, $1482 = 0, $1483 = 0;
 var $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0, $15 = 0, $150 = 0, $1500 = 0;
 var $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0, $1517 = 0, $1518 = 0, $1519 = 0;
 var $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0, $1535 = 0, $1536 = 0, $1537 = 0;
 var $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0, $1553 = 0, $1554 = 0, $1555 = 0;
 var $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0, $1571 = 0, $1572 = 0, $1573 = 0;
 var $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0, $159 = 0, $1590 = 0, $1591 = 0;
 var $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0, $1607 = 0, $1608 = 0, $1609 = 0;
 var $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0, $1625 = 0, $1626 = 0, $1627 = 0;
 var $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0, $1643 = 0, $1644 = 0, $1645 = 0;
 var $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0, $1661 = 0, $1662 = 0, $1663 = 0;
 var $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0, $168 = 0, $1680 = 0, $1681 = 0;
 var $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0, $1698 = 0, $1699 = 0, $17 = 0;
 var $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0, $1715 = 0, $1716 = 0, $1717 = 0;
 var $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0, $1733 = 0, $1734 = 0, $1735 = 0;
 var $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0, $1751 = 0, $1752 = 0, $1753 = 0;
 var $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0, $177 = 0, $1770 = 0, $1771 = 0;
 var $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0, $1788 = 0, $1789 = 0, $179 = 0;
 var $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0, $1805 = 0, $1806 = 0, $1807 = 0;
 var $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $1815 = 0, $1816 = 0, $1817 = 0, $1818 = 0, $1819 = 0, $182 = 0, $1820 = 0, $1821 = 0, $1822 = 0, $1823 = 0, $1824 = 0, $1825 = 0;
 var $1826 = 0, $1827 = 0, $1828 = 0, $1829 = 0, $183 = 0, $1830 = 0, $1831 = 0, $1832 = 0, $1833 = 0, $1834 = 0, $1835 = 0, $1836 = 0, $1837 = 0, $1838 = 0, $1839 = 0, $184 = 0, $1840 = 0, $1841 = 0, $1842 = 0, $1843 = 0;
 var $1844 = 0, $1845 = 0, $1846 = 0, $1847 = 0, $1848 = 0, $1849 = 0, $185 = 0, $1850 = 0, $1851 = 0, $1852 = 0, $1853 = 0, $1854 = 0, $1855 = 0, $1856 = 0, $1857 = 0, $1858 = 0, $1859 = 0, $186 = 0, $1860 = 0, $1861 = 0;
 var $1862 = 0, $1863 = 0, $1864 = 0, $1865 = 0, $1866 = 0, $1867 = 0, $1868 = 0, $1869 = 0, $187 = 0, $1870 = 0, $1871 = 0, $1872 = 0, $1873 = 0, $1874 = 0, $1875 = 0, $1876 = 0, $1877 = 0, $1878 = 0, $1879 = 0, $188 = 0;
 var $1880 = 0, $1881 = 0, $1882 = 0, $1883 = 0, $1884 = 0, $1885 = 0, $1886 = 0, $1887 = 0, $1888 = 0, $1889 = 0, $189 = 0, $1890 = 0, $1891 = 0, $1892 = 0, $1893 = 0, $1894 = 0, $1895 = 0, $1896 = 0, $1897 = 0, $1898 = 0;
 var $1899 = 0, $19 = 0, $190 = 0, $1900 = 0, $1901 = 0, $1902 = 0, $1903 = 0, $1904 = 0, $1905 = 0, $1906 = 0, $1907 = 0, $1908 = 0, $1909 = 0, $191 = 0, $1910 = 0, $1911 = 0, $1912 = 0, $1913 = 0, $1914 = 0, $1915 = 0;
 var $1916 = 0, $1917 = 0, $1918 = 0, $1919 = 0, $192 = 0, $1920 = 0, $1921 = 0, $1922 = 0, $1923 = 0, $1924 = 0, $1925 = 0, $1926 = 0, $1927 = 0, $1928 = 0, $1929 = 0, $193 = 0, $1930 = 0, $1931 = 0, $1932 = 0, $1933 = 0;
 var $1934 = 0, $1935 = 0, $1936 = 0, $1937 = 0, $1938 = 0, $1939 = 0, $194 = 0, $1940 = 0, $1941 = 0, $1942 = 0, $1943 = 0, $1944 = 0, $1945 = 0, $1946 = 0, $1947 = 0, $1948 = 0, $1949 = 0, $195 = 0, $1950 = 0, $1951 = 0;
 var $1952 = 0, $1953 = 0, $1954 = 0, $1955 = 0, $1956 = 0, $1957 = 0, $1958 = 0, $1959 = 0, $196 = 0, $1960 = 0, $1961 = 0, $1962 = 0, $1963 = 0, $1964 = 0, $1965 = 0, $1966 = 0, $1967 = 0, $1968 = 0, $1969 = 0, $197 = 0;
 var $1970 = 0, $1971 = 0, $1972 = 0, $1973 = 0, $1974 = 0, $1975 = 0, $1976 = 0, $1977 = 0, $1978 = 0, $1979 = 0, $198 = 0, $1980 = 0, $1981 = 0, $1982 = 0, $1983 = 0, $1984 = 0, $1985 = 0, $1986 = 0, $1987 = 0, $1988 = 0;
 var $1989 = 0, $199 = 0, $1990 = 0, $1991 = 0, $1992 = 0, $1993 = 0, $1994 = 0, $1995 = 0, $1996 = 0, $1997 = 0, $1998 = 0, $1999 = 0, $2 = 0, $20 = 0, $200 = 0, $2000 = 0, $2001 = 0, $2002 = 0, $2003 = 0, $2004 = 0;
 var $2005 = 0, $2006 = 0, $2007 = 0, $2008 = 0, $2009 = 0, $201 = 0, $2010 = 0, $2011 = 0, $2012 = 0, $2013 = 0, $2014 = 0, $2015 = 0, $2016 = 0, $2017 = 0, $2018 = 0, $2019 = 0, $202 = 0, $2020 = 0, $2021 = 0, $2022 = 0;
 var $2023 = 0, $2024 = 0, $2025 = 0, $2026 = 0, $2027 = 0, $2028 = 0, $2029 = 0, $203 = 0, $2030 = 0, $2031 = 0, $2032 = 0, $2033 = 0, $2034 = 0, $2035 = 0, $2036 = 0, $2037 = 0, $2038 = 0, $2039 = 0, $204 = 0, $2040 = 0;
 var $2041 = 0, $2042 = 0, $2043 = 0, $2044 = 0, $2045 = 0, $2046 = 0, $2047 = 0, $2048 = 0, $2049 = 0, $205 = 0, $2050 = 0, $2051 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0;
 var $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0;
 var $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0;
 var $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0;
 var $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0;
 var $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0;
 var $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0;
 var $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0;
 var $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0;
 var $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0;
 var $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0;
 var $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0;
 var $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0;
 var $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0;
 var $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0;
 var $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0;
 var $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0;
 var $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0;
 var $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0;
 var $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0;
 var $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0;
 var $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0;
 var $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0;
 var $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0;
 var $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0;
 var $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0;
 var $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0;
 var $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0;
 var $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0;
 var $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0;
 var $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0;
 var $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0;
 var $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0;
 var $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0;
 var $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0;
 var $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $arrayidx105 = 0, $arrayidx110 = 0, $arrayidx118 = 0, $arrayidx13 = 0, $arrayidx153 = 0, $arrayidx158 = 0, $arrayidx166 = 0, $arrayidx20 = 0;
 var $arrayidx210 = 0, $arrayidx215 = 0, $arrayidx223 = 0, $arrayidx274 = 0, $arrayidx279 = 0, $arrayidx287 = 0, $arrayidx32 = 0, $arrayidx347 = 0, $arrayidx352 = 0, $arrayidx360 = 0, $arrayidx37 = 0, $arrayidx427 = 0, $arrayidx432 = 0, $arrayidx440 = 0, $arrayidx45 = 0, $arrayidx513 = 0, $arrayidx577 = 0, $arrayidx634 = 0, $arrayidx64 = 0, $arrayidx682 = 0;
 var $arrayidx69 = 0, $arrayidx723 = 0, $arrayidx755 = 0, $arrayidx77 = 0, $arrayidx780 = 0, $arrayidx796 = 0, $arrayidx805 = 0, $arrayidx9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $in2;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = (_bitshift64Ashr(0,($2|0),32)|0);
 $7 = tempRet0;
 $8 = $in;
 $9 = $8;
 $10 = HEAP32[$9>>2]|0;
 $11 = (($8) + 4)|0;
 $12 = $11;
 $13 = HEAP32[$12>>2]|0;
 $14 = (_bitshift64Ashr(0,($10|0),32)|0);
 $15 = tempRet0;
 $16 = (___muldi3(($14|0),($15|0),($6|0),($7|0))|0);
 $17 = tempRet0;
 $18 = $output;
 $19 = $18;
 HEAP32[$19>>2] = $16;
 $20 = (($18) + 4)|0;
 $21 = $20;
 HEAP32[$21>>2] = $17;
 $22 = $in2;
 $23 = $22;
 $24 = HEAP32[$23>>2]|0;
 $25 = (($22) + 4)|0;
 $26 = $25;
 $27 = HEAP32[$26>>2]|0;
 $28 = (_bitshift64Ashr(0,($24|0),32)|0);
 $29 = tempRet0;
 $arrayidx9 = ((($in)) + 8|0);
 $30 = $arrayidx9;
 $31 = $30;
 $32 = HEAP32[$31>>2]|0;
 $33 = (($30) + 4)|0;
 $34 = $33;
 $35 = HEAP32[$34>>2]|0;
 $36 = (_bitshift64Ashr(0,($32|0),32)|0);
 $37 = tempRet0;
 $38 = (___muldi3(($36|0),($37|0),($28|0),($29|0))|0);
 $39 = tempRet0;
 $arrayidx13 = ((($in2)) + 8|0);
 $40 = $arrayidx13;
 $41 = $40;
 $42 = HEAP32[$41>>2]|0;
 $43 = (($40) + 4)|0;
 $44 = $43;
 $45 = HEAP32[$44>>2]|0;
 $46 = (_bitshift64Ashr(0,($42|0),32)|0);
 $47 = tempRet0;
 $48 = $in;
 $49 = $48;
 $50 = HEAP32[$49>>2]|0;
 $51 = (($48) + 4)|0;
 $52 = $51;
 $53 = HEAP32[$52>>2]|0;
 $54 = (_bitshift64Ashr(0,($50|0),32)|0);
 $55 = tempRet0;
 $56 = (___muldi3(($54|0),($55|0),($46|0),($47|0))|0);
 $57 = tempRet0;
 $58 = (_i64Add(($56|0),($57|0),($38|0),($39|0))|0);
 $59 = tempRet0;
 $arrayidx20 = ((($output)) + 8|0);
 $60 = $arrayidx20;
 $61 = $60;
 HEAP32[$61>>2] = $58;
 $62 = (($60) + 4)|0;
 $63 = $62;
 HEAP32[$63>>2] = $59;
 $64 = $arrayidx13;
 $65 = $64;
 $66 = HEAP32[$65>>2]|0;
 $67 = (($64) + 4)|0;
 $68 = $67;
 $69 = HEAP32[$68>>2]|0;
 $70 = (_bitshift64Ashr(0,($66|0),31)|0);
 $71 = tempRet0;
 $72 = $arrayidx9;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $78 = (_bitshift64Ashr(0,($74|0),32)|0);
 $79 = tempRet0;
 $80 = (___muldi3(($78|0),($79|0),($70|0),($71|0))|0);
 $81 = tempRet0;
 $82 = $in2;
 $83 = $82;
 $84 = HEAP32[$83>>2]|0;
 $85 = (($82) + 4)|0;
 $86 = $85;
 $87 = HEAP32[$86>>2]|0;
 $88 = (_bitshift64Ashr(0,($84|0),32)|0);
 $89 = tempRet0;
 $arrayidx32 = ((($in)) + 16|0);
 $90 = $arrayidx32;
 $91 = $90;
 $92 = HEAP32[$91>>2]|0;
 $93 = (($90) + 4)|0;
 $94 = $93;
 $95 = HEAP32[$94>>2]|0;
 $96 = (_bitshift64Ashr(0,($92|0),32)|0);
 $97 = tempRet0;
 $98 = (___muldi3(($96|0),($97|0),($88|0),($89|0))|0);
 $99 = tempRet0;
 $100 = (_i64Add(($98|0),($99|0),($80|0),($81|0))|0);
 $101 = tempRet0;
 $arrayidx37 = ((($in2)) + 16|0);
 $102 = $arrayidx37;
 $103 = $102;
 $104 = HEAP32[$103>>2]|0;
 $105 = (($102) + 4)|0;
 $106 = $105;
 $107 = HEAP32[$106>>2]|0;
 $108 = (_bitshift64Ashr(0,($104|0),32)|0);
 $109 = tempRet0;
 $110 = $in;
 $111 = $110;
 $112 = HEAP32[$111>>2]|0;
 $113 = (($110) + 4)|0;
 $114 = $113;
 $115 = HEAP32[$114>>2]|0;
 $116 = (_bitshift64Ashr(0,($112|0),32)|0);
 $117 = tempRet0;
 $118 = (___muldi3(($116|0),($117|0),($108|0),($109|0))|0);
 $119 = tempRet0;
 $120 = (_i64Add(($100|0),($101|0),($118|0),($119|0))|0);
 $121 = tempRet0;
 $arrayidx45 = ((($output)) + 16|0);
 $122 = $arrayidx45;
 $123 = $122;
 HEAP32[$123>>2] = $120;
 $124 = (($122) + 4)|0;
 $125 = $124;
 HEAP32[$125>>2] = $121;
 $126 = $arrayidx13;
 $127 = $126;
 $128 = HEAP32[$127>>2]|0;
 $129 = (($126) + 4)|0;
 $130 = $129;
 $131 = HEAP32[$130>>2]|0;
 $132 = (_bitshift64Ashr(0,($128|0),32)|0);
 $133 = tempRet0;
 $134 = $arrayidx32;
 $135 = $134;
 $136 = HEAP32[$135>>2]|0;
 $137 = (($134) + 4)|0;
 $138 = $137;
 $139 = HEAP32[$138>>2]|0;
 $140 = (_bitshift64Ashr(0,($136|0),32)|0);
 $141 = tempRet0;
 $142 = (___muldi3(($140|0),($141|0),($132|0),($133|0))|0);
 $143 = tempRet0;
 $144 = $arrayidx37;
 $145 = $144;
 $146 = HEAP32[$145>>2]|0;
 $147 = (($144) + 4)|0;
 $148 = $147;
 $149 = HEAP32[$148>>2]|0;
 $150 = (_bitshift64Ashr(0,($146|0),32)|0);
 $151 = tempRet0;
 $152 = $arrayidx9;
 $153 = $152;
 $154 = HEAP32[$153>>2]|0;
 $155 = (($152) + 4)|0;
 $156 = $155;
 $157 = HEAP32[$156>>2]|0;
 $158 = (_bitshift64Ashr(0,($154|0),32)|0);
 $159 = tempRet0;
 $160 = (___muldi3(($158|0),($159|0),($150|0),($151|0))|0);
 $161 = tempRet0;
 $162 = (_i64Add(($160|0),($161|0),($142|0),($143|0))|0);
 $163 = tempRet0;
 $164 = $in2;
 $165 = $164;
 $166 = HEAP32[$165>>2]|0;
 $167 = (($164) + 4)|0;
 $168 = $167;
 $169 = HEAP32[$168>>2]|0;
 $170 = (_bitshift64Ashr(0,($166|0),32)|0);
 $171 = tempRet0;
 $arrayidx64 = ((($in)) + 24|0);
 $172 = $arrayidx64;
 $173 = $172;
 $174 = HEAP32[$173>>2]|0;
 $175 = (($172) + 4)|0;
 $176 = $175;
 $177 = HEAP32[$176>>2]|0;
 $178 = (_bitshift64Ashr(0,($174|0),32)|0);
 $179 = tempRet0;
 $180 = (___muldi3(($178|0),($179|0),($170|0),($171|0))|0);
 $181 = tempRet0;
 $182 = (_i64Add(($162|0),($163|0),($180|0),($181|0))|0);
 $183 = tempRet0;
 $arrayidx69 = ((($in2)) + 24|0);
 $184 = $arrayidx69;
 $185 = $184;
 $186 = HEAP32[$185>>2]|0;
 $187 = (($184) + 4)|0;
 $188 = $187;
 $189 = HEAP32[$188>>2]|0;
 $190 = (_bitshift64Ashr(0,($186|0),32)|0);
 $191 = tempRet0;
 $192 = $in;
 $193 = $192;
 $194 = HEAP32[$193>>2]|0;
 $195 = (($192) + 4)|0;
 $196 = $195;
 $197 = HEAP32[$196>>2]|0;
 $198 = (_bitshift64Ashr(0,($194|0),32)|0);
 $199 = tempRet0;
 $200 = (___muldi3(($198|0),($199|0),($190|0),($191|0))|0);
 $201 = tempRet0;
 $202 = (_i64Add(($182|0),($183|0),($200|0),($201|0))|0);
 $203 = tempRet0;
 $arrayidx77 = ((($output)) + 24|0);
 $204 = $arrayidx77;
 $205 = $204;
 HEAP32[$205>>2] = $202;
 $206 = (($204) + 4)|0;
 $207 = $206;
 HEAP32[$207>>2] = $203;
 $208 = $arrayidx37;
 $209 = $208;
 $210 = HEAP32[$209>>2]|0;
 $211 = (($208) + 4)|0;
 $212 = $211;
 $213 = HEAP32[$212>>2]|0;
 $214 = (_bitshift64Ashr(0,($210|0),32)|0);
 $215 = tempRet0;
 $216 = $arrayidx32;
 $217 = $216;
 $218 = HEAP32[$217>>2]|0;
 $219 = (($216) + 4)|0;
 $220 = $219;
 $221 = HEAP32[$220>>2]|0;
 $222 = (_bitshift64Ashr(0,($218|0),32)|0);
 $223 = tempRet0;
 $224 = (___muldi3(($222|0),($223|0),($214|0),($215|0))|0);
 $225 = tempRet0;
 $226 = $arrayidx13;
 $227 = $226;
 $228 = HEAP32[$227>>2]|0;
 $229 = (($226) + 4)|0;
 $230 = $229;
 $231 = HEAP32[$230>>2]|0;
 $232 = (_bitshift64Ashr(0,($228|0),32)|0);
 $233 = tempRet0;
 $234 = $arrayidx64;
 $235 = $234;
 $236 = HEAP32[$235>>2]|0;
 $237 = (($234) + 4)|0;
 $238 = $237;
 $239 = HEAP32[$238>>2]|0;
 $240 = (_bitshift64Ashr(0,($236|0),32)|0);
 $241 = tempRet0;
 $242 = (___muldi3(($240|0),($241|0),($232|0),($233|0))|0);
 $243 = tempRet0;
 $244 = $arrayidx69;
 $245 = $244;
 $246 = HEAP32[$245>>2]|0;
 $247 = (($244) + 4)|0;
 $248 = $247;
 $249 = HEAP32[$248>>2]|0;
 $250 = (_bitshift64Ashr(0,($246|0),32)|0);
 $251 = tempRet0;
 $252 = $arrayidx9;
 $253 = $252;
 $254 = HEAP32[$253>>2]|0;
 $255 = (($252) + 4)|0;
 $256 = $255;
 $257 = HEAP32[$256>>2]|0;
 $258 = (_bitshift64Ashr(0,($254|0),32)|0);
 $259 = tempRet0;
 $260 = (___muldi3(($258|0),($259|0),($250|0),($251|0))|0);
 $261 = tempRet0;
 $262 = (_i64Add(($260|0),($261|0),($242|0),($243|0))|0);
 $263 = tempRet0;
 $264 = (_bitshift64Shl(($262|0),($263|0),1)|0);
 $265 = tempRet0;
 $266 = (_i64Add(($264|0),($265|0),($224|0),($225|0))|0);
 $267 = tempRet0;
 $268 = $in2;
 $269 = $268;
 $270 = HEAP32[$269>>2]|0;
 $271 = (($268) + 4)|0;
 $272 = $271;
 $273 = HEAP32[$272>>2]|0;
 $274 = (_bitshift64Ashr(0,($270|0),32)|0);
 $275 = tempRet0;
 $arrayidx105 = ((($in)) + 32|0);
 $276 = $arrayidx105;
 $277 = $276;
 $278 = HEAP32[$277>>2]|0;
 $279 = (($276) + 4)|0;
 $280 = $279;
 $281 = HEAP32[$280>>2]|0;
 $282 = (_bitshift64Ashr(0,($278|0),32)|0);
 $283 = tempRet0;
 $284 = (___muldi3(($282|0),($283|0),($274|0),($275|0))|0);
 $285 = tempRet0;
 $286 = (_i64Add(($266|0),($267|0),($284|0),($285|0))|0);
 $287 = tempRet0;
 $arrayidx110 = ((($in2)) + 32|0);
 $288 = $arrayidx110;
 $289 = $288;
 $290 = HEAP32[$289>>2]|0;
 $291 = (($288) + 4)|0;
 $292 = $291;
 $293 = HEAP32[$292>>2]|0;
 $294 = (_bitshift64Ashr(0,($290|0),32)|0);
 $295 = tempRet0;
 $296 = $in;
 $297 = $296;
 $298 = HEAP32[$297>>2]|0;
 $299 = (($296) + 4)|0;
 $300 = $299;
 $301 = HEAP32[$300>>2]|0;
 $302 = (_bitshift64Ashr(0,($298|0),32)|0);
 $303 = tempRet0;
 $304 = (___muldi3(($302|0),($303|0),($294|0),($295|0))|0);
 $305 = tempRet0;
 $306 = (_i64Add(($286|0),($287|0),($304|0),($305|0))|0);
 $307 = tempRet0;
 $arrayidx118 = ((($output)) + 32|0);
 $308 = $arrayidx118;
 $309 = $308;
 HEAP32[$309>>2] = $306;
 $310 = (($308) + 4)|0;
 $311 = $310;
 HEAP32[$311>>2] = $307;
 $312 = $arrayidx37;
 $313 = $312;
 $314 = HEAP32[$313>>2]|0;
 $315 = (($312) + 4)|0;
 $316 = $315;
 $317 = HEAP32[$316>>2]|0;
 $318 = (_bitshift64Ashr(0,($314|0),32)|0);
 $319 = tempRet0;
 $320 = $arrayidx64;
 $321 = $320;
 $322 = HEAP32[$321>>2]|0;
 $323 = (($320) + 4)|0;
 $324 = $323;
 $325 = HEAP32[$324>>2]|0;
 $326 = (_bitshift64Ashr(0,($322|0),32)|0);
 $327 = tempRet0;
 $328 = (___muldi3(($326|0),($327|0),($318|0),($319|0))|0);
 $329 = tempRet0;
 $330 = $arrayidx69;
 $331 = $330;
 $332 = HEAP32[$331>>2]|0;
 $333 = (($330) + 4)|0;
 $334 = $333;
 $335 = HEAP32[$334>>2]|0;
 $336 = (_bitshift64Ashr(0,($332|0),32)|0);
 $337 = tempRet0;
 $338 = $arrayidx32;
 $339 = $338;
 $340 = HEAP32[$339>>2]|0;
 $341 = (($338) + 4)|0;
 $342 = $341;
 $343 = HEAP32[$342>>2]|0;
 $344 = (_bitshift64Ashr(0,($340|0),32)|0);
 $345 = tempRet0;
 $346 = (___muldi3(($344|0),($345|0),($336|0),($337|0))|0);
 $347 = tempRet0;
 $348 = (_i64Add(($346|0),($347|0),($328|0),($329|0))|0);
 $349 = tempRet0;
 $350 = $arrayidx13;
 $351 = $350;
 $352 = HEAP32[$351>>2]|0;
 $353 = (($350) + 4)|0;
 $354 = $353;
 $355 = HEAP32[$354>>2]|0;
 $356 = (_bitshift64Ashr(0,($352|0),32)|0);
 $357 = tempRet0;
 $358 = $arrayidx105;
 $359 = $358;
 $360 = HEAP32[$359>>2]|0;
 $361 = (($358) + 4)|0;
 $362 = $361;
 $363 = HEAP32[$362>>2]|0;
 $364 = (_bitshift64Ashr(0,($360|0),32)|0);
 $365 = tempRet0;
 $366 = (___muldi3(($364|0),($365|0),($356|0),($357|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($348|0),($349|0),($366|0),($367|0))|0);
 $369 = tempRet0;
 $370 = $arrayidx110;
 $371 = $370;
 $372 = HEAP32[$371>>2]|0;
 $373 = (($370) + 4)|0;
 $374 = $373;
 $375 = HEAP32[$374>>2]|0;
 $376 = (_bitshift64Ashr(0,($372|0),32)|0);
 $377 = tempRet0;
 $378 = $arrayidx9;
 $379 = $378;
 $380 = HEAP32[$379>>2]|0;
 $381 = (($378) + 4)|0;
 $382 = $381;
 $383 = HEAP32[$382>>2]|0;
 $384 = (_bitshift64Ashr(0,($380|0),32)|0);
 $385 = tempRet0;
 $386 = (___muldi3(($384|0),($385|0),($376|0),($377|0))|0);
 $387 = tempRet0;
 $388 = (_i64Add(($368|0),($369|0),($386|0),($387|0))|0);
 $389 = tempRet0;
 $390 = $in2;
 $391 = $390;
 $392 = HEAP32[$391>>2]|0;
 $393 = (($390) + 4)|0;
 $394 = $393;
 $395 = HEAP32[$394>>2]|0;
 $396 = (_bitshift64Ashr(0,($392|0),32)|0);
 $397 = tempRet0;
 $arrayidx153 = ((($in)) + 40|0);
 $398 = $arrayidx153;
 $399 = $398;
 $400 = HEAP32[$399>>2]|0;
 $401 = (($398) + 4)|0;
 $402 = $401;
 $403 = HEAP32[$402>>2]|0;
 $404 = (_bitshift64Ashr(0,($400|0),32)|0);
 $405 = tempRet0;
 $406 = (___muldi3(($404|0),($405|0),($396|0),($397|0))|0);
 $407 = tempRet0;
 $408 = (_i64Add(($388|0),($389|0),($406|0),($407|0))|0);
 $409 = tempRet0;
 $arrayidx158 = ((($in2)) + 40|0);
 $410 = $arrayidx158;
 $411 = $410;
 $412 = HEAP32[$411>>2]|0;
 $413 = (($410) + 4)|0;
 $414 = $413;
 $415 = HEAP32[$414>>2]|0;
 $416 = (_bitshift64Ashr(0,($412|0),32)|0);
 $417 = tempRet0;
 $418 = $in;
 $419 = $418;
 $420 = HEAP32[$419>>2]|0;
 $421 = (($418) + 4)|0;
 $422 = $421;
 $423 = HEAP32[$422>>2]|0;
 $424 = (_bitshift64Ashr(0,($420|0),32)|0);
 $425 = tempRet0;
 $426 = (___muldi3(($424|0),($425|0),($416|0),($417|0))|0);
 $427 = tempRet0;
 $428 = (_i64Add(($408|0),($409|0),($426|0),($427|0))|0);
 $429 = tempRet0;
 $arrayidx166 = ((($output)) + 40|0);
 $430 = $arrayidx166;
 $431 = $430;
 HEAP32[$431>>2] = $428;
 $432 = (($430) + 4)|0;
 $433 = $432;
 HEAP32[$433>>2] = $429;
 $434 = $arrayidx69;
 $435 = $434;
 $436 = HEAP32[$435>>2]|0;
 $437 = (($434) + 4)|0;
 $438 = $437;
 $439 = HEAP32[$438>>2]|0;
 $440 = (_bitshift64Ashr(0,($436|0),32)|0);
 $441 = tempRet0;
 $442 = $arrayidx64;
 $443 = $442;
 $444 = HEAP32[$443>>2]|0;
 $445 = (($442) + 4)|0;
 $446 = $445;
 $447 = HEAP32[$446>>2]|0;
 $448 = (_bitshift64Ashr(0,($444|0),32)|0);
 $449 = tempRet0;
 $450 = (___muldi3(($448|0),($449|0),($440|0),($441|0))|0);
 $451 = tempRet0;
 $452 = $arrayidx13;
 $453 = $452;
 $454 = HEAP32[$453>>2]|0;
 $455 = (($452) + 4)|0;
 $456 = $455;
 $457 = HEAP32[$456>>2]|0;
 $458 = (_bitshift64Ashr(0,($454|0),32)|0);
 $459 = tempRet0;
 $460 = $arrayidx153;
 $461 = $460;
 $462 = HEAP32[$461>>2]|0;
 $463 = (($460) + 4)|0;
 $464 = $463;
 $465 = HEAP32[$464>>2]|0;
 $466 = (_bitshift64Ashr(0,($462|0),32)|0);
 $467 = tempRet0;
 $468 = (___muldi3(($466|0),($467|0),($458|0),($459|0))|0);
 $469 = tempRet0;
 $470 = (_i64Add(($468|0),($469|0),($450|0),($451|0))|0);
 $471 = tempRet0;
 $472 = $arrayidx158;
 $473 = $472;
 $474 = HEAP32[$473>>2]|0;
 $475 = (($472) + 4)|0;
 $476 = $475;
 $477 = HEAP32[$476>>2]|0;
 $478 = (_bitshift64Ashr(0,($474|0),32)|0);
 $479 = tempRet0;
 $480 = $arrayidx9;
 $481 = $480;
 $482 = HEAP32[$481>>2]|0;
 $483 = (($480) + 4)|0;
 $484 = $483;
 $485 = HEAP32[$484>>2]|0;
 $486 = (_bitshift64Ashr(0,($482|0),32)|0);
 $487 = tempRet0;
 $488 = (___muldi3(($486|0),($487|0),($478|0),($479|0))|0);
 $489 = tempRet0;
 $490 = (_i64Add(($470|0),($471|0),($488|0),($489|0))|0);
 $491 = tempRet0;
 $492 = (_bitshift64Shl(($490|0),($491|0),1)|0);
 $493 = tempRet0;
 $494 = $arrayidx37;
 $495 = $494;
 $496 = HEAP32[$495>>2]|0;
 $497 = (($494) + 4)|0;
 $498 = $497;
 $499 = HEAP32[$498>>2]|0;
 $500 = (_bitshift64Ashr(0,($496|0),32)|0);
 $501 = tempRet0;
 $502 = $arrayidx105;
 $503 = $502;
 $504 = HEAP32[$503>>2]|0;
 $505 = (($502) + 4)|0;
 $506 = $505;
 $507 = HEAP32[$506>>2]|0;
 $508 = (_bitshift64Ashr(0,($504|0),32)|0);
 $509 = tempRet0;
 $510 = (___muldi3(($508|0),($509|0),($500|0),($501|0))|0);
 $511 = tempRet0;
 $512 = (_i64Add(($492|0),($493|0),($510|0),($511|0))|0);
 $513 = tempRet0;
 $514 = $arrayidx110;
 $515 = $514;
 $516 = HEAP32[$515>>2]|0;
 $517 = (($514) + 4)|0;
 $518 = $517;
 $519 = HEAP32[$518>>2]|0;
 $520 = (_bitshift64Ashr(0,($516|0),32)|0);
 $521 = tempRet0;
 $522 = $arrayidx32;
 $523 = $522;
 $524 = HEAP32[$523>>2]|0;
 $525 = (($522) + 4)|0;
 $526 = $525;
 $527 = HEAP32[$526>>2]|0;
 $528 = (_bitshift64Ashr(0,($524|0),32)|0);
 $529 = tempRet0;
 $530 = (___muldi3(($528|0),($529|0),($520|0),($521|0))|0);
 $531 = tempRet0;
 $532 = (_i64Add(($512|0),($513|0),($530|0),($531|0))|0);
 $533 = tempRet0;
 $534 = $in2;
 $535 = $534;
 $536 = HEAP32[$535>>2]|0;
 $537 = (($534) + 4)|0;
 $538 = $537;
 $539 = HEAP32[$538>>2]|0;
 $540 = (_bitshift64Ashr(0,($536|0),32)|0);
 $541 = tempRet0;
 $arrayidx210 = ((($in)) + 48|0);
 $542 = $arrayidx210;
 $543 = $542;
 $544 = HEAP32[$543>>2]|0;
 $545 = (($542) + 4)|0;
 $546 = $545;
 $547 = HEAP32[$546>>2]|0;
 $548 = (_bitshift64Ashr(0,($544|0),32)|0);
 $549 = tempRet0;
 $550 = (___muldi3(($548|0),($549|0),($540|0),($541|0))|0);
 $551 = tempRet0;
 $552 = (_i64Add(($532|0),($533|0),($550|0),($551|0))|0);
 $553 = tempRet0;
 $arrayidx215 = ((($in2)) + 48|0);
 $554 = $arrayidx215;
 $555 = $554;
 $556 = HEAP32[$555>>2]|0;
 $557 = (($554) + 4)|0;
 $558 = $557;
 $559 = HEAP32[$558>>2]|0;
 $560 = (_bitshift64Ashr(0,($556|0),32)|0);
 $561 = tempRet0;
 $562 = $in;
 $563 = $562;
 $564 = HEAP32[$563>>2]|0;
 $565 = (($562) + 4)|0;
 $566 = $565;
 $567 = HEAP32[$566>>2]|0;
 $568 = (_bitshift64Ashr(0,($564|0),32)|0);
 $569 = tempRet0;
 $570 = (___muldi3(($568|0),($569|0),($560|0),($561|0))|0);
 $571 = tempRet0;
 $572 = (_i64Add(($552|0),($553|0),($570|0),($571|0))|0);
 $573 = tempRet0;
 $arrayidx223 = ((($output)) + 48|0);
 $574 = $arrayidx223;
 $575 = $574;
 HEAP32[$575>>2] = $572;
 $576 = (($574) + 4)|0;
 $577 = $576;
 HEAP32[$577>>2] = $573;
 $578 = $arrayidx69;
 $579 = $578;
 $580 = HEAP32[$579>>2]|0;
 $581 = (($578) + 4)|0;
 $582 = $581;
 $583 = HEAP32[$582>>2]|0;
 $584 = (_bitshift64Ashr(0,($580|0),32)|0);
 $585 = tempRet0;
 $586 = $arrayidx105;
 $587 = $586;
 $588 = HEAP32[$587>>2]|0;
 $589 = (($586) + 4)|0;
 $590 = $589;
 $591 = HEAP32[$590>>2]|0;
 $592 = (_bitshift64Ashr(0,($588|0),32)|0);
 $593 = tempRet0;
 $594 = (___muldi3(($592|0),($593|0),($584|0),($585|0))|0);
 $595 = tempRet0;
 $596 = $arrayidx110;
 $597 = $596;
 $598 = HEAP32[$597>>2]|0;
 $599 = (($596) + 4)|0;
 $600 = $599;
 $601 = HEAP32[$600>>2]|0;
 $602 = (_bitshift64Ashr(0,($598|0),32)|0);
 $603 = tempRet0;
 $604 = $arrayidx64;
 $605 = $604;
 $606 = HEAP32[$605>>2]|0;
 $607 = (($604) + 4)|0;
 $608 = $607;
 $609 = HEAP32[$608>>2]|0;
 $610 = (_bitshift64Ashr(0,($606|0),32)|0);
 $611 = tempRet0;
 $612 = (___muldi3(($610|0),($611|0),($602|0),($603|0))|0);
 $613 = tempRet0;
 $614 = (_i64Add(($612|0),($613|0),($594|0),($595|0))|0);
 $615 = tempRet0;
 $616 = $arrayidx37;
 $617 = $616;
 $618 = HEAP32[$617>>2]|0;
 $619 = (($616) + 4)|0;
 $620 = $619;
 $621 = HEAP32[$620>>2]|0;
 $622 = (_bitshift64Ashr(0,($618|0),32)|0);
 $623 = tempRet0;
 $624 = $arrayidx153;
 $625 = $624;
 $626 = HEAP32[$625>>2]|0;
 $627 = (($624) + 4)|0;
 $628 = $627;
 $629 = HEAP32[$628>>2]|0;
 $630 = (_bitshift64Ashr(0,($626|0),32)|0);
 $631 = tempRet0;
 $632 = (___muldi3(($630|0),($631|0),($622|0),($623|0))|0);
 $633 = tempRet0;
 $634 = (_i64Add(($614|0),($615|0),($632|0),($633|0))|0);
 $635 = tempRet0;
 $636 = $arrayidx158;
 $637 = $636;
 $638 = HEAP32[$637>>2]|0;
 $639 = (($636) + 4)|0;
 $640 = $639;
 $641 = HEAP32[$640>>2]|0;
 $642 = (_bitshift64Ashr(0,($638|0),32)|0);
 $643 = tempRet0;
 $644 = $arrayidx32;
 $645 = $644;
 $646 = HEAP32[$645>>2]|0;
 $647 = (($644) + 4)|0;
 $648 = $647;
 $649 = HEAP32[$648>>2]|0;
 $650 = (_bitshift64Ashr(0,($646|0),32)|0);
 $651 = tempRet0;
 $652 = (___muldi3(($650|0),($651|0),($642|0),($643|0))|0);
 $653 = tempRet0;
 $654 = (_i64Add(($634|0),($635|0),($652|0),($653|0))|0);
 $655 = tempRet0;
 $656 = $arrayidx13;
 $657 = $656;
 $658 = HEAP32[$657>>2]|0;
 $659 = (($656) + 4)|0;
 $660 = $659;
 $661 = HEAP32[$660>>2]|0;
 $662 = (_bitshift64Ashr(0,($658|0),32)|0);
 $663 = tempRet0;
 $664 = $arrayidx210;
 $665 = $664;
 $666 = HEAP32[$665>>2]|0;
 $667 = (($664) + 4)|0;
 $668 = $667;
 $669 = HEAP32[$668>>2]|0;
 $670 = (_bitshift64Ashr(0,($666|0),32)|0);
 $671 = tempRet0;
 $672 = (___muldi3(($670|0),($671|0),($662|0),($663|0))|0);
 $673 = tempRet0;
 $674 = (_i64Add(($654|0),($655|0),($672|0),($673|0))|0);
 $675 = tempRet0;
 $676 = $arrayidx215;
 $677 = $676;
 $678 = HEAP32[$677>>2]|0;
 $679 = (($676) + 4)|0;
 $680 = $679;
 $681 = HEAP32[$680>>2]|0;
 $682 = (_bitshift64Ashr(0,($678|0),32)|0);
 $683 = tempRet0;
 $684 = $arrayidx9;
 $685 = $684;
 $686 = HEAP32[$685>>2]|0;
 $687 = (($684) + 4)|0;
 $688 = $687;
 $689 = HEAP32[$688>>2]|0;
 $690 = (_bitshift64Ashr(0,($686|0),32)|0);
 $691 = tempRet0;
 $692 = (___muldi3(($690|0),($691|0),($682|0),($683|0))|0);
 $693 = tempRet0;
 $694 = (_i64Add(($674|0),($675|0),($692|0),($693|0))|0);
 $695 = tempRet0;
 $696 = $in2;
 $697 = $696;
 $698 = HEAP32[$697>>2]|0;
 $699 = (($696) + 4)|0;
 $700 = $699;
 $701 = HEAP32[$700>>2]|0;
 $702 = (_bitshift64Ashr(0,($698|0),32)|0);
 $703 = tempRet0;
 $arrayidx274 = ((($in)) + 56|0);
 $704 = $arrayidx274;
 $705 = $704;
 $706 = HEAP32[$705>>2]|0;
 $707 = (($704) + 4)|0;
 $708 = $707;
 $709 = HEAP32[$708>>2]|0;
 $710 = (_bitshift64Ashr(0,($706|0),32)|0);
 $711 = tempRet0;
 $712 = (___muldi3(($710|0),($711|0),($702|0),($703|0))|0);
 $713 = tempRet0;
 $714 = (_i64Add(($694|0),($695|0),($712|0),($713|0))|0);
 $715 = tempRet0;
 $arrayidx279 = ((($in2)) + 56|0);
 $716 = $arrayidx279;
 $717 = $716;
 $718 = HEAP32[$717>>2]|0;
 $719 = (($716) + 4)|0;
 $720 = $719;
 $721 = HEAP32[$720>>2]|0;
 $722 = (_bitshift64Ashr(0,($718|0),32)|0);
 $723 = tempRet0;
 $724 = $in;
 $725 = $724;
 $726 = HEAP32[$725>>2]|0;
 $727 = (($724) + 4)|0;
 $728 = $727;
 $729 = HEAP32[$728>>2]|0;
 $730 = (_bitshift64Ashr(0,($726|0),32)|0);
 $731 = tempRet0;
 $732 = (___muldi3(($730|0),($731|0),($722|0),($723|0))|0);
 $733 = tempRet0;
 $734 = (_i64Add(($714|0),($715|0),($732|0),($733|0))|0);
 $735 = tempRet0;
 $arrayidx287 = ((($output)) + 56|0);
 $736 = $arrayidx287;
 $737 = $736;
 HEAP32[$737>>2] = $734;
 $738 = (($736) + 4)|0;
 $739 = $738;
 HEAP32[$739>>2] = $735;
 $740 = $arrayidx110;
 $741 = $740;
 $742 = HEAP32[$741>>2]|0;
 $743 = (($740) + 4)|0;
 $744 = $743;
 $745 = HEAP32[$744>>2]|0;
 $746 = (_bitshift64Ashr(0,($742|0),32)|0);
 $747 = tempRet0;
 $748 = $arrayidx105;
 $749 = $748;
 $750 = HEAP32[$749>>2]|0;
 $751 = (($748) + 4)|0;
 $752 = $751;
 $753 = HEAP32[$752>>2]|0;
 $754 = (_bitshift64Ashr(0,($750|0),32)|0);
 $755 = tempRet0;
 $756 = (___muldi3(($754|0),($755|0),($746|0),($747|0))|0);
 $757 = tempRet0;
 $758 = $arrayidx69;
 $759 = $758;
 $760 = HEAP32[$759>>2]|0;
 $761 = (($758) + 4)|0;
 $762 = $761;
 $763 = HEAP32[$762>>2]|0;
 $764 = (_bitshift64Ashr(0,($760|0),32)|0);
 $765 = tempRet0;
 $766 = $arrayidx153;
 $767 = $766;
 $768 = HEAP32[$767>>2]|0;
 $769 = (($766) + 4)|0;
 $770 = $769;
 $771 = HEAP32[$770>>2]|0;
 $772 = (_bitshift64Ashr(0,($768|0),32)|0);
 $773 = tempRet0;
 $774 = (___muldi3(($772|0),($773|0),($764|0),($765|0))|0);
 $775 = tempRet0;
 $776 = $arrayidx158;
 $777 = $776;
 $778 = HEAP32[$777>>2]|0;
 $779 = (($776) + 4)|0;
 $780 = $779;
 $781 = HEAP32[$780>>2]|0;
 $782 = (_bitshift64Ashr(0,($778|0),32)|0);
 $783 = tempRet0;
 $784 = $arrayidx64;
 $785 = $784;
 $786 = HEAP32[$785>>2]|0;
 $787 = (($784) + 4)|0;
 $788 = $787;
 $789 = HEAP32[$788>>2]|0;
 $790 = (_bitshift64Ashr(0,($786|0),32)|0);
 $791 = tempRet0;
 $792 = (___muldi3(($790|0),($791|0),($782|0),($783|0))|0);
 $793 = tempRet0;
 $794 = (_i64Add(($792|0),($793|0),($774|0),($775|0))|0);
 $795 = tempRet0;
 $796 = $arrayidx13;
 $797 = $796;
 $798 = HEAP32[$797>>2]|0;
 $799 = (($796) + 4)|0;
 $800 = $799;
 $801 = HEAP32[$800>>2]|0;
 $802 = (_bitshift64Ashr(0,($798|0),32)|0);
 $803 = tempRet0;
 $804 = $arrayidx274;
 $805 = $804;
 $806 = HEAP32[$805>>2]|0;
 $807 = (($804) + 4)|0;
 $808 = $807;
 $809 = HEAP32[$808>>2]|0;
 $810 = (_bitshift64Ashr(0,($806|0),32)|0);
 $811 = tempRet0;
 $812 = (___muldi3(($810|0),($811|0),($802|0),($803|0))|0);
 $813 = tempRet0;
 $814 = (_i64Add(($794|0),($795|0),($812|0),($813|0))|0);
 $815 = tempRet0;
 $816 = $arrayidx279;
 $817 = $816;
 $818 = HEAP32[$817>>2]|0;
 $819 = (($816) + 4)|0;
 $820 = $819;
 $821 = HEAP32[$820>>2]|0;
 $822 = (_bitshift64Ashr(0,($818|0),32)|0);
 $823 = tempRet0;
 $824 = $arrayidx9;
 $825 = $824;
 $826 = HEAP32[$825>>2]|0;
 $827 = (($824) + 4)|0;
 $828 = $827;
 $829 = HEAP32[$828>>2]|0;
 $830 = (_bitshift64Ashr(0,($826|0),32)|0);
 $831 = tempRet0;
 $832 = (___muldi3(($830|0),($831|0),($822|0),($823|0))|0);
 $833 = tempRet0;
 $834 = (_i64Add(($814|0),($815|0),($832|0),($833|0))|0);
 $835 = tempRet0;
 $836 = (_bitshift64Shl(($834|0),($835|0),1)|0);
 $837 = tempRet0;
 $838 = (_i64Add(($836|0),($837|0),($756|0),($757|0))|0);
 $839 = tempRet0;
 $840 = $arrayidx37;
 $841 = $840;
 $842 = HEAP32[$841>>2]|0;
 $843 = (($840) + 4)|0;
 $844 = $843;
 $845 = HEAP32[$844>>2]|0;
 $846 = (_bitshift64Ashr(0,($842|0),32)|0);
 $847 = tempRet0;
 $848 = $arrayidx210;
 $849 = $848;
 $850 = HEAP32[$849>>2]|0;
 $851 = (($848) + 4)|0;
 $852 = $851;
 $853 = HEAP32[$852>>2]|0;
 $854 = (_bitshift64Ashr(0,($850|0),32)|0);
 $855 = tempRet0;
 $856 = (___muldi3(($854|0),($855|0),($846|0),($847|0))|0);
 $857 = tempRet0;
 $858 = (_i64Add(($838|0),($839|0),($856|0),($857|0))|0);
 $859 = tempRet0;
 $860 = $arrayidx215;
 $861 = $860;
 $862 = HEAP32[$861>>2]|0;
 $863 = (($860) + 4)|0;
 $864 = $863;
 $865 = HEAP32[$864>>2]|0;
 $866 = (_bitshift64Ashr(0,($862|0),32)|0);
 $867 = tempRet0;
 $868 = $arrayidx32;
 $869 = $868;
 $870 = HEAP32[$869>>2]|0;
 $871 = (($868) + 4)|0;
 $872 = $871;
 $873 = HEAP32[$872>>2]|0;
 $874 = (_bitshift64Ashr(0,($870|0),32)|0);
 $875 = tempRet0;
 $876 = (___muldi3(($874|0),($875|0),($866|0),($867|0))|0);
 $877 = tempRet0;
 $878 = (_i64Add(($858|0),($859|0),($876|0),($877|0))|0);
 $879 = tempRet0;
 $880 = $in2;
 $881 = $880;
 $882 = HEAP32[$881>>2]|0;
 $883 = (($880) + 4)|0;
 $884 = $883;
 $885 = HEAP32[$884>>2]|0;
 $886 = (_bitshift64Ashr(0,($882|0),32)|0);
 $887 = tempRet0;
 $arrayidx347 = ((($in)) + 64|0);
 $888 = $arrayidx347;
 $889 = $888;
 $890 = HEAP32[$889>>2]|0;
 $891 = (($888) + 4)|0;
 $892 = $891;
 $893 = HEAP32[$892>>2]|0;
 $894 = (_bitshift64Ashr(0,($890|0),32)|0);
 $895 = tempRet0;
 $896 = (___muldi3(($894|0),($895|0),($886|0),($887|0))|0);
 $897 = tempRet0;
 $898 = (_i64Add(($878|0),($879|0),($896|0),($897|0))|0);
 $899 = tempRet0;
 $arrayidx352 = ((($in2)) + 64|0);
 $900 = $arrayidx352;
 $901 = $900;
 $902 = HEAP32[$901>>2]|0;
 $903 = (($900) + 4)|0;
 $904 = $903;
 $905 = HEAP32[$904>>2]|0;
 $906 = (_bitshift64Ashr(0,($902|0),32)|0);
 $907 = tempRet0;
 $908 = $in;
 $909 = $908;
 $910 = HEAP32[$909>>2]|0;
 $911 = (($908) + 4)|0;
 $912 = $911;
 $913 = HEAP32[$912>>2]|0;
 $914 = (_bitshift64Ashr(0,($910|0),32)|0);
 $915 = tempRet0;
 $916 = (___muldi3(($914|0),($915|0),($906|0),($907|0))|0);
 $917 = tempRet0;
 $918 = (_i64Add(($898|0),($899|0),($916|0),($917|0))|0);
 $919 = tempRet0;
 $arrayidx360 = ((($output)) + 64|0);
 $920 = $arrayidx360;
 $921 = $920;
 HEAP32[$921>>2] = $918;
 $922 = (($920) + 4)|0;
 $923 = $922;
 HEAP32[$923>>2] = $919;
 $924 = $arrayidx110;
 $925 = $924;
 $926 = HEAP32[$925>>2]|0;
 $927 = (($924) + 4)|0;
 $928 = $927;
 $929 = HEAP32[$928>>2]|0;
 $930 = (_bitshift64Ashr(0,($926|0),32)|0);
 $931 = tempRet0;
 $932 = $arrayidx153;
 $933 = $932;
 $934 = HEAP32[$933>>2]|0;
 $935 = (($932) + 4)|0;
 $936 = $935;
 $937 = HEAP32[$936>>2]|0;
 $938 = (_bitshift64Ashr(0,($934|0),32)|0);
 $939 = tempRet0;
 $940 = (___muldi3(($938|0),($939|0),($930|0),($931|0))|0);
 $941 = tempRet0;
 $942 = $arrayidx158;
 $943 = $942;
 $944 = HEAP32[$943>>2]|0;
 $945 = (($942) + 4)|0;
 $946 = $945;
 $947 = HEAP32[$946>>2]|0;
 $948 = (_bitshift64Ashr(0,($944|0),32)|0);
 $949 = tempRet0;
 $950 = $arrayidx105;
 $951 = $950;
 $952 = HEAP32[$951>>2]|0;
 $953 = (($950) + 4)|0;
 $954 = $953;
 $955 = HEAP32[$954>>2]|0;
 $956 = (_bitshift64Ashr(0,($952|0),32)|0);
 $957 = tempRet0;
 $958 = (___muldi3(($956|0),($957|0),($948|0),($949|0))|0);
 $959 = tempRet0;
 $960 = (_i64Add(($958|0),($959|0),($940|0),($941|0))|0);
 $961 = tempRet0;
 $962 = $arrayidx69;
 $963 = $962;
 $964 = HEAP32[$963>>2]|0;
 $965 = (($962) + 4)|0;
 $966 = $965;
 $967 = HEAP32[$966>>2]|0;
 $968 = (_bitshift64Ashr(0,($964|0),32)|0);
 $969 = tempRet0;
 $970 = $arrayidx210;
 $971 = $970;
 $972 = HEAP32[$971>>2]|0;
 $973 = (($970) + 4)|0;
 $974 = $973;
 $975 = HEAP32[$974>>2]|0;
 $976 = (_bitshift64Ashr(0,($972|0),32)|0);
 $977 = tempRet0;
 $978 = (___muldi3(($976|0),($977|0),($968|0),($969|0))|0);
 $979 = tempRet0;
 $980 = (_i64Add(($960|0),($961|0),($978|0),($979|0))|0);
 $981 = tempRet0;
 $982 = $arrayidx215;
 $983 = $982;
 $984 = HEAP32[$983>>2]|0;
 $985 = (($982) + 4)|0;
 $986 = $985;
 $987 = HEAP32[$986>>2]|0;
 $988 = (_bitshift64Ashr(0,($984|0),32)|0);
 $989 = tempRet0;
 $990 = $arrayidx64;
 $991 = $990;
 $992 = HEAP32[$991>>2]|0;
 $993 = (($990) + 4)|0;
 $994 = $993;
 $995 = HEAP32[$994>>2]|0;
 $996 = (_bitshift64Ashr(0,($992|0),32)|0);
 $997 = tempRet0;
 $998 = (___muldi3(($996|0),($997|0),($988|0),($989|0))|0);
 $999 = tempRet0;
 $1000 = (_i64Add(($980|0),($981|0),($998|0),($999|0))|0);
 $1001 = tempRet0;
 $1002 = $arrayidx37;
 $1003 = $1002;
 $1004 = HEAP32[$1003>>2]|0;
 $1005 = (($1002) + 4)|0;
 $1006 = $1005;
 $1007 = HEAP32[$1006>>2]|0;
 $1008 = (_bitshift64Ashr(0,($1004|0),32)|0);
 $1009 = tempRet0;
 $1010 = $arrayidx274;
 $1011 = $1010;
 $1012 = HEAP32[$1011>>2]|0;
 $1013 = (($1010) + 4)|0;
 $1014 = $1013;
 $1015 = HEAP32[$1014>>2]|0;
 $1016 = (_bitshift64Ashr(0,($1012|0),32)|0);
 $1017 = tempRet0;
 $1018 = (___muldi3(($1016|0),($1017|0),($1008|0),($1009|0))|0);
 $1019 = tempRet0;
 $1020 = (_i64Add(($1000|0),($1001|0),($1018|0),($1019|0))|0);
 $1021 = tempRet0;
 $1022 = $arrayidx279;
 $1023 = $1022;
 $1024 = HEAP32[$1023>>2]|0;
 $1025 = (($1022) + 4)|0;
 $1026 = $1025;
 $1027 = HEAP32[$1026>>2]|0;
 $1028 = (_bitshift64Ashr(0,($1024|0),32)|0);
 $1029 = tempRet0;
 $1030 = $arrayidx32;
 $1031 = $1030;
 $1032 = HEAP32[$1031>>2]|0;
 $1033 = (($1030) + 4)|0;
 $1034 = $1033;
 $1035 = HEAP32[$1034>>2]|0;
 $1036 = (_bitshift64Ashr(0,($1032|0),32)|0);
 $1037 = tempRet0;
 $1038 = (___muldi3(($1036|0),($1037|0),($1028|0),($1029|0))|0);
 $1039 = tempRet0;
 $1040 = (_i64Add(($1020|0),($1021|0),($1038|0),($1039|0))|0);
 $1041 = tempRet0;
 $1042 = $arrayidx13;
 $1043 = $1042;
 $1044 = HEAP32[$1043>>2]|0;
 $1045 = (($1042) + 4)|0;
 $1046 = $1045;
 $1047 = HEAP32[$1046>>2]|0;
 $1048 = (_bitshift64Ashr(0,($1044|0),32)|0);
 $1049 = tempRet0;
 $1050 = $arrayidx347;
 $1051 = $1050;
 $1052 = HEAP32[$1051>>2]|0;
 $1053 = (($1050) + 4)|0;
 $1054 = $1053;
 $1055 = HEAP32[$1054>>2]|0;
 $1056 = (_bitshift64Ashr(0,($1052|0),32)|0);
 $1057 = tempRet0;
 $1058 = (___muldi3(($1056|0),($1057|0),($1048|0),($1049|0))|0);
 $1059 = tempRet0;
 $1060 = (_i64Add(($1040|0),($1041|0),($1058|0),($1059|0))|0);
 $1061 = tempRet0;
 $1062 = $arrayidx352;
 $1063 = $1062;
 $1064 = HEAP32[$1063>>2]|0;
 $1065 = (($1062) + 4)|0;
 $1066 = $1065;
 $1067 = HEAP32[$1066>>2]|0;
 $1068 = (_bitshift64Ashr(0,($1064|0),32)|0);
 $1069 = tempRet0;
 $1070 = $arrayidx9;
 $1071 = $1070;
 $1072 = HEAP32[$1071>>2]|0;
 $1073 = (($1070) + 4)|0;
 $1074 = $1073;
 $1075 = HEAP32[$1074>>2]|0;
 $1076 = (_bitshift64Ashr(0,($1072|0),32)|0);
 $1077 = tempRet0;
 $1078 = (___muldi3(($1076|0),($1077|0),($1068|0),($1069|0))|0);
 $1079 = tempRet0;
 $1080 = (_i64Add(($1060|0),($1061|0),($1078|0),($1079|0))|0);
 $1081 = tempRet0;
 $1082 = $in2;
 $1083 = $1082;
 $1084 = HEAP32[$1083>>2]|0;
 $1085 = (($1082) + 4)|0;
 $1086 = $1085;
 $1087 = HEAP32[$1086>>2]|0;
 $1088 = (_bitshift64Ashr(0,($1084|0),32)|0);
 $1089 = tempRet0;
 $arrayidx427 = ((($in)) + 72|0);
 $1090 = $arrayidx427;
 $1091 = $1090;
 $1092 = HEAP32[$1091>>2]|0;
 $1093 = (($1090) + 4)|0;
 $1094 = $1093;
 $1095 = HEAP32[$1094>>2]|0;
 $1096 = (_bitshift64Ashr(0,($1092|0),32)|0);
 $1097 = tempRet0;
 $1098 = (___muldi3(($1096|0),($1097|0),($1088|0),($1089|0))|0);
 $1099 = tempRet0;
 $1100 = (_i64Add(($1080|0),($1081|0),($1098|0),($1099|0))|0);
 $1101 = tempRet0;
 $arrayidx432 = ((($in2)) + 72|0);
 $1102 = $arrayidx432;
 $1103 = $1102;
 $1104 = HEAP32[$1103>>2]|0;
 $1105 = (($1102) + 4)|0;
 $1106 = $1105;
 $1107 = HEAP32[$1106>>2]|0;
 $1108 = (_bitshift64Ashr(0,($1104|0),32)|0);
 $1109 = tempRet0;
 $1110 = $in;
 $1111 = $1110;
 $1112 = HEAP32[$1111>>2]|0;
 $1113 = (($1110) + 4)|0;
 $1114 = $1113;
 $1115 = HEAP32[$1114>>2]|0;
 $1116 = (_bitshift64Ashr(0,($1112|0),32)|0);
 $1117 = tempRet0;
 $1118 = (___muldi3(($1116|0),($1117|0),($1108|0),($1109|0))|0);
 $1119 = tempRet0;
 $1120 = (_i64Add(($1100|0),($1101|0),($1118|0),($1119|0))|0);
 $1121 = tempRet0;
 $arrayidx440 = ((($output)) + 72|0);
 $1122 = $arrayidx440;
 $1123 = $1122;
 HEAP32[$1123>>2] = $1120;
 $1124 = (($1122) + 4)|0;
 $1125 = $1124;
 HEAP32[$1125>>2] = $1121;
 $1126 = $arrayidx158;
 $1127 = $1126;
 $1128 = HEAP32[$1127>>2]|0;
 $1129 = (($1126) + 4)|0;
 $1130 = $1129;
 $1131 = HEAP32[$1130>>2]|0;
 $1132 = (_bitshift64Ashr(0,($1128|0),32)|0);
 $1133 = tempRet0;
 $1134 = $arrayidx153;
 $1135 = $1134;
 $1136 = HEAP32[$1135>>2]|0;
 $1137 = (($1134) + 4)|0;
 $1138 = $1137;
 $1139 = HEAP32[$1138>>2]|0;
 $1140 = (_bitshift64Ashr(0,($1136|0),32)|0);
 $1141 = tempRet0;
 $1142 = (___muldi3(($1140|0),($1141|0),($1132|0),($1133|0))|0);
 $1143 = tempRet0;
 $1144 = $arrayidx69;
 $1145 = $1144;
 $1146 = HEAP32[$1145>>2]|0;
 $1147 = (($1144) + 4)|0;
 $1148 = $1147;
 $1149 = HEAP32[$1148>>2]|0;
 $1150 = (_bitshift64Ashr(0,($1146|0),32)|0);
 $1151 = tempRet0;
 $1152 = $arrayidx274;
 $1153 = $1152;
 $1154 = HEAP32[$1153>>2]|0;
 $1155 = (($1152) + 4)|0;
 $1156 = $1155;
 $1157 = HEAP32[$1156>>2]|0;
 $1158 = (_bitshift64Ashr(0,($1154|0),32)|0);
 $1159 = tempRet0;
 $1160 = (___muldi3(($1158|0),($1159|0),($1150|0),($1151|0))|0);
 $1161 = tempRet0;
 $1162 = (_i64Add(($1160|0),($1161|0),($1142|0),($1143|0))|0);
 $1163 = tempRet0;
 $1164 = $arrayidx279;
 $1165 = $1164;
 $1166 = HEAP32[$1165>>2]|0;
 $1167 = (($1164) + 4)|0;
 $1168 = $1167;
 $1169 = HEAP32[$1168>>2]|0;
 $1170 = (_bitshift64Ashr(0,($1166|0),32)|0);
 $1171 = tempRet0;
 $1172 = $arrayidx64;
 $1173 = $1172;
 $1174 = HEAP32[$1173>>2]|0;
 $1175 = (($1172) + 4)|0;
 $1176 = $1175;
 $1177 = HEAP32[$1176>>2]|0;
 $1178 = (_bitshift64Ashr(0,($1174|0),32)|0);
 $1179 = tempRet0;
 $1180 = (___muldi3(($1178|0),($1179|0),($1170|0),($1171|0))|0);
 $1181 = tempRet0;
 $1182 = (_i64Add(($1162|0),($1163|0),($1180|0),($1181|0))|0);
 $1183 = tempRet0;
 $1184 = $arrayidx13;
 $1185 = $1184;
 $1186 = HEAP32[$1185>>2]|0;
 $1187 = (($1184) + 4)|0;
 $1188 = $1187;
 $1189 = HEAP32[$1188>>2]|0;
 $1190 = (_bitshift64Ashr(0,($1186|0),32)|0);
 $1191 = tempRet0;
 $1192 = $arrayidx427;
 $1193 = $1192;
 $1194 = HEAP32[$1193>>2]|0;
 $1195 = (($1192) + 4)|0;
 $1196 = $1195;
 $1197 = HEAP32[$1196>>2]|0;
 $1198 = (_bitshift64Ashr(0,($1194|0),32)|0);
 $1199 = tempRet0;
 $1200 = (___muldi3(($1198|0),($1199|0),($1190|0),($1191|0))|0);
 $1201 = tempRet0;
 $1202 = (_i64Add(($1182|0),($1183|0),($1200|0),($1201|0))|0);
 $1203 = tempRet0;
 $1204 = $arrayidx432;
 $1205 = $1204;
 $1206 = HEAP32[$1205>>2]|0;
 $1207 = (($1204) + 4)|0;
 $1208 = $1207;
 $1209 = HEAP32[$1208>>2]|0;
 $1210 = (_bitshift64Ashr(0,($1206|0),32)|0);
 $1211 = tempRet0;
 $1212 = $arrayidx9;
 $1213 = $1212;
 $1214 = HEAP32[$1213>>2]|0;
 $1215 = (($1212) + 4)|0;
 $1216 = $1215;
 $1217 = HEAP32[$1216>>2]|0;
 $1218 = (_bitshift64Ashr(0,($1214|0),32)|0);
 $1219 = tempRet0;
 $1220 = (___muldi3(($1218|0),($1219|0),($1210|0),($1211|0))|0);
 $1221 = tempRet0;
 $1222 = (_i64Add(($1202|0),($1203|0),($1220|0),($1221|0))|0);
 $1223 = tempRet0;
 $1224 = (_bitshift64Shl(($1222|0),($1223|0),1)|0);
 $1225 = tempRet0;
 $1226 = $arrayidx110;
 $1227 = $1226;
 $1228 = HEAP32[$1227>>2]|0;
 $1229 = (($1226) + 4)|0;
 $1230 = $1229;
 $1231 = HEAP32[$1230>>2]|0;
 $1232 = (_bitshift64Ashr(0,($1228|0),32)|0);
 $1233 = tempRet0;
 $1234 = $arrayidx210;
 $1235 = $1234;
 $1236 = HEAP32[$1235>>2]|0;
 $1237 = (($1234) + 4)|0;
 $1238 = $1237;
 $1239 = HEAP32[$1238>>2]|0;
 $1240 = (_bitshift64Ashr(0,($1236|0),32)|0);
 $1241 = tempRet0;
 $1242 = (___muldi3(($1240|0),($1241|0),($1232|0),($1233|0))|0);
 $1243 = tempRet0;
 $1244 = (_i64Add(($1224|0),($1225|0),($1242|0),($1243|0))|0);
 $1245 = tempRet0;
 $1246 = $arrayidx215;
 $1247 = $1246;
 $1248 = HEAP32[$1247>>2]|0;
 $1249 = (($1246) + 4)|0;
 $1250 = $1249;
 $1251 = HEAP32[$1250>>2]|0;
 $1252 = (_bitshift64Ashr(0,($1248|0),32)|0);
 $1253 = tempRet0;
 $1254 = $arrayidx105;
 $1255 = $1254;
 $1256 = HEAP32[$1255>>2]|0;
 $1257 = (($1254) + 4)|0;
 $1258 = $1257;
 $1259 = HEAP32[$1258>>2]|0;
 $1260 = (_bitshift64Ashr(0,($1256|0),32)|0);
 $1261 = tempRet0;
 $1262 = (___muldi3(($1260|0),($1261|0),($1252|0),($1253|0))|0);
 $1263 = tempRet0;
 $1264 = (_i64Add(($1244|0),($1245|0),($1262|0),($1263|0))|0);
 $1265 = tempRet0;
 $1266 = $arrayidx37;
 $1267 = $1266;
 $1268 = HEAP32[$1267>>2]|0;
 $1269 = (($1266) + 4)|0;
 $1270 = $1269;
 $1271 = HEAP32[$1270>>2]|0;
 $1272 = (_bitshift64Ashr(0,($1268|0),32)|0);
 $1273 = tempRet0;
 $1274 = $arrayidx347;
 $1275 = $1274;
 $1276 = HEAP32[$1275>>2]|0;
 $1277 = (($1274) + 4)|0;
 $1278 = $1277;
 $1279 = HEAP32[$1278>>2]|0;
 $1280 = (_bitshift64Ashr(0,($1276|0),32)|0);
 $1281 = tempRet0;
 $1282 = (___muldi3(($1280|0),($1281|0),($1272|0),($1273|0))|0);
 $1283 = tempRet0;
 $1284 = (_i64Add(($1264|0),($1265|0),($1282|0),($1283|0))|0);
 $1285 = tempRet0;
 $1286 = $arrayidx352;
 $1287 = $1286;
 $1288 = HEAP32[$1287>>2]|0;
 $1289 = (($1286) + 4)|0;
 $1290 = $1289;
 $1291 = HEAP32[$1290>>2]|0;
 $1292 = (_bitshift64Ashr(0,($1288|0),32)|0);
 $1293 = tempRet0;
 $1294 = $arrayidx32;
 $1295 = $1294;
 $1296 = HEAP32[$1295>>2]|0;
 $1297 = (($1294) + 4)|0;
 $1298 = $1297;
 $1299 = HEAP32[$1298>>2]|0;
 $1300 = (_bitshift64Ashr(0,($1296|0),32)|0);
 $1301 = tempRet0;
 $1302 = (___muldi3(($1300|0),($1301|0),($1292|0),($1293|0))|0);
 $1303 = tempRet0;
 $1304 = (_i64Add(($1284|0),($1285|0),($1302|0),($1303|0))|0);
 $1305 = tempRet0;
 $arrayidx513 = ((($output)) + 80|0);
 $1306 = $arrayidx513;
 $1307 = $1306;
 HEAP32[$1307>>2] = $1304;
 $1308 = (($1306) + 4)|0;
 $1309 = $1308;
 HEAP32[$1309>>2] = $1305;
 $1310 = $arrayidx158;
 $1311 = $1310;
 $1312 = HEAP32[$1311>>2]|0;
 $1313 = (($1310) + 4)|0;
 $1314 = $1313;
 $1315 = HEAP32[$1314>>2]|0;
 $1316 = (_bitshift64Ashr(0,($1312|0),32)|0);
 $1317 = tempRet0;
 $1318 = $arrayidx210;
 $1319 = $1318;
 $1320 = HEAP32[$1319>>2]|0;
 $1321 = (($1318) + 4)|0;
 $1322 = $1321;
 $1323 = HEAP32[$1322>>2]|0;
 $1324 = (_bitshift64Ashr(0,($1320|0),32)|0);
 $1325 = tempRet0;
 $1326 = (___muldi3(($1324|0),($1325|0),($1316|0),($1317|0))|0);
 $1327 = tempRet0;
 $1328 = $arrayidx215;
 $1329 = $1328;
 $1330 = HEAP32[$1329>>2]|0;
 $1331 = (($1328) + 4)|0;
 $1332 = $1331;
 $1333 = HEAP32[$1332>>2]|0;
 $1334 = (_bitshift64Ashr(0,($1330|0),32)|0);
 $1335 = tempRet0;
 $1336 = $arrayidx153;
 $1337 = $1336;
 $1338 = HEAP32[$1337>>2]|0;
 $1339 = (($1336) + 4)|0;
 $1340 = $1339;
 $1341 = HEAP32[$1340>>2]|0;
 $1342 = (_bitshift64Ashr(0,($1338|0),32)|0);
 $1343 = tempRet0;
 $1344 = (___muldi3(($1342|0),($1343|0),($1334|0),($1335|0))|0);
 $1345 = tempRet0;
 $1346 = (_i64Add(($1344|0),($1345|0),($1326|0),($1327|0))|0);
 $1347 = tempRet0;
 $1348 = $arrayidx110;
 $1349 = $1348;
 $1350 = HEAP32[$1349>>2]|0;
 $1351 = (($1348) + 4)|0;
 $1352 = $1351;
 $1353 = HEAP32[$1352>>2]|0;
 $1354 = (_bitshift64Ashr(0,($1350|0),32)|0);
 $1355 = tempRet0;
 $1356 = $arrayidx274;
 $1357 = $1356;
 $1358 = HEAP32[$1357>>2]|0;
 $1359 = (($1356) + 4)|0;
 $1360 = $1359;
 $1361 = HEAP32[$1360>>2]|0;
 $1362 = (_bitshift64Ashr(0,($1358|0),32)|0);
 $1363 = tempRet0;
 $1364 = (___muldi3(($1362|0),($1363|0),($1354|0),($1355|0))|0);
 $1365 = tempRet0;
 $1366 = (_i64Add(($1346|0),($1347|0),($1364|0),($1365|0))|0);
 $1367 = tempRet0;
 $1368 = $arrayidx279;
 $1369 = $1368;
 $1370 = HEAP32[$1369>>2]|0;
 $1371 = (($1368) + 4)|0;
 $1372 = $1371;
 $1373 = HEAP32[$1372>>2]|0;
 $1374 = (_bitshift64Ashr(0,($1370|0),32)|0);
 $1375 = tempRet0;
 $1376 = $arrayidx105;
 $1377 = $1376;
 $1378 = HEAP32[$1377>>2]|0;
 $1379 = (($1376) + 4)|0;
 $1380 = $1379;
 $1381 = HEAP32[$1380>>2]|0;
 $1382 = (_bitshift64Ashr(0,($1378|0),32)|0);
 $1383 = tempRet0;
 $1384 = (___muldi3(($1382|0),($1383|0),($1374|0),($1375|0))|0);
 $1385 = tempRet0;
 $1386 = (_i64Add(($1366|0),($1367|0),($1384|0),($1385|0))|0);
 $1387 = tempRet0;
 $1388 = $arrayidx69;
 $1389 = $1388;
 $1390 = HEAP32[$1389>>2]|0;
 $1391 = (($1388) + 4)|0;
 $1392 = $1391;
 $1393 = HEAP32[$1392>>2]|0;
 $1394 = (_bitshift64Ashr(0,($1390|0),32)|0);
 $1395 = tempRet0;
 $1396 = $arrayidx347;
 $1397 = $1396;
 $1398 = HEAP32[$1397>>2]|0;
 $1399 = (($1396) + 4)|0;
 $1400 = $1399;
 $1401 = HEAP32[$1400>>2]|0;
 $1402 = (_bitshift64Ashr(0,($1398|0),32)|0);
 $1403 = tempRet0;
 $1404 = (___muldi3(($1402|0),($1403|0),($1394|0),($1395|0))|0);
 $1405 = tempRet0;
 $1406 = (_i64Add(($1386|0),($1387|0),($1404|0),($1405|0))|0);
 $1407 = tempRet0;
 $1408 = $arrayidx352;
 $1409 = $1408;
 $1410 = HEAP32[$1409>>2]|0;
 $1411 = (($1408) + 4)|0;
 $1412 = $1411;
 $1413 = HEAP32[$1412>>2]|0;
 $1414 = (_bitshift64Ashr(0,($1410|0),32)|0);
 $1415 = tempRet0;
 $1416 = $arrayidx64;
 $1417 = $1416;
 $1418 = HEAP32[$1417>>2]|0;
 $1419 = (($1416) + 4)|0;
 $1420 = $1419;
 $1421 = HEAP32[$1420>>2]|0;
 $1422 = (_bitshift64Ashr(0,($1418|0),32)|0);
 $1423 = tempRet0;
 $1424 = (___muldi3(($1422|0),($1423|0),($1414|0),($1415|0))|0);
 $1425 = tempRet0;
 $1426 = (_i64Add(($1406|0),($1407|0),($1424|0),($1425|0))|0);
 $1427 = tempRet0;
 $1428 = $arrayidx37;
 $1429 = $1428;
 $1430 = HEAP32[$1429>>2]|0;
 $1431 = (($1428) + 4)|0;
 $1432 = $1431;
 $1433 = HEAP32[$1432>>2]|0;
 $1434 = (_bitshift64Ashr(0,($1430|0),32)|0);
 $1435 = tempRet0;
 $1436 = $arrayidx427;
 $1437 = $1436;
 $1438 = HEAP32[$1437>>2]|0;
 $1439 = (($1436) + 4)|0;
 $1440 = $1439;
 $1441 = HEAP32[$1440>>2]|0;
 $1442 = (_bitshift64Ashr(0,($1438|0),32)|0);
 $1443 = tempRet0;
 $1444 = (___muldi3(($1442|0),($1443|0),($1434|0),($1435|0))|0);
 $1445 = tempRet0;
 $1446 = (_i64Add(($1426|0),($1427|0),($1444|0),($1445|0))|0);
 $1447 = tempRet0;
 $1448 = $arrayidx432;
 $1449 = $1448;
 $1450 = HEAP32[$1449>>2]|0;
 $1451 = (($1448) + 4)|0;
 $1452 = $1451;
 $1453 = HEAP32[$1452>>2]|0;
 $1454 = (_bitshift64Ashr(0,($1450|0),32)|0);
 $1455 = tempRet0;
 $1456 = $arrayidx32;
 $1457 = $1456;
 $1458 = HEAP32[$1457>>2]|0;
 $1459 = (($1456) + 4)|0;
 $1460 = $1459;
 $1461 = HEAP32[$1460>>2]|0;
 $1462 = (_bitshift64Ashr(0,($1458|0),32)|0);
 $1463 = tempRet0;
 $1464 = (___muldi3(($1462|0),($1463|0),($1454|0),($1455|0))|0);
 $1465 = tempRet0;
 $1466 = (_i64Add(($1446|0),($1447|0),($1464|0),($1465|0))|0);
 $1467 = tempRet0;
 $arrayidx577 = ((($output)) + 88|0);
 $1468 = $arrayidx577;
 $1469 = $1468;
 HEAP32[$1469>>2] = $1466;
 $1470 = (($1468) + 4)|0;
 $1471 = $1470;
 HEAP32[$1471>>2] = $1467;
 $1472 = $arrayidx215;
 $1473 = $1472;
 $1474 = HEAP32[$1473>>2]|0;
 $1475 = (($1472) + 4)|0;
 $1476 = $1475;
 $1477 = HEAP32[$1476>>2]|0;
 $1478 = (_bitshift64Ashr(0,($1474|0),32)|0);
 $1479 = tempRet0;
 $1480 = $arrayidx210;
 $1481 = $1480;
 $1482 = HEAP32[$1481>>2]|0;
 $1483 = (($1480) + 4)|0;
 $1484 = $1483;
 $1485 = HEAP32[$1484>>2]|0;
 $1486 = (_bitshift64Ashr(0,($1482|0),32)|0);
 $1487 = tempRet0;
 $1488 = (___muldi3(($1486|0),($1487|0),($1478|0),($1479|0))|0);
 $1489 = tempRet0;
 $1490 = $arrayidx158;
 $1491 = $1490;
 $1492 = HEAP32[$1491>>2]|0;
 $1493 = (($1490) + 4)|0;
 $1494 = $1493;
 $1495 = HEAP32[$1494>>2]|0;
 $1496 = (_bitshift64Ashr(0,($1492|0),32)|0);
 $1497 = tempRet0;
 $1498 = $arrayidx274;
 $1499 = $1498;
 $1500 = HEAP32[$1499>>2]|0;
 $1501 = (($1498) + 4)|0;
 $1502 = $1501;
 $1503 = HEAP32[$1502>>2]|0;
 $1504 = (_bitshift64Ashr(0,($1500|0),32)|0);
 $1505 = tempRet0;
 $1506 = (___muldi3(($1504|0),($1505|0),($1496|0),($1497|0))|0);
 $1507 = tempRet0;
 $1508 = $arrayidx279;
 $1509 = $1508;
 $1510 = HEAP32[$1509>>2]|0;
 $1511 = (($1508) + 4)|0;
 $1512 = $1511;
 $1513 = HEAP32[$1512>>2]|0;
 $1514 = (_bitshift64Ashr(0,($1510|0),32)|0);
 $1515 = tempRet0;
 $1516 = $arrayidx153;
 $1517 = $1516;
 $1518 = HEAP32[$1517>>2]|0;
 $1519 = (($1516) + 4)|0;
 $1520 = $1519;
 $1521 = HEAP32[$1520>>2]|0;
 $1522 = (_bitshift64Ashr(0,($1518|0),32)|0);
 $1523 = tempRet0;
 $1524 = (___muldi3(($1522|0),($1523|0),($1514|0),($1515|0))|0);
 $1525 = tempRet0;
 $1526 = (_i64Add(($1524|0),($1525|0),($1506|0),($1507|0))|0);
 $1527 = tempRet0;
 $1528 = $arrayidx69;
 $1529 = $1528;
 $1530 = HEAP32[$1529>>2]|0;
 $1531 = (($1528) + 4)|0;
 $1532 = $1531;
 $1533 = HEAP32[$1532>>2]|0;
 $1534 = (_bitshift64Ashr(0,($1530|0),32)|0);
 $1535 = tempRet0;
 $1536 = $arrayidx427;
 $1537 = $1536;
 $1538 = HEAP32[$1537>>2]|0;
 $1539 = (($1536) + 4)|0;
 $1540 = $1539;
 $1541 = HEAP32[$1540>>2]|0;
 $1542 = (_bitshift64Ashr(0,($1538|0),32)|0);
 $1543 = tempRet0;
 $1544 = (___muldi3(($1542|0),($1543|0),($1534|0),($1535|0))|0);
 $1545 = tempRet0;
 $1546 = (_i64Add(($1526|0),($1527|0),($1544|0),($1545|0))|0);
 $1547 = tempRet0;
 $1548 = $arrayidx432;
 $1549 = $1548;
 $1550 = HEAP32[$1549>>2]|0;
 $1551 = (($1548) + 4)|0;
 $1552 = $1551;
 $1553 = HEAP32[$1552>>2]|0;
 $1554 = (_bitshift64Ashr(0,($1550|0),32)|0);
 $1555 = tempRet0;
 $1556 = $arrayidx64;
 $1557 = $1556;
 $1558 = HEAP32[$1557>>2]|0;
 $1559 = (($1556) + 4)|0;
 $1560 = $1559;
 $1561 = HEAP32[$1560>>2]|0;
 $1562 = (_bitshift64Ashr(0,($1558|0),32)|0);
 $1563 = tempRet0;
 $1564 = (___muldi3(($1562|0),($1563|0),($1554|0),($1555|0))|0);
 $1565 = tempRet0;
 $1566 = (_i64Add(($1546|0),($1547|0),($1564|0),($1565|0))|0);
 $1567 = tempRet0;
 $1568 = (_bitshift64Shl(($1566|0),($1567|0),1)|0);
 $1569 = tempRet0;
 $1570 = (_i64Add(($1568|0),($1569|0),($1488|0),($1489|0))|0);
 $1571 = tempRet0;
 $1572 = $arrayidx110;
 $1573 = $1572;
 $1574 = HEAP32[$1573>>2]|0;
 $1575 = (($1572) + 4)|0;
 $1576 = $1575;
 $1577 = HEAP32[$1576>>2]|0;
 $1578 = (_bitshift64Ashr(0,($1574|0),32)|0);
 $1579 = tempRet0;
 $1580 = $arrayidx347;
 $1581 = $1580;
 $1582 = HEAP32[$1581>>2]|0;
 $1583 = (($1580) + 4)|0;
 $1584 = $1583;
 $1585 = HEAP32[$1584>>2]|0;
 $1586 = (_bitshift64Ashr(0,($1582|0),32)|0);
 $1587 = tempRet0;
 $1588 = (___muldi3(($1586|0),($1587|0),($1578|0),($1579|0))|0);
 $1589 = tempRet0;
 $1590 = (_i64Add(($1570|0),($1571|0),($1588|0),($1589|0))|0);
 $1591 = tempRet0;
 $1592 = $arrayidx352;
 $1593 = $1592;
 $1594 = HEAP32[$1593>>2]|0;
 $1595 = (($1592) + 4)|0;
 $1596 = $1595;
 $1597 = HEAP32[$1596>>2]|0;
 $1598 = (_bitshift64Ashr(0,($1594|0),32)|0);
 $1599 = tempRet0;
 $1600 = $arrayidx105;
 $1601 = $1600;
 $1602 = HEAP32[$1601>>2]|0;
 $1603 = (($1600) + 4)|0;
 $1604 = $1603;
 $1605 = HEAP32[$1604>>2]|0;
 $1606 = (_bitshift64Ashr(0,($1602|0),32)|0);
 $1607 = tempRet0;
 $1608 = (___muldi3(($1606|0),($1607|0),($1598|0),($1599|0))|0);
 $1609 = tempRet0;
 $1610 = (_i64Add(($1590|0),($1591|0),($1608|0),($1609|0))|0);
 $1611 = tempRet0;
 $arrayidx634 = ((($output)) + 96|0);
 $1612 = $arrayidx634;
 $1613 = $1612;
 HEAP32[$1613>>2] = $1610;
 $1614 = (($1612) + 4)|0;
 $1615 = $1614;
 HEAP32[$1615>>2] = $1611;
 $1616 = $arrayidx215;
 $1617 = $1616;
 $1618 = HEAP32[$1617>>2]|0;
 $1619 = (($1616) + 4)|0;
 $1620 = $1619;
 $1621 = HEAP32[$1620>>2]|0;
 $1622 = (_bitshift64Ashr(0,($1618|0),32)|0);
 $1623 = tempRet0;
 $1624 = $arrayidx274;
 $1625 = $1624;
 $1626 = HEAP32[$1625>>2]|0;
 $1627 = (($1624) + 4)|0;
 $1628 = $1627;
 $1629 = HEAP32[$1628>>2]|0;
 $1630 = (_bitshift64Ashr(0,($1626|0),32)|0);
 $1631 = tempRet0;
 $1632 = (___muldi3(($1630|0),($1631|0),($1622|0),($1623|0))|0);
 $1633 = tempRet0;
 $1634 = $arrayidx279;
 $1635 = $1634;
 $1636 = HEAP32[$1635>>2]|0;
 $1637 = (($1634) + 4)|0;
 $1638 = $1637;
 $1639 = HEAP32[$1638>>2]|0;
 $1640 = (_bitshift64Ashr(0,($1636|0),32)|0);
 $1641 = tempRet0;
 $1642 = $arrayidx210;
 $1643 = $1642;
 $1644 = HEAP32[$1643>>2]|0;
 $1645 = (($1642) + 4)|0;
 $1646 = $1645;
 $1647 = HEAP32[$1646>>2]|0;
 $1648 = (_bitshift64Ashr(0,($1644|0),32)|0);
 $1649 = tempRet0;
 $1650 = (___muldi3(($1648|0),($1649|0),($1640|0),($1641|0))|0);
 $1651 = tempRet0;
 $1652 = (_i64Add(($1650|0),($1651|0),($1632|0),($1633|0))|0);
 $1653 = tempRet0;
 $1654 = $arrayidx158;
 $1655 = $1654;
 $1656 = HEAP32[$1655>>2]|0;
 $1657 = (($1654) + 4)|0;
 $1658 = $1657;
 $1659 = HEAP32[$1658>>2]|0;
 $1660 = (_bitshift64Ashr(0,($1656|0),32)|0);
 $1661 = tempRet0;
 $1662 = $arrayidx347;
 $1663 = $1662;
 $1664 = HEAP32[$1663>>2]|0;
 $1665 = (($1662) + 4)|0;
 $1666 = $1665;
 $1667 = HEAP32[$1666>>2]|0;
 $1668 = (_bitshift64Ashr(0,($1664|0),32)|0);
 $1669 = tempRet0;
 $1670 = (___muldi3(($1668|0),($1669|0),($1660|0),($1661|0))|0);
 $1671 = tempRet0;
 $1672 = (_i64Add(($1652|0),($1653|0),($1670|0),($1671|0))|0);
 $1673 = tempRet0;
 $1674 = $arrayidx352;
 $1675 = $1674;
 $1676 = HEAP32[$1675>>2]|0;
 $1677 = (($1674) + 4)|0;
 $1678 = $1677;
 $1679 = HEAP32[$1678>>2]|0;
 $1680 = (_bitshift64Ashr(0,($1676|0),32)|0);
 $1681 = tempRet0;
 $1682 = $arrayidx153;
 $1683 = $1682;
 $1684 = HEAP32[$1683>>2]|0;
 $1685 = (($1682) + 4)|0;
 $1686 = $1685;
 $1687 = HEAP32[$1686>>2]|0;
 $1688 = (_bitshift64Ashr(0,($1684|0),32)|0);
 $1689 = tempRet0;
 $1690 = (___muldi3(($1688|0),($1689|0),($1680|0),($1681|0))|0);
 $1691 = tempRet0;
 $1692 = (_i64Add(($1672|0),($1673|0),($1690|0),($1691|0))|0);
 $1693 = tempRet0;
 $1694 = $arrayidx110;
 $1695 = $1694;
 $1696 = HEAP32[$1695>>2]|0;
 $1697 = (($1694) + 4)|0;
 $1698 = $1697;
 $1699 = HEAP32[$1698>>2]|0;
 $1700 = (_bitshift64Ashr(0,($1696|0),32)|0);
 $1701 = tempRet0;
 $1702 = $arrayidx427;
 $1703 = $1702;
 $1704 = HEAP32[$1703>>2]|0;
 $1705 = (($1702) + 4)|0;
 $1706 = $1705;
 $1707 = HEAP32[$1706>>2]|0;
 $1708 = (_bitshift64Ashr(0,($1704|0),32)|0);
 $1709 = tempRet0;
 $1710 = (___muldi3(($1708|0),($1709|0),($1700|0),($1701|0))|0);
 $1711 = tempRet0;
 $1712 = (_i64Add(($1692|0),($1693|0),($1710|0),($1711|0))|0);
 $1713 = tempRet0;
 $1714 = $arrayidx432;
 $1715 = $1714;
 $1716 = HEAP32[$1715>>2]|0;
 $1717 = (($1714) + 4)|0;
 $1718 = $1717;
 $1719 = HEAP32[$1718>>2]|0;
 $1720 = (_bitshift64Ashr(0,($1716|0),32)|0);
 $1721 = tempRet0;
 $1722 = $arrayidx105;
 $1723 = $1722;
 $1724 = HEAP32[$1723>>2]|0;
 $1725 = (($1722) + 4)|0;
 $1726 = $1725;
 $1727 = HEAP32[$1726>>2]|0;
 $1728 = (_bitshift64Ashr(0,($1724|0),32)|0);
 $1729 = tempRet0;
 $1730 = (___muldi3(($1728|0),($1729|0),($1720|0),($1721|0))|0);
 $1731 = tempRet0;
 $1732 = (_i64Add(($1712|0),($1713|0),($1730|0),($1731|0))|0);
 $1733 = tempRet0;
 $arrayidx682 = ((($output)) + 104|0);
 $1734 = $arrayidx682;
 $1735 = $1734;
 HEAP32[$1735>>2] = $1732;
 $1736 = (($1734) + 4)|0;
 $1737 = $1736;
 HEAP32[$1737>>2] = $1733;
 $1738 = $arrayidx279;
 $1739 = $1738;
 $1740 = HEAP32[$1739>>2]|0;
 $1741 = (($1738) + 4)|0;
 $1742 = $1741;
 $1743 = HEAP32[$1742>>2]|0;
 $1744 = (_bitshift64Ashr(0,($1740|0),32)|0);
 $1745 = tempRet0;
 $1746 = $arrayidx274;
 $1747 = $1746;
 $1748 = HEAP32[$1747>>2]|0;
 $1749 = (($1746) + 4)|0;
 $1750 = $1749;
 $1751 = HEAP32[$1750>>2]|0;
 $1752 = (_bitshift64Ashr(0,($1748|0),32)|0);
 $1753 = tempRet0;
 $1754 = (___muldi3(($1752|0),($1753|0),($1744|0),($1745|0))|0);
 $1755 = tempRet0;
 $1756 = $arrayidx158;
 $1757 = $1756;
 $1758 = HEAP32[$1757>>2]|0;
 $1759 = (($1756) + 4)|0;
 $1760 = $1759;
 $1761 = HEAP32[$1760>>2]|0;
 $1762 = (_bitshift64Ashr(0,($1758|0),32)|0);
 $1763 = tempRet0;
 $1764 = $arrayidx427;
 $1765 = $1764;
 $1766 = HEAP32[$1765>>2]|0;
 $1767 = (($1764) + 4)|0;
 $1768 = $1767;
 $1769 = HEAP32[$1768>>2]|0;
 $1770 = (_bitshift64Ashr(0,($1766|0),32)|0);
 $1771 = tempRet0;
 $1772 = (___muldi3(($1770|0),($1771|0),($1762|0),($1763|0))|0);
 $1773 = tempRet0;
 $1774 = (_i64Add(($1772|0),($1773|0),($1754|0),($1755|0))|0);
 $1775 = tempRet0;
 $1776 = $arrayidx432;
 $1777 = $1776;
 $1778 = HEAP32[$1777>>2]|0;
 $1779 = (($1776) + 4)|0;
 $1780 = $1779;
 $1781 = HEAP32[$1780>>2]|0;
 $1782 = (_bitshift64Ashr(0,($1778|0),32)|0);
 $1783 = tempRet0;
 $1784 = $arrayidx153;
 $1785 = $1784;
 $1786 = HEAP32[$1785>>2]|0;
 $1787 = (($1784) + 4)|0;
 $1788 = $1787;
 $1789 = HEAP32[$1788>>2]|0;
 $1790 = (_bitshift64Ashr(0,($1786|0),32)|0);
 $1791 = tempRet0;
 $1792 = (___muldi3(($1790|0),($1791|0),($1782|0),($1783|0))|0);
 $1793 = tempRet0;
 $1794 = (_i64Add(($1774|0),($1775|0),($1792|0),($1793|0))|0);
 $1795 = tempRet0;
 $1796 = (_bitshift64Shl(($1794|0),($1795|0),1)|0);
 $1797 = tempRet0;
 $1798 = $arrayidx215;
 $1799 = $1798;
 $1800 = HEAP32[$1799>>2]|0;
 $1801 = (($1798) + 4)|0;
 $1802 = $1801;
 $1803 = HEAP32[$1802>>2]|0;
 $1804 = (_bitshift64Ashr(0,($1800|0),32)|0);
 $1805 = tempRet0;
 $1806 = $arrayidx347;
 $1807 = $1806;
 $1808 = HEAP32[$1807>>2]|0;
 $1809 = (($1806) + 4)|0;
 $1810 = $1809;
 $1811 = HEAP32[$1810>>2]|0;
 $1812 = (_bitshift64Ashr(0,($1808|0),32)|0);
 $1813 = tempRet0;
 $1814 = (___muldi3(($1812|0),($1813|0),($1804|0),($1805|0))|0);
 $1815 = tempRet0;
 $1816 = (_i64Add(($1796|0),($1797|0),($1814|0),($1815|0))|0);
 $1817 = tempRet0;
 $1818 = $arrayidx352;
 $1819 = $1818;
 $1820 = HEAP32[$1819>>2]|0;
 $1821 = (($1818) + 4)|0;
 $1822 = $1821;
 $1823 = HEAP32[$1822>>2]|0;
 $1824 = (_bitshift64Ashr(0,($1820|0),32)|0);
 $1825 = tempRet0;
 $1826 = $arrayidx210;
 $1827 = $1826;
 $1828 = HEAP32[$1827>>2]|0;
 $1829 = (($1826) + 4)|0;
 $1830 = $1829;
 $1831 = HEAP32[$1830>>2]|0;
 $1832 = (_bitshift64Ashr(0,($1828|0),32)|0);
 $1833 = tempRet0;
 $1834 = (___muldi3(($1832|0),($1833|0),($1824|0),($1825|0))|0);
 $1835 = tempRet0;
 $1836 = (_i64Add(($1816|0),($1817|0),($1834|0),($1835|0))|0);
 $1837 = tempRet0;
 $arrayidx723 = ((($output)) + 112|0);
 $1838 = $arrayidx723;
 $1839 = $1838;
 HEAP32[$1839>>2] = $1836;
 $1840 = (($1838) + 4)|0;
 $1841 = $1840;
 HEAP32[$1841>>2] = $1837;
 $1842 = $arrayidx279;
 $1843 = $1842;
 $1844 = HEAP32[$1843>>2]|0;
 $1845 = (($1842) + 4)|0;
 $1846 = $1845;
 $1847 = HEAP32[$1846>>2]|0;
 $1848 = (_bitshift64Ashr(0,($1844|0),32)|0);
 $1849 = tempRet0;
 $1850 = $arrayidx347;
 $1851 = $1850;
 $1852 = HEAP32[$1851>>2]|0;
 $1853 = (($1850) + 4)|0;
 $1854 = $1853;
 $1855 = HEAP32[$1854>>2]|0;
 $1856 = (_bitshift64Ashr(0,($1852|0),32)|0);
 $1857 = tempRet0;
 $1858 = (___muldi3(($1856|0),($1857|0),($1848|0),($1849|0))|0);
 $1859 = tempRet0;
 $1860 = $arrayidx352;
 $1861 = $1860;
 $1862 = HEAP32[$1861>>2]|0;
 $1863 = (($1860) + 4)|0;
 $1864 = $1863;
 $1865 = HEAP32[$1864>>2]|0;
 $1866 = (_bitshift64Ashr(0,($1862|0),32)|0);
 $1867 = tempRet0;
 $1868 = $arrayidx274;
 $1869 = $1868;
 $1870 = HEAP32[$1869>>2]|0;
 $1871 = (($1868) + 4)|0;
 $1872 = $1871;
 $1873 = HEAP32[$1872>>2]|0;
 $1874 = (_bitshift64Ashr(0,($1870|0),32)|0);
 $1875 = tempRet0;
 $1876 = (___muldi3(($1874|0),($1875|0),($1866|0),($1867|0))|0);
 $1877 = tempRet0;
 $1878 = (_i64Add(($1876|0),($1877|0),($1858|0),($1859|0))|0);
 $1879 = tempRet0;
 $1880 = $arrayidx215;
 $1881 = $1880;
 $1882 = HEAP32[$1881>>2]|0;
 $1883 = (($1880) + 4)|0;
 $1884 = $1883;
 $1885 = HEAP32[$1884>>2]|0;
 $1886 = (_bitshift64Ashr(0,($1882|0),32)|0);
 $1887 = tempRet0;
 $1888 = $arrayidx427;
 $1889 = $1888;
 $1890 = HEAP32[$1889>>2]|0;
 $1891 = (($1888) + 4)|0;
 $1892 = $1891;
 $1893 = HEAP32[$1892>>2]|0;
 $1894 = (_bitshift64Ashr(0,($1890|0),32)|0);
 $1895 = tempRet0;
 $1896 = (___muldi3(($1894|0),($1895|0),($1886|0),($1887|0))|0);
 $1897 = tempRet0;
 $1898 = (_i64Add(($1878|0),($1879|0),($1896|0),($1897|0))|0);
 $1899 = tempRet0;
 $1900 = $arrayidx432;
 $1901 = $1900;
 $1902 = HEAP32[$1901>>2]|0;
 $1903 = (($1900) + 4)|0;
 $1904 = $1903;
 $1905 = HEAP32[$1904>>2]|0;
 $1906 = (_bitshift64Ashr(0,($1902|0),32)|0);
 $1907 = tempRet0;
 $1908 = $arrayidx210;
 $1909 = $1908;
 $1910 = HEAP32[$1909>>2]|0;
 $1911 = (($1908) + 4)|0;
 $1912 = $1911;
 $1913 = HEAP32[$1912>>2]|0;
 $1914 = (_bitshift64Ashr(0,($1910|0),32)|0);
 $1915 = tempRet0;
 $1916 = (___muldi3(($1914|0),($1915|0),($1906|0),($1907|0))|0);
 $1917 = tempRet0;
 $1918 = (_i64Add(($1898|0),($1899|0),($1916|0),($1917|0))|0);
 $1919 = tempRet0;
 $arrayidx755 = ((($output)) + 120|0);
 $1920 = $arrayidx755;
 $1921 = $1920;
 HEAP32[$1921>>2] = $1918;
 $1922 = (($1920) + 4)|0;
 $1923 = $1922;
 HEAP32[$1923>>2] = $1919;
 $1924 = $arrayidx352;
 $1925 = $1924;
 $1926 = HEAP32[$1925>>2]|0;
 $1927 = (($1924) + 4)|0;
 $1928 = $1927;
 $1929 = HEAP32[$1928>>2]|0;
 $1930 = (_bitshift64Ashr(0,($1926|0),32)|0);
 $1931 = tempRet0;
 $1932 = $arrayidx347;
 $1933 = $1932;
 $1934 = HEAP32[$1933>>2]|0;
 $1935 = (($1932) + 4)|0;
 $1936 = $1935;
 $1937 = HEAP32[$1936>>2]|0;
 $1938 = (_bitshift64Ashr(0,($1934|0),32)|0);
 $1939 = tempRet0;
 $1940 = (___muldi3(($1938|0),($1939|0),($1930|0),($1931|0))|0);
 $1941 = tempRet0;
 $1942 = $arrayidx279;
 $1943 = $1942;
 $1944 = HEAP32[$1943>>2]|0;
 $1945 = (($1942) + 4)|0;
 $1946 = $1945;
 $1947 = HEAP32[$1946>>2]|0;
 $1948 = (_bitshift64Ashr(0,($1944|0),32)|0);
 $1949 = tempRet0;
 $1950 = $arrayidx427;
 $1951 = $1950;
 $1952 = HEAP32[$1951>>2]|0;
 $1953 = (($1950) + 4)|0;
 $1954 = $1953;
 $1955 = HEAP32[$1954>>2]|0;
 $1956 = (_bitshift64Ashr(0,($1952|0),32)|0);
 $1957 = tempRet0;
 $1958 = (___muldi3(($1956|0),($1957|0),($1948|0),($1949|0))|0);
 $1959 = tempRet0;
 $1960 = $arrayidx432;
 $1961 = $1960;
 $1962 = HEAP32[$1961>>2]|0;
 $1963 = (($1960) + 4)|0;
 $1964 = $1963;
 $1965 = HEAP32[$1964>>2]|0;
 $1966 = (_bitshift64Ashr(0,($1962|0),32)|0);
 $1967 = tempRet0;
 $1968 = $arrayidx274;
 $1969 = $1968;
 $1970 = HEAP32[$1969>>2]|0;
 $1971 = (($1968) + 4)|0;
 $1972 = $1971;
 $1973 = HEAP32[$1972>>2]|0;
 $1974 = (_bitshift64Ashr(0,($1970|0),32)|0);
 $1975 = tempRet0;
 $1976 = (___muldi3(($1974|0),($1975|0),($1966|0),($1967|0))|0);
 $1977 = tempRet0;
 $1978 = (_i64Add(($1976|0),($1977|0),($1958|0),($1959|0))|0);
 $1979 = tempRet0;
 $1980 = (_bitshift64Shl(($1978|0),($1979|0),1)|0);
 $1981 = tempRet0;
 $1982 = (_i64Add(($1980|0),($1981|0),($1940|0),($1941|0))|0);
 $1983 = tempRet0;
 $arrayidx780 = ((($output)) + 128|0);
 $1984 = $arrayidx780;
 $1985 = $1984;
 HEAP32[$1985>>2] = $1982;
 $1986 = (($1984) + 4)|0;
 $1987 = $1986;
 HEAP32[$1987>>2] = $1983;
 $1988 = $arrayidx352;
 $1989 = $1988;
 $1990 = HEAP32[$1989>>2]|0;
 $1991 = (($1988) + 4)|0;
 $1992 = $1991;
 $1993 = HEAP32[$1992>>2]|0;
 $1994 = (_bitshift64Ashr(0,($1990|0),32)|0);
 $1995 = tempRet0;
 $1996 = $arrayidx427;
 $1997 = $1996;
 $1998 = HEAP32[$1997>>2]|0;
 $1999 = (($1996) + 4)|0;
 $2000 = $1999;
 $2001 = HEAP32[$2000>>2]|0;
 $2002 = (_bitshift64Ashr(0,($1998|0),32)|0);
 $2003 = tempRet0;
 $2004 = (___muldi3(($2002|0),($2003|0),($1994|0),($1995|0))|0);
 $2005 = tempRet0;
 $2006 = $arrayidx432;
 $2007 = $2006;
 $2008 = HEAP32[$2007>>2]|0;
 $2009 = (($2006) + 4)|0;
 $2010 = $2009;
 $2011 = HEAP32[$2010>>2]|0;
 $2012 = (_bitshift64Ashr(0,($2008|0),32)|0);
 $2013 = tempRet0;
 $2014 = $arrayidx347;
 $2015 = $2014;
 $2016 = HEAP32[$2015>>2]|0;
 $2017 = (($2014) + 4)|0;
 $2018 = $2017;
 $2019 = HEAP32[$2018>>2]|0;
 $2020 = (_bitshift64Ashr(0,($2016|0),32)|0);
 $2021 = tempRet0;
 $2022 = (___muldi3(($2020|0),($2021|0),($2012|0),($2013|0))|0);
 $2023 = tempRet0;
 $2024 = (_i64Add(($2022|0),($2023|0),($2004|0),($2005|0))|0);
 $2025 = tempRet0;
 $arrayidx796 = ((($output)) + 136|0);
 $2026 = $arrayidx796;
 $2027 = $2026;
 HEAP32[$2027>>2] = $2024;
 $2028 = (($2026) + 4)|0;
 $2029 = $2028;
 HEAP32[$2029>>2] = $2025;
 $2030 = $arrayidx432;
 $2031 = $2030;
 $2032 = HEAP32[$2031>>2]|0;
 $2033 = (($2030) + 4)|0;
 $2034 = $2033;
 $2035 = HEAP32[$2034>>2]|0;
 $2036 = (_bitshift64Ashr(0,($2032|0),31)|0);
 $2037 = tempRet0;
 $2038 = $arrayidx427;
 $2039 = $2038;
 $2040 = HEAP32[$2039>>2]|0;
 $2041 = (($2038) + 4)|0;
 $2042 = $2041;
 $2043 = HEAP32[$2042>>2]|0;
 $2044 = (_bitshift64Ashr(0,($2040|0),32)|0);
 $2045 = tempRet0;
 $2046 = (___muldi3(($2044|0),($2045|0),($2036|0),($2037|0))|0);
 $2047 = tempRet0;
 $arrayidx805 = ((($output)) + 144|0);
 $2048 = $arrayidx805;
 $2049 = $2048;
 HEAP32[$2049>>2] = $2046;
 $2050 = (($2048) + 4)|0;
 $2051 = $2050;
 HEAP32[$2051>>2] = $2047;
 return;
}
function _freduce_degree($output) {
 $output = $output|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $arrayidx = 0, $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx20 = 0, $arrayidx22 = 0, $arrayidx31 = 0, $arrayidx33 = 0, $arrayidx42 = 0, $arrayidx44 = 0, $arrayidx53 = 0, $arrayidx55 = 0, $arrayidx64 = 0, $arrayidx66 = 0, $arrayidx75 = 0, $arrayidx77 = 0, $arrayidx86 = 0, $arrayidx9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $arrayidx = ((($output)) + 144|0);
 $0 = $arrayidx;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $arrayidx1 = ((($output)) + 64|0);
 $6 = $arrayidx1;
 $7 = $6;
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) + 4)|0;
 $10 = $9;
 $11 = HEAP32[$10>>2]|0;
 $12 = (___muldi3(($2|0),($5|0),18,0)|0);
 $13 = tempRet0;
 $14 = (_i64Add(($8|0),($11|0),($2|0),($5|0))|0);
 $15 = tempRet0;
 $16 = (_i64Add(($14|0),($15|0),($12|0),($13|0))|0);
 $17 = tempRet0;
 $18 = $arrayidx1;
 $19 = $18;
 HEAP32[$19>>2] = $16;
 $20 = (($18) + 4)|0;
 $21 = $20;
 HEAP32[$21>>2] = $17;
 $arrayidx9 = ((($output)) + 136|0);
 $22 = $arrayidx9;
 $23 = $22;
 $24 = HEAP32[$23>>2]|0;
 $25 = (($22) + 4)|0;
 $26 = $25;
 $27 = HEAP32[$26>>2]|0;
 $arrayidx11 = ((($output)) + 56|0);
 $28 = $arrayidx11;
 $29 = $28;
 $30 = HEAP32[$29>>2]|0;
 $31 = (($28) + 4)|0;
 $32 = $31;
 $33 = HEAP32[$32>>2]|0;
 $34 = (___muldi3(($24|0),($27|0),18,0)|0);
 $35 = tempRet0;
 $36 = (_i64Add(($30|0),($33|0),($24|0),($27|0))|0);
 $37 = tempRet0;
 $38 = (_i64Add(($36|0),($37|0),($34|0),($35|0))|0);
 $39 = tempRet0;
 $40 = $arrayidx11;
 $41 = $40;
 HEAP32[$41>>2] = $38;
 $42 = (($40) + 4)|0;
 $43 = $42;
 HEAP32[$43>>2] = $39;
 $arrayidx20 = ((($output)) + 128|0);
 $44 = $arrayidx20;
 $45 = $44;
 $46 = HEAP32[$45>>2]|0;
 $47 = (($44) + 4)|0;
 $48 = $47;
 $49 = HEAP32[$48>>2]|0;
 $arrayidx22 = ((($output)) + 48|0);
 $50 = $arrayidx22;
 $51 = $50;
 $52 = HEAP32[$51>>2]|0;
 $53 = (($50) + 4)|0;
 $54 = $53;
 $55 = HEAP32[$54>>2]|0;
 $56 = (___muldi3(($46|0),($49|0),18,0)|0);
 $57 = tempRet0;
 $58 = (_i64Add(($52|0),($55|0),($46|0),($49|0))|0);
 $59 = tempRet0;
 $60 = (_i64Add(($58|0),($59|0),($56|0),($57|0))|0);
 $61 = tempRet0;
 $62 = $arrayidx22;
 $63 = $62;
 HEAP32[$63>>2] = $60;
 $64 = (($62) + 4)|0;
 $65 = $64;
 HEAP32[$65>>2] = $61;
 $arrayidx31 = ((($output)) + 120|0);
 $66 = $arrayidx31;
 $67 = $66;
 $68 = HEAP32[$67>>2]|0;
 $69 = (($66) + 4)|0;
 $70 = $69;
 $71 = HEAP32[$70>>2]|0;
 $arrayidx33 = ((($output)) + 40|0);
 $72 = $arrayidx33;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $78 = (___muldi3(($68|0),($71|0),18,0)|0);
 $79 = tempRet0;
 $80 = (_i64Add(($74|0),($77|0),($68|0),($71|0))|0);
 $81 = tempRet0;
 $82 = (_i64Add(($80|0),($81|0),($78|0),($79|0))|0);
 $83 = tempRet0;
 $84 = $arrayidx33;
 $85 = $84;
 HEAP32[$85>>2] = $82;
 $86 = (($84) + 4)|0;
 $87 = $86;
 HEAP32[$87>>2] = $83;
 $arrayidx42 = ((($output)) + 112|0);
 $88 = $arrayidx42;
 $89 = $88;
 $90 = HEAP32[$89>>2]|0;
 $91 = (($88) + 4)|0;
 $92 = $91;
 $93 = HEAP32[$92>>2]|0;
 $arrayidx44 = ((($output)) + 32|0);
 $94 = $arrayidx44;
 $95 = $94;
 $96 = HEAP32[$95>>2]|0;
 $97 = (($94) + 4)|0;
 $98 = $97;
 $99 = HEAP32[$98>>2]|0;
 $100 = (___muldi3(($90|0),($93|0),18,0)|0);
 $101 = tempRet0;
 $102 = (_i64Add(($96|0),($99|0),($90|0),($93|0))|0);
 $103 = tempRet0;
 $104 = (_i64Add(($102|0),($103|0),($100|0),($101|0))|0);
 $105 = tempRet0;
 $106 = $arrayidx44;
 $107 = $106;
 HEAP32[$107>>2] = $104;
 $108 = (($106) + 4)|0;
 $109 = $108;
 HEAP32[$109>>2] = $105;
 $arrayidx53 = ((($output)) + 104|0);
 $110 = $arrayidx53;
 $111 = $110;
 $112 = HEAP32[$111>>2]|0;
 $113 = (($110) + 4)|0;
 $114 = $113;
 $115 = HEAP32[$114>>2]|0;
 $arrayidx55 = ((($output)) + 24|0);
 $116 = $arrayidx55;
 $117 = $116;
 $118 = HEAP32[$117>>2]|0;
 $119 = (($116) + 4)|0;
 $120 = $119;
 $121 = HEAP32[$120>>2]|0;
 $122 = (___muldi3(($112|0),($115|0),18,0)|0);
 $123 = tempRet0;
 $124 = (_i64Add(($118|0),($121|0),($112|0),($115|0))|0);
 $125 = tempRet0;
 $126 = (_i64Add(($124|0),($125|0),($122|0),($123|0))|0);
 $127 = tempRet0;
 $128 = $arrayidx55;
 $129 = $128;
 HEAP32[$129>>2] = $126;
 $130 = (($128) + 4)|0;
 $131 = $130;
 HEAP32[$131>>2] = $127;
 $arrayidx64 = ((($output)) + 96|0);
 $132 = $arrayidx64;
 $133 = $132;
 $134 = HEAP32[$133>>2]|0;
 $135 = (($132) + 4)|0;
 $136 = $135;
 $137 = HEAP32[$136>>2]|0;
 $arrayidx66 = ((($output)) + 16|0);
 $138 = $arrayidx66;
 $139 = $138;
 $140 = HEAP32[$139>>2]|0;
 $141 = (($138) + 4)|0;
 $142 = $141;
 $143 = HEAP32[$142>>2]|0;
 $144 = (___muldi3(($134|0),($137|0),18,0)|0);
 $145 = tempRet0;
 $146 = (_i64Add(($140|0),($143|0),($134|0),($137|0))|0);
 $147 = tempRet0;
 $148 = (_i64Add(($146|0),($147|0),($144|0),($145|0))|0);
 $149 = tempRet0;
 $150 = $arrayidx66;
 $151 = $150;
 HEAP32[$151>>2] = $148;
 $152 = (($150) + 4)|0;
 $153 = $152;
 HEAP32[$153>>2] = $149;
 $arrayidx75 = ((($output)) + 88|0);
 $154 = $arrayidx75;
 $155 = $154;
 $156 = HEAP32[$155>>2]|0;
 $157 = (($154) + 4)|0;
 $158 = $157;
 $159 = HEAP32[$158>>2]|0;
 $arrayidx77 = ((($output)) + 8|0);
 $160 = $arrayidx77;
 $161 = $160;
 $162 = HEAP32[$161>>2]|0;
 $163 = (($160) + 4)|0;
 $164 = $163;
 $165 = HEAP32[$164>>2]|0;
 $166 = (___muldi3(($156|0),($159|0),18,0)|0);
 $167 = tempRet0;
 $168 = (_i64Add(($162|0),($165|0),($156|0),($159|0))|0);
 $169 = tempRet0;
 $170 = (_i64Add(($168|0),($169|0),($166|0),($167|0))|0);
 $171 = tempRet0;
 $172 = $arrayidx77;
 $173 = $172;
 HEAP32[$173>>2] = $170;
 $174 = (($172) + 4)|0;
 $175 = $174;
 HEAP32[$175>>2] = $171;
 $arrayidx86 = ((($output)) + 80|0);
 $176 = $arrayidx86;
 $177 = $176;
 $178 = HEAP32[$177>>2]|0;
 $179 = (($176) + 4)|0;
 $180 = $179;
 $181 = HEAP32[$180>>2]|0;
 $182 = (_bitshift64Shl(($178|0),($181|0),4)|0);
 $183 = tempRet0;
 $184 = $output;
 $185 = $184;
 $186 = HEAP32[$185>>2]|0;
 $187 = (($184) + 4)|0;
 $188 = $187;
 $189 = HEAP32[$188>>2]|0;
 $190 = (_i64Add(($186|0),($189|0),($182|0),($183|0))|0);
 $191 = tempRet0;
 $192 = (_bitshift64Shl(($178|0),($181|0),1)|0);
 $193 = tempRet0;
 $194 = (_i64Add(($190|0),($191|0),($192|0),($193|0))|0);
 $195 = tempRet0;
 $196 = (_i64Add(($194|0),($195|0),($178|0),($181|0))|0);
 $197 = tempRet0;
 $198 = $output;
 $199 = $198;
 HEAP32[$199>>2] = $196;
 $200 = (($198) + 4)|0;
 $201 = $200;
 HEAP32[$201>>2] = $197;
 return;
}
function _freduce_coefficients($output) {
 $output = $output|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $add = 0, $add12 = 0, $arrayidx = 0, $arrayidx1 = 0, $arrayidx13 = 0, $arrayidx3 = 0;
 var $arrayidx34 = 0, $cmp = 0, $i$032 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $arrayidx = ((($output)) + 80|0);
 $0 = $arrayidx;
 $1 = $0;
 HEAP32[$1>>2] = 0;
 $2 = (($0) + 4)|0;
 $3 = $2;
 HEAP32[$3>>2] = 0;
 $i$032 = 0;
 while(1) {
  $arrayidx1 = (($output) + ($i$032<<3)|0);
  $4 = $arrayidx1;
  $5 = $4;
  $6 = HEAP32[$5>>2]|0;
  $7 = (($4) + 4)|0;
  $8 = $7;
  $9 = HEAP32[$8>>2]|0;
  $10 = (_div_by_2_26($6,$9)|0);
  $11 = tempRet0;
  $12 = (_bitshift64Shl(($10|0),($11|0),26)|0);
  $13 = tempRet0;
  $14 = (_i64Subtract(($6|0),($9|0),($12|0),($13|0))|0);
  $15 = tempRet0;
  $16 = $arrayidx1;
  $17 = $16;
  HEAP32[$17>>2] = $14;
  $18 = (($16) + 4)|0;
  $19 = $18;
  HEAP32[$19>>2] = $15;
  $add = $i$032 | 1;
  $arrayidx3 = (($output) + ($add<<3)|0);
  $20 = $arrayidx3;
  $21 = $20;
  $22 = HEAP32[$21>>2]|0;
  $23 = (($20) + 4)|0;
  $24 = $23;
  $25 = HEAP32[$24>>2]|0;
  $26 = (_i64Add(($22|0),($25|0),($10|0),($11|0))|0);
  $27 = tempRet0;
  $28 = (_div_by_2_25($26,$27)|0);
  $29 = tempRet0;
  $30 = (_bitshift64Shl(($28|0),($29|0),25)|0);
  $31 = tempRet0;
  $32 = (_i64Subtract(($26|0),($27|0),($30|0),($31|0))|0);
  $33 = tempRet0;
  $34 = $arrayidx3;
  $35 = $34;
  HEAP32[$35>>2] = $32;
  $36 = (($34) + 4)|0;
  $37 = $36;
  HEAP32[$37>>2] = $33;
  $add12 = (($i$032) + 2)|0;
  $arrayidx13 = (($output) + ($add12<<3)|0);
  $38 = $arrayidx13;
  $39 = $38;
  $40 = HEAP32[$39>>2]|0;
  $41 = (($38) + 4)|0;
  $42 = $41;
  $43 = HEAP32[$42>>2]|0;
  $44 = (_i64Add(($40|0),($43|0),($28|0),($29|0))|0);
  $45 = tempRet0;
  $46 = $arrayidx13;
  $47 = $46;
  HEAP32[$47>>2] = $44;
  $48 = (($46) + 4)|0;
  $49 = $48;
  HEAP32[$49>>2] = $45;
  $cmp = ($add12>>>0)<(10);
  if ($cmp) {
   $i$032 = $add12;
  } else {
   break;
  }
 }
 $50 = $arrayidx;
 $51 = $50;
 $52 = HEAP32[$51>>2]|0;
 $53 = (($50) + 4)|0;
 $54 = $53;
 $55 = HEAP32[$54>>2]|0;
 $56 = $output;
 $57 = $56;
 $58 = HEAP32[$57>>2]|0;
 $59 = (($56) + 4)|0;
 $60 = $59;
 $61 = HEAP32[$60>>2]|0;
 $62 = (___muldi3(($52|0),($55|0),18,0)|0);
 $63 = tempRet0;
 $64 = (_i64Add(($58|0),($61|0),($52|0),($55|0))|0);
 $65 = tempRet0;
 $66 = (_i64Add(($64|0),($65|0),($62|0),($63|0))|0);
 $67 = tempRet0;
 $68 = $arrayidx;
 $69 = $68;
 HEAP32[$69>>2] = 0;
 $70 = (($68) + 4)|0;
 $71 = $70;
 HEAP32[$71>>2] = 0;
 $72 = (_div_by_2_26($66,$67)|0);
 $73 = tempRet0;
 $74 = (_bitshift64Shl(($72|0),($73|0),26)|0);
 $75 = tempRet0;
 $76 = (_i64Subtract(($66|0),($67|0),($74|0),($75|0))|0);
 $77 = tempRet0;
 $78 = $output;
 $79 = $78;
 HEAP32[$79>>2] = $76;
 $80 = (($78) + 4)|0;
 $81 = $80;
 HEAP32[$81>>2] = $77;
 $arrayidx34 = ((($output)) + 8|0);
 $82 = $arrayidx34;
 $83 = $82;
 $84 = HEAP32[$83>>2]|0;
 $85 = (($82) + 4)|0;
 $86 = $85;
 $87 = HEAP32[$86>>2]|0;
 $88 = (_i64Add(($84|0),($87|0),($72|0),($73|0))|0);
 $89 = tempRet0;
 $90 = $arrayidx34;
 $91 = $90;
 HEAP32[$91>>2] = $88;
 $92 = (($90) + 4)|0;
 $93 = $92;
 HEAP32[$93>>2] = $89;
 return;
}
function _div_by_2_26($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $shr1 = 0, $shr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $shr1 = $1 >> 31;
 $shr2 = $shr1 >>> 6;
 $2 = (_i64Add(($shr2|0),0,($0|0),($1|0))|0);
 $3 = tempRet0;
 $4 = (_bitshift64Ashr(($2|0),($3|0),26)|0);
 $5 = tempRet0;
 tempRet0 = ($5);
 return ($4|0);
}
function _div_by_2_25($0,$1) {
 $0 = $0|0;
 $1 = $1|0;
 var $2 = 0, $3 = 0, $4 = 0, $5 = 0, $shr1 = 0, $shr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $shr1 = $1 >> 31;
 $shr2 = $shr1 >>> 7;
 $2 = (_i64Add(($shr2|0),0,($0|0),($1|0))|0);
 $3 = tempRet0;
 $4 = (_bitshift64Ashr(($2|0),($3|0),25)|0);
 $5 = tempRet0;
 tempRet0 = ($5);
 return ($4|0);
}
function _fsquare($output,$in) {
 $output = $output|0;
 $in = $in|0;
 var $t = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $t = sp;
 _fsquare_inner($t,$in);
 _freduce_degree($t);
 _freduce_coefficients($t);
 dest=$output; src=$t; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 STACKTOP = sp;return;
}
function _fsquare_inner($output,$in) {
 $output = $output|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0;
 var $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0;
 var $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0;
 var $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0;
 var $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0;
 var $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0;
 var $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0;
 var $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0;
 var $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0;
 var $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0;
 var $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0;
 var $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0;
 var $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0;
 var $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0;
 var $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0;
 var $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0;
 var $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0;
 var $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0;
 var $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0;
 var $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0;
 var $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0;
 var $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0;
 var $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0;
 var $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0;
 var $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0;
 var $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0;
 var $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0;
 var $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0;
 var $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0;
 var $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0;
 var $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0;
 var $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0;
 var $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0;
 var $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0;
 var $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0;
 var $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0;
 var $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0;
 var $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0;
 var $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0;
 var $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $arrayidx10 = 0, $arrayidx117 = 0, $arrayidx132 = 0, $arrayidx14 = 0, $arrayidx159 = 0, $arrayidx165 = 0, $arrayidx183 = 0, $arrayidx207 = 0;
 var $arrayidx242 = 0, $arrayidx248 = 0, $arrayidx25 = 0, $arrayidx290 = 0, $arrayidx30 = 0, $arrayidx323 = 0, $arrayidx357 = 0, $arrayidx382 = 0, $arrayidx408 = 0, $arrayidx41 = 0, $arrayidx425 = 0, $arrayidx442 = 0, $arrayidx451 = 0, $arrayidx460 = 0, $arrayidx47 = 0, $arrayidx68 = 0, $arrayidx73 = 0, $arrayidx92 = 0, $arrayidx98 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = $in;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = (_bitshift64Ashr(0,($2|0),32)|0);
 $7 = tempRet0;
 $8 = (___muldi3(($6|0),($7|0),($6|0),($7|0))|0);
 $9 = tempRet0;
 $10 = $output;
 $11 = $10;
 HEAP32[$11>>2] = $8;
 $12 = (($10) + 4)|0;
 $13 = $12;
 HEAP32[$13>>2] = $9;
 $14 = $in;
 $15 = $14;
 $16 = HEAP32[$15>>2]|0;
 $17 = (($14) + 4)|0;
 $18 = $17;
 $19 = HEAP32[$18>>2]|0;
 $20 = (_bitshift64Ashr(0,($16|0),31)|0);
 $21 = tempRet0;
 $arrayidx10 = ((($in)) + 8|0);
 $22 = $arrayidx10;
 $23 = $22;
 $24 = HEAP32[$23>>2]|0;
 $25 = (($22) + 4)|0;
 $26 = $25;
 $27 = HEAP32[$26>>2]|0;
 $28 = (_bitshift64Ashr(0,($24|0),32)|0);
 $29 = tempRet0;
 $30 = (___muldi3(($28|0),($29|0),($20|0),($21|0))|0);
 $31 = tempRet0;
 $arrayidx14 = ((($output)) + 8|0);
 $32 = $arrayidx14;
 $33 = $32;
 HEAP32[$33>>2] = $30;
 $34 = (($32) + 4)|0;
 $35 = $34;
 HEAP32[$35>>2] = $31;
 $36 = $arrayidx10;
 $37 = $36;
 $38 = HEAP32[$37>>2]|0;
 $39 = (($36) + 4)|0;
 $40 = $39;
 $41 = HEAP32[$40>>2]|0;
 $42 = (_bitshift64Ashr(0,($38|0),32)|0);
 $43 = tempRet0;
 $44 = (___muldi3(($42|0),($43|0),($42|0),($43|0))|0);
 $45 = tempRet0;
 $46 = $in;
 $47 = $46;
 $48 = HEAP32[$47>>2]|0;
 $49 = (($46) + 4)|0;
 $50 = $49;
 $51 = HEAP32[$50>>2]|0;
 $52 = (_bitshift64Ashr(0,($48|0),32)|0);
 $53 = tempRet0;
 $arrayidx25 = ((($in)) + 16|0);
 $54 = $arrayidx25;
 $55 = $54;
 $56 = HEAP32[$55>>2]|0;
 $57 = (($54) + 4)|0;
 $58 = $57;
 $59 = HEAP32[$58>>2]|0;
 $60 = (_bitshift64Ashr(0,($56|0),32)|0);
 $61 = tempRet0;
 $62 = (___muldi3(($60|0),($61|0),($52|0),($53|0))|0);
 $63 = tempRet0;
 $64 = (_i64Add(($62|0),($63|0),($44|0),($45|0))|0);
 $65 = tempRet0;
 $66 = (_bitshift64Shl(($64|0),($65|0),1)|0);
 $67 = tempRet0;
 $arrayidx30 = ((($output)) + 16|0);
 $68 = $arrayidx30;
 $69 = $68;
 HEAP32[$69>>2] = $66;
 $70 = (($68) + 4)|0;
 $71 = $70;
 HEAP32[$71>>2] = $67;
 $72 = $arrayidx10;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $78 = (_bitshift64Ashr(0,($74|0),32)|0);
 $79 = tempRet0;
 $80 = $arrayidx25;
 $81 = $80;
 $82 = HEAP32[$81>>2]|0;
 $83 = (($80) + 4)|0;
 $84 = $83;
 $85 = HEAP32[$84>>2]|0;
 $86 = (_bitshift64Ashr(0,($82|0),32)|0);
 $87 = tempRet0;
 $88 = (___muldi3(($86|0),($87|0),($78|0),($79|0))|0);
 $89 = tempRet0;
 $90 = $in;
 $91 = $90;
 $92 = HEAP32[$91>>2]|0;
 $93 = (($90) + 4)|0;
 $94 = $93;
 $95 = HEAP32[$94>>2]|0;
 $96 = (_bitshift64Ashr(0,($92|0),32)|0);
 $97 = tempRet0;
 $arrayidx41 = ((($in)) + 24|0);
 $98 = $arrayidx41;
 $99 = $98;
 $100 = HEAP32[$99>>2]|0;
 $101 = (($98) + 4)|0;
 $102 = $101;
 $103 = HEAP32[$102>>2]|0;
 $104 = (_bitshift64Ashr(0,($100|0),32)|0);
 $105 = tempRet0;
 $106 = (___muldi3(($104|0),($105|0),($96|0),($97|0))|0);
 $107 = tempRet0;
 $108 = (_i64Add(($106|0),($107|0),($88|0),($89|0))|0);
 $109 = tempRet0;
 $110 = (_bitshift64Shl(($108|0),($109|0),1)|0);
 $111 = tempRet0;
 $arrayidx47 = ((($output)) + 24|0);
 $112 = $arrayidx47;
 $113 = $112;
 HEAP32[$113>>2] = $110;
 $114 = (($112) + 4)|0;
 $115 = $114;
 HEAP32[$115>>2] = $111;
 $116 = $arrayidx25;
 $117 = $116;
 $118 = HEAP32[$117>>2]|0;
 $119 = (($116) + 4)|0;
 $120 = $119;
 $121 = HEAP32[$120>>2]|0;
 $122 = (_bitshift64Ashr(0,($118|0),32)|0);
 $123 = tempRet0;
 $124 = (___muldi3(($122|0),($123|0),($122|0),($123|0))|0);
 $125 = tempRet0;
 $126 = $arrayidx10;
 $127 = $126;
 $128 = HEAP32[$127>>2]|0;
 $129 = (($126) + 4)|0;
 $130 = $129;
 $131 = HEAP32[$130>>2]|0;
 $132 = (_bitshift64Ashr(0,($128|0),30)|0);
 $133 = tempRet0;
 $134 = $arrayidx41;
 $135 = $134;
 $136 = HEAP32[$135>>2]|0;
 $137 = (($134) + 4)|0;
 $138 = $137;
 $139 = HEAP32[$138>>2]|0;
 $140 = (_bitshift64Ashr(0,($136|0),32)|0);
 $141 = tempRet0;
 $142 = (___muldi3(($140|0),($141|0),($132|0),($133|0))|0);
 $143 = tempRet0;
 $144 = (_i64Add(($142|0),($143|0),($124|0),($125|0))|0);
 $145 = tempRet0;
 $146 = $in;
 $147 = $146;
 $148 = HEAP32[$147>>2]|0;
 $149 = (($146) + 4)|0;
 $150 = $149;
 $151 = HEAP32[$150>>2]|0;
 $152 = (_bitshift64Ashr(0,($148|0),31)|0);
 $153 = tempRet0;
 $arrayidx68 = ((($in)) + 32|0);
 $154 = $arrayidx68;
 $155 = $154;
 $156 = HEAP32[$155>>2]|0;
 $157 = (($154) + 4)|0;
 $158 = $157;
 $159 = HEAP32[$158>>2]|0;
 $160 = (_bitshift64Ashr(0,($156|0),32)|0);
 $161 = tempRet0;
 $162 = (___muldi3(($160|0),($161|0),($152|0),($153|0))|0);
 $163 = tempRet0;
 $164 = (_i64Add(($144|0),($145|0),($162|0),($163|0))|0);
 $165 = tempRet0;
 $arrayidx73 = ((($output)) + 32|0);
 $166 = $arrayidx73;
 $167 = $166;
 HEAP32[$167>>2] = $164;
 $168 = (($166) + 4)|0;
 $169 = $168;
 HEAP32[$169>>2] = $165;
 $170 = $arrayidx25;
 $171 = $170;
 $172 = HEAP32[$171>>2]|0;
 $173 = (($170) + 4)|0;
 $174 = $173;
 $175 = HEAP32[$174>>2]|0;
 $176 = (_bitshift64Ashr(0,($172|0),32)|0);
 $177 = tempRet0;
 $178 = $arrayidx41;
 $179 = $178;
 $180 = HEAP32[$179>>2]|0;
 $181 = (($178) + 4)|0;
 $182 = $181;
 $183 = HEAP32[$182>>2]|0;
 $184 = (_bitshift64Ashr(0,($180|0),32)|0);
 $185 = tempRet0;
 $186 = (___muldi3(($184|0),($185|0),($176|0),($177|0))|0);
 $187 = tempRet0;
 $188 = $arrayidx10;
 $189 = $188;
 $190 = HEAP32[$189>>2]|0;
 $191 = (($188) + 4)|0;
 $192 = $191;
 $193 = HEAP32[$192>>2]|0;
 $194 = (_bitshift64Ashr(0,($190|0),32)|0);
 $195 = tempRet0;
 $196 = $arrayidx68;
 $197 = $196;
 $198 = HEAP32[$197>>2]|0;
 $199 = (($196) + 4)|0;
 $200 = $199;
 $201 = HEAP32[$200>>2]|0;
 $202 = (_bitshift64Ashr(0,($198|0),32)|0);
 $203 = tempRet0;
 $204 = (___muldi3(($202|0),($203|0),($194|0),($195|0))|0);
 $205 = tempRet0;
 $206 = (_i64Add(($204|0),($205|0),($186|0),($187|0))|0);
 $207 = tempRet0;
 $208 = $in;
 $209 = $208;
 $210 = HEAP32[$209>>2]|0;
 $211 = (($208) + 4)|0;
 $212 = $211;
 $213 = HEAP32[$212>>2]|0;
 $214 = (_bitshift64Ashr(0,($210|0),32)|0);
 $215 = tempRet0;
 $arrayidx92 = ((($in)) + 40|0);
 $216 = $arrayidx92;
 $217 = $216;
 $218 = HEAP32[$217>>2]|0;
 $219 = (($216) + 4)|0;
 $220 = $219;
 $221 = HEAP32[$220>>2]|0;
 $222 = (_bitshift64Ashr(0,($218|0),32)|0);
 $223 = tempRet0;
 $224 = (___muldi3(($222|0),($223|0),($214|0),($215|0))|0);
 $225 = tempRet0;
 $226 = (_i64Add(($206|0),($207|0),($224|0),($225|0))|0);
 $227 = tempRet0;
 $228 = (_bitshift64Shl(($226|0),($227|0),1)|0);
 $229 = tempRet0;
 $arrayidx98 = ((($output)) + 40|0);
 $230 = $arrayidx98;
 $231 = $230;
 HEAP32[$231>>2] = $228;
 $232 = (($230) + 4)|0;
 $233 = $232;
 HEAP32[$233>>2] = $229;
 $234 = $arrayidx41;
 $235 = $234;
 $236 = HEAP32[$235>>2]|0;
 $237 = (($234) + 4)|0;
 $238 = $237;
 $239 = HEAP32[$238>>2]|0;
 $240 = (_bitshift64Ashr(0,($236|0),32)|0);
 $241 = tempRet0;
 $242 = (___muldi3(($240|0),($241|0),($240|0),($241|0))|0);
 $243 = tempRet0;
 $244 = $arrayidx25;
 $245 = $244;
 $246 = HEAP32[$245>>2]|0;
 $247 = (($244) + 4)|0;
 $248 = $247;
 $249 = HEAP32[$248>>2]|0;
 $250 = (_bitshift64Ashr(0,($246|0),32)|0);
 $251 = tempRet0;
 $252 = $arrayidx68;
 $253 = $252;
 $254 = HEAP32[$253>>2]|0;
 $255 = (($252) + 4)|0;
 $256 = $255;
 $257 = HEAP32[$256>>2]|0;
 $258 = (_bitshift64Ashr(0,($254|0),32)|0);
 $259 = tempRet0;
 $260 = (___muldi3(($258|0),($259|0),($250|0),($251|0))|0);
 $261 = tempRet0;
 $262 = (_i64Add(($260|0),($261|0),($242|0),($243|0))|0);
 $263 = tempRet0;
 $264 = $in;
 $265 = $264;
 $266 = HEAP32[$265>>2]|0;
 $267 = (($264) + 4)|0;
 $268 = $267;
 $269 = HEAP32[$268>>2]|0;
 $270 = (_bitshift64Ashr(0,($266|0),32)|0);
 $271 = tempRet0;
 $arrayidx117 = ((($in)) + 48|0);
 $272 = $arrayidx117;
 $273 = $272;
 $274 = HEAP32[$273>>2]|0;
 $275 = (($272) + 4)|0;
 $276 = $275;
 $277 = HEAP32[$276>>2]|0;
 $278 = (_bitshift64Ashr(0,($274|0),32)|0);
 $279 = tempRet0;
 $280 = (___muldi3(($278|0),($279|0),($270|0),($271|0))|0);
 $281 = tempRet0;
 $282 = (_i64Add(($262|0),($263|0),($280|0),($281|0))|0);
 $283 = tempRet0;
 $284 = $arrayidx10;
 $285 = $284;
 $286 = HEAP32[$285>>2]|0;
 $287 = (($284) + 4)|0;
 $288 = $287;
 $289 = HEAP32[$288>>2]|0;
 $290 = (_bitshift64Ashr(0,($286|0),31)|0);
 $291 = tempRet0;
 $292 = $arrayidx92;
 $293 = $292;
 $294 = HEAP32[$293>>2]|0;
 $295 = (($292) + 4)|0;
 $296 = $295;
 $297 = HEAP32[$296>>2]|0;
 $298 = (_bitshift64Ashr(0,($294|0),32)|0);
 $299 = tempRet0;
 $300 = (___muldi3(($298|0),($299|0),($290|0),($291|0))|0);
 $301 = tempRet0;
 $302 = (_i64Add(($282|0),($283|0),($300|0),($301|0))|0);
 $303 = tempRet0;
 $304 = (_bitshift64Shl(($302|0),($303|0),1)|0);
 $305 = tempRet0;
 $arrayidx132 = ((($output)) + 48|0);
 $306 = $arrayidx132;
 $307 = $306;
 HEAP32[$307>>2] = $304;
 $308 = (($306) + 4)|0;
 $309 = $308;
 HEAP32[$309>>2] = $305;
 $310 = $arrayidx41;
 $311 = $310;
 $312 = HEAP32[$311>>2]|0;
 $313 = (($310) + 4)|0;
 $314 = $313;
 $315 = HEAP32[$314>>2]|0;
 $316 = (_bitshift64Ashr(0,($312|0),32)|0);
 $317 = tempRet0;
 $318 = $arrayidx68;
 $319 = $318;
 $320 = HEAP32[$319>>2]|0;
 $321 = (($318) + 4)|0;
 $322 = $321;
 $323 = HEAP32[$322>>2]|0;
 $324 = (_bitshift64Ashr(0,($320|0),32)|0);
 $325 = tempRet0;
 $326 = (___muldi3(($324|0),($325|0),($316|0),($317|0))|0);
 $327 = tempRet0;
 $328 = $arrayidx25;
 $329 = $328;
 $330 = HEAP32[$329>>2]|0;
 $331 = (($328) + 4)|0;
 $332 = $331;
 $333 = HEAP32[$332>>2]|0;
 $334 = (_bitshift64Ashr(0,($330|0),32)|0);
 $335 = tempRet0;
 $336 = $arrayidx92;
 $337 = $336;
 $338 = HEAP32[$337>>2]|0;
 $339 = (($336) + 4)|0;
 $340 = $339;
 $341 = HEAP32[$340>>2]|0;
 $342 = (_bitshift64Ashr(0,($338|0),32)|0);
 $343 = tempRet0;
 $344 = (___muldi3(($342|0),($343|0),($334|0),($335|0))|0);
 $345 = tempRet0;
 $346 = (_i64Add(($344|0),($345|0),($326|0),($327|0))|0);
 $347 = tempRet0;
 $348 = $arrayidx10;
 $349 = $348;
 $350 = HEAP32[$349>>2]|0;
 $351 = (($348) + 4)|0;
 $352 = $351;
 $353 = HEAP32[$352>>2]|0;
 $354 = (_bitshift64Ashr(0,($350|0),32)|0);
 $355 = tempRet0;
 $356 = $arrayidx117;
 $357 = $356;
 $358 = HEAP32[$357>>2]|0;
 $359 = (($356) + 4)|0;
 $360 = $359;
 $361 = HEAP32[$360>>2]|0;
 $362 = (_bitshift64Ashr(0,($358|0),32)|0);
 $363 = tempRet0;
 $364 = (___muldi3(($362|0),($363|0),($354|0),($355|0))|0);
 $365 = tempRet0;
 $366 = (_i64Add(($346|0),($347|0),($364|0),($365|0))|0);
 $367 = tempRet0;
 $368 = $in;
 $369 = $368;
 $370 = HEAP32[$369>>2]|0;
 $371 = (($368) + 4)|0;
 $372 = $371;
 $373 = HEAP32[$372>>2]|0;
 $374 = (_bitshift64Ashr(0,($370|0),32)|0);
 $375 = tempRet0;
 $arrayidx159 = ((($in)) + 56|0);
 $376 = $arrayidx159;
 $377 = $376;
 $378 = HEAP32[$377>>2]|0;
 $379 = (($376) + 4)|0;
 $380 = $379;
 $381 = HEAP32[$380>>2]|0;
 $382 = (_bitshift64Ashr(0,($378|0),32)|0);
 $383 = tempRet0;
 $384 = (___muldi3(($382|0),($383|0),($374|0),($375|0))|0);
 $385 = tempRet0;
 $386 = (_i64Add(($366|0),($367|0),($384|0),($385|0))|0);
 $387 = tempRet0;
 $388 = (_bitshift64Shl(($386|0),($387|0),1)|0);
 $389 = tempRet0;
 $arrayidx165 = ((($output)) + 56|0);
 $390 = $arrayidx165;
 $391 = $390;
 HEAP32[$391>>2] = $388;
 $392 = (($390) + 4)|0;
 $393 = $392;
 HEAP32[$393>>2] = $389;
 $394 = $arrayidx68;
 $395 = $394;
 $396 = HEAP32[$395>>2]|0;
 $397 = (($394) + 4)|0;
 $398 = $397;
 $399 = HEAP32[$398>>2]|0;
 $400 = (_bitshift64Ashr(0,($396|0),32)|0);
 $401 = tempRet0;
 $402 = (___muldi3(($400|0),($401|0),($400|0),($401|0))|0);
 $403 = tempRet0;
 $404 = $arrayidx25;
 $405 = $404;
 $406 = HEAP32[$405>>2]|0;
 $407 = (($404) + 4)|0;
 $408 = $407;
 $409 = HEAP32[$408>>2]|0;
 $410 = (_bitshift64Ashr(0,($406|0),32)|0);
 $411 = tempRet0;
 $412 = $arrayidx117;
 $413 = $412;
 $414 = HEAP32[$413>>2]|0;
 $415 = (($412) + 4)|0;
 $416 = $415;
 $417 = HEAP32[$416>>2]|0;
 $418 = (_bitshift64Ashr(0,($414|0),32)|0);
 $419 = tempRet0;
 $420 = (___muldi3(($418|0),($419|0),($410|0),($411|0))|0);
 $421 = tempRet0;
 $422 = $in;
 $423 = $422;
 $424 = HEAP32[$423>>2]|0;
 $425 = (($422) + 4)|0;
 $426 = $425;
 $427 = HEAP32[$426>>2]|0;
 $428 = (_bitshift64Ashr(0,($424|0),32)|0);
 $429 = tempRet0;
 $arrayidx183 = ((($in)) + 64|0);
 $430 = $arrayidx183;
 $431 = $430;
 $432 = HEAP32[$431>>2]|0;
 $433 = (($430) + 4)|0;
 $434 = $433;
 $435 = HEAP32[$434>>2]|0;
 $436 = (_bitshift64Ashr(0,($432|0),32)|0);
 $437 = tempRet0;
 $438 = (___muldi3(($436|0),($437|0),($428|0),($429|0))|0);
 $439 = tempRet0;
 $440 = (_i64Add(($438|0),($439|0),($420|0),($421|0))|0);
 $441 = tempRet0;
 $442 = $arrayidx10;
 $443 = $442;
 $444 = HEAP32[$443>>2]|0;
 $445 = (($442) + 4)|0;
 $446 = $445;
 $447 = HEAP32[$446>>2]|0;
 $448 = (_bitshift64Ashr(0,($444|0),32)|0);
 $449 = tempRet0;
 $450 = $arrayidx159;
 $451 = $450;
 $452 = HEAP32[$451>>2]|0;
 $453 = (($450) + 4)|0;
 $454 = $453;
 $455 = HEAP32[$454>>2]|0;
 $456 = (_bitshift64Ashr(0,($452|0),32)|0);
 $457 = tempRet0;
 $458 = (___muldi3(($456|0),($457|0),($448|0),($449|0))|0);
 $459 = tempRet0;
 $460 = $arrayidx41;
 $461 = $460;
 $462 = HEAP32[$461>>2]|0;
 $463 = (($460) + 4)|0;
 $464 = $463;
 $465 = HEAP32[$464>>2]|0;
 $466 = (_bitshift64Ashr(0,($462|0),32)|0);
 $467 = tempRet0;
 $468 = $arrayidx92;
 $469 = $468;
 $470 = HEAP32[$469>>2]|0;
 $471 = (($468) + 4)|0;
 $472 = $471;
 $473 = HEAP32[$472>>2]|0;
 $474 = (_bitshift64Ashr(0,($470|0),32)|0);
 $475 = tempRet0;
 $476 = (___muldi3(($474|0),($475|0),($466|0),($467|0))|0);
 $477 = tempRet0;
 $478 = (_i64Add(($476|0),($477|0),($458|0),($459|0))|0);
 $479 = tempRet0;
 $480 = (_bitshift64Shl(($478|0),($479|0),1)|0);
 $481 = tempRet0;
 $482 = (_i64Add(($440|0),($441|0),($480|0),($481|0))|0);
 $483 = tempRet0;
 $484 = (_bitshift64Shl(($482|0),($483|0),1)|0);
 $485 = tempRet0;
 $486 = (_i64Add(($484|0),($485|0),($402|0),($403|0))|0);
 $487 = tempRet0;
 $arrayidx207 = ((($output)) + 64|0);
 $488 = $arrayidx207;
 $489 = $488;
 HEAP32[$489>>2] = $486;
 $490 = (($488) + 4)|0;
 $491 = $490;
 HEAP32[$491>>2] = $487;
 $492 = $arrayidx68;
 $493 = $492;
 $494 = HEAP32[$493>>2]|0;
 $495 = (($492) + 4)|0;
 $496 = $495;
 $497 = HEAP32[$496>>2]|0;
 $498 = (_bitshift64Ashr(0,($494|0),32)|0);
 $499 = tempRet0;
 $500 = $arrayidx92;
 $501 = $500;
 $502 = HEAP32[$501>>2]|0;
 $503 = (($500) + 4)|0;
 $504 = $503;
 $505 = HEAP32[$504>>2]|0;
 $506 = (_bitshift64Ashr(0,($502|0),32)|0);
 $507 = tempRet0;
 $508 = (___muldi3(($506|0),($507|0),($498|0),($499|0))|0);
 $509 = tempRet0;
 $510 = $arrayidx41;
 $511 = $510;
 $512 = HEAP32[$511>>2]|0;
 $513 = (($510) + 4)|0;
 $514 = $513;
 $515 = HEAP32[$514>>2]|0;
 $516 = (_bitshift64Ashr(0,($512|0),32)|0);
 $517 = tempRet0;
 $518 = $arrayidx117;
 $519 = $518;
 $520 = HEAP32[$519>>2]|0;
 $521 = (($518) + 4)|0;
 $522 = $521;
 $523 = HEAP32[$522>>2]|0;
 $524 = (_bitshift64Ashr(0,($520|0),32)|0);
 $525 = tempRet0;
 $526 = (___muldi3(($524|0),($525|0),($516|0),($517|0))|0);
 $527 = tempRet0;
 $528 = (_i64Add(($526|0),($527|0),($508|0),($509|0))|0);
 $529 = tempRet0;
 $530 = $arrayidx25;
 $531 = $530;
 $532 = HEAP32[$531>>2]|0;
 $533 = (($530) + 4)|0;
 $534 = $533;
 $535 = HEAP32[$534>>2]|0;
 $536 = (_bitshift64Ashr(0,($532|0),32)|0);
 $537 = tempRet0;
 $538 = $arrayidx159;
 $539 = $538;
 $540 = HEAP32[$539>>2]|0;
 $541 = (($538) + 4)|0;
 $542 = $541;
 $543 = HEAP32[$542>>2]|0;
 $544 = (_bitshift64Ashr(0,($540|0),32)|0);
 $545 = tempRet0;
 $546 = (___muldi3(($544|0),($545|0),($536|0),($537|0))|0);
 $547 = tempRet0;
 $548 = (_i64Add(($528|0),($529|0),($546|0),($547|0))|0);
 $549 = tempRet0;
 $550 = $arrayidx10;
 $551 = $550;
 $552 = HEAP32[$551>>2]|0;
 $553 = (($550) + 4)|0;
 $554 = $553;
 $555 = HEAP32[$554>>2]|0;
 $556 = (_bitshift64Ashr(0,($552|0),32)|0);
 $557 = tempRet0;
 $558 = $arrayidx183;
 $559 = $558;
 $560 = HEAP32[$559>>2]|0;
 $561 = (($558) + 4)|0;
 $562 = $561;
 $563 = HEAP32[$562>>2]|0;
 $564 = (_bitshift64Ashr(0,($560|0),32)|0);
 $565 = tempRet0;
 $566 = (___muldi3(($564|0),($565|0),($556|0),($557|0))|0);
 $567 = tempRet0;
 $568 = (_i64Add(($548|0),($549|0),($566|0),($567|0))|0);
 $569 = tempRet0;
 $570 = $in;
 $571 = $570;
 $572 = HEAP32[$571>>2]|0;
 $573 = (($570) + 4)|0;
 $574 = $573;
 $575 = HEAP32[$574>>2]|0;
 $576 = (_bitshift64Ashr(0,($572|0),32)|0);
 $577 = tempRet0;
 $arrayidx242 = ((($in)) + 72|0);
 $578 = $arrayidx242;
 $579 = $578;
 $580 = HEAP32[$579>>2]|0;
 $581 = (($578) + 4)|0;
 $582 = $581;
 $583 = HEAP32[$582>>2]|0;
 $584 = (_bitshift64Ashr(0,($580|0),32)|0);
 $585 = tempRet0;
 $586 = (___muldi3(($584|0),($585|0),($576|0),($577|0))|0);
 $587 = tempRet0;
 $588 = (_i64Add(($568|0),($569|0),($586|0),($587|0))|0);
 $589 = tempRet0;
 $590 = (_bitshift64Shl(($588|0),($589|0),1)|0);
 $591 = tempRet0;
 $arrayidx248 = ((($output)) + 72|0);
 $592 = $arrayidx248;
 $593 = $592;
 HEAP32[$593>>2] = $590;
 $594 = (($592) + 4)|0;
 $595 = $594;
 HEAP32[$595>>2] = $591;
 $596 = $arrayidx92;
 $597 = $596;
 $598 = HEAP32[$597>>2]|0;
 $599 = (($596) + 4)|0;
 $600 = $599;
 $601 = HEAP32[$600>>2]|0;
 $602 = (_bitshift64Ashr(0,($598|0),32)|0);
 $603 = tempRet0;
 $604 = (___muldi3(($602|0),($603|0),($602|0),($603|0))|0);
 $605 = tempRet0;
 $606 = $arrayidx68;
 $607 = $606;
 $608 = HEAP32[$607>>2]|0;
 $609 = (($606) + 4)|0;
 $610 = $609;
 $611 = HEAP32[$610>>2]|0;
 $612 = (_bitshift64Ashr(0,($608|0),32)|0);
 $613 = tempRet0;
 $614 = $arrayidx117;
 $615 = $614;
 $616 = HEAP32[$615>>2]|0;
 $617 = (($614) + 4)|0;
 $618 = $617;
 $619 = HEAP32[$618>>2]|0;
 $620 = (_bitshift64Ashr(0,($616|0),32)|0);
 $621 = tempRet0;
 $622 = (___muldi3(($620|0),($621|0),($612|0),($613|0))|0);
 $623 = tempRet0;
 $624 = (_i64Add(($622|0),($623|0),($604|0),($605|0))|0);
 $625 = tempRet0;
 $626 = $arrayidx25;
 $627 = $626;
 $628 = HEAP32[$627>>2]|0;
 $629 = (($626) + 4)|0;
 $630 = $629;
 $631 = HEAP32[$630>>2]|0;
 $632 = (_bitshift64Ashr(0,($628|0),32)|0);
 $633 = tempRet0;
 $634 = $arrayidx183;
 $635 = $634;
 $636 = HEAP32[$635>>2]|0;
 $637 = (($634) + 4)|0;
 $638 = $637;
 $639 = HEAP32[$638>>2]|0;
 $640 = (_bitshift64Ashr(0,($636|0),32)|0);
 $641 = tempRet0;
 $642 = (___muldi3(($640|0),($641|0),($632|0),($633|0))|0);
 $643 = tempRet0;
 $644 = (_i64Add(($624|0),($625|0),($642|0),($643|0))|0);
 $645 = tempRet0;
 $646 = $arrayidx41;
 $647 = $646;
 $648 = HEAP32[$647>>2]|0;
 $649 = (($646) + 4)|0;
 $650 = $649;
 $651 = HEAP32[$650>>2]|0;
 $652 = (_bitshift64Ashr(0,($648|0),32)|0);
 $653 = tempRet0;
 $654 = $arrayidx159;
 $655 = $654;
 $656 = HEAP32[$655>>2]|0;
 $657 = (($654) + 4)|0;
 $658 = $657;
 $659 = HEAP32[$658>>2]|0;
 $660 = (_bitshift64Ashr(0,($656|0),32)|0);
 $661 = tempRet0;
 $662 = (___muldi3(($660|0),($661|0),($652|0),($653|0))|0);
 $663 = tempRet0;
 $664 = $arrayidx10;
 $665 = $664;
 $666 = HEAP32[$665>>2]|0;
 $667 = (($664) + 4)|0;
 $668 = $667;
 $669 = HEAP32[$668>>2]|0;
 $670 = (_bitshift64Ashr(0,($666|0),32)|0);
 $671 = tempRet0;
 $672 = $arrayidx242;
 $673 = $672;
 $674 = HEAP32[$673>>2]|0;
 $675 = (($672) + 4)|0;
 $676 = $675;
 $677 = HEAP32[$676>>2]|0;
 $678 = (_bitshift64Ashr(0,($674|0),32)|0);
 $679 = tempRet0;
 $680 = (___muldi3(($678|0),($679|0),($670|0),($671|0))|0);
 $681 = tempRet0;
 $682 = (_i64Add(($680|0),($681|0),($662|0),($663|0))|0);
 $683 = tempRet0;
 $684 = (_bitshift64Shl(($682|0),($683|0),1)|0);
 $685 = tempRet0;
 $686 = (_i64Add(($644|0),($645|0),($684|0),($685|0))|0);
 $687 = tempRet0;
 $688 = (_bitshift64Shl(($686|0),($687|0),1)|0);
 $689 = tempRet0;
 $arrayidx290 = ((($output)) + 80|0);
 $690 = $arrayidx290;
 $691 = $690;
 HEAP32[$691>>2] = $688;
 $692 = (($690) + 4)|0;
 $693 = $692;
 HEAP32[$693>>2] = $689;
 $694 = $arrayidx92;
 $695 = $694;
 $696 = HEAP32[$695>>2]|0;
 $697 = (($694) + 4)|0;
 $698 = $697;
 $699 = HEAP32[$698>>2]|0;
 $700 = (_bitshift64Ashr(0,($696|0),32)|0);
 $701 = tempRet0;
 $702 = $arrayidx117;
 $703 = $702;
 $704 = HEAP32[$703>>2]|0;
 $705 = (($702) + 4)|0;
 $706 = $705;
 $707 = HEAP32[$706>>2]|0;
 $708 = (_bitshift64Ashr(0,($704|0),32)|0);
 $709 = tempRet0;
 $710 = (___muldi3(($708|0),($709|0),($700|0),($701|0))|0);
 $711 = tempRet0;
 $712 = $arrayidx68;
 $713 = $712;
 $714 = HEAP32[$713>>2]|0;
 $715 = (($712) + 4)|0;
 $716 = $715;
 $717 = HEAP32[$716>>2]|0;
 $718 = (_bitshift64Ashr(0,($714|0),32)|0);
 $719 = tempRet0;
 $720 = $arrayidx159;
 $721 = $720;
 $722 = HEAP32[$721>>2]|0;
 $723 = (($720) + 4)|0;
 $724 = $723;
 $725 = HEAP32[$724>>2]|0;
 $726 = (_bitshift64Ashr(0,($722|0),32)|0);
 $727 = tempRet0;
 $728 = (___muldi3(($726|0),($727|0),($718|0),($719|0))|0);
 $729 = tempRet0;
 $730 = (_i64Add(($728|0),($729|0),($710|0),($711|0))|0);
 $731 = tempRet0;
 $732 = $arrayidx41;
 $733 = $732;
 $734 = HEAP32[$733>>2]|0;
 $735 = (($732) + 4)|0;
 $736 = $735;
 $737 = HEAP32[$736>>2]|0;
 $738 = (_bitshift64Ashr(0,($734|0),32)|0);
 $739 = tempRet0;
 $740 = $arrayidx183;
 $741 = $740;
 $742 = HEAP32[$741>>2]|0;
 $743 = (($740) + 4)|0;
 $744 = $743;
 $745 = HEAP32[$744>>2]|0;
 $746 = (_bitshift64Ashr(0,($742|0),32)|0);
 $747 = tempRet0;
 $748 = (___muldi3(($746|0),($747|0),($738|0),($739|0))|0);
 $749 = tempRet0;
 $750 = (_i64Add(($730|0),($731|0),($748|0),($749|0))|0);
 $751 = tempRet0;
 $752 = $arrayidx25;
 $753 = $752;
 $754 = HEAP32[$753>>2]|0;
 $755 = (($752) + 4)|0;
 $756 = $755;
 $757 = HEAP32[$756>>2]|0;
 $758 = (_bitshift64Ashr(0,($754|0),32)|0);
 $759 = tempRet0;
 $760 = $arrayidx242;
 $761 = $760;
 $762 = HEAP32[$761>>2]|0;
 $763 = (($760) + 4)|0;
 $764 = $763;
 $765 = HEAP32[$764>>2]|0;
 $766 = (_bitshift64Ashr(0,($762|0),32)|0);
 $767 = tempRet0;
 $768 = (___muldi3(($766|0),($767|0),($758|0),($759|0))|0);
 $769 = tempRet0;
 $770 = (_i64Add(($750|0),($751|0),($768|0),($769|0))|0);
 $771 = tempRet0;
 $772 = (_bitshift64Shl(($770|0),($771|0),1)|0);
 $773 = tempRet0;
 $arrayidx323 = ((($output)) + 88|0);
 $774 = $arrayidx323;
 $775 = $774;
 HEAP32[$775>>2] = $772;
 $776 = (($774) + 4)|0;
 $777 = $776;
 HEAP32[$777>>2] = $773;
 $778 = $arrayidx117;
 $779 = $778;
 $780 = HEAP32[$779>>2]|0;
 $781 = (($778) + 4)|0;
 $782 = $781;
 $783 = HEAP32[$782>>2]|0;
 $784 = (_bitshift64Ashr(0,($780|0),32)|0);
 $785 = tempRet0;
 $786 = (___muldi3(($784|0),($785|0),($784|0),($785|0))|0);
 $787 = tempRet0;
 $788 = $arrayidx68;
 $789 = $788;
 $790 = HEAP32[$789>>2]|0;
 $791 = (($788) + 4)|0;
 $792 = $791;
 $793 = HEAP32[$792>>2]|0;
 $794 = (_bitshift64Ashr(0,($790|0),32)|0);
 $795 = tempRet0;
 $796 = $arrayidx183;
 $797 = $796;
 $798 = HEAP32[$797>>2]|0;
 $799 = (($796) + 4)|0;
 $800 = $799;
 $801 = HEAP32[$800>>2]|0;
 $802 = (_bitshift64Ashr(0,($798|0),32)|0);
 $803 = tempRet0;
 $804 = (___muldi3(($802|0),($803|0),($794|0),($795|0))|0);
 $805 = tempRet0;
 $806 = $arrayidx92;
 $807 = $806;
 $808 = HEAP32[$807>>2]|0;
 $809 = (($806) + 4)|0;
 $810 = $809;
 $811 = HEAP32[$810>>2]|0;
 $812 = (_bitshift64Ashr(0,($808|0),32)|0);
 $813 = tempRet0;
 $814 = $arrayidx159;
 $815 = $814;
 $816 = HEAP32[$815>>2]|0;
 $817 = (($814) + 4)|0;
 $818 = $817;
 $819 = HEAP32[$818>>2]|0;
 $820 = (_bitshift64Ashr(0,($816|0),32)|0);
 $821 = tempRet0;
 $822 = (___muldi3(($820|0),($821|0),($812|0),($813|0))|0);
 $823 = tempRet0;
 $824 = $arrayidx41;
 $825 = $824;
 $826 = HEAP32[$825>>2]|0;
 $827 = (($824) + 4)|0;
 $828 = $827;
 $829 = HEAP32[$828>>2]|0;
 $830 = (_bitshift64Ashr(0,($826|0),32)|0);
 $831 = tempRet0;
 $832 = $arrayidx242;
 $833 = $832;
 $834 = HEAP32[$833>>2]|0;
 $835 = (($832) + 4)|0;
 $836 = $835;
 $837 = HEAP32[$836>>2]|0;
 $838 = (_bitshift64Ashr(0,($834|0),32)|0);
 $839 = tempRet0;
 $840 = (___muldi3(($838|0),($839|0),($830|0),($831|0))|0);
 $841 = tempRet0;
 $842 = (_i64Add(($840|0),($841|0),($822|0),($823|0))|0);
 $843 = tempRet0;
 $844 = (_bitshift64Shl(($842|0),($843|0),1)|0);
 $845 = tempRet0;
 $846 = (_i64Add(($844|0),($845|0),($804|0),($805|0))|0);
 $847 = tempRet0;
 $848 = (_bitshift64Shl(($846|0),($847|0),1)|0);
 $849 = tempRet0;
 $850 = (_i64Add(($848|0),($849|0),($786|0),($787|0))|0);
 $851 = tempRet0;
 $arrayidx357 = ((($output)) + 96|0);
 $852 = $arrayidx357;
 $853 = $852;
 HEAP32[$853>>2] = $850;
 $854 = (($852) + 4)|0;
 $855 = $854;
 HEAP32[$855>>2] = $851;
 $856 = $arrayidx117;
 $857 = $856;
 $858 = HEAP32[$857>>2]|0;
 $859 = (($856) + 4)|0;
 $860 = $859;
 $861 = HEAP32[$860>>2]|0;
 $862 = (_bitshift64Ashr(0,($858|0),32)|0);
 $863 = tempRet0;
 $864 = $arrayidx159;
 $865 = $864;
 $866 = HEAP32[$865>>2]|0;
 $867 = (($864) + 4)|0;
 $868 = $867;
 $869 = HEAP32[$868>>2]|0;
 $870 = (_bitshift64Ashr(0,($866|0),32)|0);
 $871 = tempRet0;
 $872 = (___muldi3(($870|0),($871|0),($862|0),($863|0))|0);
 $873 = tempRet0;
 $874 = $arrayidx92;
 $875 = $874;
 $876 = HEAP32[$875>>2]|0;
 $877 = (($874) + 4)|0;
 $878 = $877;
 $879 = HEAP32[$878>>2]|0;
 $880 = (_bitshift64Ashr(0,($876|0),32)|0);
 $881 = tempRet0;
 $882 = $arrayidx183;
 $883 = $882;
 $884 = HEAP32[$883>>2]|0;
 $885 = (($882) + 4)|0;
 $886 = $885;
 $887 = HEAP32[$886>>2]|0;
 $888 = (_bitshift64Ashr(0,($884|0),32)|0);
 $889 = tempRet0;
 $890 = (___muldi3(($888|0),($889|0),($880|0),($881|0))|0);
 $891 = tempRet0;
 $892 = (_i64Add(($890|0),($891|0),($872|0),($873|0))|0);
 $893 = tempRet0;
 $894 = $arrayidx68;
 $895 = $894;
 $896 = HEAP32[$895>>2]|0;
 $897 = (($894) + 4)|0;
 $898 = $897;
 $899 = HEAP32[$898>>2]|0;
 $900 = (_bitshift64Ashr(0,($896|0),32)|0);
 $901 = tempRet0;
 $902 = $arrayidx242;
 $903 = $902;
 $904 = HEAP32[$903>>2]|0;
 $905 = (($902) + 4)|0;
 $906 = $905;
 $907 = HEAP32[$906>>2]|0;
 $908 = (_bitshift64Ashr(0,($904|0),32)|0);
 $909 = tempRet0;
 $910 = (___muldi3(($908|0),($909|0),($900|0),($901|0))|0);
 $911 = tempRet0;
 $912 = (_i64Add(($892|0),($893|0),($910|0),($911|0))|0);
 $913 = tempRet0;
 $914 = (_bitshift64Shl(($912|0),($913|0),1)|0);
 $915 = tempRet0;
 $arrayidx382 = ((($output)) + 104|0);
 $916 = $arrayidx382;
 $917 = $916;
 HEAP32[$917>>2] = $914;
 $918 = (($916) + 4)|0;
 $919 = $918;
 HEAP32[$919>>2] = $915;
 $920 = $arrayidx159;
 $921 = $920;
 $922 = HEAP32[$921>>2]|0;
 $923 = (($920) + 4)|0;
 $924 = $923;
 $925 = HEAP32[$924>>2]|0;
 $926 = (_bitshift64Ashr(0,($922|0),32)|0);
 $927 = tempRet0;
 $928 = (___muldi3(($926|0),($927|0),($926|0),($927|0))|0);
 $929 = tempRet0;
 $930 = $arrayidx117;
 $931 = $930;
 $932 = HEAP32[$931>>2]|0;
 $933 = (($930) + 4)|0;
 $934 = $933;
 $935 = HEAP32[$934>>2]|0;
 $936 = (_bitshift64Ashr(0,($932|0),32)|0);
 $937 = tempRet0;
 $938 = $arrayidx183;
 $939 = $938;
 $940 = HEAP32[$939>>2]|0;
 $941 = (($938) + 4)|0;
 $942 = $941;
 $943 = HEAP32[$942>>2]|0;
 $944 = (_bitshift64Ashr(0,($940|0),32)|0);
 $945 = tempRet0;
 $946 = (___muldi3(($944|0),($945|0),($936|0),($937|0))|0);
 $947 = tempRet0;
 $948 = (_i64Add(($946|0),($947|0),($928|0),($929|0))|0);
 $949 = tempRet0;
 $950 = $arrayidx92;
 $951 = $950;
 $952 = HEAP32[$951>>2]|0;
 $953 = (($950) + 4)|0;
 $954 = $953;
 $955 = HEAP32[$954>>2]|0;
 $956 = (_bitshift64Ashr(0,($952|0),31)|0);
 $957 = tempRet0;
 $958 = $arrayidx242;
 $959 = $958;
 $960 = HEAP32[$959>>2]|0;
 $961 = (($958) + 4)|0;
 $962 = $961;
 $963 = HEAP32[$962>>2]|0;
 $964 = (_bitshift64Ashr(0,($960|0),32)|0);
 $965 = tempRet0;
 $966 = (___muldi3(($964|0),($965|0),($956|0),($957|0))|0);
 $967 = tempRet0;
 $968 = (_i64Add(($948|0),($949|0),($966|0),($967|0))|0);
 $969 = tempRet0;
 $970 = (_bitshift64Shl(($968|0),($969|0),1)|0);
 $971 = tempRet0;
 $arrayidx408 = ((($output)) + 112|0);
 $972 = $arrayidx408;
 $973 = $972;
 HEAP32[$973>>2] = $970;
 $974 = (($972) + 4)|0;
 $975 = $974;
 HEAP32[$975>>2] = $971;
 $976 = $arrayidx159;
 $977 = $976;
 $978 = HEAP32[$977>>2]|0;
 $979 = (($976) + 4)|0;
 $980 = $979;
 $981 = HEAP32[$980>>2]|0;
 $982 = (_bitshift64Ashr(0,($978|0),32)|0);
 $983 = tempRet0;
 $984 = $arrayidx183;
 $985 = $984;
 $986 = HEAP32[$985>>2]|0;
 $987 = (($984) + 4)|0;
 $988 = $987;
 $989 = HEAP32[$988>>2]|0;
 $990 = (_bitshift64Ashr(0,($986|0),32)|0);
 $991 = tempRet0;
 $992 = (___muldi3(($990|0),($991|0),($982|0),($983|0))|0);
 $993 = tempRet0;
 $994 = $arrayidx117;
 $995 = $994;
 $996 = HEAP32[$995>>2]|0;
 $997 = (($994) + 4)|0;
 $998 = $997;
 $999 = HEAP32[$998>>2]|0;
 $1000 = (_bitshift64Ashr(0,($996|0),32)|0);
 $1001 = tempRet0;
 $1002 = $arrayidx242;
 $1003 = $1002;
 $1004 = HEAP32[$1003>>2]|0;
 $1005 = (($1002) + 4)|0;
 $1006 = $1005;
 $1007 = HEAP32[$1006>>2]|0;
 $1008 = (_bitshift64Ashr(0,($1004|0),32)|0);
 $1009 = tempRet0;
 $1010 = (___muldi3(($1008|0),($1009|0),($1000|0),($1001|0))|0);
 $1011 = tempRet0;
 $1012 = (_i64Add(($1010|0),($1011|0),($992|0),($993|0))|0);
 $1013 = tempRet0;
 $1014 = (_bitshift64Shl(($1012|0),($1013|0),1)|0);
 $1015 = tempRet0;
 $arrayidx425 = ((($output)) + 120|0);
 $1016 = $arrayidx425;
 $1017 = $1016;
 HEAP32[$1017>>2] = $1014;
 $1018 = (($1016) + 4)|0;
 $1019 = $1018;
 HEAP32[$1019>>2] = $1015;
 $1020 = $arrayidx183;
 $1021 = $1020;
 $1022 = HEAP32[$1021>>2]|0;
 $1023 = (($1020) + 4)|0;
 $1024 = $1023;
 $1025 = HEAP32[$1024>>2]|0;
 $1026 = (_bitshift64Ashr(0,($1022|0),32)|0);
 $1027 = tempRet0;
 $1028 = (___muldi3(($1026|0),($1027|0),($1026|0),($1027|0))|0);
 $1029 = tempRet0;
 $1030 = $arrayidx159;
 $1031 = $1030;
 $1032 = HEAP32[$1031>>2]|0;
 $1033 = (($1030) + 4)|0;
 $1034 = $1033;
 $1035 = HEAP32[$1034>>2]|0;
 $1036 = (_bitshift64Ashr(0,($1032|0),30)|0);
 $1037 = tempRet0;
 $1038 = $arrayidx242;
 $1039 = $1038;
 $1040 = HEAP32[$1039>>2]|0;
 $1041 = (($1038) + 4)|0;
 $1042 = $1041;
 $1043 = HEAP32[$1042>>2]|0;
 $1044 = (_bitshift64Ashr(0,($1040|0),32)|0);
 $1045 = tempRet0;
 $1046 = (___muldi3(($1044|0),($1045|0),($1036|0),($1037|0))|0);
 $1047 = tempRet0;
 $1048 = (_i64Add(($1046|0),($1047|0),($1028|0),($1029|0))|0);
 $1049 = tempRet0;
 $arrayidx442 = ((($output)) + 128|0);
 $1050 = $arrayidx442;
 $1051 = $1050;
 HEAP32[$1051>>2] = $1048;
 $1052 = (($1050) + 4)|0;
 $1053 = $1052;
 HEAP32[$1053>>2] = $1049;
 $1054 = $arrayidx183;
 $1055 = $1054;
 $1056 = HEAP32[$1055>>2]|0;
 $1057 = (($1054) + 4)|0;
 $1058 = $1057;
 $1059 = HEAP32[$1058>>2]|0;
 $1060 = (_bitshift64Ashr(0,($1056|0),31)|0);
 $1061 = tempRet0;
 $1062 = $arrayidx242;
 $1063 = $1062;
 $1064 = HEAP32[$1063>>2]|0;
 $1065 = (($1062) + 4)|0;
 $1066 = $1065;
 $1067 = HEAP32[$1066>>2]|0;
 $1068 = (_bitshift64Ashr(0,($1064|0),32)|0);
 $1069 = tempRet0;
 $1070 = (___muldi3(($1068|0),($1069|0),($1060|0),($1061|0))|0);
 $1071 = tempRet0;
 $arrayidx451 = ((($output)) + 136|0);
 $1072 = $arrayidx451;
 $1073 = $1072;
 HEAP32[$1073>>2] = $1070;
 $1074 = (($1072) + 4)|0;
 $1075 = $1074;
 HEAP32[$1075>>2] = $1071;
 $1076 = $arrayidx242;
 $1077 = $1076;
 $1078 = HEAP32[$1077>>2]|0;
 $1079 = (($1076) + 4)|0;
 $1080 = $1079;
 $1081 = HEAP32[$1080>>2]|0;
 $1082 = (_bitshift64Ashr(0,($1078|0),32)|0);
 $1083 = tempRet0;
 $1084 = (_bitshift64Ashr(0,($1078|0),31)|0);
 $1085 = tempRet0;
 $1086 = (___muldi3(($1084|0),($1085|0),($1082|0),($1083|0))|0);
 $1087 = tempRet0;
 $arrayidx460 = ((($output)) + 144|0);
 $1088 = $arrayidx460;
 $1089 = $1088;
 HEAP32[$1089>>2] = $1086;
 $1090 = (($1088) + 4)|0;
 $1091 = $1090;
 HEAP32[$1091>>2] = $1087;
 return;
}
function _swap_conditional($a,$b,$0,$1) {
 $a = $a|0;
 $b = $b|0;
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0;
 var $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0;
 var $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0;
 var $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0;
 var $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0;
 var $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0;
 var $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0;
 var $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0;
 var $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0;
 var $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0;
 var $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0;
 var $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $arrayidx$1 = 0, $arrayidx$2 = 0, $arrayidx$3 = 0, $arrayidx$4 = 0, $arrayidx$5 = 0, $arrayidx$6 = 0, $arrayidx$7 = 0, $arrayidx$8 = 0, $arrayidx$9 = 0, $arrayidx3$1 = 0, $arrayidx3$2 = 0, $arrayidx3$3 = 0, $arrayidx3$4 = 0, $arrayidx3$5 = 0, $arrayidx3$6 = 0, $arrayidx3$7 = 0, $arrayidx3$8 = 0, $arrayidx3$9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (_i64Subtract(0,0,($0|0),($1|0))|0);
 $3 = tempRet0;
 $4 = $a;
 $5 = $4;
 $6 = HEAP32[$5>>2]|0;
 $7 = (($4) + 4)|0;
 $8 = $7;
 $9 = HEAP32[$8>>2]|0;
 $10 = $b;
 $11 = $10;
 $12 = HEAP32[$11>>2]|0;
 $13 = (($10) + 4)|0;
 $14 = $13;
 $15 = HEAP32[$14>>2]|0;
 $16 = $12 ^ $6;
 $17 = $15 ^ $9;
 $18 = $16 & $2;
 $19 = $17 & $3;
 $20 = $18 ^ $6;
 $19 ^ $9;
 $21 = (_bitshift64Ashr(0,($20|0),32)|0);
 $22 = tempRet0;
 $23 = $a;
 $24 = $23;
 HEAP32[$24>>2] = $21;
 $25 = (($23) + 4)|0;
 $26 = $25;
 HEAP32[$26>>2] = $22;
 $27 = $b;
 $28 = $27;
 $29 = HEAP32[$28>>2]|0;
 $30 = (($27) + 4)|0;
 $31 = $30;
 $32 = HEAP32[$31>>2]|0;
 $33 = $29 ^ $18;
 $32 ^ $19;
 $34 = (_bitshift64Ashr(0,($33|0),32)|0);
 $35 = tempRet0;
 $36 = $b;
 $37 = $36;
 HEAP32[$37>>2] = $34;
 $38 = (($36) + 4)|0;
 $39 = $38;
 HEAP32[$39>>2] = $35;
 $arrayidx$1 = ((($a)) + 8|0);
 $40 = $arrayidx$1;
 $41 = $40;
 $42 = HEAP32[$41>>2]|0;
 $43 = (($40) + 4)|0;
 $44 = $43;
 $45 = HEAP32[$44>>2]|0;
 $arrayidx3$1 = ((($b)) + 8|0);
 $46 = $arrayidx3$1;
 $47 = $46;
 $48 = HEAP32[$47>>2]|0;
 $49 = (($46) + 4)|0;
 $50 = $49;
 $51 = HEAP32[$50>>2]|0;
 $52 = $48 ^ $42;
 $53 = $51 ^ $45;
 $54 = $52 & $2;
 $55 = $53 & $3;
 $56 = $54 ^ $42;
 $55 ^ $45;
 $57 = (_bitshift64Ashr(0,($56|0),32)|0);
 $58 = tempRet0;
 $59 = $arrayidx$1;
 $60 = $59;
 HEAP32[$60>>2] = $57;
 $61 = (($59) + 4)|0;
 $62 = $61;
 HEAP32[$62>>2] = $58;
 $63 = $arrayidx3$1;
 $64 = $63;
 $65 = HEAP32[$64>>2]|0;
 $66 = (($63) + 4)|0;
 $67 = $66;
 $68 = HEAP32[$67>>2]|0;
 $69 = $65 ^ $54;
 $68 ^ $55;
 $70 = (_bitshift64Ashr(0,($69|0),32)|0);
 $71 = tempRet0;
 $72 = $arrayidx3$1;
 $73 = $72;
 HEAP32[$73>>2] = $70;
 $74 = (($72) + 4)|0;
 $75 = $74;
 HEAP32[$75>>2] = $71;
 $arrayidx$2 = ((($a)) + 16|0);
 $76 = $arrayidx$2;
 $77 = $76;
 $78 = HEAP32[$77>>2]|0;
 $79 = (($76) + 4)|0;
 $80 = $79;
 $81 = HEAP32[$80>>2]|0;
 $arrayidx3$2 = ((($b)) + 16|0);
 $82 = $arrayidx3$2;
 $83 = $82;
 $84 = HEAP32[$83>>2]|0;
 $85 = (($82) + 4)|0;
 $86 = $85;
 $87 = HEAP32[$86>>2]|0;
 $88 = $84 ^ $78;
 $89 = $87 ^ $81;
 $90 = $88 & $2;
 $91 = $89 & $3;
 $92 = $90 ^ $78;
 $91 ^ $81;
 $93 = (_bitshift64Ashr(0,($92|0),32)|0);
 $94 = tempRet0;
 $95 = $arrayidx$2;
 $96 = $95;
 HEAP32[$96>>2] = $93;
 $97 = (($95) + 4)|0;
 $98 = $97;
 HEAP32[$98>>2] = $94;
 $99 = $arrayidx3$2;
 $100 = $99;
 $101 = HEAP32[$100>>2]|0;
 $102 = (($99) + 4)|0;
 $103 = $102;
 $104 = HEAP32[$103>>2]|0;
 $105 = $101 ^ $90;
 $104 ^ $91;
 $106 = (_bitshift64Ashr(0,($105|0),32)|0);
 $107 = tempRet0;
 $108 = $arrayidx3$2;
 $109 = $108;
 HEAP32[$109>>2] = $106;
 $110 = (($108) + 4)|0;
 $111 = $110;
 HEAP32[$111>>2] = $107;
 $arrayidx$3 = ((($a)) + 24|0);
 $112 = $arrayidx$3;
 $113 = $112;
 $114 = HEAP32[$113>>2]|0;
 $115 = (($112) + 4)|0;
 $116 = $115;
 $117 = HEAP32[$116>>2]|0;
 $arrayidx3$3 = ((($b)) + 24|0);
 $118 = $arrayidx3$3;
 $119 = $118;
 $120 = HEAP32[$119>>2]|0;
 $121 = (($118) + 4)|0;
 $122 = $121;
 $123 = HEAP32[$122>>2]|0;
 $124 = $120 ^ $114;
 $125 = $123 ^ $117;
 $126 = $124 & $2;
 $127 = $125 & $3;
 $128 = $126 ^ $114;
 $127 ^ $117;
 $129 = (_bitshift64Ashr(0,($128|0),32)|0);
 $130 = tempRet0;
 $131 = $arrayidx$3;
 $132 = $131;
 HEAP32[$132>>2] = $129;
 $133 = (($131) + 4)|0;
 $134 = $133;
 HEAP32[$134>>2] = $130;
 $135 = $arrayidx3$3;
 $136 = $135;
 $137 = HEAP32[$136>>2]|0;
 $138 = (($135) + 4)|0;
 $139 = $138;
 $140 = HEAP32[$139>>2]|0;
 $141 = $137 ^ $126;
 $140 ^ $127;
 $142 = (_bitshift64Ashr(0,($141|0),32)|0);
 $143 = tempRet0;
 $144 = $arrayidx3$3;
 $145 = $144;
 HEAP32[$145>>2] = $142;
 $146 = (($144) + 4)|0;
 $147 = $146;
 HEAP32[$147>>2] = $143;
 $arrayidx$4 = ((($a)) + 32|0);
 $148 = $arrayidx$4;
 $149 = $148;
 $150 = HEAP32[$149>>2]|0;
 $151 = (($148) + 4)|0;
 $152 = $151;
 $153 = HEAP32[$152>>2]|0;
 $arrayidx3$4 = ((($b)) + 32|0);
 $154 = $arrayidx3$4;
 $155 = $154;
 $156 = HEAP32[$155>>2]|0;
 $157 = (($154) + 4)|0;
 $158 = $157;
 $159 = HEAP32[$158>>2]|0;
 $160 = $156 ^ $150;
 $161 = $159 ^ $153;
 $162 = $160 & $2;
 $163 = $161 & $3;
 $164 = $162 ^ $150;
 $163 ^ $153;
 $165 = (_bitshift64Ashr(0,($164|0),32)|0);
 $166 = tempRet0;
 $167 = $arrayidx$4;
 $168 = $167;
 HEAP32[$168>>2] = $165;
 $169 = (($167) + 4)|0;
 $170 = $169;
 HEAP32[$170>>2] = $166;
 $171 = $arrayidx3$4;
 $172 = $171;
 $173 = HEAP32[$172>>2]|0;
 $174 = (($171) + 4)|0;
 $175 = $174;
 $176 = HEAP32[$175>>2]|0;
 $177 = $173 ^ $162;
 $176 ^ $163;
 $178 = (_bitshift64Ashr(0,($177|0),32)|0);
 $179 = tempRet0;
 $180 = $arrayidx3$4;
 $181 = $180;
 HEAP32[$181>>2] = $178;
 $182 = (($180) + 4)|0;
 $183 = $182;
 HEAP32[$183>>2] = $179;
 $arrayidx$5 = ((($a)) + 40|0);
 $184 = $arrayidx$5;
 $185 = $184;
 $186 = HEAP32[$185>>2]|0;
 $187 = (($184) + 4)|0;
 $188 = $187;
 $189 = HEAP32[$188>>2]|0;
 $arrayidx3$5 = ((($b)) + 40|0);
 $190 = $arrayidx3$5;
 $191 = $190;
 $192 = HEAP32[$191>>2]|0;
 $193 = (($190) + 4)|0;
 $194 = $193;
 $195 = HEAP32[$194>>2]|0;
 $196 = $192 ^ $186;
 $197 = $195 ^ $189;
 $198 = $196 & $2;
 $199 = $197 & $3;
 $200 = $198 ^ $186;
 $199 ^ $189;
 $201 = (_bitshift64Ashr(0,($200|0),32)|0);
 $202 = tempRet0;
 $203 = $arrayidx$5;
 $204 = $203;
 HEAP32[$204>>2] = $201;
 $205 = (($203) + 4)|0;
 $206 = $205;
 HEAP32[$206>>2] = $202;
 $207 = $arrayidx3$5;
 $208 = $207;
 $209 = HEAP32[$208>>2]|0;
 $210 = (($207) + 4)|0;
 $211 = $210;
 $212 = HEAP32[$211>>2]|0;
 $213 = $209 ^ $198;
 $212 ^ $199;
 $214 = (_bitshift64Ashr(0,($213|0),32)|0);
 $215 = tempRet0;
 $216 = $arrayidx3$5;
 $217 = $216;
 HEAP32[$217>>2] = $214;
 $218 = (($216) + 4)|0;
 $219 = $218;
 HEAP32[$219>>2] = $215;
 $arrayidx$6 = ((($a)) + 48|0);
 $220 = $arrayidx$6;
 $221 = $220;
 $222 = HEAP32[$221>>2]|0;
 $223 = (($220) + 4)|0;
 $224 = $223;
 $225 = HEAP32[$224>>2]|0;
 $arrayidx3$6 = ((($b)) + 48|0);
 $226 = $arrayidx3$6;
 $227 = $226;
 $228 = HEAP32[$227>>2]|0;
 $229 = (($226) + 4)|0;
 $230 = $229;
 $231 = HEAP32[$230>>2]|0;
 $232 = $228 ^ $222;
 $233 = $231 ^ $225;
 $234 = $232 & $2;
 $235 = $233 & $3;
 $236 = $234 ^ $222;
 $235 ^ $225;
 $237 = (_bitshift64Ashr(0,($236|0),32)|0);
 $238 = tempRet0;
 $239 = $arrayidx$6;
 $240 = $239;
 HEAP32[$240>>2] = $237;
 $241 = (($239) + 4)|0;
 $242 = $241;
 HEAP32[$242>>2] = $238;
 $243 = $arrayidx3$6;
 $244 = $243;
 $245 = HEAP32[$244>>2]|0;
 $246 = (($243) + 4)|0;
 $247 = $246;
 $248 = HEAP32[$247>>2]|0;
 $249 = $245 ^ $234;
 $248 ^ $235;
 $250 = (_bitshift64Ashr(0,($249|0),32)|0);
 $251 = tempRet0;
 $252 = $arrayidx3$6;
 $253 = $252;
 HEAP32[$253>>2] = $250;
 $254 = (($252) + 4)|0;
 $255 = $254;
 HEAP32[$255>>2] = $251;
 $arrayidx$7 = ((($a)) + 56|0);
 $256 = $arrayidx$7;
 $257 = $256;
 $258 = HEAP32[$257>>2]|0;
 $259 = (($256) + 4)|0;
 $260 = $259;
 $261 = HEAP32[$260>>2]|0;
 $arrayidx3$7 = ((($b)) + 56|0);
 $262 = $arrayidx3$7;
 $263 = $262;
 $264 = HEAP32[$263>>2]|0;
 $265 = (($262) + 4)|0;
 $266 = $265;
 $267 = HEAP32[$266>>2]|0;
 $268 = $264 ^ $258;
 $269 = $267 ^ $261;
 $270 = $268 & $2;
 $271 = $269 & $3;
 $272 = $270 ^ $258;
 $271 ^ $261;
 $273 = (_bitshift64Ashr(0,($272|0),32)|0);
 $274 = tempRet0;
 $275 = $arrayidx$7;
 $276 = $275;
 HEAP32[$276>>2] = $273;
 $277 = (($275) + 4)|0;
 $278 = $277;
 HEAP32[$278>>2] = $274;
 $279 = $arrayidx3$7;
 $280 = $279;
 $281 = HEAP32[$280>>2]|0;
 $282 = (($279) + 4)|0;
 $283 = $282;
 $284 = HEAP32[$283>>2]|0;
 $285 = $281 ^ $270;
 $284 ^ $271;
 $286 = (_bitshift64Ashr(0,($285|0),32)|0);
 $287 = tempRet0;
 $288 = $arrayidx3$7;
 $289 = $288;
 HEAP32[$289>>2] = $286;
 $290 = (($288) + 4)|0;
 $291 = $290;
 HEAP32[$291>>2] = $287;
 $arrayidx$8 = ((($a)) + 64|0);
 $292 = $arrayidx$8;
 $293 = $292;
 $294 = HEAP32[$293>>2]|0;
 $295 = (($292) + 4)|0;
 $296 = $295;
 $297 = HEAP32[$296>>2]|0;
 $arrayidx3$8 = ((($b)) + 64|0);
 $298 = $arrayidx3$8;
 $299 = $298;
 $300 = HEAP32[$299>>2]|0;
 $301 = (($298) + 4)|0;
 $302 = $301;
 $303 = HEAP32[$302>>2]|0;
 $304 = $300 ^ $294;
 $305 = $303 ^ $297;
 $306 = $304 & $2;
 $307 = $305 & $3;
 $308 = $306 ^ $294;
 $307 ^ $297;
 $309 = (_bitshift64Ashr(0,($308|0),32)|0);
 $310 = tempRet0;
 $311 = $arrayidx$8;
 $312 = $311;
 HEAP32[$312>>2] = $309;
 $313 = (($311) + 4)|0;
 $314 = $313;
 HEAP32[$314>>2] = $310;
 $315 = $arrayidx3$8;
 $316 = $315;
 $317 = HEAP32[$316>>2]|0;
 $318 = (($315) + 4)|0;
 $319 = $318;
 $320 = HEAP32[$319>>2]|0;
 $321 = $317 ^ $306;
 $320 ^ $307;
 $322 = (_bitshift64Ashr(0,($321|0),32)|0);
 $323 = tempRet0;
 $324 = $arrayidx3$8;
 $325 = $324;
 HEAP32[$325>>2] = $322;
 $326 = (($324) + 4)|0;
 $327 = $326;
 HEAP32[$327>>2] = $323;
 $arrayidx$9 = ((($a)) + 72|0);
 $328 = $arrayidx$9;
 $329 = $328;
 $330 = HEAP32[$329>>2]|0;
 $331 = (($328) + 4)|0;
 $332 = $331;
 $333 = HEAP32[$332>>2]|0;
 $arrayidx3$9 = ((($b)) + 72|0);
 $334 = $arrayidx3$9;
 $335 = $334;
 $336 = HEAP32[$335>>2]|0;
 $337 = (($334) + 4)|0;
 $338 = $337;
 $339 = HEAP32[$338>>2]|0;
 $340 = $336 ^ $330;
 $341 = $339 ^ $333;
 $342 = $340 & $2;
 $343 = $341 & $3;
 $344 = $342 ^ $330;
 $343 ^ $333;
 $345 = (_bitshift64Ashr(0,($344|0),32)|0);
 $346 = tempRet0;
 $347 = $arrayidx$9;
 $348 = $347;
 HEAP32[$348>>2] = $345;
 $349 = (($347) + 4)|0;
 $350 = $349;
 HEAP32[$350>>2] = $346;
 $351 = $arrayidx3$9;
 $352 = $351;
 $353 = HEAP32[$352>>2]|0;
 $354 = (($351) + 4)|0;
 $355 = $354;
 $356 = HEAP32[$355>>2]|0;
 $357 = $353 ^ $342;
 $356 ^ $343;
 $358 = (_bitshift64Ashr(0,($357|0),32)|0);
 $359 = tempRet0;
 $360 = $arrayidx3$9;
 $361 = $360;
 HEAP32[$361>>2] = $358;
 $362 = (($360) + 4)|0;
 $363 = $362;
 HEAP32[$363>>2] = $359;
 return;
}
function _fmonty($x2,$z2,$x3,$z3,$x,$z,$xprime,$zprime,$qmqp) {
 $x2 = $x2|0;
 $z2 = $z2|0;
 $x3 = $x3|0;
 $z3 = $z3|0;
 $x = $x|0;
 $z = $z|0;
 $xprime = $xprime|0;
 $zprime = $zprime|0;
 $qmqp = $qmqp|0;
 var $add$ptr = 0, $origx = 0, $origxprime = 0, $xx = 0, $xxprime = 0, $xxxprime = 0, $zz = 0, $zzprime = 0, $zzz = 0, $zzzprime = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 1232|0;
 $origx = sp + 1144|0;
 $origxprime = sp + 1064|0;
 $zzz = sp + 912|0;
 $xx = sp + 760|0;
 $zz = sp + 608|0;
 $xxprime = sp + 456|0;
 $zzprime = sp + 304|0;
 $zzzprime = sp + 152|0;
 $xxxprime = sp;
 dest=$origx; src=$x; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _fsum($x,$z);
 _fdifference($z,$origx);
 dest=$origxprime; src=$xprime; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _fsum($xprime,$zprime);
 _fdifference($zprime,$origxprime);
 _fproduct($xxprime,$xprime,$z);
 _fproduct($zzprime,$x,$zprime);
 _freduce_degree($xxprime);
 _freduce_coefficients($xxprime);
 _freduce_degree($zzprime);
 _freduce_coefficients($zzprime);
 dest=$origxprime; src=$xxprime; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _fsum($xxprime,$zzprime);
 _fdifference($zzprime,$origxprime);
 _fsquare($xxxprime,$xxprime);
 _fsquare($zzzprime,$zzprime);
 _fproduct($zzprime,$zzzprime,$qmqp);
 _freduce_degree($zzprime);
 _freduce_coefficients($zzprime);
 dest=$x3; src=$xxxprime; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 dest=$z3; src=$zzprime; stop=dest+80|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _fsquare($xx,$x);
 _fsquare($zz,$z);
 _fproduct($x2,$xx,$zz);
 _freduce_degree($x2);
 _freduce_coefficients($x2);
 _fdifference($zz,$xx);
 $add$ptr = ((($zzz)) + 80|0);
 dest=$add$ptr; stop=dest+72|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 _fscalar_product($zzz,$zz);
 _freduce_coefficients($zzz);
 _fsum($zzz,$xx);
 _fproduct($z2,$zz,$zzz);
 _freduce_degree($z2);
 _freduce_coefficients($z2);
 STACKTOP = sp;return;
}
function _fsum($output,$in) {
 $output = $output|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $arrayidx$1 = 0, $arrayidx$2 = 0, $arrayidx$3 = 0, $arrayidx$4 = 0, $arrayidx2$1 = 0, $arrayidx2$2 = 0, $arrayidx2$3 = 0, $arrayidx2$4 = 0, $arrayidx7 = 0, $arrayidx7$1 = 0, $arrayidx7$2 = 0, $arrayidx7$3 = 0, $arrayidx7$4 = 0, $arrayidx9 = 0, $arrayidx9$1 = 0, $arrayidx9$2 = 0, $arrayidx9$3 = 0, $arrayidx9$4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $output;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = $in;
 $7 = $6;
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) + 4)|0;
 $10 = $9;
 $11 = HEAP32[$10>>2]|0;
 $12 = (_i64Add(($8|0),($11|0),($2|0),($5|0))|0);
 $13 = tempRet0;
 $14 = $output;
 $15 = $14;
 HEAP32[$15>>2] = $12;
 $16 = (($14) + 4)|0;
 $17 = $16;
 HEAP32[$17>>2] = $13;
 $arrayidx7 = ((($output)) + 8|0);
 $18 = $arrayidx7;
 $19 = $18;
 $20 = HEAP32[$19>>2]|0;
 $21 = (($18) + 4)|0;
 $22 = $21;
 $23 = HEAP32[$22>>2]|0;
 $arrayidx9 = ((($in)) + 8|0);
 $24 = $arrayidx9;
 $25 = $24;
 $26 = HEAP32[$25>>2]|0;
 $27 = (($24) + 4)|0;
 $28 = $27;
 $29 = HEAP32[$28>>2]|0;
 $30 = (_i64Add(($26|0),($29|0),($20|0),($23|0))|0);
 $31 = tempRet0;
 $32 = $arrayidx7;
 $33 = $32;
 HEAP32[$33>>2] = $30;
 $34 = (($32) + 4)|0;
 $35 = $34;
 HEAP32[$35>>2] = $31;
 $arrayidx$1 = ((($output)) + 16|0);
 $36 = $arrayidx$1;
 $37 = $36;
 $38 = HEAP32[$37>>2]|0;
 $39 = (($36) + 4)|0;
 $40 = $39;
 $41 = HEAP32[$40>>2]|0;
 $arrayidx2$1 = ((($in)) + 16|0);
 $42 = $arrayidx2$1;
 $43 = $42;
 $44 = HEAP32[$43>>2]|0;
 $45 = (($42) + 4)|0;
 $46 = $45;
 $47 = HEAP32[$46>>2]|0;
 $48 = (_i64Add(($44|0),($47|0),($38|0),($41|0))|0);
 $49 = tempRet0;
 $50 = $arrayidx$1;
 $51 = $50;
 HEAP32[$51>>2] = $48;
 $52 = (($50) + 4)|0;
 $53 = $52;
 HEAP32[$53>>2] = $49;
 $arrayidx7$1 = ((($output)) + 24|0);
 $54 = $arrayidx7$1;
 $55 = $54;
 $56 = HEAP32[$55>>2]|0;
 $57 = (($54) + 4)|0;
 $58 = $57;
 $59 = HEAP32[$58>>2]|0;
 $arrayidx9$1 = ((($in)) + 24|0);
 $60 = $arrayidx9$1;
 $61 = $60;
 $62 = HEAP32[$61>>2]|0;
 $63 = (($60) + 4)|0;
 $64 = $63;
 $65 = HEAP32[$64>>2]|0;
 $66 = (_i64Add(($62|0),($65|0),($56|0),($59|0))|0);
 $67 = tempRet0;
 $68 = $arrayidx7$1;
 $69 = $68;
 HEAP32[$69>>2] = $66;
 $70 = (($68) + 4)|0;
 $71 = $70;
 HEAP32[$71>>2] = $67;
 $arrayidx$2 = ((($output)) + 32|0);
 $72 = $arrayidx$2;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $arrayidx2$2 = ((($in)) + 32|0);
 $78 = $arrayidx2$2;
 $79 = $78;
 $80 = HEAP32[$79>>2]|0;
 $81 = (($78) + 4)|0;
 $82 = $81;
 $83 = HEAP32[$82>>2]|0;
 $84 = (_i64Add(($80|0),($83|0),($74|0),($77|0))|0);
 $85 = tempRet0;
 $86 = $arrayidx$2;
 $87 = $86;
 HEAP32[$87>>2] = $84;
 $88 = (($86) + 4)|0;
 $89 = $88;
 HEAP32[$89>>2] = $85;
 $arrayidx7$2 = ((($output)) + 40|0);
 $90 = $arrayidx7$2;
 $91 = $90;
 $92 = HEAP32[$91>>2]|0;
 $93 = (($90) + 4)|0;
 $94 = $93;
 $95 = HEAP32[$94>>2]|0;
 $arrayidx9$2 = ((($in)) + 40|0);
 $96 = $arrayidx9$2;
 $97 = $96;
 $98 = HEAP32[$97>>2]|0;
 $99 = (($96) + 4)|0;
 $100 = $99;
 $101 = HEAP32[$100>>2]|0;
 $102 = (_i64Add(($98|0),($101|0),($92|0),($95|0))|0);
 $103 = tempRet0;
 $104 = $arrayidx7$2;
 $105 = $104;
 HEAP32[$105>>2] = $102;
 $106 = (($104) + 4)|0;
 $107 = $106;
 HEAP32[$107>>2] = $103;
 $arrayidx$3 = ((($output)) + 48|0);
 $108 = $arrayidx$3;
 $109 = $108;
 $110 = HEAP32[$109>>2]|0;
 $111 = (($108) + 4)|0;
 $112 = $111;
 $113 = HEAP32[$112>>2]|0;
 $arrayidx2$3 = ((($in)) + 48|0);
 $114 = $arrayidx2$3;
 $115 = $114;
 $116 = HEAP32[$115>>2]|0;
 $117 = (($114) + 4)|0;
 $118 = $117;
 $119 = HEAP32[$118>>2]|0;
 $120 = (_i64Add(($116|0),($119|0),($110|0),($113|0))|0);
 $121 = tempRet0;
 $122 = $arrayidx$3;
 $123 = $122;
 HEAP32[$123>>2] = $120;
 $124 = (($122) + 4)|0;
 $125 = $124;
 HEAP32[$125>>2] = $121;
 $arrayidx7$3 = ((($output)) + 56|0);
 $126 = $arrayidx7$3;
 $127 = $126;
 $128 = HEAP32[$127>>2]|0;
 $129 = (($126) + 4)|0;
 $130 = $129;
 $131 = HEAP32[$130>>2]|0;
 $arrayidx9$3 = ((($in)) + 56|0);
 $132 = $arrayidx9$3;
 $133 = $132;
 $134 = HEAP32[$133>>2]|0;
 $135 = (($132) + 4)|0;
 $136 = $135;
 $137 = HEAP32[$136>>2]|0;
 $138 = (_i64Add(($134|0),($137|0),($128|0),($131|0))|0);
 $139 = tempRet0;
 $140 = $arrayidx7$3;
 $141 = $140;
 HEAP32[$141>>2] = $138;
 $142 = (($140) + 4)|0;
 $143 = $142;
 HEAP32[$143>>2] = $139;
 $arrayidx$4 = ((($output)) + 64|0);
 $144 = $arrayidx$4;
 $145 = $144;
 $146 = HEAP32[$145>>2]|0;
 $147 = (($144) + 4)|0;
 $148 = $147;
 $149 = HEAP32[$148>>2]|0;
 $arrayidx2$4 = ((($in)) + 64|0);
 $150 = $arrayidx2$4;
 $151 = $150;
 $152 = HEAP32[$151>>2]|0;
 $153 = (($150) + 4)|0;
 $154 = $153;
 $155 = HEAP32[$154>>2]|0;
 $156 = (_i64Add(($152|0),($155|0),($146|0),($149|0))|0);
 $157 = tempRet0;
 $158 = $arrayidx$4;
 $159 = $158;
 HEAP32[$159>>2] = $156;
 $160 = (($158) + 4)|0;
 $161 = $160;
 HEAP32[$161>>2] = $157;
 $arrayidx7$4 = ((($output)) + 72|0);
 $162 = $arrayidx7$4;
 $163 = $162;
 $164 = HEAP32[$163>>2]|0;
 $165 = (($162) + 4)|0;
 $166 = $165;
 $167 = HEAP32[$166>>2]|0;
 $arrayidx9$4 = ((($in)) + 72|0);
 $168 = $arrayidx9$4;
 $169 = $168;
 $170 = HEAP32[$169>>2]|0;
 $171 = (($168) + 4)|0;
 $172 = $171;
 $173 = HEAP32[$172>>2]|0;
 $174 = (_i64Add(($170|0),($173|0),($164|0),($167|0))|0);
 $175 = tempRet0;
 $176 = $arrayidx7$4;
 $177 = $176;
 HEAP32[$177>>2] = $174;
 $178 = (($176) + 4)|0;
 $179 = $178;
 HEAP32[$179>>2] = $175;
 return;
}
function _fdifference($output,$in) {
 $output = $output|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $arrayidx$1 = 0, $arrayidx$2 = 0, $arrayidx$3 = 0, $arrayidx$4 = 0, $arrayidx$5 = 0, $arrayidx$6 = 0, $arrayidx$7 = 0, $arrayidx$8 = 0, $arrayidx$9 = 0, $arrayidx1$1 = 0, $arrayidx1$2 = 0, $arrayidx1$3 = 0, $arrayidx1$4 = 0, $arrayidx1$5 = 0, $arrayidx1$6 = 0, $arrayidx1$7 = 0, $arrayidx1$8 = 0, $arrayidx1$9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $in;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = $output;
 $7 = $6;
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) + 4)|0;
 $10 = $9;
 $11 = HEAP32[$10>>2]|0;
 $12 = (_i64Subtract(($2|0),($5|0),($8|0),($11|0))|0);
 $13 = tempRet0;
 $14 = $output;
 $15 = $14;
 HEAP32[$15>>2] = $12;
 $16 = (($14) + 4)|0;
 $17 = $16;
 HEAP32[$17>>2] = $13;
 $arrayidx$1 = ((($in)) + 8|0);
 $18 = $arrayidx$1;
 $19 = $18;
 $20 = HEAP32[$19>>2]|0;
 $21 = (($18) + 4)|0;
 $22 = $21;
 $23 = HEAP32[$22>>2]|0;
 $arrayidx1$1 = ((($output)) + 8|0);
 $24 = $arrayidx1$1;
 $25 = $24;
 $26 = HEAP32[$25>>2]|0;
 $27 = (($24) + 4)|0;
 $28 = $27;
 $29 = HEAP32[$28>>2]|0;
 $30 = (_i64Subtract(($20|0),($23|0),($26|0),($29|0))|0);
 $31 = tempRet0;
 $32 = $arrayidx1$1;
 $33 = $32;
 HEAP32[$33>>2] = $30;
 $34 = (($32) + 4)|0;
 $35 = $34;
 HEAP32[$35>>2] = $31;
 $arrayidx$2 = ((($in)) + 16|0);
 $36 = $arrayidx$2;
 $37 = $36;
 $38 = HEAP32[$37>>2]|0;
 $39 = (($36) + 4)|0;
 $40 = $39;
 $41 = HEAP32[$40>>2]|0;
 $arrayidx1$2 = ((($output)) + 16|0);
 $42 = $arrayidx1$2;
 $43 = $42;
 $44 = HEAP32[$43>>2]|0;
 $45 = (($42) + 4)|0;
 $46 = $45;
 $47 = HEAP32[$46>>2]|0;
 $48 = (_i64Subtract(($38|0),($41|0),($44|0),($47|0))|0);
 $49 = tempRet0;
 $50 = $arrayidx1$2;
 $51 = $50;
 HEAP32[$51>>2] = $48;
 $52 = (($50) + 4)|0;
 $53 = $52;
 HEAP32[$53>>2] = $49;
 $arrayidx$3 = ((($in)) + 24|0);
 $54 = $arrayidx$3;
 $55 = $54;
 $56 = HEAP32[$55>>2]|0;
 $57 = (($54) + 4)|0;
 $58 = $57;
 $59 = HEAP32[$58>>2]|0;
 $arrayidx1$3 = ((($output)) + 24|0);
 $60 = $arrayidx1$3;
 $61 = $60;
 $62 = HEAP32[$61>>2]|0;
 $63 = (($60) + 4)|0;
 $64 = $63;
 $65 = HEAP32[$64>>2]|0;
 $66 = (_i64Subtract(($56|0),($59|0),($62|0),($65|0))|0);
 $67 = tempRet0;
 $68 = $arrayidx1$3;
 $69 = $68;
 HEAP32[$69>>2] = $66;
 $70 = (($68) + 4)|0;
 $71 = $70;
 HEAP32[$71>>2] = $67;
 $arrayidx$4 = ((($in)) + 32|0);
 $72 = $arrayidx$4;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $arrayidx1$4 = ((($output)) + 32|0);
 $78 = $arrayidx1$4;
 $79 = $78;
 $80 = HEAP32[$79>>2]|0;
 $81 = (($78) + 4)|0;
 $82 = $81;
 $83 = HEAP32[$82>>2]|0;
 $84 = (_i64Subtract(($74|0),($77|0),($80|0),($83|0))|0);
 $85 = tempRet0;
 $86 = $arrayidx1$4;
 $87 = $86;
 HEAP32[$87>>2] = $84;
 $88 = (($86) + 4)|0;
 $89 = $88;
 HEAP32[$89>>2] = $85;
 $arrayidx$5 = ((($in)) + 40|0);
 $90 = $arrayidx$5;
 $91 = $90;
 $92 = HEAP32[$91>>2]|0;
 $93 = (($90) + 4)|0;
 $94 = $93;
 $95 = HEAP32[$94>>2]|0;
 $arrayidx1$5 = ((($output)) + 40|0);
 $96 = $arrayidx1$5;
 $97 = $96;
 $98 = HEAP32[$97>>2]|0;
 $99 = (($96) + 4)|0;
 $100 = $99;
 $101 = HEAP32[$100>>2]|0;
 $102 = (_i64Subtract(($92|0),($95|0),($98|0),($101|0))|0);
 $103 = tempRet0;
 $104 = $arrayidx1$5;
 $105 = $104;
 HEAP32[$105>>2] = $102;
 $106 = (($104) + 4)|0;
 $107 = $106;
 HEAP32[$107>>2] = $103;
 $arrayidx$6 = ((($in)) + 48|0);
 $108 = $arrayidx$6;
 $109 = $108;
 $110 = HEAP32[$109>>2]|0;
 $111 = (($108) + 4)|0;
 $112 = $111;
 $113 = HEAP32[$112>>2]|0;
 $arrayidx1$6 = ((($output)) + 48|0);
 $114 = $arrayidx1$6;
 $115 = $114;
 $116 = HEAP32[$115>>2]|0;
 $117 = (($114) + 4)|0;
 $118 = $117;
 $119 = HEAP32[$118>>2]|0;
 $120 = (_i64Subtract(($110|0),($113|0),($116|0),($119|0))|0);
 $121 = tempRet0;
 $122 = $arrayidx1$6;
 $123 = $122;
 HEAP32[$123>>2] = $120;
 $124 = (($122) + 4)|0;
 $125 = $124;
 HEAP32[$125>>2] = $121;
 $arrayidx$7 = ((($in)) + 56|0);
 $126 = $arrayidx$7;
 $127 = $126;
 $128 = HEAP32[$127>>2]|0;
 $129 = (($126) + 4)|0;
 $130 = $129;
 $131 = HEAP32[$130>>2]|0;
 $arrayidx1$7 = ((($output)) + 56|0);
 $132 = $arrayidx1$7;
 $133 = $132;
 $134 = HEAP32[$133>>2]|0;
 $135 = (($132) + 4)|0;
 $136 = $135;
 $137 = HEAP32[$136>>2]|0;
 $138 = (_i64Subtract(($128|0),($131|0),($134|0),($137|0))|0);
 $139 = tempRet0;
 $140 = $arrayidx1$7;
 $141 = $140;
 HEAP32[$141>>2] = $138;
 $142 = (($140) + 4)|0;
 $143 = $142;
 HEAP32[$143>>2] = $139;
 $arrayidx$8 = ((($in)) + 64|0);
 $144 = $arrayidx$8;
 $145 = $144;
 $146 = HEAP32[$145>>2]|0;
 $147 = (($144) + 4)|0;
 $148 = $147;
 $149 = HEAP32[$148>>2]|0;
 $arrayidx1$8 = ((($output)) + 64|0);
 $150 = $arrayidx1$8;
 $151 = $150;
 $152 = HEAP32[$151>>2]|0;
 $153 = (($150) + 4)|0;
 $154 = $153;
 $155 = HEAP32[$154>>2]|0;
 $156 = (_i64Subtract(($146|0),($149|0),($152|0),($155|0))|0);
 $157 = tempRet0;
 $158 = $arrayidx1$8;
 $159 = $158;
 HEAP32[$159>>2] = $156;
 $160 = (($158) + 4)|0;
 $161 = $160;
 HEAP32[$161>>2] = $157;
 $arrayidx$9 = ((($in)) + 72|0);
 $162 = $arrayidx$9;
 $163 = $162;
 $164 = HEAP32[$163>>2]|0;
 $165 = (($162) + 4)|0;
 $166 = $165;
 $167 = HEAP32[$166>>2]|0;
 $arrayidx1$9 = ((($output)) + 72|0);
 $168 = $arrayidx1$9;
 $169 = $168;
 $170 = HEAP32[$169>>2]|0;
 $171 = (($168) + 4)|0;
 $172 = $171;
 $173 = HEAP32[$172>>2]|0;
 $174 = (_i64Subtract(($164|0),($167|0),($170|0),($173|0))|0);
 $175 = tempRet0;
 $176 = $arrayidx1$9;
 $177 = $176;
 HEAP32[$177>>2] = $174;
 $178 = (($176) + 4)|0;
 $179 = $178;
 HEAP32[$179>>2] = $175;
 return;
}
function _fscalar_product($output,$in) {
 $output = $output|0;
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $arrayidx$1 = 0, $arrayidx$2 = 0, $arrayidx$3 = 0, $arrayidx$4 = 0, $arrayidx$5 = 0, $arrayidx$6 = 0, $arrayidx$7 = 0, $arrayidx$8 = 0, $arrayidx$9 = 0, $arrayidx1$1 = 0, $arrayidx1$2 = 0, $arrayidx1$3 = 0, $arrayidx1$4 = 0, $arrayidx1$5 = 0, $arrayidx1$6 = 0, $arrayidx1$7 = 0, $arrayidx1$8 = 0, $arrayidx1$9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $in;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $6 = (___muldi3(($2|0),($5|0),121665,0)|0);
 $7 = tempRet0;
 $8 = $output;
 $9 = $8;
 HEAP32[$9>>2] = $6;
 $10 = (($8) + 4)|0;
 $11 = $10;
 HEAP32[$11>>2] = $7;
 $arrayidx$1 = ((($in)) + 8|0);
 $12 = $arrayidx$1;
 $13 = $12;
 $14 = HEAP32[$13>>2]|0;
 $15 = (($12) + 4)|0;
 $16 = $15;
 $17 = HEAP32[$16>>2]|0;
 $18 = (___muldi3(($14|0),($17|0),121665,0)|0);
 $19 = tempRet0;
 $arrayidx1$1 = ((($output)) + 8|0);
 $20 = $arrayidx1$1;
 $21 = $20;
 HEAP32[$21>>2] = $18;
 $22 = (($20) + 4)|0;
 $23 = $22;
 HEAP32[$23>>2] = $19;
 $arrayidx$2 = ((($in)) + 16|0);
 $24 = $arrayidx$2;
 $25 = $24;
 $26 = HEAP32[$25>>2]|0;
 $27 = (($24) + 4)|0;
 $28 = $27;
 $29 = HEAP32[$28>>2]|0;
 $30 = (___muldi3(($26|0),($29|0),121665,0)|0);
 $31 = tempRet0;
 $arrayidx1$2 = ((($output)) + 16|0);
 $32 = $arrayidx1$2;
 $33 = $32;
 HEAP32[$33>>2] = $30;
 $34 = (($32) + 4)|0;
 $35 = $34;
 HEAP32[$35>>2] = $31;
 $arrayidx$3 = ((($in)) + 24|0);
 $36 = $arrayidx$3;
 $37 = $36;
 $38 = HEAP32[$37>>2]|0;
 $39 = (($36) + 4)|0;
 $40 = $39;
 $41 = HEAP32[$40>>2]|0;
 $42 = (___muldi3(($38|0),($41|0),121665,0)|0);
 $43 = tempRet0;
 $arrayidx1$3 = ((($output)) + 24|0);
 $44 = $arrayidx1$3;
 $45 = $44;
 HEAP32[$45>>2] = $42;
 $46 = (($44) + 4)|0;
 $47 = $46;
 HEAP32[$47>>2] = $43;
 $arrayidx$4 = ((($in)) + 32|0);
 $48 = $arrayidx$4;
 $49 = $48;
 $50 = HEAP32[$49>>2]|0;
 $51 = (($48) + 4)|0;
 $52 = $51;
 $53 = HEAP32[$52>>2]|0;
 $54 = (___muldi3(($50|0),($53|0),121665,0)|0);
 $55 = tempRet0;
 $arrayidx1$4 = ((($output)) + 32|0);
 $56 = $arrayidx1$4;
 $57 = $56;
 HEAP32[$57>>2] = $54;
 $58 = (($56) + 4)|0;
 $59 = $58;
 HEAP32[$59>>2] = $55;
 $arrayidx$5 = ((($in)) + 40|0);
 $60 = $arrayidx$5;
 $61 = $60;
 $62 = HEAP32[$61>>2]|0;
 $63 = (($60) + 4)|0;
 $64 = $63;
 $65 = HEAP32[$64>>2]|0;
 $66 = (___muldi3(($62|0),($65|0),121665,0)|0);
 $67 = tempRet0;
 $arrayidx1$5 = ((($output)) + 40|0);
 $68 = $arrayidx1$5;
 $69 = $68;
 HEAP32[$69>>2] = $66;
 $70 = (($68) + 4)|0;
 $71 = $70;
 HEAP32[$71>>2] = $67;
 $arrayidx$6 = ((($in)) + 48|0);
 $72 = $arrayidx$6;
 $73 = $72;
 $74 = HEAP32[$73>>2]|0;
 $75 = (($72) + 4)|0;
 $76 = $75;
 $77 = HEAP32[$76>>2]|0;
 $78 = (___muldi3(($74|0),($77|0),121665,0)|0);
 $79 = tempRet0;
 $arrayidx1$6 = ((($output)) + 48|0);
 $80 = $arrayidx1$6;
 $81 = $80;
 HEAP32[$81>>2] = $78;
 $82 = (($80) + 4)|0;
 $83 = $82;
 HEAP32[$83>>2] = $79;
 $arrayidx$7 = ((($in)) + 56|0);
 $84 = $arrayidx$7;
 $85 = $84;
 $86 = HEAP32[$85>>2]|0;
 $87 = (($84) + 4)|0;
 $88 = $87;
 $89 = HEAP32[$88>>2]|0;
 $90 = (___muldi3(($86|0),($89|0),121665,0)|0);
 $91 = tempRet0;
 $arrayidx1$7 = ((($output)) + 56|0);
 $92 = $arrayidx1$7;
 $93 = $92;
 HEAP32[$93>>2] = $90;
 $94 = (($92) + 4)|0;
 $95 = $94;
 HEAP32[$95>>2] = $91;
 $arrayidx$8 = ((($in)) + 64|0);
 $96 = $arrayidx$8;
 $97 = $96;
 $98 = HEAP32[$97>>2]|0;
 $99 = (($96) + 4)|0;
 $100 = $99;
 $101 = HEAP32[$100>>2]|0;
 $102 = (___muldi3(($98|0),($101|0),121665,0)|0);
 $103 = tempRet0;
 $arrayidx1$8 = ((($output)) + 64|0);
 $104 = $arrayidx1$8;
 $105 = $104;
 HEAP32[$105>>2] = $102;
 $106 = (($104) + 4)|0;
 $107 = $106;
 HEAP32[$107>>2] = $103;
 $arrayidx$9 = ((($in)) + 72|0);
 $108 = $arrayidx$9;
 $109 = $108;
 $110 = HEAP32[$109>>2]|0;
 $111 = (($108) + 4)|0;
 $112 = $111;
 $113 = HEAP32[$112>>2]|0;
 $114 = (___muldi3(($110|0),($113|0),121665,0)|0);
 $115 = tempRet0;
 $arrayidx1$9 = ((($output)) + 72|0);
 $116 = $arrayidx1$9;
 $117 = $116;
 HEAP32[$117>>2] = $114;
 $118 = (($116) + 4)|0;
 $119 = $118;
 HEAP32[$119>>2] = $115;
 return;
}
function _crypto_sign_ed25519_ref10_fe_0($h) {
 $h = $h|0;
 var dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 dest=$h; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 return;
}
function _crypto_sign_ed25519_ref10_fe_1($h) {
 $h = $h|0;
 var $arrayidx1 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 HEAP32[$h>>2] = 1;
 $arrayidx1 = ((($h)) + 4|0);
 dest=$arrayidx1; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 return;
}
function _crypto_sign_ed25519_ref10_fe_add($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $add = 0, $add20 = 0, $add21 = 0, $add22 = 0, $add23 = 0, $add24 = 0, $add25 = 0, $add26 = 0, $add27 = 0, $add28 = 0, $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx12 = 0, $arrayidx13 = 0, $arrayidx14 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx18 = 0, $arrayidx19 = 0;
 var $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx30 = 0, $arrayidx31 = 0, $arrayidx32 = 0, $arrayidx33 = 0, $arrayidx34 = 0, $arrayidx35 = 0, $arrayidx36 = 0, $arrayidx37 = 0, $arrayidx38 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $10 = HEAP32[$g>>2]|0;
 $arrayidx11 = ((($g)) + 4|0);
 $11 = HEAP32[$arrayidx11>>2]|0;
 $arrayidx12 = ((($g)) + 8|0);
 $12 = HEAP32[$arrayidx12>>2]|0;
 $arrayidx13 = ((($g)) + 12|0);
 $13 = HEAP32[$arrayidx13>>2]|0;
 $arrayidx14 = ((($g)) + 16|0);
 $14 = HEAP32[$arrayidx14>>2]|0;
 $arrayidx15 = ((($g)) + 20|0);
 $15 = HEAP32[$arrayidx15>>2]|0;
 $arrayidx16 = ((($g)) + 24|0);
 $16 = HEAP32[$arrayidx16>>2]|0;
 $arrayidx17 = ((($g)) + 28|0);
 $17 = HEAP32[$arrayidx17>>2]|0;
 $arrayidx18 = ((($g)) + 32|0);
 $18 = HEAP32[$arrayidx18>>2]|0;
 $arrayidx19 = ((($g)) + 36|0);
 $19 = HEAP32[$arrayidx19>>2]|0;
 $add = (($10) + ($0))|0;
 $add20 = (($11) + ($1))|0;
 $add21 = (($12) + ($2))|0;
 $add22 = (($13) + ($3))|0;
 $add23 = (($14) + ($4))|0;
 $add24 = (($15) + ($5))|0;
 $add25 = (($16) + ($6))|0;
 $add26 = (($17) + ($7))|0;
 $add27 = (($18) + ($8))|0;
 $add28 = (($19) + ($9))|0;
 HEAP32[$h>>2] = $add;
 $arrayidx30 = ((($h)) + 4|0);
 HEAP32[$arrayidx30>>2] = $add20;
 $arrayidx31 = ((($h)) + 8|0);
 HEAP32[$arrayidx31>>2] = $add21;
 $arrayidx32 = ((($h)) + 12|0);
 HEAP32[$arrayidx32>>2] = $add22;
 $arrayidx33 = ((($h)) + 16|0);
 HEAP32[$arrayidx33>>2] = $add23;
 $arrayidx34 = ((($h)) + 20|0);
 HEAP32[$arrayidx34>>2] = $add24;
 $arrayidx35 = ((($h)) + 24|0);
 HEAP32[$arrayidx35>>2] = $add25;
 $arrayidx36 = ((($h)) + 28|0);
 HEAP32[$arrayidx36>>2] = $add26;
 $arrayidx37 = ((($h)) + 32|0);
 HEAP32[$arrayidx37>>2] = $add27;
 $arrayidx38 = ((($h)) + 36|0);
 HEAP32[$arrayidx38>>2] = $add28;
 return;
}
function _crypto_sign_ed25519_ref10_fe_cmov($f,$g,$b) {
 $f = $f|0;
 $g = $g|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $and = 0, $and29 = 0, $and30 = 0, $and31 = 0, $and32 = 0, $and33 = 0, $and34 = 0, $and35 = 0, $and36 = 0, $and37 = 0, $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx12 = 0, $arrayidx13 = 0, $arrayidx14 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx18 = 0, $arrayidx19 = 0;
 var $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $sub = 0, $xor = 0, $xor20 = 0, $xor21 = 0, $xor22 = 0, $xor23 = 0, $xor24 = 0, $xor25 = 0, $xor26 = 0, $xor27 = 0, $xor28 = 0, $xor38 = 0;
 var $xor40 = 0, $xor42 = 0, $xor44 = 0, $xor46 = 0, $xor48 = 0, $xor50 = 0, $xor52 = 0, $xor54 = 0, $xor56 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $10 = HEAP32[$g>>2]|0;
 $arrayidx11 = ((($g)) + 4|0);
 $11 = HEAP32[$arrayidx11>>2]|0;
 $arrayidx12 = ((($g)) + 8|0);
 $12 = HEAP32[$arrayidx12>>2]|0;
 $arrayidx13 = ((($g)) + 12|0);
 $13 = HEAP32[$arrayidx13>>2]|0;
 $arrayidx14 = ((($g)) + 16|0);
 $14 = HEAP32[$arrayidx14>>2]|0;
 $arrayidx15 = ((($g)) + 20|0);
 $15 = HEAP32[$arrayidx15>>2]|0;
 $arrayidx16 = ((($g)) + 24|0);
 $16 = HEAP32[$arrayidx16>>2]|0;
 $arrayidx17 = ((($g)) + 28|0);
 $17 = HEAP32[$arrayidx17>>2]|0;
 $arrayidx18 = ((($g)) + 32|0);
 $18 = HEAP32[$arrayidx18>>2]|0;
 $arrayidx19 = ((($g)) + 36|0);
 $19 = HEAP32[$arrayidx19>>2]|0;
 $xor = $10 ^ $0;
 $xor20 = $11 ^ $1;
 $xor21 = $12 ^ $2;
 $xor22 = $13 ^ $3;
 $xor23 = $14 ^ $4;
 $xor24 = $15 ^ $5;
 $xor25 = $16 ^ $6;
 $xor26 = $17 ^ $7;
 $xor27 = $18 ^ $8;
 $xor28 = $19 ^ $9;
 $sub = (0 - ($b))|0;
 $and = $xor & $sub;
 $and29 = $xor20 & $sub;
 $and30 = $xor21 & $sub;
 $and31 = $xor22 & $sub;
 $and32 = $xor23 & $sub;
 $and33 = $xor24 & $sub;
 $and34 = $xor25 & $sub;
 $and35 = $xor26 & $sub;
 $and36 = $xor27 & $sub;
 $and37 = $xor28 & $sub;
 $xor38 = $and ^ $0;
 HEAP32[$f>>2] = $xor38;
 $xor40 = $and29 ^ $1;
 HEAP32[$arrayidx1>>2] = $xor40;
 $xor42 = $and30 ^ $2;
 HEAP32[$arrayidx2>>2] = $xor42;
 $xor44 = $and31 ^ $3;
 HEAP32[$arrayidx3>>2] = $xor44;
 $xor46 = $and32 ^ $4;
 HEAP32[$arrayidx4>>2] = $xor46;
 $xor48 = $and33 ^ $5;
 HEAP32[$arrayidx5>>2] = $xor48;
 $xor50 = $and34 ^ $6;
 HEAP32[$arrayidx6>>2] = $xor50;
 $xor52 = $and35 ^ $7;
 HEAP32[$arrayidx7>>2] = $xor52;
 $xor54 = $and36 ^ $8;
 HEAP32[$arrayidx8>>2] = $xor54;
 $xor56 = $and37 ^ $9;
 HEAP32[$arrayidx9>>2] = $xor56;
 return;
}
function _crypto_sign_ed25519_ref10_fe_copy($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx12 = 0, $arrayidx13 = 0, $arrayidx14 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx18 = 0, $arrayidx19 = 0;
 var $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 HEAP32[$h>>2] = $0;
 $arrayidx11 = ((($h)) + 4|0);
 HEAP32[$arrayidx11>>2] = $1;
 $arrayidx12 = ((($h)) + 8|0);
 HEAP32[$arrayidx12>>2] = $2;
 $arrayidx13 = ((($h)) + 12|0);
 HEAP32[$arrayidx13>>2] = $3;
 $arrayidx14 = ((($h)) + 16|0);
 HEAP32[$arrayidx14>>2] = $4;
 $arrayidx15 = ((($h)) + 20|0);
 HEAP32[$arrayidx15>>2] = $5;
 $arrayidx16 = ((($h)) + 24|0);
 HEAP32[$arrayidx16>>2] = $6;
 $arrayidx17 = ((($h)) + 28|0);
 HEAP32[$arrayidx17>>2] = $7;
 $arrayidx18 = ((($h)) + 32|0);
 HEAP32[$arrayidx18>>2] = $8;
 $arrayidx19 = ((($h)) + 36|0);
 HEAP32[$arrayidx19>>2] = $9;
 return;
}
function _crypto_sign_ed25519_ref10_fe_frombytes($h,$s) {
 $h = $h|0;
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $add$ptr = 0, $add$ptr11 = 0, $add$ptr13 = 0, $add$ptr16 = 0, $add$ptr19 = 0, $add$ptr2 = 0, $add$ptr22 = 0, $add$ptr5 = 0, $add$ptr8 = 0, $arrayidx73 = 0, $arrayidx75 = 0, $arrayidx77 = 0, $arrayidx79 = 0, $arrayidx81 = 0, $arrayidx83 = 0, $arrayidx85 = 0, $arrayidx87 = 0, $arrayidx89 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_load_4($s)|0);
 $1 = tempRet0;
 $add$ptr = ((($s)) + 4|0);
 $2 = (_load_3($add$ptr)|0);
 $3 = tempRet0;
 $4 = (_bitshift64Shl(($2|0),($3|0),6)|0);
 $5 = tempRet0;
 $add$ptr2 = ((($s)) + 7|0);
 $6 = (_load_3($add$ptr2)|0);
 $7 = tempRet0;
 $8 = (_bitshift64Shl(($6|0),($7|0),5)|0);
 $9 = tempRet0;
 $add$ptr5 = ((($s)) + 10|0);
 $10 = (_load_3($add$ptr5)|0);
 $11 = tempRet0;
 $12 = (_bitshift64Shl(($10|0),($11|0),3)|0);
 $13 = tempRet0;
 $add$ptr8 = ((($s)) + 13|0);
 $14 = (_load_3($add$ptr8)|0);
 $15 = tempRet0;
 $16 = (_bitshift64Shl(($14|0),($15|0),2)|0);
 $17 = tempRet0;
 $add$ptr11 = ((($s)) + 16|0);
 $18 = (_load_4($add$ptr11)|0);
 $19 = tempRet0;
 $add$ptr13 = ((($s)) + 20|0);
 $20 = (_load_3($add$ptr13)|0);
 $21 = tempRet0;
 $22 = (_bitshift64Shl(($20|0),($21|0),7)|0);
 $23 = tempRet0;
 $add$ptr16 = ((($s)) + 23|0);
 $24 = (_load_3($add$ptr16)|0);
 $25 = tempRet0;
 $26 = (_bitshift64Shl(($24|0),($25|0),5)|0);
 $27 = tempRet0;
 $add$ptr19 = ((($s)) + 26|0);
 $28 = (_load_3($add$ptr19)|0);
 $29 = tempRet0;
 $30 = (_bitshift64Shl(($28|0),($29|0),4)|0);
 $31 = tempRet0;
 $add$ptr22 = ((($s)) + 29|0);
 $32 = (_load_3($add$ptr22)|0);
 $33 = tempRet0;
 $34 = (_bitshift64Shl(($32|0),($33|0),2)|0);
 $35 = tempRet0;
 $36 = $34 & 33554428;
 $37 = (_i64Add(($36|0),0,16777216,0)|0);
 $38 = tempRet0;
 $39 = (_bitshift64Lshr(($37|0),($38|0),25)|0);
 $40 = tempRet0;
 $41 = (_i64Subtract(0,0,($39|0),($40|0))|0);
 $42 = tempRet0;
 $43 = $41 & 19;
 $44 = (_i64Add(($43|0),0,($0|0),($1|0))|0);
 $45 = tempRet0;
 $46 = (_bitshift64Shl(($39|0),($40|0),25)|0);
 $47 = tempRet0;
 $48 = (_i64Add(($4|0),($5|0),16777216,0)|0);
 $49 = tempRet0;
 $50 = (_bitshift64Ashr(($48|0),($49|0),25)|0);
 $51 = tempRet0;
 $52 = (_i64Add(($50|0),($51|0),($8|0),($9|0))|0);
 $53 = tempRet0;
 $54 = (_bitshift64Shl(($50|0),($51|0),25)|0);
 $55 = tempRet0;
 $56 = (_i64Subtract(($4|0),($5|0),($54|0),($55|0))|0);
 $57 = tempRet0;
 $58 = (_i64Add(($12|0),($13|0),16777216,0)|0);
 $59 = tempRet0;
 $60 = (_bitshift64Ashr(($58|0),($59|0),25)|0);
 $61 = tempRet0;
 $62 = (_i64Add(($60|0),($61|0),($16|0),($17|0))|0);
 $63 = tempRet0;
 $64 = (_bitshift64Shl(($60|0),($61|0),25)|0);
 $65 = tempRet0;
 $66 = (_i64Subtract(($12|0),($13|0),($64|0),($65|0))|0);
 $67 = tempRet0;
 $68 = (_i64Add(($18|0),($19|0),16777216,0)|0);
 $69 = tempRet0;
 $70 = (_bitshift64Ashr(($68|0),($69|0),25)|0);
 $71 = tempRet0;
 $72 = (_i64Add(($22|0),($23|0),($70|0),($71|0))|0);
 $73 = tempRet0;
 $74 = (_bitshift64Shl(($70|0),($71|0),25)|0);
 $75 = tempRet0;
 $76 = (_i64Subtract(($18|0),($19|0),($74|0),($75|0))|0);
 $77 = tempRet0;
 $78 = (_i64Add(($26|0),($27|0),16777216,0)|0);
 $79 = tempRet0;
 $80 = (_bitshift64Ashr(($78|0),($79|0),25)|0);
 $81 = tempRet0;
 $82 = (_i64Add(($80|0),($81|0),($30|0),($31|0))|0);
 $83 = tempRet0;
 $84 = (_bitshift64Shl(($80|0),($81|0),25)|0);
 $85 = tempRet0;
 $86 = (_i64Add(($44|0),($45|0),33554432,0)|0);
 $87 = tempRet0;
 $88 = (_bitshift64Ashr(($86|0),($87|0),26)|0);
 $89 = tempRet0;
 $90 = (_i64Add(($56|0),($57|0),($88|0),($89|0))|0);
 $91 = tempRet0;
 $92 = (_bitshift64Shl(($88|0),($89|0),26)|0);
 $93 = tempRet0;
 $94 = (_i64Subtract(($44|0),($45|0),($92|0),($93|0))|0);
 $95 = tempRet0;
 $96 = (_i64Add(($52|0),($53|0),33554432,0)|0);
 $97 = tempRet0;
 $98 = (_bitshift64Ashr(($96|0),($97|0),26)|0);
 $99 = tempRet0;
 $100 = (_i64Add(($66|0),($67|0),($98|0),($99|0))|0);
 $101 = tempRet0;
 $102 = (_bitshift64Shl(($98|0),($99|0),26)|0);
 $103 = tempRet0;
 $104 = (_i64Subtract(($52|0),($53|0),($102|0),($103|0))|0);
 $105 = tempRet0;
 $106 = (_i64Add(($62|0),($63|0),33554432,0)|0);
 $107 = tempRet0;
 $108 = (_bitshift64Ashr(($106|0),($107|0),26)|0);
 $109 = tempRet0;
 $110 = (_i64Add(($76|0),($77|0),($108|0),($109|0))|0);
 $111 = tempRet0;
 $112 = (_bitshift64Shl(($108|0),($109|0),26)|0);
 $113 = tempRet0;
 $114 = (_i64Subtract(($62|0),($63|0),($112|0),($113|0))|0);
 $115 = tempRet0;
 $116 = (_i64Add(($72|0),($73|0),33554432,0)|0);
 $117 = tempRet0;
 $118 = (_bitshift64Ashr(($116|0),($117|0),26)|0);
 $119 = tempRet0;
 $120 = (_i64Add(($118|0),($119|0),($26|0),($27|0))|0);
 $121 = tempRet0;
 $122 = (_i64Subtract(($120|0),($121|0),($84|0),($85|0))|0);
 $123 = tempRet0;
 $124 = (_bitshift64Shl(($118|0),($119|0),26)|0);
 $125 = tempRet0;
 $126 = (_i64Subtract(($72|0),($73|0),($124|0),($125|0))|0);
 $127 = tempRet0;
 $128 = (_i64Add(($82|0),($83|0),33554432,0)|0);
 $129 = tempRet0;
 $130 = (_bitshift64Ashr(($128|0),($129|0),26)|0);
 $131 = tempRet0;
 $132 = (_i64Add(($130|0),($131|0),($36|0),0)|0);
 $133 = tempRet0;
 $134 = (_i64Subtract(($132|0),($133|0),($46|0),($47|0))|0);
 $135 = tempRet0;
 $136 = (_bitshift64Shl(($130|0),($131|0),26)|0);
 $137 = tempRet0;
 $138 = (_i64Subtract(($82|0),($83|0),($136|0),($137|0))|0);
 $139 = tempRet0;
 HEAP32[$h>>2] = $94;
 $arrayidx73 = ((($h)) + 4|0);
 HEAP32[$arrayidx73>>2] = $90;
 $arrayidx75 = ((($h)) + 8|0);
 HEAP32[$arrayidx75>>2] = $104;
 $arrayidx77 = ((($h)) + 12|0);
 HEAP32[$arrayidx77>>2] = $100;
 $arrayidx79 = ((($h)) + 16|0);
 HEAP32[$arrayidx79>>2] = $114;
 $arrayidx81 = ((($h)) + 20|0);
 HEAP32[$arrayidx81>>2] = $110;
 $arrayidx83 = ((($h)) + 24|0);
 HEAP32[$arrayidx83>>2] = $126;
 $arrayidx85 = ((($h)) + 28|0);
 HEAP32[$arrayidx85>>2] = $122;
 $arrayidx87 = ((($h)) + 32|0);
 HEAP32[$arrayidx87>>2] = $138;
 $arrayidx89 = ((($h)) + 36|0);
 HEAP32[$arrayidx89>>2] = $134;
 return;
}
function _load_4($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0;
 var $arrayidx3 = 0, $arrayidx7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 $arrayidx7 = ((($in)) + 3|0);
 $13 = HEAP8[$arrayidx7>>0]|0;
 $14 = $13&255;
 $15 = (_bitshift64Shl(($14|0),0,24)|0);
 $16 = tempRet0;
 $17 = $11 | $15;
 $18 = $12 | $16;
 tempRet0 = ($18);
 return ($17|0);
}
function _load_3($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0, $arrayidx3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 tempRet0 = ($12);
 return ($11|0);
}
function _crypto_sign_ed25519_ref10_fe_invert($out,$z) {
 $out = $out|0;
 $z = $z|0;
 var $exitcond = 0, $exitcond33 = 0, $exitcond34 = 0, $i$727 = 0, $i$826 = 0, $i$925 = 0, $inc104 = 0, $inc117 = 0, $inc91 = 0, $t0 = 0, $t1 = 0, $t2 = 0, $t3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $t0 = sp + 120|0;
 $t1 = sp + 80|0;
 $t2 = sp + 40|0;
 $t3 = sp;
 _crypto_sign_ed25519_ref10_fe_sq($t0,$z);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$z,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t0,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t0);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t1,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_mul($t2,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
 _crypto_sign_ed25519_ref10_fe_mul($t2,$t3,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t1);
 $i$727 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
  $inc91 = (($i$727) + 1)|0;
  $exitcond34 = ($inc91|0)==(50);
  if ($exitcond34) {
   break;
  } else {
   $i$727 = $inc91;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t2,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t3,$t2);
 $i$826 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t3,$t3);
  $inc104 = (($i$826) + 1)|0;
  $exitcond33 = ($inc104|0)==(100);
  if ($exitcond33) {
   break;
  } else {
   $i$826 = $inc104;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t2,$t3,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 $i$925 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
  $inc117 = (($i$925) + 1)|0;
  $exitcond = ($inc117|0)==(50);
  if ($exitcond) {
   break;
  } else {
   $i$925 = $inc117;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($out,$t1,$t0);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_fe_isnegative($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $and = 0, $s = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $s = sp;
 _crypto_sign_ed25519_ref10_fe_tobytes($s,$f);
 $0 = HEAP8[$s>>0]|0;
 $1 = $0 & 1;
 $and = $1&255;
 STACKTOP = sp;return ($and|0);
}
function _crypto_sign_ed25519_ref10_fe_isnonzero($f) {
 $f = $f|0;
 var $call = 0, $s = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $s = sp;
 _crypto_sign_ed25519_ref10_fe_tobytes($s,$f);
 $call = (_crypto_verify_32_ref($s,33460)|0);
 STACKTOP = sp;return ($call|0);
}
function _crypto_sign_ed25519_ref10_fe_mul($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx12 = 0, $arrayidx13 = 0, $arrayidx14 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx18 = 0, $arrayidx19 = 0;
 var $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx4 = 0, $arrayidx482 = 0, $arrayidx484 = 0, $arrayidx486 = 0, $arrayidx488 = 0, $arrayidx490 = 0, $arrayidx492 = 0, $arrayidx494 = 0, $arrayidx496 = 0, $arrayidx498 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $mul = 0, $mul20 = 0, $mul21 = 0;
 var $mul22 = 0, $mul23 = 0, $mul24 = 0, $mul25 = 0, $mul26 = 0, $mul27 = 0, $mul28 = 0, $mul29 = 0, $mul30 = 0, $mul31 = 0, $mul32 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $10 = HEAP32[$g>>2]|0;
 $arrayidx11 = ((($g)) + 4|0);
 $11 = HEAP32[$arrayidx11>>2]|0;
 $arrayidx12 = ((($g)) + 8|0);
 $12 = HEAP32[$arrayidx12>>2]|0;
 $arrayidx13 = ((($g)) + 12|0);
 $13 = HEAP32[$arrayidx13>>2]|0;
 $arrayidx14 = ((($g)) + 16|0);
 $14 = HEAP32[$arrayidx14>>2]|0;
 $arrayidx15 = ((($g)) + 20|0);
 $15 = HEAP32[$arrayidx15>>2]|0;
 $arrayidx16 = ((($g)) + 24|0);
 $16 = HEAP32[$arrayidx16>>2]|0;
 $arrayidx17 = ((($g)) + 28|0);
 $17 = HEAP32[$arrayidx17>>2]|0;
 $arrayidx18 = ((($g)) + 32|0);
 $18 = HEAP32[$arrayidx18>>2]|0;
 $arrayidx19 = ((($g)) + 36|0);
 $19 = HEAP32[$arrayidx19>>2]|0;
 $mul = ($11*19)|0;
 $mul20 = ($12*19)|0;
 $mul21 = ($13*19)|0;
 $mul22 = ($14*19)|0;
 $mul23 = ($15*19)|0;
 $mul24 = ($16*19)|0;
 $mul25 = ($17*19)|0;
 $mul26 = ($18*19)|0;
 $mul27 = ($19*19)|0;
 $mul28 = $1 << 1;
 $mul29 = $3 << 1;
 $mul30 = $5 << 1;
 $mul31 = $7 << 1;
 $mul32 = $9 << 1;
 $20 = ($0|0)<(0);
 $21 = $20 << 31 >> 31;
 $22 = ($10|0)<(0);
 $23 = $22 << 31 >> 31;
 $24 = (___muldi3(($10|0),($23|0),($0|0),($21|0))|0);
 $25 = tempRet0;
 $26 = ($11|0)<(0);
 $27 = $26 << 31 >> 31;
 $28 = (___muldi3(($11|0),($27|0),($0|0),($21|0))|0);
 $29 = tempRet0;
 $30 = ($12|0)<(0);
 $31 = $30 << 31 >> 31;
 $32 = (___muldi3(($12|0),($31|0),($0|0),($21|0))|0);
 $33 = tempRet0;
 $34 = ($13|0)<(0);
 $35 = $34 << 31 >> 31;
 $36 = (___muldi3(($13|0),($35|0),($0|0),($21|0))|0);
 $37 = tempRet0;
 $38 = ($14|0)<(0);
 $39 = $38 << 31 >> 31;
 $40 = (___muldi3(($14|0),($39|0),($0|0),($21|0))|0);
 $41 = tempRet0;
 $42 = ($15|0)<(0);
 $43 = $42 << 31 >> 31;
 $44 = (___muldi3(($15|0),($43|0),($0|0),($21|0))|0);
 $45 = tempRet0;
 $46 = ($16|0)<(0);
 $47 = $46 << 31 >> 31;
 $48 = (___muldi3(($16|0),($47|0),($0|0),($21|0))|0);
 $49 = tempRet0;
 $50 = ($17|0)<(0);
 $51 = $50 << 31 >> 31;
 $52 = (___muldi3(($17|0),($51|0),($0|0),($21|0))|0);
 $53 = tempRet0;
 $54 = ($18|0)<(0);
 $55 = $54 << 31 >> 31;
 $56 = (___muldi3(($18|0),($55|0),($0|0),($21|0))|0);
 $57 = tempRet0;
 $58 = ($19|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($19|0),($59|0),($0|0),($21|0))|0);
 $61 = tempRet0;
 $62 = ($1|0)<(0);
 $63 = $62 << 31 >> 31;
 $64 = (___muldi3(($10|0),($23|0),($1|0),($63|0))|0);
 $65 = tempRet0;
 $66 = ($mul28|0)<(0);
 $67 = $66 << 31 >> 31;
 $68 = (___muldi3(($11|0),($27|0),($mul28|0),($67|0))|0);
 $69 = tempRet0;
 $70 = (___muldi3(($12|0),($31|0),($1|0),($63|0))|0);
 $71 = tempRet0;
 $72 = (___muldi3(($13|0),($35|0),($mul28|0),($67|0))|0);
 $73 = tempRet0;
 $74 = (___muldi3(($14|0),($39|0),($1|0),($63|0))|0);
 $75 = tempRet0;
 $76 = (___muldi3(($15|0),($43|0),($mul28|0),($67|0))|0);
 $77 = tempRet0;
 $78 = (___muldi3(($16|0),($47|0),($1|0),($63|0))|0);
 $79 = tempRet0;
 $80 = (___muldi3(($17|0),($51|0),($mul28|0),($67|0))|0);
 $81 = tempRet0;
 $82 = (___muldi3(($18|0),($55|0),($1|0),($63|0))|0);
 $83 = tempRet0;
 $84 = ($mul27|0)<(0);
 $85 = $84 << 31 >> 31;
 $86 = (___muldi3(($mul27|0),($85|0),($mul28|0),($67|0))|0);
 $87 = tempRet0;
 $88 = ($2|0)<(0);
 $89 = $88 << 31 >> 31;
 $90 = (___muldi3(($10|0),($23|0),($2|0),($89|0))|0);
 $91 = tempRet0;
 $92 = (___muldi3(($11|0),($27|0),($2|0),($89|0))|0);
 $93 = tempRet0;
 $94 = (___muldi3(($12|0),($31|0),($2|0),($89|0))|0);
 $95 = tempRet0;
 $96 = (___muldi3(($13|0),($35|0),($2|0),($89|0))|0);
 $97 = tempRet0;
 $98 = (___muldi3(($14|0),($39|0),($2|0),($89|0))|0);
 $99 = tempRet0;
 $100 = (___muldi3(($15|0),($43|0),($2|0),($89|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($16|0),($47|0),($2|0),($89|0))|0);
 $103 = tempRet0;
 $104 = (___muldi3(($17|0),($51|0),($2|0),($89|0))|0);
 $105 = tempRet0;
 $106 = ($mul26|0)<(0);
 $107 = $106 << 31 >> 31;
 $108 = (___muldi3(($mul26|0),($107|0),($2|0),($89|0))|0);
 $109 = tempRet0;
 $110 = (___muldi3(($mul27|0),($85|0),($2|0),($89|0))|0);
 $111 = tempRet0;
 $112 = ($3|0)<(0);
 $113 = $112 << 31 >> 31;
 $114 = (___muldi3(($10|0),($23|0),($3|0),($113|0))|0);
 $115 = tempRet0;
 $116 = ($mul29|0)<(0);
 $117 = $116 << 31 >> 31;
 $118 = (___muldi3(($11|0),($27|0),($mul29|0),($117|0))|0);
 $119 = tempRet0;
 $120 = (___muldi3(($12|0),($31|0),($3|0),($113|0))|0);
 $121 = tempRet0;
 $122 = (___muldi3(($13|0),($35|0),($mul29|0),($117|0))|0);
 $123 = tempRet0;
 $124 = (___muldi3(($14|0),($39|0),($3|0),($113|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($15|0),($43|0),($mul29|0),($117|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($16|0),($47|0),($3|0),($113|0))|0);
 $129 = tempRet0;
 $130 = ($mul25|0)<(0);
 $131 = $130 << 31 >> 31;
 $132 = (___muldi3(($mul25|0),($131|0),($mul29|0),($117|0))|0);
 $133 = tempRet0;
 $134 = (___muldi3(($mul26|0),($107|0),($3|0),($113|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($mul27|0),($85|0),($mul29|0),($117|0))|0);
 $137 = tempRet0;
 $138 = ($4|0)<(0);
 $139 = $138 << 31 >> 31;
 $140 = (___muldi3(($10|0),($23|0),($4|0),($139|0))|0);
 $141 = tempRet0;
 $142 = (___muldi3(($11|0),($27|0),($4|0),($139|0))|0);
 $143 = tempRet0;
 $144 = (___muldi3(($12|0),($31|0),($4|0),($139|0))|0);
 $145 = tempRet0;
 $146 = (___muldi3(($13|0),($35|0),($4|0),($139|0))|0);
 $147 = tempRet0;
 $148 = (___muldi3(($14|0),($39|0),($4|0),($139|0))|0);
 $149 = tempRet0;
 $150 = (___muldi3(($15|0),($43|0),($4|0),($139|0))|0);
 $151 = tempRet0;
 $152 = ($mul24|0)<(0);
 $153 = $152 << 31 >> 31;
 $154 = (___muldi3(($mul24|0),($153|0),($4|0),($139|0))|0);
 $155 = tempRet0;
 $156 = (___muldi3(($mul25|0),($131|0),($4|0),($139|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($mul26|0),($107|0),($4|0),($139|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($mul27|0),($85|0),($4|0),($139|0))|0);
 $161 = tempRet0;
 $162 = ($5|0)<(0);
 $163 = $162 << 31 >> 31;
 $164 = (___muldi3(($10|0),($23|0),($5|0),($163|0))|0);
 $165 = tempRet0;
 $166 = ($mul30|0)<(0);
 $167 = $166 << 31 >> 31;
 $168 = (___muldi3(($11|0),($27|0),($mul30|0),($167|0))|0);
 $169 = tempRet0;
 $170 = (___muldi3(($12|0),($31|0),($5|0),($163|0))|0);
 $171 = tempRet0;
 $172 = (___muldi3(($13|0),($35|0),($mul30|0),($167|0))|0);
 $173 = tempRet0;
 $174 = (___muldi3(($14|0),($39|0),($5|0),($163|0))|0);
 $175 = tempRet0;
 $176 = ($mul23|0)<(0);
 $177 = $176 << 31 >> 31;
 $178 = (___muldi3(($mul23|0),($177|0),($mul30|0),($167|0))|0);
 $179 = tempRet0;
 $180 = (___muldi3(($mul24|0),($153|0),($5|0),($163|0))|0);
 $181 = tempRet0;
 $182 = (___muldi3(($mul25|0),($131|0),($mul30|0),($167|0))|0);
 $183 = tempRet0;
 $184 = (___muldi3(($mul26|0),($107|0),($5|0),($163|0))|0);
 $185 = tempRet0;
 $186 = (___muldi3(($mul27|0),($85|0),($mul30|0),($167|0))|0);
 $187 = tempRet0;
 $188 = ($6|0)<(0);
 $189 = $188 << 31 >> 31;
 $190 = (___muldi3(($10|0),($23|0),($6|0),($189|0))|0);
 $191 = tempRet0;
 $192 = (___muldi3(($11|0),($27|0),($6|0),($189|0))|0);
 $193 = tempRet0;
 $194 = (___muldi3(($12|0),($31|0),($6|0),($189|0))|0);
 $195 = tempRet0;
 $196 = (___muldi3(($13|0),($35|0),($6|0),($189|0))|0);
 $197 = tempRet0;
 $198 = ($mul22|0)<(0);
 $199 = $198 << 31 >> 31;
 $200 = (___muldi3(($mul22|0),($199|0),($6|0),($189|0))|0);
 $201 = tempRet0;
 $202 = (___muldi3(($mul23|0),($177|0),($6|0),($189|0))|0);
 $203 = tempRet0;
 $204 = (___muldi3(($mul24|0),($153|0),($6|0),($189|0))|0);
 $205 = tempRet0;
 $206 = (___muldi3(($mul25|0),($131|0),($6|0),($189|0))|0);
 $207 = tempRet0;
 $208 = (___muldi3(($mul26|0),($107|0),($6|0),($189|0))|0);
 $209 = tempRet0;
 $210 = (___muldi3(($mul27|0),($85|0),($6|0),($189|0))|0);
 $211 = tempRet0;
 $212 = ($7|0)<(0);
 $213 = $212 << 31 >> 31;
 $214 = (___muldi3(($10|0),($23|0),($7|0),($213|0))|0);
 $215 = tempRet0;
 $216 = ($mul31|0)<(0);
 $217 = $216 << 31 >> 31;
 $218 = (___muldi3(($11|0),($27|0),($mul31|0),($217|0))|0);
 $219 = tempRet0;
 $220 = (___muldi3(($12|0),($31|0),($7|0),($213|0))|0);
 $221 = tempRet0;
 $222 = ($mul21|0)<(0);
 $223 = $222 << 31 >> 31;
 $224 = (___muldi3(($mul21|0),($223|0),($mul31|0),($217|0))|0);
 $225 = tempRet0;
 $226 = (___muldi3(($mul22|0),($199|0),($7|0),($213|0))|0);
 $227 = tempRet0;
 $228 = (___muldi3(($mul23|0),($177|0),($mul31|0),($217|0))|0);
 $229 = tempRet0;
 $230 = (___muldi3(($mul24|0),($153|0),($7|0),($213|0))|0);
 $231 = tempRet0;
 $232 = (___muldi3(($mul25|0),($131|0),($mul31|0),($217|0))|0);
 $233 = tempRet0;
 $234 = (___muldi3(($mul26|0),($107|0),($7|0),($213|0))|0);
 $235 = tempRet0;
 $236 = (___muldi3(($mul27|0),($85|0),($mul31|0),($217|0))|0);
 $237 = tempRet0;
 $238 = ($8|0)<(0);
 $239 = $238 << 31 >> 31;
 $240 = (___muldi3(($10|0),($23|0),($8|0),($239|0))|0);
 $241 = tempRet0;
 $242 = (___muldi3(($11|0),($27|0),($8|0),($239|0))|0);
 $243 = tempRet0;
 $244 = ($mul20|0)<(0);
 $245 = $244 << 31 >> 31;
 $246 = (___muldi3(($mul20|0),($245|0),($8|0),($239|0))|0);
 $247 = tempRet0;
 $248 = (___muldi3(($mul21|0),($223|0),($8|0),($239|0))|0);
 $249 = tempRet0;
 $250 = (___muldi3(($mul22|0),($199|0),($8|0),($239|0))|0);
 $251 = tempRet0;
 $252 = (___muldi3(($mul23|0),($177|0),($8|0),($239|0))|0);
 $253 = tempRet0;
 $254 = (___muldi3(($mul24|0),($153|0),($8|0),($239|0))|0);
 $255 = tempRet0;
 $256 = (___muldi3(($mul25|0),($131|0),($8|0),($239|0))|0);
 $257 = tempRet0;
 $258 = (___muldi3(($mul26|0),($107|0),($8|0),($239|0))|0);
 $259 = tempRet0;
 $260 = (___muldi3(($mul27|0),($85|0),($8|0),($239|0))|0);
 $261 = tempRet0;
 $262 = ($9|0)<(0);
 $263 = $262 << 31 >> 31;
 $264 = (___muldi3(($10|0),($23|0),($9|0),($263|0))|0);
 $265 = tempRet0;
 $266 = ($mul32|0)<(0);
 $267 = $266 << 31 >> 31;
 $268 = ($mul|0)<(0);
 $269 = $268 << 31 >> 31;
 $270 = (___muldi3(($mul|0),($269|0),($mul32|0),($267|0))|0);
 $271 = tempRet0;
 $272 = (___muldi3(($mul20|0),($245|0),($9|0),($263|0))|0);
 $273 = tempRet0;
 $274 = (___muldi3(($mul21|0),($223|0),($mul32|0),($267|0))|0);
 $275 = tempRet0;
 $276 = (___muldi3(($mul22|0),($199|0),($9|0),($263|0))|0);
 $277 = tempRet0;
 $278 = (___muldi3(($mul23|0),($177|0),($mul32|0),($267|0))|0);
 $279 = tempRet0;
 $280 = (___muldi3(($mul24|0),($153|0),($9|0),($263|0))|0);
 $281 = tempRet0;
 $282 = (___muldi3(($mul25|0),($131|0),($mul32|0),($267|0))|0);
 $283 = tempRet0;
 $284 = (___muldi3(($mul26|0),($107|0),($9|0),($263|0))|0);
 $285 = tempRet0;
 $286 = (___muldi3(($mul27|0),($85|0),($mul32|0),($267|0))|0);
 $287 = tempRet0;
 $288 = (_i64Add(($270|0),($271|0),($24|0),($25|0))|0);
 $289 = tempRet0;
 $290 = (_i64Add(($288|0),($289|0),($246|0),($247|0))|0);
 $291 = tempRet0;
 $292 = (_i64Add(($290|0),($291|0),($224|0),($225|0))|0);
 $293 = tempRet0;
 $294 = (_i64Add(($292|0),($293|0),($200|0),($201|0))|0);
 $295 = tempRet0;
 $296 = (_i64Add(($294|0),($295|0),($178|0),($179|0))|0);
 $297 = tempRet0;
 $298 = (_i64Add(($296|0),($297|0),($154|0),($155|0))|0);
 $299 = tempRet0;
 $300 = (_i64Add(($298|0),($299|0),($132|0),($133|0))|0);
 $301 = tempRet0;
 $302 = (_i64Add(($300|0),($301|0),($108|0),($109|0))|0);
 $303 = tempRet0;
 $304 = (_i64Add(($302|0),($303|0),($86|0),($87|0))|0);
 $305 = tempRet0;
 $306 = (_i64Add(($28|0),($29|0),($64|0),($65|0))|0);
 $307 = tempRet0;
 $308 = (_i64Add(($118|0),($119|0),($140|0),($141|0))|0);
 $309 = tempRet0;
 $310 = (_i64Add(($308|0),($309|0),($94|0),($95|0))|0);
 $311 = tempRet0;
 $312 = (_i64Add(($310|0),($311|0),($72|0),($73|0))|0);
 $313 = tempRet0;
 $314 = (_i64Add(($312|0),($313|0),($40|0),($41|0))|0);
 $315 = tempRet0;
 $316 = (_i64Add(($314|0),($315|0),($278|0),($279|0))|0);
 $317 = tempRet0;
 $318 = (_i64Add(($316|0),($317|0),($254|0),($255|0))|0);
 $319 = tempRet0;
 $320 = (_i64Add(($318|0),($319|0),($232|0),($233|0))|0);
 $321 = tempRet0;
 $322 = (_i64Add(($320|0),($321|0),($208|0),($209|0))|0);
 $323 = tempRet0;
 $324 = (_i64Add(($322|0),($323|0),($186|0),($187|0))|0);
 $325 = tempRet0;
 $326 = (_i64Add(($304|0),($305|0),33554432,0)|0);
 $327 = tempRet0;
 $328 = (_bitshift64Ashr(($326|0),($327|0),26)|0);
 $329 = tempRet0;
 $330 = (_i64Add(($306|0),($307|0),($272|0),($273|0))|0);
 $331 = tempRet0;
 $332 = (_i64Add(($330|0),($331|0),($248|0),($249|0))|0);
 $333 = tempRet0;
 $334 = (_i64Add(($332|0),($333|0),($226|0),($227|0))|0);
 $335 = tempRet0;
 $336 = (_i64Add(($334|0),($335|0),($202|0),($203|0))|0);
 $337 = tempRet0;
 $338 = (_i64Add(($336|0),($337|0),($180|0),($181|0))|0);
 $339 = tempRet0;
 $340 = (_i64Add(($338|0),($339|0),($156|0),($157|0))|0);
 $341 = tempRet0;
 $342 = (_i64Add(($340|0),($341|0),($134|0),($135|0))|0);
 $343 = tempRet0;
 $344 = (_i64Add(($342|0),($343|0),($110|0),($111|0))|0);
 $345 = tempRet0;
 $346 = (_i64Add(($344|0),($345|0),($328|0),($329|0))|0);
 $347 = tempRet0;
 $348 = (_bitshift64Shl(($328|0),($329|0),26)|0);
 $349 = tempRet0;
 $350 = (_i64Subtract(($304|0),($305|0),($348|0),($349|0))|0);
 $351 = tempRet0;
 $352 = (_i64Add(($324|0),($325|0),33554432,0)|0);
 $353 = tempRet0;
 $354 = (_bitshift64Ashr(($352|0),($353|0),26)|0);
 $355 = tempRet0;
 $356 = (_i64Add(($142|0),($143|0),($164|0),($165|0))|0);
 $357 = tempRet0;
 $358 = (_i64Add(($356|0),($357|0),($120|0),($121|0))|0);
 $359 = tempRet0;
 $360 = (_i64Add(($358|0),($359|0),($96|0),($97|0))|0);
 $361 = tempRet0;
 $362 = (_i64Add(($360|0),($361|0),($74|0),($75|0))|0);
 $363 = tempRet0;
 $364 = (_i64Add(($362|0),($363|0),($44|0),($45|0))|0);
 $365 = tempRet0;
 $366 = (_i64Add(($364|0),($365|0),($280|0),($281|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($366|0),($367|0),($256|0),($257|0))|0);
 $369 = tempRet0;
 $370 = (_i64Add(($368|0),($369|0),($234|0),($235|0))|0);
 $371 = tempRet0;
 $372 = (_i64Add(($370|0),($371|0),($210|0),($211|0))|0);
 $373 = tempRet0;
 $374 = (_i64Add(($372|0),($373|0),($354|0),($355|0))|0);
 $375 = tempRet0;
 $376 = (_bitshift64Shl(($354|0),($355|0),26)|0);
 $377 = tempRet0;
 $378 = (_i64Subtract(($324|0),($325|0),($376|0),($377|0))|0);
 $379 = tempRet0;
 $380 = (_i64Add(($346|0),($347|0),16777216,0)|0);
 $381 = tempRet0;
 $382 = (_bitshift64Ashr(($380|0),($381|0),25)|0);
 $383 = tempRet0;
 $384 = (_i64Add(($68|0),($69|0),($90|0),($91|0))|0);
 $385 = tempRet0;
 $386 = (_i64Add(($384|0),($385|0),($32|0),($33|0))|0);
 $387 = tempRet0;
 $388 = (_i64Add(($386|0),($387|0),($274|0),($275|0))|0);
 $389 = tempRet0;
 $390 = (_i64Add(($388|0),($389|0),($250|0),($251|0))|0);
 $391 = tempRet0;
 $392 = (_i64Add(($390|0),($391|0),($228|0),($229|0))|0);
 $393 = tempRet0;
 $394 = (_i64Add(($392|0),($393|0),($204|0),($205|0))|0);
 $395 = tempRet0;
 $396 = (_i64Add(($394|0),($395|0),($182|0),($183|0))|0);
 $397 = tempRet0;
 $398 = (_i64Add(($396|0),($397|0),($158|0),($159|0))|0);
 $399 = tempRet0;
 $400 = (_i64Add(($398|0),($399|0),($136|0),($137|0))|0);
 $401 = tempRet0;
 $402 = (_i64Add(($400|0),($401|0),($382|0),($383|0))|0);
 $403 = tempRet0;
 $404 = (_bitshift64Shl(($382|0),($383|0),25)|0);
 $405 = tempRet0;
 $406 = (_i64Subtract(($346|0),($347|0),($404|0),($405|0))|0);
 $407 = tempRet0;
 $408 = (_i64Add(($374|0),($375|0),16777216,0)|0);
 $409 = tempRet0;
 $410 = (_bitshift64Ashr(($408|0),($409|0),25)|0);
 $411 = tempRet0;
 $412 = (_i64Add(($168|0),($169|0),($190|0),($191|0))|0);
 $413 = tempRet0;
 $414 = (_i64Add(($412|0),($413|0),($144|0),($145|0))|0);
 $415 = tempRet0;
 $416 = (_i64Add(($414|0),($415|0),($122|0),($123|0))|0);
 $417 = tempRet0;
 $418 = (_i64Add(($416|0),($417|0),($98|0),($99|0))|0);
 $419 = tempRet0;
 $420 = (_i64Add(($418|0),($419|0),($76|0),($77|0))|0);
 $421 = tempRet0;
 $422 = (_i64Add(($420|0),($421|0),($48|0),($49|0))|0);
 $423 = tempRet0;
 $424 = (_i64Add(($422|0),($423|0),($282|0),($283|0))|0);
 $425 = tempRet0;
 $426 = (_i64Add(($424|0),($425|0),($258|0),($259|0))|0);
 $427 = tempRet0;
 $428 = (_i64Add(($426|0),($427|0),($236|0),($237|0))|0);
 $429 = tempRet0;
 $430 = (_i64Add(($428|0),($429|0),($410|0),($411|0))|0);
 $431 = tempRet0;
 $432 = (_bitshift64Shl(($410|0),($411|0),25)|0);
 $433 = tempRet0;
 $434 = (_i64Subtract(($374|0),($375|0),($432|0),($433|0))|0);
 $435 = tempRet0;
 $436 = (_i64Add(($402|0),($403|0),33554432,0)|0);
 $437 = tempRet0;
 $438 = (_bitshift64Ashr(($436|0),($437|0),26)|0);
 $439 = tempRet0;
 $440 = (_i64Add(($92|0),($93|0),($114|0),($115|0))|0);
 $441 = tempRet0;
 $442 = (_i64Add(($440|0),($441|0),($70|0),($71|0))|0);
 $443 = tempRet0;
 $444 = (_i64Add(($442|0),($443|0),($36|0),($37|0))|0);
 $445 = tempRet0;
 $446 = (_i64Add(($444|0),($445|0),($276|0),($277|0))|0);
 $447 = tempRet0;
 $448 = (_i64Add(($446|0),($447|0),($252|0),($253|0))|0);
 $449 = tempRet0;
 $450 = (_i64Add(($448|0),($449|0),($230|0),($231|0))|0);
 $451 = tempRet0;
 $452 = (_i64Add(($450|0),($451|0),($206|0),($207|0))|0);
 $453 = tempRet0;
 $454 = (_i64Add(($452|0),($453|0),($184|0),($185|0))|0);
 $455 = tempRet0;
 $456 = (_i64Add(($454|0),($455|0),($160|0),($161|0))|0);
 $457 = tempRet0;
 $458 = (_i64Add(($456|0),($457|0),($438|0),($439|0))|0);
 $459 = tempRet0;
 $460 = (_bitshift64Shl(($438|0),($439|0),26)|0);
 $461 = tempRet0;
 $462 = (_i64Subtract(($402|0),($403|0),($460|0),($461|0))|0);
 $463 = tempRet0;
 $464 = (_i64Add(($430|0),($431|0),33554432,0)|0);
 $465 = tempRet0;
 $466 = (_bitshift64Ashr(($464|0),($465|0),26)|0);
 $467 = tempRet0;
 $468 = (_i64Add(($192|0),($193|0),($214|0),($215|0))|0);
 $469 = tempRet0;
 $470 = (_i64Add(($468|0),($469|0),($170|0),($171|0))|0);
 $471 = tempRet0;
 $472 = (_i64Add(($470|0),($471|0),($146|0),($147|0))|0);
 $473 = tempRet0;
 $474 = (_i64Add(($472|0),($473|0),($124|0),($125|0))|0);
 $475 = tempRet0;
 $476 = (_i64Add(($474|0),($475|0),($100|0),($101|0))|0);
 $477 = tempRet0;
 $478 = (_i64Add(($476|0),($477|0),($78|0),($79|0))|0);
 $479 = tempRet0;
 $480 = (_i64Add(($478|0),($479|0),($52|0),($53|0))|0);
 $481 = tempRet0;
 $482 = (_i64Add(($480|0),($481|0),($284|0),($285|0))|0);
 $483 = tempRet0;
 $484 = (_i64Add(($482|0),($483|0),($260|0),($261|0))|0);
 $485 = tempRet0;
 $486 = (_i64Add(($484|0),($485|0),($466|0),($467|0))|0);
 $487 = tempRet0;
 $488 = (_bitshift64Shl(($466|0),($467|0),26)|0);
 $489 = tempRet0;
 $490 = (_i64Subtract(($430|0),($431|0),($488|0),($489|0))|0);
 $491 = tempRet0;
 $492 = (_i64Add(($458|0),($459|0),16777216,0)|0);
 $493 = tempRet0;
 $494 = (_bitshift64Ashr(($492|0),($493|0),25)|0);
 $495 = tempRet0;
 $496 = (_i64Add(($494|0),($495|0),($378|0),($379|0))|0);
 $497 = tempRet0;
 $498 = (_bitshift64Shl(($494|0),($495|0),25)|0);
 $499 = tempRet0;
 $500 = (_i64Subtract(($458|0),($459|0),($498|0),($499|0))|0);
 $501 = tempRet0;
 $502 = (_i64Add(($486|0),($487|0),16777216,0)|0);
 $503 = tempRet0;
 $504 = (_bitshift64Ashr(($502|0),($503|0),25)|0);
 $505 = tempRet0;
 $506 = (_i64Add(($218|0),($219|0),($240|0),($241|0))|0);
 $507 = tempRet0;
 $508 = (_i64Add(($506|0),($507|0),($194|0),($195|0))|0);
 $509 = tempRet0;
 $510 = (_i64Add(($508|0),($509|0),($172|0),($173|0))|0);
 $511 = tempRet0;
 $512 = (_i64Add(($510|0),($511|0),($148|0),($149|0))|0);
 $513 = tempRet0;
 $514 = (_i64Add(($512|0),($513|0),($126|0),($127|0))|0);
 $515 = tempRet0;
 $516 = (_i64Add(($514|0),($515|0),($102|0),($103|0))|0);
 $517 = tempRet0;
 $518 = (_i64Add(($516|0),($517|0),($80|0),($81|0))|0);
 $519 = tempRet0;
 $520 = (_i64Add(($518|0),($519|0),($56|0),($57|0))|0);
 $521 = tempRet0;
 $522 = (_i64Add(($520|0),($521|0),($286|0),($287|0))|0);
 $523 = tempRet0;
 $524 = (_i64Add(($522|0),($523|0),($504|0),($505|0))|0);
 $525 = tempRet0;
 $526 = (_bitshift64Shl(($504|0),($505|0),25)|0);
 $527 = tempRet0;
 $528 = (_i64Subtract(($486|0),($487|0),($526|0),($527|0))|0);
 $529 = tempRet0;
 $530 = (_i64Add(($496|0),($497|0),33554432,0)|0);
 $531 = tempRet0;
 $532 = (_bitshift64Ashr(($530|0),($531|0),26)|0);
 $533 = tempRet0;
 $534 = (_i64Add(($434|0),($435|0),($532|0),($533|0))|0);
 $535 = tempRet0;
 $536 = (_bitshift64Shl(($532|0),($533|0),26)|0);
 $537 = tempRet0;
 $538 = (_i64Subtract(($496|0),($497|0),($536|0),($537|0))|0);
 $539 = tempRet0;
 $540 = (_i64Add(($524|0),($525|0),33554432,0)|0);
 $541 = tempRet0;
 $542 = (_bitshift64Ashr(($540|0),($541|0),26)|0);
 $543 = tempRet0;
 $544 = (_i64Add(($242|0),($243|0),($264|0),($265|0))|0);
 $545 = tempRet0;
 $546 = (_i64Add(($544|0),($545|0),($220|0),($221|0))|0);
 $547 = tempRet0;
 $548 = (_i64Add(($546|0),($547|0),($196|0),($197|0))|0);
 $549 = tempRet0;
 $550 = (_i64Add(($548|0),($549|0),($174|0),($175|0))|0);
 $551 = tempRet0;
 $552 = (_i64Add(($550|0),($551|0),($150|0),($151|0))|0);
 $553 = tempRet0;
 $554 = (_i64Add(($552|0),($553|0),($128|0),($129|0))|0);
 $555 = tempRet0;
 $556 = (_i64Add(($554|0),($555|0),($104|0),($105|0))|0);
 $557 = tempRet0;
 $558 = (_i64Add(($556|0),($557|0),($82|0),($83|0))|0);
 $559 = tempRet0;
 $560 = (_i64Add(($558|0),($559|0),($60|0),($61|0))|0);
 $561 = tempRet0;
 $562 = (_i64Add(($560|0),($561|0),($542|0),($543|0))|0);
 $563 = tempRet0;
 $564 = (_bitshift64Shl(($542|0),($543|0),26)|0);
 $565 = tempRet0;
 $566 = (_i64Subtract(($524|0),($525|0),($564|0),($565|0))|0);
 $567 = tempRet0;
 $568 = (_i64Add(($562|0),($563|0),16777216,0)|0);
 $569 = tempRet0;
 $570 = (_bitshift64Ashr(($568|0),($569|0),25)|0);
 $571 = tempRet0;
 $572 = (___muldi3(($570|0),($571|0),19,0)|0);
 $573 = tempRet0;
 $574 = (_i64Add(($572|0),($573|0),($350|0),($351|0))|0);
 $575 = tempRet0;
 $576 = (_bitshift64Shl(($570|0),($571|0),25)|0);
 $577 = tempRet0;
 $578 = (_i64Subtract(($562|0),($563|0),($576|0),($577|0))|0);
 $579 = tempRet0;
 $580 = (_i64Add(($574|0),($575|0),33554432,0)|0);
 $581 = tempRet0;
 $582 = (_bitshift64Ashr(($580|0),($581|0),26)|0);
 $583 = tempRet0;
 $584 = (_i64Add(($406|0),($407|0),($582|0),($583|0))|0);
 $585 = tempRet0;
 $586 = (_bitshift64Shl(($582|0),($583|0),26)|0);
 $587 = tempRet0;
 $588 = (_i64Subtract(($574|0),($575|0),($586|0),($587|0))|0);
 $589 = tempRet0;
 HEAP32[$h>>2] = $588;
 $arrayidx482 = ((($h)) + 4|0);
 HEAP32[$arrayidx482>>2] = $584;
 $arrayidx484 = ((($h)) + 8|0);
 HEAP32[$arrayidx484>>2] = $462;
 $arrayidx486 = ((($h)) + 12|0);
 HEAP32[$arrayidx486>>2] = $500;
 $arrayidx488 = ((($h)) + 16|0);
 HEAP32[$arrayidx488>>2] = $538;
 $arrayidx490 = ((($h)) + 20|0);
 HEAP32[$arrayidx490>>2] = $534;
 $arrayidx492 = ((($h)) + 24|0);
 HEAP32[$arrayidx492>>2] = $490;
 $arrayidx494 = ((($h)) + 28|0);
 HEAP32[$arrayidx494>>2] = $528;
 $arrayidx496 = ((($h)) + 32|0);
 HEAP32[$arrayidx496>>2] = $566;
 $arrayidx498 = ((($h)) + 36|0);
 HEAP32[$arrayidx498>>2] = $578;
 return;
}
function _crypto_sign_ed25519_ref10_fe_neg($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0, $arrayidx2 = 0, $arrayidx20 = 0, $arrayidx21 = 0, $arrayidx22 = 0, $arrayidx23 = 0, $arrayidx24 = 0, $arrayidx25 = 0, $arrayidx26 = 0, $arrayidx27 = 0;
 var $arrayidx28 = 0, $arrayidx3 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $sub = 0, $sub10 = 0, $sub11 = 0, $sub12 = 0, $sub13 = 0, $sub14 = 0, $sub15 = 0, $sub16 = 0, $sub17 = 0, $sub18 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $sub = (0 - ($0))|0;
 $sub10 = (0 - ($1))|0;
 $sub11 = (0 - ($2))|0;
 $sub12 = (0 - ($3))|0;
 $sub13 = (0 - ($4))|0;
 $sub14 = (0 - ($5))|0;
 $sub15 = (0 - ($6))|0;
 $sub16 = (0 - ($7))|0;
 $sub17 = (0 - ($8))|0;
 $sub18 = (0 - ($9))|0;
 HEAP32[$h>>2] = $sub;
 $arrayidx20 = ((($h)) + 4|0);
 HEAP32[$arrayidx20>>2] = $sub10;
 $arrayidx21 = ((($h)) + 8|0);
 HEAP32[$arrayidx21>>2] = $sub11;
 $arrayidx22 = ((($h)) + 12|0);
 HEAP32[$arrayidx22>>2] = $sub12;
 $arrayidx23 = ((($h)) + 16|0);
 HEAP32[$arrayidx23>>2] = $sub13;
 $arrayidx24 = ((($h)) + 20|0);
 HEAP32[$arrayidx24>>2] = $sub14;
 $arrayidx25 = ((($h)) + 24|0);
 HEAP32[$arrayidx25>>2] = $sub15;
 $arrayidx26 = ((($h)) + 28|0);
 HEAP32[$arrayidx26>>2] = $sub16;
 $arrayidx27 = ((($h)) + 32|0);
 HEAP32[$arrayidx27>>2] = $sub17;
 $arrayidx28 = ((($h)) + 36|0);
 HEAP32[$arrayidx28>>2] = $sub18;
 return;
}
function _crypto_sign_ed25519_ref10_fe_pow22523($out,$z) {
 $out = $out|0;
 $z = $z|0;
 var $exitcond = 0, $exitcond34 = 0, $exitcond35 = 0, $i$728 = 0, $i$827 = 0, $i$926 = 0, $inc104 = 0, $inc117 = 0, $inc91 = 0, $t0 = 0, $t1 = 0, $t2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $t0 = sp + 80|0;
 $t1 = sp + 40|0;
 $t2 = sp;
 _crypto_sign_ed25519_ref10_fe_sq($t0,$z);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$z,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t0,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t0,$t0);
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t0);
 $i$728 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
  $inc91 = (($i$728) + 1)|0;
  $exitcond35 = ($inc91|0)==(50);
  if ($exitcond35) {
   break;
  } else {
   $i$728 = $inc91;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t2,$t1);
 $i$827 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t2,$t2);
  $inc104 = (($i$827) + 1)|0;
  $exitcond34 = ($inc104|0)==(100);
  if ($exitcond34) {
   break;
  } else {
   $i$827 = $inc104;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t1,$t2,$t1);
 _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
 $i$926 = 1;
 while(1) {
  _crypto_sign_ed25519_ref10_fe_sq($t1,$t1);
  $inc117 = (($i$926) + 1)|0;
  $exitcond = ($inc117|0)==(50);
  if ($exitcond) {
   break;
  } else {
   $i$926 = $inc117;
  }
 }
 _crypto_sign_ed25519_ref10_fe_mul($t0,$t1,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t0,$t0);
 _crypto_sign_ed25519_ref10_fe_sq($t0,$t0);
 _crypto_sign_ed25519_ref10_fe_mul($out,$t0,$z);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_fe_sq2($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arrayidx1 = 0, $arrayidx2 = 0;
 var $arrayidx3 = 0, $arrayidx301 = 0, $arrayidx303 = 0, $arrayidx305 = 0, $arrayidx307 = 0, $arrayidx309 = 0, $arrayidx311 = 0, $arrayidx313 = 0, $arrayidx315 = 0, $arrayidx317 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $mul = 0, $mul10 = 0, $mul11 = 0, $mul12 = 0;
 var $mul13 = 0, $mul14 = 0, $mul15 = 0, $mul16 = 0, $mul17 = 0, $mul18 = 0, $mul19 = 0, $mul20 = 0, $mul21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $mul = $0 << 1;
 $mul10 = $1 << 1;
 $mul11 = $2 << 1;
 $mul12 = $3 << 1;
 $mul13 = $4 << 1;
 $mul14 = $5 << 1;
 $mul15 = $6 << 1;
 $mul16 = $7 << 1;
 $mul17 = ($5*38)|0;
 $mul18 = ($6*19)|0;
 $mul19 = ($7*38)|0;
 $mul20 = ($8*19)|0;
 $mul21 = ($9*38)|0;
 $10 = ($0|0)<(0);
 $11 = $10 << 31 >> 31;
 $12 = (___muldi3(($0|0),($11|0),($0|0),($11|0))|0);
 $13 = tempRet0;
 $14 = ($mul|0)<(0);
 $15 = $14 << 31 >> 31;
 $16 = ($1|0)<(0);
 $17 = $16 << 31 >> 31;
 $18 = (___muldi3(($mul|0),($15|0),($1|0),($17|0))|0);
 $19 = tempRet0;
 $20 = ($2|0)<(0);
 $21 = $20 << 31 >> 31;
 $22 = (___muldi3(($2|0),($21|0),($mul|0),($15|0))|0);
 $23 = tempRet0;
 $24 = ($3|0)<(0);
 $25 = $24 << 31 >> 31;
 $26 = (___muldi3(($3|0),($25|0),($mul|0),($15|0))|0);
 $27 = tempRet0;
 $28 = ($4|0)<(0);
 $29 = $28 << 31 >> 31;
 $30 = (___muldi3(($4|0),($29|0),($mul|0),($15|0))|0);
 $31 = tempRet0;
 $32 = ($5|0)<(0);
 $33 = $32 << 31 >> 31;
 $34 = (___muldi3(($5|0),($33|0),($mul|0),($15|0))|0);
 $35 = tempRet0;
 $36 = ($6|0)<(0);
 $37 = $36 << 31 >> 31;
 $38 = (___muldi3(($6|0),($37|0),($mul|0),($15|0))|0);
 $39 = tempRet0;
 $40 = ($7|0)<(0);
 $41 = $40 << 31 >> 31;
 $42 = (___muldi3(($7|0),($41|0),($mul|0),($15|0))|0);
 $43 = tempRet0;
 $44 = ($8|0)<(0);
 $45 = $44 << 31 >> 31;
 $46 = (___muldi3(($8|0),($45|0),($mul|0),($15|0))|0);
 $47 = tempRet0;
 $48 = ($9|0)<(0);
 $49 = $48 << 31 >> 31;
 $50 = (___muldi3(($9|0),($49|0),($mul|0),($15|0))|0);
 $51 = tempRet0;
 $52 = ($mul10|0)<(0);
 $53 = $52 << 31 >> 31;
 $54 = (___muldi3(($mul10|0),($53|0),($1|0),($17|0))|0);
 $55 = tempRet0;
 $56 = (___muldi3(($mul10|0),($53|0),($2|0),($21|0))|0);
 $57 = tempRet0;
 $58 = ($mul12|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($mul12|0),($59|0),($mul10|0),($53|0))|0);
 $61 = tempRet0;
 $62 = (___muldi3(($4|0),($29|0),($mul10|0),($53|0))|0);
 $63 = tempRet0;
 $64 = ($mul14|0)<(0);
 $65 = $64 << 31 >> 31;
 $66 = (___muldi3(($mul14|0),($65|0),($mul10|0),($53|0))|0);
 $67 = tempRet0;
 $68 = (___muldi3(($6|0),($37|0),($mul10|0),($53|0))|0);
 $69 = tempRet0;
 $70 = ($mul16|0)<(0);
 $71 = $70 << 31 >> 31;
 $72 = (___muldi3(($mul16|0),($71|0),($mul10|0),($53|0))|0);
 $73 = tempRet0;
 $74 = (___muldi3(($8|0),($45|0),($mul10|0),($53|0))|0);
 $75 = tempRet0;
 $76 = ($mul21|0)<(0);
 $77 = $76 << 31 >> 31;
 $78 = (___muldi3(($mul21|0),($77|0),($mul10|0),($53|0))|0);
 $79 = tempRet0;
 $80 = (___muldi3(($2|0),($21|0),($2|0),($21|0))|0);
 $81 = tempRet0;
 $82 = ($mul11|0)<(0);
 $83 = $82 << 31 >> 31;
 $84 = (___muldi3(($mul11|0),($83|0),($3|0),($25|0))|0);
 $85 = tempRet0;
 $86 = (___muldi3(($4|0),($29|0),($mul11|0),($83|0))|0);
 $87 = tempRet0;
 $88 = (___muldi3(($5|0),($33|0),($mul11|0),($83|0))|0);
 $89 = tempRet0;
 $90 = (___muldi3(($6|0),($37|0),($mul11|0),($83|0))|0);
 $91 = tempRet0;
 $92 = (___muldi3(($7|0),($41|0),($mul11|0),($83|0))|0);
 $93 = tempRet0;
 $94 = ($mul20|0)<(0);
 $95 = $94 << 31 >> 31;
 $96 = (___muldi3(($mul20|0),($95|0),($mul11|0),($83|0))|0);
 $97 = tempRet0;
 $98 = (___muldi3(($mul21|0),($77|0),($2|0),($21|0))|0);
 $99 = tempRet0;
 $100 = (___muldi3(($mul12|0),($59|0),($3|0),($25|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($mul12|0),($59|0),($4|0),($29|0))|0);
 $103 = tempRet0;
 $104 = (___muldi3(($mul14|0),($65|0),($mul12|0),($59|0))|0);
 $105 = tempRet0;
 $106 = (___muldi3(($6|0),($37|0),($mul12|0),($59|0))|0);
 $107 = tempRet0;
 $108 = ($mul19|0)<(0);
 $109 = $108 << 31 >> 31;
 $110 = (___muldi3(($mul19|0),($109|0),($mul12|0),($59|0))|0);
 $111 = tempRet0;
 $112 = (___muldi3(($mul20|0),($95|0),($mul12|0),($59|0))|0);
 $113 = tempRet0;
 $114 = (___muldi3(($mul21|0),($77|0),($mul12|0),($59|0))|0);
 $115 = tempRet0;
 $116 = (___muldi3(($4|0),($29|0),($4|0),($29|0))|0);
 $117 = tempRet0;
 $118 = ($mul13|0)<(0);
 $119 = $118 << 31 >> 31;
 $120 = (___muldi3(($mul13|0),($119|0),($5|0),($33|0))|0);
 $121 = tempRet0;
 $122 = ($mul18|0)<(0);
 $123 = $122 << 31 >> 31;
 $124 = (___muldi3(($mul18|0),($123|0),($mul13|0),($119|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($mul19|0),($109|0),($4|0),($29|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($mul20|0),($95|0),($mul13|0),($119|0))|0);
 $129 = tempRet0;
 $130 = (___muldi3(($mul21|0),($77|0),($4|0),($29|0))|0);
 $131 = tempRet0;
 $132 = ($mul17|0)<(0);
 $133 = $132 << 31 >> 31;
 $134 = (___muldi3(($mul17|0),($133|0),($5|0),($33|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($mul18|0),($123|0),($mul14|0),($65|0))|0);
 $137 = tempRet0;
 $138 = (___muldi3(($mul19|0),($109|0),($mul14|0),($65|0))|0);
 $139 = tempRet0;
 $140 = (___muldi3(($mul20|0),($95|0),($mul14|0),($65|0))|0);
 $141 = tempRet0;
 $142 = (___muldi3(($mul21|0),($77|0),($mul14|0),($65|0))|0);
 $143 = tempRet0;
 $144 = (___muldi3(($mul18|0),($123|0),($6|0),($37|0))|0);
 $145 = tempRet0;
 $146 = (___muldi3(($mul19|0),($109|0),($6|0),($37|0))|0);
 $147 = tempRet0;
 $148 = ($mul15|0)<(0);
 $149 = $148 << 31 >> 31;
 $150 = (___muldi3(($mul20|0),($95|0),($mul15|0),($149|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($mul21|0),($77|0),($6|0),($37|0))|0);
 $153 = tempRet0;
 $154 = (___muldi3(($mul19|0),($109|0),($7|0),($41|0))|0);
 $155 = tempRet0;
 $156 = (___muldi3(($mul20|0),($95|0),($mul16|0),($71|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($mul21|0),($77|0),($mul16|0),($71|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($mul20|0),($95|0),($8|0),($45|0))|0);
 $161 = tempRet0;
 $162 = (___muldi3(($mul21|0),($77|0),($8|0),($45|0))|0);
 $163 = tempRet0;
 $164 = (___muldi3(($mul21|0),($77|0),($9|0),($49|0))|0);
 $165 = tempRet0;
 $166 = (_i64Add(($134|0),($135|0),($12|0),($13|0))|0);
 $167 = tempRet0;
 $168 = (_i64Add(($166|0),($167|0),($124|0),($125|0))|0);
 $169 = tempRet0;
 $170 = (_i64Add(($168|0),($169|0),($110|0),($111|0))|0);
 $171 = tempRet0;
 $172 = (_i64Add(($170|0),($171|0),($96|0),($97|0))|0);
 $173 = tempRet0;
 $174 = (_i64Add(($172|0),($173|0),($78|0),($79|0))|0);
 $175 = tempRet0;
 $176 = (_i64Add(($136|0),($137|0),($18|0),($19|0))|0);
 $177 = tempRet0;
 $178 = (_i64Add(($176|0),($177|0),($126|0),($127|0))|0);
 $179 = tempRet0;
 $180 = (_i64Add(($178|0),($179|0),($112|0),($113|0))|0);
 $181 = tempRet0;
 $182 = (_i64Add(($180|0),($181|0),($98|0),($99|0))|0);
 $183 = tempRet0;
 $184 = (_i64Add(($22|0),($23|0),($54|0),($55|0))|0);
 $185 = tempRet0;
 $186 = (_i64Add(($184|0),($185|0),($144|0),($145|0))|0);
 $187 = tempRet0;
 $188 = (_i64Add(($186|0),($187|0),($138|0),($139|0))|0);
 $189 = tempRet0;
 $190 = (_i64Add(($188|0),($189|0),($128|0),($129|0))|0);
 $191 = tempRet0;
 $192 = (_i64Add(($190|0),($191|0),($114|0),($115|0))|0);
 $193 = tempRet0;
 $194 = (_i64Add(($26|0),($27|0),($56|0),($57|0))|0);
 $195 = tempRet0;
 $196 = (_i64Add(($194|0),($195|0),($146|0),($147|0))|0);
 $197 = tempRet0;
 $198 = (_i64Add(($196|0),($197|0),($140|0),($141|0))|0);
 $199 = tempRet0;
 $200 = (_i64Add(($198|0),($199|0),($130|0),($131|0))|0);
 $201 = tempRet0;
 $202 = (_i64Add(($60|0),($61|0),($80|0),($81|0))|0);
 $203 = tempRet0;
 $204 = (_i64Add(($202|0),($203|0),($30|0),($31|0))|0);
 $205 = tempRet0;
 $206 = (_i64Add(($204|0),($205|0),($154|0),($155|0))|0);
 $207 = tempRet0;
 $208 = (_i64Add(($206|0),($207|0),($150|0),($151|0))|0);
 $209 = tempRet0;
 $210 = (_i64Add(($208|0),($209|0),($142|0),($143|0))|0);
 $211 = tempRet0;
 $212 = (_i64Add(($62|0),($63|0),($84|0),($85|0))|0);
 $213 = tempRet0;
 $214 = (_i64Add(($212|0),($213|0),($34|0),($35|0))|0);
 $215 = tempRet0;
 $216 = (_i64Add(($214|0),($215|0),($156|0),($157|0))|0);
 $217 = tempRet0;
 $218 = (_i64Add(($216|0),($217|0),($152|0),($153|0))|0);
 $219 = tempRet0;
 $220 = (_i64Add(($100|0),($101|0),($86|0),($87|0))|0);
 $221 = tempRet0;
 $222 = (_i64Add(($220|0),($221|0),($66|0),($67|0))|0);
 $223 = tempRet0;
 $224 = (_i64Add(($222|0),($223|0),($38|0),($39|0))|0);
 $225 = tempRet0;
 $226 = (_i64Add(($224|0),($225|0),($160|0),($161|0))|0);
 $227 = tempRet0;
 $228 = (_i64Add(($226|0),($227|0),($158|0),($159|0))|0);
 $229 = tempRet0;
 $230 = (_i64Add(($88|0),($89|0),($102|0),($103|0))|0);
 $231 = tempRet0;
 $232 = (_i64Add(($230|0),($231|0),($68|0),($69|0))|0);
 $233 = tempRet0;
 $234 = (_i64Add(($232|0),($233|0),($42|0),($43|0))|0);
 $235 = tempRet0;
 $236 = (_i64Add(($234|0),($235|0),($162|0),($163|0))|0);
 $237 = tempRet0;
 $238 = (_i64Add(($90|0),($91|0),($116|0),($117|0))|0);
 $239 = tempRet0;
 $240 = (_i64Add(($238|0),($239|0),($104|0),($105|0))|0);
 $241 = tempRet0;
 $242 = (_i64Add(($240|0),($241|0),($72|0),($73|0))|0);
 $243 = tempRet0;
 $244 = (_i64Add(($242|0),($243|0),($46|0),($47|0))|0);
 $245 = tempRet0;
 $246 = (_i64Add(($244|0),($245|0),($164|0),($165|0))|0);
 $247 = tempRet0;
 $248 = (_i64Add(($106|0),($107|0),($120|0),($121|0))|0);
 $249 = tempRet0;
 $250 = (_i64Add(($248|0),($249|0),($92|0),($93|0))|0);
 $251 = tempRet0;
 $252 = (_i64Add(($250|0),($251|0),($74|0),($75|0))|0);
 $253 = tempRet0;
 $254 = (_i64Add(($252|0),($253|0),($50|0),($51|0))|0);
 $255 = tempRet0;
 $256 = (_bitshift64Shl(($174|0),($175|0),1)|0);
 $257 = tempRet0;
 $258 = (_bitshift64Shl(($182|0),($183|0),1)|0);
 $259 = tempRet0;
 $260 = (_bitshift64Shl(($192|0),($193|0),1)|0);
 $261 = tempRet0;
 $262 = (_bitshift64Shl(($200|0),($201|0),1)|0);
 $263 = tempRet0;
 $264 = (_bitshift64Shl(($210|0),($211|0),1)|0);
 $265 = tempRet0;
 $266 = (_bitshift64Shl(($218|0),($219|0),1)|0);
 $267 = tempRet0;
 $268 = (_bitshift64Shl(($228|0),($229|0),1)|0);
 $269 = tempRet0;
 $270 = (_bitshift64Shl(($236|0),($237|0),1)|0);
 $271 = tempRet0;
 $272 = (_bitshift64Shl(($246|0),($247|0),1)|0);
 $273 = tempRet0;
 $274 = (_bitshift64Shl(($254|0),($255|0),1)|0);
 $275 = tempRet0;
 $276 = (_i64Add(($256|0),($257|0),33554432,0)|0);
 $277 = tempRet0;
 $278 = (_bitshift64Ashr(($276|0),($277|0),26)|0);
 $279 = tempRet0;
 $280 = (_i64Add(($278|0),($279|0),($258|0),($259|0))|0);
 $281 = tempRet0;
 $282 = (_bitshift64Shl(($278|0),($279|0),26)|0);
 $283 = tempRet0;
 $284 = (_i64Subtract(($256|0),($257|0),($282|0),($283|0))|0);
 $285 = tempRet0;
 $286 = (_i64Add(($264|0),($265|0),33554432,0)|0);
 $287 = tempRet0;
 $288 = (_bitshift64Ashr(($286|0),($287|0),26)|0);
 $289 = tempRet0;
 $290 = (_i64Add(($288|0),($289|0),($266|0),($267|0))|0);
 $291 = tempRet0;
 $292 = (_bitshift64Shl(($288|0),($289|0),26)|0);
 $293 = tempRet0;
 $294 = (_i64Subtract(($264|0),($265|0),($292|0),($293|0))|0);
 $295 = tempRet0;
 $296 = (_i64Add(($280|0),($281|0),16777216,0)|0);
 $297 = tempRet0;
 $298 = (_bitshift64Ashr(($296|0),($297|0),25)|0);
 $299 = tempRet0;
 $300 = (_i64Add(($298|0),($299|0),($260|0),($261|0))|0);
 $301 = tempRet0;
 $302 = (_bitshift64Shl(($298|0),($299|0),25)|0);
 $303 = tempRet0;
 $304 = (_i64Subtract(($280|0),($281|0),($302|0),($303|0))|0);
 $305 = tempRet0;
 $306 = (_i64Add(($290|0),($291|0),16777216,0)|0);
 $307 = tempRet0;
 $308 = (_bitshift64Ashr(($306|0),($307|0),25)|0);
 $309 = tempRet0;
 $310 = (_i64Add(($308|0),($309|0),($268|0),($269|0))|0);
 $311 = tempRet0;
 $312 = (_bitshift64Shl(($308|0),($309|0),25)|0);
 $313 = tempRet0;
 $314 = (_i64Subtract(($290|0),($291|0),($312|0),($313|0))|0);
 $315 = tempRet0;
 $316 = (_i64Add(($300|0),($301|0),33554432,0)|0);
 $317 = tempRet0;
 $318 = (_bitshift64Ashr(($316|0),($317|0),26)|0);
 $319 = tempRet0;
 $320 = (_i64Add(($318|0),($319|0),($262|0),($263|0))|0);
 $321 = tempRet0;
 $322 = (_bitshift64Shl(($318|0),($319|0),26)|0);
 $323 = tempRet0;
 $324 = (_i64Subtract(($300|0),($301|0),($322|0),($323|0))|0);
 $325 = tempRet0;
 $326 = (_i64Add(($310|0),($311|0),33554432,0)|0);
 $327 = tempRet0;
 $328 = (_bitshift64Ashr(($326|0),($327|0),26)|0);
 $329 = tempRet0;
 $330 = (_i64Add(($328|0),($329|0),($270|0),($271|0))|0);
 $331 = tempRet0;
 $332 = (_bitshift64Shl(($328|0),($329|0),26)|0);
 $333 = tempRet0;
 $334 = (_i64Subtract(($310|0),($311|0),($332|0),($333|0))|0);
 $335 = tempRet0;
 $336 = (_i64Add(($320|0),($321|0),16777216,0)|0);
 $337 = tempRet0;
 $338 = (_bitshift64Ashr(($336|0),($337|0),25)|0);
 $339 = tempRet0;
 $340 = (_i64Add(($338|0),($339|0),($294|0),($295|0))|0);
 $341 = tempRet0;
 $342 = (_bitshift64Shl(($338|0),($339|0),25)|0);
 $343 = tempRet0;
 $344 = (_i64Subtract(($320|0),($321|0),($342|0),($343|0))|0);
 $345 = tempRet0;
 $346 = (_i64Add(($330|0),($331|0),16777216,0)|0);
 $347 = tempRet0;
 $348 = (_bitshift64Ashr(($346|0),($347|0),25)|0);
 $349 = tempRet0;
 $350 = (_i64Add(($348|0),($349|0),($272|0),($273|0))|0);
 $351 = tempRet0;
 $352 = (_bitshift64Shl(($348|0),($349|0),25)|0);
 $353 = tempRet0;
 $354 = (_i64Subtract(($330|0),($331|0),($352|0),($353|0))|0);
 $355 = tempRet0;
 $356 = (_i64Add(($340|0),($341|0),33554432,0)|0);
 $357 = tempRet0;
 $358 = (_bitshift64Ashr(($356|0),($357|0),26)|0);
 $359 = tempRet0;
 $360 = (_i64Add(($314|0),($315|0),($358|0),($359|0))|0);
 $361 = tempRet0;
 $362 = (_bitshift64Shl(($358|0),($359|0),26)|0);
 $363 = tempRet0;
 $364 = (_i64Subtract(($340|0),($341|0),($362|0),($363|0))|0);
 $365 = tempRet0;
 $366 = (_i64Add(($350|0),($351|0),33554432,0)|0);
 $367 = tempRet0;
 $368 = (_bitshift64Ashr(($366|0),($367|0),26)|0);
 $369 = tempRet0;
 $370 = (_i64Add(($368|0),($369|0),($274|0),($275|0))|0);
 $371 = tempRet0;
 $372 = (_bitshift64Shl(($368|0),($369|0),26)|0);
 $373 = tempRet0;
 $374 = (_i64Subtract(($350|0),($351|0),($372|0),($373|0))|0);
 $375 = tempRet0;
 $376 = (_i64Add(($370|0),($371|0),16777216,0)|0);
 $377 = tempRet0;
 $378 = (_bitshift64Ashr(($376|0),($377|0),25)|0);
 $379 = tempRet0;
 $380 = (___muldi3(($378|0),($379|0),19,0)|0);
 $381 = tempRet0;
 $382 = (_i64Add(($380|0),($381|0),($284|0),($285|0))|0);
 $383 = tempRet0;
 $384 = (_bitshift64Shl(($378|0),($379|0),25)|0);
 $385 = tempRet0;
 $386 = (_i64Subtract(($370|0),($371|0),($384|0),($385|0))|0);
 $387 = tempRet0;
 $388 = (_i64Add(($382|0),($383|0),33554432,0)|0);
 $389 = tempRet0;
 $390 = (_bitshift64Ashr(($388|0),($389|0),26)|0);
 $391 = tempRet0;
 $392 = (_i64Add(($304|0),($305|0),($390|0),($391|0))|0);
 $393 = tempRet0;
 $394 = (_bitshift64Shl(($390|0),($391|0),26)|0);
 $395 = tempRet0;
 $396 = (_i64Subtract(($382|0),($383|0),($394|0),($395|0))|0);
 $397 = tempRet0;
 HEAP32[$h>>2] = $396;
 $arrayidx301 = ((($h)) + 4|0);
 HEAP32[$arrayidx301>>2] = $392;
 $arrayidx303 = ((($h)) + 8|0);
 HEAP32[$arrayidx303>>2] = $324;
 $arrayidx305 = ((($h)) + 12|0);
 HEAP32[$arrayidx305>>2] = $344;
 $arrayidx307 = ((($h)) + 16|0);
 HEAP32[$arrayidx307>>2] = $364;
 $arrayidx309 = ((($h)) + 20|0);
 HEAP32[$arrayidx309>>2] = $360;
 $arrayidx311 = ((($h)) + 24|0);
 HEAP32[$arrayidx311>>2] = $334;
 $arrayidx313 = ((($h)) + 28|0);
 HEAP32[$arrayidx313>>2] = $354;
 $arrayidx315 = ((($h)) + 32|0);
 HEAP32[$arrayidx315>>2] = $374;
 $arrayidx317 = ((($h)) + 36|0);
 HEAP32[$arrayidx317>>2] = $386;
 return;
}
function _crypto_sign_ed25519_ref10_fe_sq($h,$f) {
 $h = $h|0;
 $f = $f|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arrayidx1 = 0, $arrayidx2 = 0;
 var $arrayidx291 = 0, $arrayidx293 = 0, $arrayidx295 = 0, $arrayidx297 = 0, $arrayidx299 = 0, $arrayidx3 = 0, $arrayidx301 = 0, $arrayidx303 = 0, $arrayidx305 = 0, $arrayidx307 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $mul = 0, $mul10 = 0, $mul11 = 0, $mul12 = 0;
 var $mul13 = 0, $mul14 = 0, $mul15 = 0, $mul16 = 0, $mul17 = 0, $mul18 = 0, $mul19 = 0, $mul20 = 0, $mul21 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $mul = $0 << 1;
 $mul10 = $1 << 1;
 $mul11 = $2 << 1;
 $mul12 = $3 << 1;
 $mul13 = $4 << 1;
 $mul14 = $5 << 1;
 $mul15 = $6 << 1;
 $mul16 = $7 << 1;
 $mul17 = ($5*38)|0;
 $mul18 = ($6*19)|0;
 $mul19 = ($7*38)|0;
 $mul20 = ($8*19)|0;
 $mul21 = ($9*38)|0;
 $10 = ($0|0)<(0);
 $11 = $10 << 31 >> 31;
 $12 = (___muldi3(($0|0),($11|0),($0|0),($11|0))|0);
 $13 = tempRet0;
 $14 = ($mul|0)<(0);
 $15 = $14 << 31 >> 31;
 $16 = ($1|0)<(0);
 $17 = $16 << 31 >> 31;
 $18 = (___muldi3(($mul|0),($15|0),($1|0),($17|0))|0);
 $19 = tempRet0;
 $20 = ($2|0)<(0);
 $21 = $20 << 31 >> 31;
 $22 = (___muldi3(($2|0),($21|0),($mul|0),($15|0))|0);
 $23 = tempRet0;
 $24 = ($3|0)<(0);
 $25 = $24 << 31 >> 31;
 $26 = (___muldi3(($3|0),($25|0),($mul|0),($15|0))|0);
 $27 = tempRet0;
 $28 = ($4|0)<(0);
 $29 = $28 << 31 >> 31;
 $30 = (___muldi3(($4|0),($29|0),($mul|0),($15|0))|0);
 $31 = tempRet0;
 $32 = ($5|0)<(0);
 $33 = $32 << 31 >> 31;
 $34 = (___muldi3(($5|0),($33|0),($mul|0),($15|0))|0);
 $35 = tempRet0;
 $36 = ($6|0)<(0);
 $37 = $36 << 31 >> 31;
 $38 = (___muldi3(($6|0),($37|0),($mul|0),($15|0))|0);
 $39 = tempRet0;
 $40 = ($7|0)<(0);
 $41 = $40 << 31 >> 31;
 $42 = (___muldi3(($7|0),($41|0),($mul|0),($15|0))|0);
 $43 = tempRet0;
 $44 = ($8|0)<(0);
 $45 = $44 << 31 >> 31;
 $46 = (___muldi3(($8|0),($45|0),($mul|0),($15|0))|0);
 $47 = tempRet0;
 $48 = ($9|0)<(0);
 $49 = $48 << 31 >> 31;
 $50 = (___muldi3(($9|0),($49|0),($mul|0),($15|0))|0);
 $51 = tempRet0;
 $52 = ($mul10|0)<(0);
 $53 = $52 << 31 >> 31;
 $54 = (___muldi3(($mul10|0),($53|0),($1|0),($17|0))|0);
 $55 = tempRet0;
 $56 = (___muldi3(($mul10|0),($53|0),($2|0),($21|0))|0);
 $57 = tempRet0;
 $58 = ($mul12|0)<(0);
 $59 = $58 << 31 >> 31;
 $60 = (___muldi3(($mul12|0),($59|0),($mul10|0),($53|0))|0);
 $61 = tempRet0;
 $62 = (___muldi3(($4|0),($29|0),($mul10|0),($53|0))|0);
 $63 = tempRet0;
 $64 = ($mul14|0)<(0);
 $65 = $64 << 31 >> 31;
 $66 = (___muldi3(($mul14|0),($65|0),($mul10|0),($53|0))|0);
 $67 = tempRet0;
 $68 = (___muldi3(($6|0),($37|0),($mul10|0),($53|0))|0);
 $69 = tempRet0;
 $70 = ($mul16|0)<(0);
 $71 = $70 << 31 >> 31;
 $72 = (___muldi3(($mul16|0),($71|0),($mul10|0),($53|0))|0);
 $73 = tempRet0;
 $74 = (___muldi3(($8|0),($45|0),($mul10|0),($53|0))|0);
 $75 = tempRet0;
 $76 = ($mul21|0)<(0);
 $77 = $76 << 31 >> 31;
 $78 = (___muldi3(($mul21|0),($77|0),($mul10|0),($53|0))|0);
 $79 = tempRet0;
 $80 = (___muldi3(($2|0),($21|0),($2|0),($21|0))|0);
 $81 = tempRet0;
 $82 = ($mul11|0)<(0);
 $83 = $82 << 31 >> 31;
 $84 = (___muldi3(($mul11|0),($83|0),($3|0),($25|0))|0);
 $85 = tempRet0;
 $86 = (___muldi3(($4|0),($29|0),($mul11|0),($83|0))|0);
 $87 = tempRet0;
 $88 = (___muldi3(($5|0),($33|0),($mul11|0),($83|0))|0);
 $89 = tempRet0;
 $90 = (___muldi3(($6|0),($37|0),($mul11|0),($83|0))|0);
 $91 = tempRet0;
 $92 = (___muldi3(($7|0),($41|0),($mul11|0),($83|0))|0);
 $93 = tempRet0;
 $94 = ($mul20|0)<(0);
 $95 = $94 << 31 >> 31;
 $96 = (___muldi3(($mul20|0),($95|0),($mul11|0),($83|0))|0);
 $97 = tempRet0;
 $98 = (___muldi3(($mul21|0),($77|0),($2|0),($21|0))|0);
 $99 = tempRet0;
 $100 = (___muldi3(($mul12|0),($59|0),($3|0),($25|0))|0);
 $101 = tempRet0;
 $102 = (___muldi3(($mul12|0),($59|0),($4|0),($29|0))|0);
 $103 = tempRet0;
 $104 = (___muldi3(($mul14|0),($65|0),($mul12|0),($59|0))|0);
 $105 = tempRet0;
 $106 = (___muldi3(($6|0),($37|0),($mul12|0),($59|0))|0);
 $107 = tempRet0;
 $108 = ($mul19|0)<(0);
 $109 = $108 << 31 >> 31;
 $110 = (___muldi3(($mul19|0),($109|0),($mul12|0),($59|0))|0);
 $111 = tempRet0;
 $112 = (___muldi3(($mul20|0),($95|0),($mul12|0),($59|0))|0);
 $113 = tempRet0;
 $114 = (___muldi3(($mul21|0),($77|0),($mul12|0),($59|0))|0);
 $115 = tempRet0;
 $116 = (___muldi3(($4|0),($29|0),($4|0),($29|0))|0);
 $117 = tempRet0;
 $118 = ($mul13|0)<(0);
 $119 = $118 << 31 >> 31;
 $120 = (___muldi3(($mul13|0),($119|0),($5|0),($33|0))|0);
 $121 = tempRet0;
 $122 = ($mul18|0)<(0);
 $123 = $122 << 31 >> 31;
 $124 = (___muldi3(($mul18|0),($123|0),($mul13|0),($119|0))|0);
 $125 = tempRet0;
 $126 = (___muldi3(($mul19|0),($109|0),($4|0),($29|0))|0);
 $127 = tempRet0;
 $128 = (___muldi3(($mul20|0),($95|0),($mul13|0),($119|0))|0);
 $129 = tempRet0;
 $130 = (___muldi3(($mul21|0),($77|0),($4|0),($29|0))|0);
 $131 = tempRet0;
 $132 = ($mul17|0)<(0);
 $133 = $132 << 31 >> 31;
 $134 = (___muldi3(($mul17|0),($133|0),($5|0),($33|0))|0);
 $135 = tempRet0;
 $136 = (___muldi3(($mul18|0),($123|0),($mul14|0),($65|0))|0);
 $137 = tempRet0;
 $138 = (___muldi3(($mul19|0),($109|0),($mul14|0),($65|0))|0);
 $139 = tempRet0;
 $140 = (___muldi3(($mul20|0),($95|0),($mul14|0),($65|0))|0);
 $141 = tempRet0;
 $142 = (___muldi3(($mul21|0),($77|0),($mul14|0),($65|0))|0);
 $143 = tempRet0;
 $144 = (___muldi3(($mul18|0),($123|0),($6|0),($37|0))|0);
 $145 = tempRet0;
 $146 = (___muldi3(($mul19|0),($109|0),($6|0),($37|0))|0);
 $147 = tempRet0;
 $148 = ($mul15|0)<(0);
 $149 = $148 << 31 >> 31;
 $150 = (___muldi3(($mul20|0),($95|0),($mul15|0),($149|0))|0);
 $151 = tempRet0;
 $152 = (___muldi3(($mul21|0),($77|0),($6|0),($37|0))|0);
 $153 = tempRet0;
 $154 = (___muldi3(($mul19|0),($109|0),($7|0),($41|0))|0);
 $155 = tempRet0;
 $156 = (___muldi3(($mul20|0),($95|0),($mul16|0),($71|0))|0);
 $157 = tempRet0;
 $158 = (___muldi3(($mul21|0),($77|0),($mul16|0),($71|0))|0);
 $159 = tempRet0;
 $160 = (___muldi3(($mul20|0),($95|0),($8|0),($45|0))|0);
 $161 = tempRet0;
 $162 = (___muldi3(($mul21|0),($77|0),($8|0),($45|0))|0);
 $163 = tempRet0;
 $164 = (___muldi3(($mul21|0),($77|0),($9|0),($49|0))|0);
 $165 = tempRet0;
 $166 = (_i64Add(($134|0),($135|0),($12|0),($13|0))|0);
 $167 = tempRet0;
 $168 = (_i64Add(($166|0),($167|0),($124|0),($125|0))|0);
 $169 = tempRet0;
 $170 = (_i64Add(($168|0),($169|0),($110|0),($111|0))|0);
 $171 = tempRet0;
 $172 = (_i64Add(($170|0),($171|0),($96|0),($97|0))|0);
 $173 = tempRet0;
 $174 = (_i64Add(($172|0),($173|0),($78|0),($79|0))|0);
 $175 = tempRet0;
 $176 = (_i64Add(($22|0),($23|0),($54|0),($55|0))|0);
 $177 = tempRet0;
 $178 = (_i64Add(($26|0),($27|0),($56|0),($57|0))|0);
 $179 = tempRet0;
 $180 = (_i64Add(($60|0),($61|0),($80|0),($81|0))|0);
 $181 = tempRet0;
 $182 = (_i64Add(($180|0),($181|0),($30|0),($31|0))|0);
 $183 = tempRet0;
 $184 = (_i64Add(($182|0),($183|0),($154|0),($155|0))|0);
 $185 = tempRet0;
 $186 = (_i64Add(($184|0),($185|0),($150|0),($151|0))|0);
 $187 = tempRet0;
 $188 = (_i64Add(($186|0),($187|0),($142|0),($143|0))|0);
 $189 = tempRet0;
 $190 = (_i64Add(($174|0),($175|0),33554432,0)|0);
 $191 = tempRet0;
 $192 = (_bitshift64Ashr(($190|0),($191|0),26)|0);
 $193 = tempRet0;
 $194 = (_i64Add(($136|0),($137|0),($18|0),($19|0))|0);
 $195 = tempRet0;
 $196 = (_i64Add(($194|0),($195|0),($126|0),($127|0))|0);
 $197 = tempRet0;
 $198 = (_i64Add(($196|0),($197|0),($112|0),($113|0))|0);
 $199 = tempRet0;
 $200 = (_i64Add(($198|0),($199|0),($98|0),($99|0))|0);
 $201 = tempRet0;
 $202 = (_i64Add(($200|0),($201|0),($192|0),($193|0))|0);
 $203 = tempRet0;
 $204 = (_bitshift64Shl(($192|0),($193|0),26)|0);
 $205 = tempRet0;
 $206 = (_i64Subtract(($174|0),($175|0),($204|0),($205|0))|0);
 $207 = tempRet0;
 $208 = (_i64Add(($188|0),($189|0),33554432,0)|0);
 $209 = tempRet0;
 $210 = (_bitshift64Ashr(($208|0),($209|0),26)|0);
 $211 = tempRet0;
 $212 = (_i64Add(($62|0),($63|0),($84|0),($85|0))|0);
 $213 = tempRet0;
 $214 = (_i64Add(($212|0),($213|0),($34|0),($35|0))|0);
 $215 = tempRet0;
 $216 = (_i64Add(($214|0),($215|0),($156|0),($157|0))|0);
 $217 = tempRet0;
 $218 = (_i64Add(($216|0),($217|0),($152|0),($153|0))|0);
 $219 = tempRet0;
 $220 = (_i64Add(($218|0),($219|0),($210|0),($211|0))|0);
 $221 = tempRet0;
 $222 = (_bitshift64Shl(($210|0),($211|0),26)|0);
 $223 = tempRet0;
 $224 = (_i64Subtract(($188|0),($189|0),($222|0),($223|0))|0);
 $225 = tempRet0;
 $226 = (_i64Add(($202|0),($203|0),16777216,0)|0);
 $227 = tempRet0;
 $228 = (_bitshift64Ashr(($226|0),($227|0),25)|0);
 $229 = tempRet0;
 $230 = (_i64Add(($176|0),($177|0),($144|0),($145|0))|0);
 $231 = tempRet0;
 $232 = (_i64Add(($230|0),($231|0),($138|0),($139|0))|0);
 $233 = tempRet0;
 $234 = (_i64Add(($232|0),($233|0),($128|0),($129|0))|0);
 $235 = tempRet0;
 $236 = (_i64Add(($234|0),($235|0),($114|0),($115|0))|0);
 $237 = tempRet0;
 $238 = (_i64Add(($236|0),($237|0),($228|0),($229|0))|0);
 $239 = tempRet0;
 $240 = (_bitshift64Shl(($228|0),($229|0),25)|0);
 $241 = tempRet0;
 $242 = (_i64Subtract(($202|0),($203|0),($240|0),($241|0))|0);
 $243 = tempRet0;
 $244 = (_i64Add(($220|0),($221|0),16777216,0)|0);
 $245 = tempRet0;
 $246 = (_bitshift64Ashr(($244|0),($245|0),25)|0);
 $247 = tempRet0;
 $248 = (_i64Add(($100|0),($101|0),($86|0),($87|0))|0);
 $249 = tempRet0;
 $250 = (_i64Add(($248|0),($249|0),($66|0),($67|0))|0);
 $251 = tempRet0;
 $252 = (_i64Add(($250|0),($251|0),($38|0),($39|0))|0);
 $253 = tempRet0;
 $254 = (_i64Add(($252|0),($253|0),($160|0),($161|0))|0);
 $255 = tempRet0;
 $256 = (_i64Add(($254|0),($255|0),($158|0),($159|0))|0);
 $257 = tempRet0;
 $258 = (_i64Add(($256|0),($257|0),($246|0),($247|0))|0);
 $259 = tempRet0;
 $260 = (_bitshift64Shl(($246|0),($247|0),25)|0);
 $261 = tempRet0;
 $262 = (_i64Subtract(($220|0),($221|0),($260|0),($261|0))|0);
 $263 = tempRet0;
 $264 = (_i64Add(($238|0),($239|0),33554432,0)|0);
 $265 = tempRet0;
 $266 = (_bitshift64Ashr(($264|0),($265|0),26)|0);
 $267 = tempRet0;
 $268 = (_i64Add(($178|0),($179|0),($146|0),($147|0))|0);
 $269 = tempRet0;
 $270 = (_i64Add(($268|0),($269|0),($140|0),($141|0))|0);
 $271 = tempRet0;
 $272 = (_i64Add(($270|0),($271|0),($130|0),($131|0))|0);
 $273 = tempRet0;
 $274 = (_i64Add(($272|0),($273|0),($266|0),($267|0))|0);
 $275 = tempRet0;
 $276 = (_bitshift64Shl(($266|0),($267|0),26)|0);
 $277 = tempRet0;
 $278 = (_i64Subtract(($238|0),($239|0),($276|0),($277|0))|0);
 $279 = tempRet0;
 $280 = (_i64Add(($258|0),($259|0),33554432,0)|0);
 $281 = tempRet0;
 $282 = (_bitshift64Ashr(($280|0),($281|0),26)|0);
 $283 = tempRet0;
 $284 = (_i64Add(($88|0),($89|0),($102|0),($103|0))|0);
 $285 = tempRet0;
 $286 = (_i64Add(($284|0),($285|0),($68|0),($69|0))|0);
 $287 = tempRet0;
 $288 = (_i64Add(($286|0),($287|0),($42|0),($43|0))|0);
 $289 = tempRet0;
 $290 = (_i64Add(($288|0),($289|0),($162|0),($163|0))|0);
 $291 = tempRet0;
 $292 = (_i64Add(($290|0),($291|0),($282|0),($283|0))|0);
 $293 = tempRet0;
 $294 = (_bitshift64Shl(($282|0),($283|0),26)|0);
 $295 = tempRet0;
 $296 = (_i64Subtract(($258|0),($259|0),($294|0),($295|0))|0);
 $297 = tempRet0;
 $298 = (_i64Add(($274|0),($275|0),16777216,0)|0);
 $299 = tempRet0;
 $300 = (_bitshift64Ashr(($298|0),($299|0),25)|0);
 $301 = tempRet0;
 $302 = (_i64Add(($300|0),($301|0),($224|0),($225|0))|0);
 $303 = tempRet0;
 $304 = (_bitshift64Shl(($300|0),($301|0),25)|0);
 $305 = tempRet0;
 $306 = (_i64Subtract(($274|0),($275|0),($304|0),($305|0))|0);
 $307 = tempRet0;
 $308 = (_i64Add(($292|0),($293|0),16777216,0)|0);
 $309 = tempRet0;
 $310 = (_bitshift64Ashr(($308|0),($309|0),25)|0);
 $311 = tempRet0;
 $312 = (_i64Add(($90|0),($91|0),($116|0),($117|0))|0);
 $313 = tempRet0;
 $314 = (_i64Add(($312|0),($313|0),($104|0),($105|0))|0);
 $315 = tempRet0;
 $316 = (_i64Add(($314|0),($315|0),($72|0),($73|0))|0);
 $317 = tempRet0;
 $318 = (_i64Add(($316|0),($317|0),($46|0),($47|0))|0);
 $319 = tempRet0;
 $320 = (_i64Add(($318|0),($319|0),($164|0),($165|0))|0);
 $321 = tempRet0;
 $322 = (_i64Add(($320|0),($321|0),($310|0),($311|0))|0);
 $323 = tempRet0;
 $324 = (_bitshift64Shl(($310|0),($311|0),25)|0);
 $325 = tempRet0;
 $326 = (_i64Subtract(($292|0),($293|0),($324|0),($325|0))|0);
 $327 = tempRet0;
 $328 = (_i64Add(($302|0),($303|0),33554432,0)|0);
 $329 = tempRet0;
 $330 = (_bitshift64Ashr(($328|0),($329|0),26)|0);
 $331 = tempRet0;
 $332 = (_i64Add(($262|0),($263|0),($330|0),($331|0))|0);
 $333 = tempRet0;
 $334 = (_bitshift64Shl(($330|0),($331|0),26)|0);
 $335 = tempRet0;
 $336 = (_i64Subtract(($302|0),($303|0),($334|0),($335|0))|0);
 $337 = tempRet0;
 $338 = (_i64Add(($322|0),($323|0),33554432,0)|0);
 $339 = tempRet0;
 $340 = (_bitshift64Ashr(($338|0),($339|0),26)|0);
 $341 = tempRet0;
 $342 = (_i64Add(($106|0),($107|0),($120|0),($121|0))|0);
 $343 = tempRet0;
 $344 = (_i64Add(($342|0),($343|0),($92|0),($93|0))|0);
 $345 = tempRet0;
 $346 = (_i64Add(($344|0),($345|0),($74|0),($75|0))|0);
 $347 = tempRet0;
 $348 = (_i64Add(($346|0),($347|0),($50|0),($51|0))|0);
 $349 = tempRet0;
 $350 = (_i64Add(($348|0),($349|0),($340|0),($341|0))|0);
 $351 = tempRet0;
 $352 = (_bitshift64Shl(($340|0),($341|0),26)|0);
 $353 = tempRet0;
 $354 = (_i64Subtract(($322|0),($323|0),($352|0),($353|0))|0);
 $355 = tempRet0;
 $356 = (_i64Add(($350|0),($351|0),16777216,0)|0);
 $357 = tempRet0;
 $358 = (_bitshift64Ashr(($356|0),($357|0),25)|0);
 $359 = tempRet0;
 $360 = (___muldi3(($358|0),($359|0),19,0)|0);
 $361 = tempRet0;
 $362 = (_i64Add(($360|0),($361|0),($206|0),($207|0))|0);
 $363 = tempRet0;
 $364 = (_bitshift64Shl(($358|0),($359|0),25)|0);
 $365 = tempRet0;
 $366 = (_i64Subtract(($350|0),($351|0),($364|0),($365|0))|0);
 $367 = tempRet0;
 $368 = (_i64Add(($362|0),($363|0),33554432,0)|0);
 $369 = tempRet0;
 $370 = (_bitshift64Ashr(($368|0),($369|0),26)|0);
 $371 = tempRet0;
 $372 = (_i64Add(($242|0),($243|0),($370|0),($371|0))|0);
 $373 = tempRet0;
 $374 = (_bitshift64Shl(($370|0),($371|0),26)|0);
 $375 = tempRet0;
 $376 = (_i64Subtract(($362|0),($363|0),($374|0),($375|0))|0);
 $377 = tempRet0;
 HEAP32[$h>>2] = $376;
 $arrayidx291 = ((($h)) + 4|0);
 HEAP32[$arrayidx291>>2] = $372;
 $arrayidx293 = ((($h)) + 8|0);
 HEAP32[$arrayidx293>>2] = $278;
 $arrayidx295 = ((($h)) + 12|0);
 HEAP32[$arrayidx295>>2] = $306;
 $arrayidx297 = ((($h)) + 16|0);
 HEAP32[$arrayidx297>>2] = $336;
 $arrayidx299 = ((($h)) + 20|0);
 HEAP32[$arrayidx299>>2] = $332;
 $arrayidx301 = ((($h)) + 24|0);
 HEAP32[$arrayidx301>>2] = $296;
 $arrayidx303 = ((($h)) + 28|0);
 HEAP32[$arrayidx303>>2] = $326;
 $arrayidx305 = ((($h)) + 32|0);
 HEAP32[$arrayidx305>>2] = $354;
 $arrayidx307 = ((($h)) + 36|0);
 HEAP32[$arrayidx307>>2] = $366;
 return;
}
function _crypto_sign_ed25519_ref10_fe_sub($h,$f,$g) {
 $h = $h|0;
 $f = $f|0;
 $g = $g|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $arrayidx1 = 0, $arrayidx11 = 0, $arrayidx12 = 0, $arrayidx13 = 0, $arrayidx14 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx18 = 0, $arrayidx19 = 0, $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx30 = 0, $arrayidx31 = 0, $arrayidx32 = 0, $arrayidx33 = 0, $arrayidx34 = 0, $arrayidx35 = 0, $arrayidx36 = 0, $arrayidx37 = 0;
 var $arrayidx38 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0, $arrayidx7 = 0, $arrayidx8 = 0, $arrayidx9 = 0, $sub = 0, $sub20 = 0, $sub21 = 0, $sub22 = 0, $sub23 = 0, $sub24 = 0, $sub25 = 0, $sub26 = 0, $sub27 = 0, $sub28 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$f>>2]|0;
 $arrayidx1 = ((($f)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($f)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($f)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($f)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($f)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($f)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($f)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($f)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($f)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $10 = HEAP32[$g>>2]|0;
 $arrayidx11 = ((($g)) + 4|0);
 $11 = HEAP32[$arrayidx11>>2]|0;
 $arrayidx12 = ((($g)) + 8|0);
 $12 = HEAP32[$arrayidx12>>2]|0;
 $arrayidx13 = ((($g)) + 12|0);
 $13 = HEAP32[$arrayidx13>>2]|0;
 $arrayidx14 = ((($g)) + 16|0);
 $14 = HEAP32[$arrayidx14>>2]|0;
 $arrayidx15 = ((($g)) + 20|0);
 $15 = HEAP32[$arrayidx15>>2]|0;
 $arrayidx16 = ((($g)) + 24|0);
 $16 = HEAP32[$arrayidx16>>2]|0;
 $arrayidx17 = ((($g)) + 28|0);
 $17 = HEAP32[$arrayidx17>>2]|0;
 $arrayidx18 = ((($g)) + 32|0);
 $18 = HEAP32[$arrayidx18>>2]|0;
 $arrayidx19 = ((($g)) + 36|0);
 $19 = HEAP32[$arrayidx19>>2]|0;
 $sub = (($0) - ($10))|0;
 $sub20 = (($1) - ($11))|0;
 $sub21 = (($2) - ($12))|0;
 $sub22 = (($3) - ($13))|0;
 $sub23 = (($4) - ($14))|0;
 $sub24 = (($5) - ($15))|0;
 $sub25 = (($6) - ($16))|0;
 $sub26 = (($7) - ($17))|0;
 $sub27 = (($8) - ($18))|0;
 $sub28 = (($9) - ($19))|0;
 HEAP32[$h>>2] = $sub;
 $arrayidx30 = ((($h)) + 4|0);
 HEAP32[$arrayidx30>>2] = $sub20;
 $arrayidx31 = ((($h)) + 8|0);
 HEAP32[$arrayidx31>>2] = $sub21;
 $arrayidx32 = ((($h)) + 12|0);
 HEAP32[$arrayidx32>>2] = $sub22;
 $arrayidx33 = ((($h)) + 16|0);
 HEAP32[$arrayidx33>>2] = $sub23;
 $arrayidx34 = ((($h)) + 20|0);
 HEAP32[$arrayidx34>>2] = $sub24;
 $arrayidx35 = ((($h)) + 24|0);
 HEAP32[$arrayidx35>>2] = $sub25;
 $arrayidx36 = ((($h)) + 28|0);
 HEAP32[$arrayidx36>>2] = $sub26;
 $arrayidx37 = ((($h)) + 32|0);
 HEAP32[$arrayidx37>>2] = $sub27;
 $arrayidx38 = ((($h)) + 36|0);
 HEAP32[$arrayidx38>>2] = $sub28;
 return;
}
function _crypto_sign_ed25519_ref10_fe_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $add = 0, $add10 = 0, $add12 = 0, $add14 = 0, $add16 = 0, $add18 = 0, $add20 = 0, $add22 = 0, $add24 = 0, $add26 = 0;
 var $add28 = 0, $add31 = 0, $add33 = 0, $add35 = 0, $add39 = 0, $add43 = 0, $add47 = 0, $add51 = 0, $add55 = 0, $add59 = 0, $add63 = 0, $arrayidx1 = 0, $arrayidx102 = 0, $arrayidx105 = 0, $arrayidx108 = 0, $arrayidx113 = 0, $arrayidx116 = 0, $arrayidx119 = 0, $arrayidx122 = 0, $arrayidx125 = 0;
 var $arrayidx128 = 0, $arrayidx131 = 0, $arrayidx136 = 0, $arrayidx139 = 0, $arrayidx142 = 0, $arrayidx147 = 0, $arrayidx150 = 0, $arrayidx153 = 0, $arrayidx158 = 0, $arrayidx161 = 0, $arrayidx164 = 0, $arrayidx169 = 0, $arrayidx172 = 0, $arrayidx175 = 0, $arrayidx178 = 0, $arrayidx2 = 0, $arrayidx3 = 0, $arrayidx4 = 0, $arrayidx5 = 0, $arrayidx6 = 0;
 var $arrayidx7 = 0, $arrayidx73 = 0, $arrayidx76 = 0, $arrayidx8 = 0, $arrayidx80 = 0, $arrayidx83 = 0, $arrayidx86 = 0, $arrayidx9 = 0, $arrayidx91 = 0, $arrayidx94 = 0, $arrayidx97 = 0, $conv = 0, $conv101 = 0, $conv104 = 0, $conv107 = 0, $conv112 = 0, $conv115 = 0, $conv118 = 0, $conv121 = 0, $conv124 = 0;
 var $conv127 = 0, $conv130 = 0, $conv135 = 0, $conv138 = 0, $conv141 = 0, $conv146 = 0, $conv149 = 0, $conv152 = 0, $conv157 = 0, $conv160 = 0, $conv163 = 0, $conv168 = 0, $conv171 = 0, $conv174 = 0, $conv177 = 0, $conv72 = 0, $conv75 = 0, $conv79 = 0, $conv82 = 0, $conv85 = 0;
 var $conv90 = 0, $conv93 = 0, $conv96 = 0, $mul = 0, $mul30 = 0, $or = 0, $or100 = 0, $or111 = 0, $or134 = 0, $or145 = 0, $or156 = 0, $or167 = 0, $or89 = 0, $shl = 0, $shl110 = 0, $shl133 = 0, $shl144 = 0, $shl155 = 0, $shl166 = 0, $shl36 = 0;
 var $shl40 = 0, $shl44 = 0, $shl48 = 0, $shl52 = 0, $shl56 = 0, $shl60 = 0, $shl64 = 0, $shl78 = 0, $shl88 = 0, $shl99 = 0, $shr = 0, $shr103162 = 0, $shr106163 = 0, $shr109164 = 0, $shr11 = 0, $shr114165 = 0, $shr117166 = 0, $shr120167 = 0, $shr126168 = 0, $shr129169 = 0;
 var $shr13 = 0, $shr132170 = 0, $shr137171 = 0, $shr140172 = 0, $shr143173 = 0, $shr148174 = 0, $shr15 = 0, $shr151175 = 0, $shr154176 = 0, $shr159177 = 0, $shr162178 = 0, $shr165179 = 0, $shr17 = 0, $shr170180 = 0, $shr173181 = 0, $shr176182 = 0, $shr19 = 0, $shr21 = 0, $shr23 = 0, $shr25 = 0;
 var $shr27 = 0, $shr29 = 0, $shr32 = 0, $shr34 = 0, $shr38 = 0, $shr42 = 0, $shr46 = 0, $shr50 = 0, $shr54 = 0, $shr58 = 0, $shr62 = 0, $shr71153 = 0, $shr74154 = 0, $shr77155 = 0, $shr81156 = 0, $shr84157 = 0, $shr87158 = 0, $shr92159 = 0, $shr95160 = 0, $shr98161 = 0;
 var $sub = 0, $sub37 = 0, $sub41 = 0, $sub45 = 0, $sub49 = 0, $sub53 = 0, $sub57 = 0, $sub61 = 0, $sub65 = 0, $sub68 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$h>>2]|0;
 $arrayidx1 = ((($h)) + 4|0);
 $1 = HEAP32[$arrayidx1>>2]|0;
 $arrayidx2 = ((($h)) + 8|0);
 $2 = HEAP32[$arrayidx2>>2]|0;
 $arrayidx3 = ((($h)) + 12|0);
 $3 = HEAP32[$arrayidx3>>2]|0;
 $arrayidx4 = ((($h)) + 16|0);
 $4 = HEAP32[$arrayidx4>>2]|0;
 $arrayidx5 = ((($h)) + 20|0);
 $5 = HEAP32[$arrayidx5>>2]|0;
 $arrayidx6 = ((($h)) + 24|0);
 $6 = HEAP32[$arrayidx6>>2]|0;
 $arrayidx7 = ((($h)) + 28|0);
 $7 = HEAP32[$arrayidx7>>2]|0;
 $arrayidx8 = ((($h)) + 32|0);
 $8 = HEAP32[$arrayidx8>>2]|0;
 $arrayidx9 = ((($h)) + 36|0);
 $9 = HEAP32[$arrayidx9>>2]|0;
 $mul = ($9*19)|0;
 $add = (($mul) + 16777216)|0;
 $shr = $add >> 25;
 $add10 = (($shr) + ($0))|0;
 $shr11 = $add10 >> 26;
 $add12 = (($shr11) + ($1))|0;
 $shr13 = $add12 >> 25;
 $add14 = (($shr13) + ($2))|0;
 $shr15 = $add14 >> 26;
 $add16 = (($shr15) + ($3))|0;
 $shr17 = $add16 >> 25;
 $add18 = (($shr17) + ($4))|0;
 $shr19 = $add18 >> 26;
 $add20 = (($shr19) + ($5))|0;
 $shr21 = $add20 >> 25;
 $add22 = (($shr21) + ($6))|0;
 $shr23 = $add22 >> 26;
 $add24 = (($shr23) + ($7))|0;
 $shr25 = $add24 >> 25;
 $add26 = (($shr25) + ($8))|0;
 $shr27 = $add26 >> 26;
 $add28 = (($shr27) + ($9))|0;
 $shr29 = $add28 >> 25;
 $mul30 = ($shr29*19)|0;
 $add31 = (($mul30) + ($0))|0;
 $shr32 = $add31 >> 26;
 $add33 = (($shr32) + ($1))|0;
 $shl = $shr32 << 26;
 $sub = (($add31) - ($shl))|0;
 $shr34 = $add33 >> 25;
 $add35 = (($shr34) + ($2))|0;
 $shl36 = $shr34 << 25;
 $sub37 = (($add33) - ($shl36))|0;
 $shr38 = $add35 >> 26;
 $add39 = (($shr38) + ($3))|0;
 $shl40 = $shr38 << 26;
 $sub41 = (($add35) - ($shl40))|0;
 $shr42 = $add39 >> 25;
 $add43 = (($shr42) + ($4))|0;
 $shl44 = $shr42 << 25;
 $sub45 = (($add39) - ($shl44))|0;
 $shr46 = $add43 >> 26;
 $add47 = (($shr46) + ($5))|0;
 $shl48 = $shr46 << 26;
 $sub49 = (($add43) - ($shl48))|0;
 $shr50 = $add47 >> 25;
 $add51 = (($shr50) + ($6))|0;
 $shl52 = $shr50 << 25;
 $sub53 = (($add47) - ($shl52))|0;
 $shr54 = $add51 >> 26;
 $add55 = (($shr54) + ($7))|0;
 $shl56 = $shr54 << 26;
 $sub57 = (($add51) - ($shl56))|0;
 $shr58 = $add55 >> 25;
 $add59 = (($shr58) + ($8))|0;
 $shl60 = $shr58 << 25;
 $sub61 = (($add55) - ($shl60))|0;
 $shr62 = $add59 >> 26;
 $add63 = (($shr62) + ($9))|0;
 $shl64 = $shr62 << 26;
 $sub65 = (($add59) - ($shl64))|0;
 $sub68 = $add63 & 33554431;
 $conv = $sub&255;
 HEAP8[$s>>0] = $conv;
 $shr71153 = $sub >>> 8;
 $conv72 = $shr71153&255;
 $arrayidx73 = ((($s)) + 1|0);
 HEAP8[$arrayidx73>>0] = $conv72;
 $shr74154 = $sub >>> 16;
 $conv75 = $shr74154&255;
 $arrayidx76 = ((($s)) + 2|0);
 HEAP8[$arrayidx76>>0] = $conv75;
 $shr77155 = $sub >>> 24;
 $shl78 = $sub37 << 2;
 $or = $shl78 | $shr77155;
 $conv79 = $or&255;
 $arrayidx80 = ((($s)) + 3|0);
 HEAP8[$arrayidx80>>0] = $conv79;
 $shr81156 = $sub37 >>> 6;
 $conv82 = $shr81156&255;
 $arrayidx83 = ((($s)) + 4|0);
 HEAP8[$arrayidx83>>0] = $conv82;
 $shr84157 = $sub37 >>> 14;
 $conv85 = $shr84157&255;
 $arrayidx86 = ((($s)) + 5|0);
 HEAP8[$arrayidx86>>0] = $conv85;
 $shr87158 = $sub37 >>> 22;
 $shl88 = $sub41 << 3;
 $or89 = $shl88 | $shr87158;
 $conv90 = $or89&255;
 $arrayidx91 = ((($s)) + 6|0);
 HEAP8[$arrayidx91>>0] = $conv90;
 $shr92159 = $sub41 >>> 5;
 $conv93 = $shr92159&255;
 $arrayidx94 = ((($s)) + 7|0);
 HEAP8[$arrayidx94>>0] = $conv93;
 $shr95160 = $sub41 >>> 13;
 $conv96 = $shr95160&255;
 $arrayidx97 = ((($s)) + 8|0);
 HEAP8[$arrayidx97>>0] = $conv96;
 $shr98161 = $sub41 >>> 21;
 $shl99 = $sub45 << 5;
 $or100 = $shl99 | $shr98161;
 $conv101 = $or100&255;
 $arrayidx102 = ((($s)) + 9|0);
 HEAP8[$arrayidx102>>0] = $conv101;
 $shr103162 = $sub45 >>> 3;
 $conv104 = $shr103162&255;
 $arrayidx105 = ((($s)) + 10|0);
 HEAP8[$arrayidx105>>0] = $conv104;
 $shr106163 = $sub45 >>> 11;
 $conv107 = $shr106163&255;
 $arrayidx108 = ((($s)) + 11|0);
 HEAP8[$arrayidx108>>0] = $conv107;
 $shr109164 = $sub45 >>> 19;
 $shl110 = $sub49 << 6;
 $or111 = $shl110 | $shr109164;
 $conv112 = $or111&255;
 $arrayidx113 = ((($s)) + 12|0);
 HEAP8[$arrayidx113>>0] = $conv112;
 $shr114165 = $sub49 >>> 2;
 $conv115 = $shr114165&255;
 $arrayidx116 = ((($s)) + 13|0);
 HEAP8[$arrayidx116>>0] = $conv115;
 $shr117166 = $sub49 >>> 10;
 $conv118 = $shr117166&255;
 $arrayidx119 = ((($s)) + 14|0);
 HEAP8[$arrayidx119>>0] = $conv118;
 $shr120167 = $sub49 >>> 18;
 $conv121 = $shr120167&255;
 $arrayidx122 = ((($s)) + 15|0);
 HEAP8[$arrayidx122>>0] = $conv121;
 $conv124 = $sub53&255;
 $arrayidx125 = ((($s)) + 16|0);
 HEAP8[$arrayidx125>>0] = $conv124;
 $shr126168 = $sub53 >>> 8;
 $conv127 = $shr126168&255;
 $arrayidx128 = ((($s)) + 17|0);
 HEAP8[$arrayidx128>>0] = $conv127;
 $shr129169 = $sub53 >>> 16;
 $conv130 = $shr129169&255;
 $arrayidx131 = ((($s)) + 18|0);
 HEAP8[$arrayidx131>>0] = $conv130;
 $shr132170 = $sub53 >>> 24;
 $shl133 = $sub57 << 1;
 $or134 = $shl133 | $shr132170;
 $conv135 = $or134&255;
 $arrayidx136 = ((($s)) + 19|0);
 HEAP8[$arrayidx136>>0] = $conv135;
 $shr137171 = $sub57 >>> 7;
 $conv138 = $shr137171&255;
 $arrayidx139 = ((($s)) + 20|0);
 HEAP8[$arrayidx139>>0] = $conv138;
 $shr140172 = $sub57 >>> 15;
 $conv141 = $shr140172&255;
 $arrayidx142 = ((($s)) + 21|0);
 HEAP8[$arrayidx142>>0] = $conv141;
 $shr143173 = $sub57 >>> 23;
 $shl144 = $sub61 << 3;
 $or145 = $shl144 | $shr143173;
 $conv146 = $or145&255;
 $arrayidx147 = ((($s)) + 22|0);
 HEAP8[$arrayidx147>>0] = $conv146;
 $shr148174 = $sub61 >>> 5;
 $conv149 = $shr148174&255;
 $arrayidx150 = ((($s)) + 23|0);
 HEAP8[$arrayidx150>>0] = $conv149;
 $shr151175 = $sub61 >>> 13;
 $conv152 = $shr151175&255;
 $arrayidx153 = ((($s)) + 24|0);
 HEAP8[$arrayidx153>>0] = $conv152;
 $shr154176 = $sub61 >>> 21;
 $shl155 = $sub65 << 4;
 $or156 = $shl155 | $shr154176;
 $conv157 = $or156&255;
 $arrayidx158 = ((($s)) + 25|0);
 HEAP8[$arrayidx158>>0] = $conv157;
 $shr159177 = $sub65 >>> 4;
 $conv160 = $shr159177&255;
 $arrayidx161 = ((($s)) + 26|0);
 HEAP8[$arrayidx161>>0] = $conv160;
 $shr162178 = $sub65 >>> 12;
 $conv163 = $shr162178&255;
 $arrayidx164 = ((($s)) + 27|0);
 HEAP8[$arrayidx164>>0] = $conv163;
 $shr165179 = $sub65 >>> 20;
 $shl166 = $sub68 << 6;
 $or167 = $shr165179 | $shl166;
 $conv168 = $or167&255;
 $arrayidx169 = ((($s)) + 28|0);
 HEAP8[$arrayidx169>>0] = $conv168;
 $shr170180 = $add63 >>> 2;
 $conv171 = $shr170180&255;
 $arrayidx172 = ((($s)) + 29|0);
 HEAP8[$arrayidx172>>0] = $conv171;
 $shr173181 = $add63 >>> 10;
 $conv174 = $shr173181&255;
 $arrayidx175 = ((($s)) + 30|0);
 HEAP8[$arrayidx175>>0] = $conv174;
 $shr176182 = $sub68 >>> 18;
 $conv177 = $shr176182&255;
 $arrayidx178 = ((($s)) + 31|0);
 HEAP8[$arrayidx178>>0] = $conv177;
 return;
}
function _crypto_sign_ed25519_ref10_ge_add($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $arraydecay1 = 0, $arraydecay10 = 0, $arraydecay18 = 0, $arraydecay19 = 0, $arraydecay20 = 0, $arraydecay22 = 0, $arraydecay26 = 0, $arraydecay28 = 0, $arraydecay5 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $arraydecay1 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($r,$arraydecay1,$p);
 $arraydecay5 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay5,$arraydecay1,$p);
 $arraydecay10 = ((($r)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay10,$r,$q);
 $arraydecay18 = ((($q)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay5,$arraydecay5,$arraydecay18);
 $arraydecay19 = ((($r)) + 120|0);
 $arraydecay20 = ((($q)) + 120|0);
 $arraydecay22 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay19,$arraydecay20,$arraydecay22);
 $arraydecay26 = ((($p)) + 80|0);
 $arraydecay28 = ((($q)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($r,$arraydecay26,$arraydecay28);
 _crypto_sign_ed25519_ref10_fe_add($t0,$r,$r);
 _crypto_sign_ed25519_ref10_fe_sub($r,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay5,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay10,$t0,$arraydecay19);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay19,$t0,$arraydecay19);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_double_scalarmult_vartime($r,$a,$A,$b) {
 $r = $r|0;
 $a = $a|0;
 $A = $A|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $A2 = 0, $Ai = 0, $arrayidx11 = 0, $arrayidx13 = 0, $arrayidx15 = 0, $arrayidx16 = 0, $arrayidx17 = 0, $arrayidx24 = 0;
 var $arrayidx3 = 0, $arrayidx31 = 0, $arrayidx40 = 0, $arrayidx43 = 0, $arrayidx5 = 0, $arrayidx51 = 0, $arrayidx62 = 0, $arrayidx7 = 0, $arrayidx9 = 0, $aslide = 0, $bslide = 0, $cmp = 0, $cmp21 = 0, $cmp2118 = 0, $cmp26 = 0, $cmp34 = 0, $cmp45 = 0, $cmp55 = 0, $dec = 0, $dec66 = 0;
 var $div = 0, $div39 = 0, $div50 = 0, $div61 = 0, $i$0$lcssa = 0, $i$020 = 0, $i$119 = 0, $t = 0, $tobool = 0, $tobool19 = 0, $u = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 2272|0;
 $aslide = sp + 2016|0;
 $bslide = sp + 1760|0;
 $Ai = sp + 480|0;
 $t = sp + 320|0;
 $u = sp + 160|0;
 $A2 = sp;
 _slide($aslide,$a);
 _slide($bslide,$b);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($Ai,$A);
 _crypto_sign_ed25519_ref10_ge_p3_dbl($t,$A);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($A2,$t);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$Ai);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx3 = ((($Ai)) + 160|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx3,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx3);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx5 = ((($Ai)) + 320|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx5,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx5);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx7 = ((($Ai)) + 480|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx7,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx7);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx9 = ((($Ai)) + 640|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx9,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx9);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx11 = ((($Ai)) + 800|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx11,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx11);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx13 = ((($Ai)) + 960|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx13,$u);
 _crypto_sign_ed25519_ref10_ge_add($t,$A2,$arrayidx13);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
 $arrayidx15 = ((($Ai)) + 1120|0);
 _crypto_sign_ed25519_ref10_ge_p3_to_cached($arrayidx15,$u);
 _crypto_sign_ed25519_ref10_ge_p2_0($r);
 $i$020 = 255;
 while(1) {
  $arrayidx16 = (($aslide) + ($i$020)|0);
  $0 = HEAP8[$arrayidx16>>0]|0;
  $tobool = ($0<<24>>24)==(0);
  if (!($tobool)) {
   $i$0$lcssa = $i$020;
   break;
  }
  $arrayidx17 = (($bslide) + ($i$020)|0);
  $1 = HEAP8[$arrayidx17>>0]|0;
  $tobool19 = ($1<<24>>24)==(0);
  if (!($tobool19)) {
   $i$0$lcssa = $i$020;
   break;
  }
  $dec = (($i$020) + -1)|0;
  $cmp = ($i$020|0)>(0);
  if ($cmp) {
   $i$020 = $dec;
  } else {
   $i$0$lcssa = $dec;
   break;
  }
 }
 $cmp2118 = ($i$0$lcssa|0)>(-1);
 if ($cmp2118) {
  $i$119 = $i$0$lcssa;
 } else {
  STACKTOP = sp;return;
 }
 while(1) {
  _crypto_sign_ed25519_ref10_ge_p2_dbl($t,$r);
  $arrayidx24 = (($aslide) + ($i$119)|0);
  $2 = HEAP8[$arrayidx24>>0]|0;
  $cmp26 = ($2<<24>>24)>(0);
  if ($cmp26) {
   _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
   $3 = HEAP8[$arrayidx24>>0]|0;
   $4 = (($3<<24>>24) / 2)&-1;
   $div = $4 << 24 >> 24;
   $arrayidx31 = (($Ai) + (($div*160)|0)|0);
   _crypto_sign_ed25519_ref10_ge_add($t,$u,$arrayidx31);
  } else {
   $cmp34 = ($2<<24>>24)<(0);
   if ($cmp34) {
    _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
    $5 = HEAP8[$arrayidx24>>0]|0;
    $6 = (($5<<24>>24) / -2)&-1;
    $div39 = $6 << 24 >> 24;
    $arrayidx40 = (($Ai) + (($div39*160)|0)|0);
    _crypto_sign_ed25519_ref10_ge_sub($t,$u,$arrayidx40);
   }
  }
  $arrayidx43 = (($bslide) + ($i$119)|0);
  $7 = HEAP8[$arrayidx43>>0]|0;
  $cmp45 = ($7<<24>>24)>(0);
  if ($cmp45) {
   _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
   $8 = HEAP8[$arrayidx43>>0]|0;
   $9 = (($8<<24>>24) / 2)&-1;
   $div50 = $9 << 24 >> 24;
   $arrayidx51 = (712 + (($div50*120)|0)|0);
   _crypto_sign_ed25519_ref10_ge_madd($t,$u,$arrayidx51);
  } else {
   $cmp55 = ($7<<24>>24)<(0);
   if ($cmp55) {
    _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($u,$t);
    $10 = HEAP8[$arrayidx43>>0]|0;
    $11 = (($10<<24>>24) / -2)&-1;
    $div61 = $11 << 24 >> 24;
    $arrayidx62 = (712 + (($div61*120)|0)|0);
    _crypto_sign_ed25519_ref10_ge_msub($t,$u,$arrayidx62);
   }
  }
  _crypto_sign_ed25519_ref10_ge_p1p1_to_p2($r,$t);
  $dec66 = (($i$119) + -1)|0;
  $cmp21 = ($i$119|0)>(0);
  if ($cmp21) {
   $i$119 = $dec66;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _slide($r,$a) {
 $r = $r|0;
 $a = $a|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $add = 0, $add25 = 0, $and = 0, $and2 = 0, $arrayidx = 0, $arrayidx17 = 0, $arrayidx4 = 0, $arrayidx61 = 0, $arrayidx9 = 0, $b$052 = 0, $cmp11 = 0, $cmp13 = 0, $cmp26 = 0, $cmp45 = 0, $cmp58 = 0;
 var $conv = 0, $conv21 = 0, $conv24 = 0, $conv3 = 0, $conv36 = 0, $conv55 = 0, $exitcond = 0, $exitcond58 = 0, $i$056 = 0, $i$153 = 0, $inc = 0, $inc67 = 0, $inc74 = 0, $inc78 = 0, $k$051 = 0, $shl = 0, $shr = 0, $shr1 = 0, $sub = 0, $tobool = 0;
 var $tobool18 = 0, $tobool62 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $i$056 = 0;
 while(1) {
  $shr = $i$056 >> 3;
  $arrayidx = (($a) + ($shr)|0);
  $0 = HEAP8[$arrayidx>>0]|0;
  $conv = $0&255;
  $and = $i$056 & 7;
  $shr1 = $conv >>> $and;
  $and2 = $shr1 & 1;
  $conv3 = $and2&255;
  $arrayidx4 = (($r) + ($i$056)|0);
  HEAP8[$arrayidx4>>0] = $conv3;
  $inc = (($i$056) + 1)|0;
  $exitcond58 = ($inc|0)==(256);
  if ($exitcond58) {
   $i$153 = 0;
   break;
  } else {
   $i$056 = $inc;
  }
 }
 while(1) {
  $arrayidx9 = (($r) + ($i$153)|0);
  $1 = HEAP8[$arrayidx9>>0]|0;
  $tobool = ($1<<24>>24)==(0);
  L5: do {
   if (!($tobool)) {
    $b$052 = 1;
    while(1) {
     $add = (($b$052) + ($i$153))|0;
     $cmp13 = ($add|0)<(256);
     if (!($cmp13)) {
      break L5;
     }
     $arrayidx17 = (($r) + ($add)|0);
     $2 = HEAP8[$arrayidx17>>0]|0;
     $tobool18 = ($2<<24>>24)==(0);
     L9: do {
      if (!($tobool18)) {
       $3 = HEAP8[$arrayidx9>>0]|0;
       $conv21 = $3 << 24 >> 24;
       $conv24 = $2 << 24 >> 24;
       $shl = $conv24 << $b$052;
       $add25 = (($conv21) + ($shl))|0;
       $cmp26 = ($add25|0)<(16);
       if ($cmp26) {
        $conv36 = $add25&255;
        HEAP8[$arrayidx9>>0] = $conv36;
        HEAP8[$arrayidx17>>0] = 0;
        break;
       }
       $sub = (($conv21) - ($shl))|0;
       $cmp45 = ($sub|0)>(-16);
       if (!($cmp45)) {
        break L5;
       }
       $conv55 = $sub&255;
       HEAP8[$arrayidx9>>0] = $conv55;
       $k$051 = $add;
       while(1) {
        $arrayidx61 = (($r) + ($k$051)|0);
        $4 = HEAP8[$arrayidx61>>0]|0;
        $tobool62 = ($4<<24>>24)==(0);
        if ($tobool62) {
         break;
        }
        HEAP8[$arrayidx61>>0] = 0;
        $inc67 = (($k$051) + 1)|0;
        $cmp58 = ($inc67|0)<(256);
        if ($cmp58) {
         $k$051 = $inc67;
        } else {
         break L9;
        }
       }
       HEAP8[$arrayidx61>>0] = 1;
      }
     } while(0);
     $inc74 = (($b$052) + 1)|0;
     $cmp11 = ($inc74|0)<(7);
     if ($cmp11) {
      $b$052 = $inc74;
     } else {
      break;
     }
    }
   }
  } while(0);
  $inc78 = (($i$153) + 1)|0;
  $exitcond = ($inc78|0)==(256);
  if ($exitcond) {
   break;
  } else {
   $i$153 = $inc78;
  }
 }
 return;
}
function _crypto_sign_ed25519_ref10_ge_frombytes_negate_vartime($h,$s) {
 $h = $h|0;
 $s = $s|0;
 var $0 = 0, $arraydecay = 0, $arraydecay1 = 0, $arraydecay78 = 0, $arrayidx = 0, $call = 0, $call60 = 0, $call70 = 0, $check = 0, $cmp = 0, $conv = 0, $retval$0 = 0, $shr26 = 0, $tobool = 0, $tobool61 = 0, $u = 0, $v = 0, $v3 = 0, $vxx = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 208|0;
 $u = sp + 160|0;
 $v = sp + 120|0;
 $v3 = sp + 80|0;
 $vxx = sp + 40|0;
 $check = sp;
 $arraydecay = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_frombytes($arraydecay,$s);
 $arraydecay1 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay1);
 _crypto_sign_ed25519_ref10_fe_sq($u,$arraydecay);
 _crypto_sign_ed25519_ref10_fe_mul($v,$u,1672);
 _crypto_sign_ed25519_ref10_fe_sub($u,$u,$arraydecay1);
 _crypto_sign_ed25519_ref10_fe_add($v,$v,$arraydecay1);
 _crypto_sign_ed25519_ref10_fe_sq($v3,$v);
 _crypto_sign_ed25519_ref10_fe_mul($v3,$v3,$v);
 _crypto_sign_ed25519_ref10_fe_sq($h,$v3);
 _crypto_sign_ed25519_ref10_fe_mul($h,$h,$v);
 _crypto_sign_ed25519_ref10_fe_mul($h,$h,$u);
 _crypto_sign_ed25519_ref10_fe_pow22523($h,$h);
 _crypto_sign_ed25519_ref10_fe_mul($h,$h,$v3);
 _crypto_sign_ed25519_ref10_fe_mul($h,$h,$u);
 _crypto_sign_ed25519_ref10_fe_sq($vxx,$h);
 _crypto_sign_ed25519_ref10_fe_mul($vxx,$vxx,$v);
 _crypto_sign_ed25519_ref10_fe_sub($check,$vxx,$u);
 $call = (_crypto_sign_ed25519_ref10_fe_isnonzero($check)|0);
 $tobool = ($call|0)==(0);
 do {
  if (!($tobool)) {
   _crypto_sign_ed25519_ref10_fe_add($check,$vxx,$u);
   $call60 = (_crypto_sign_ed25519_ref10_fe_isnonzero($check)|0);
   $tobool61 = ($call60|0)==(0);
   if ($tobool61) {
    _crypto_sign_ed25519_ref10_fe_mul($h,$h,1712);
    break;
   } else {
    $retval$0 = -1;
    STACKTOP = sp;return ($retval$0|0);
   }
  }
 } while(0);
 $call70 = (_crypto_sign_ed25519_ref10_fe_isnegative($h)|0);
 $arrayidx = ((($s)) + 31|0);
 $0 = HEAP8[$arrayidx>>0]|0;
 $conv = $0&255;
 $shr26 = $conv >>> 7;
 $cmp = ($call70|0)==($shr26|0);
 if ($cmp) {
  _crypto_sign_ed25519_ref10_fe_neg($h,$h);
 }
 $arraydecay78 = ((($h)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay78,$h,$arraydecay);
 $retval$0 = 0;
 STACKTOP = sp;return ($retval$0|0);
}
function _crypto_sign_ed25519_ref10_ge_madd($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $arraydecay1 = 0, $arraydecay10 = 0, $arraydecay18 = 0, $arraydecay19 = 0, $arraydecay20 = 0, $arraydecay22 = 0, $arraydecay25 = 0, $arraydecay5 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $arraydecay1 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($r,$arraydecay1,$p);
 $arraydecay5 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay5,$arraydecay1,$p);
 $arraydecay10 = ((($r)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay10,$r,$q);
 $arraydecay18 = ((($q)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay5,$arraydecay5,$arraydecay18);
 $arraydecay19 = ((($r)) + 120|0);
 $arraydecay20 = ((($q)) + 80|0);
 $arraydecay22 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay19,$arraydecay20,$arraydecay22);
 $arraydecay25 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_add($t0,$arraydecay25,$arraydecay25);
 _crypto_sign_ed25519_ref10_fe_sub($r,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay5,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay10,$t0,$arraydecay19);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay19,$t0,$arraydecay19);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_msub($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $arraydecay1 = 0, $arraydecay10 = 0, $arraydecay13 = 0, $arraydecay19 = 0, $arraydecay20 = 0, $arraydecay22 = 0, $arraydecay25 = 0, $arraydecay5 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $arraydecay1 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($r,$arraydecay1,$p);
 $arraydecay5 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay5,$arraydecay1,$p);
 $arraydecay10 = ((($r)) + 80|0);
 $arraydecay13 = ((($q)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay10,$r,$arraydecay13);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay5,$arraydecay5,$q);
 $arraydecay19 = ((($r)) + 120|0);
 $arraydecay20 = ((($q)) + 80|0);
 $arraydecay22 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay19,$arraydecay20,$arraydecay22);
 $arraydecay25 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_add($t0,$arraydecay25,$arraydecay25);
 _crypto_sign_ed25519_ref10_fe_sub($r,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay5,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay10,$t0,$arraydecay19);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay19,$t0,$arraydecay19);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_p1p1_to_p2($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $arraydecay3 = 0, $arraydecay4 = 0, $arraydecay6 = 0, $arraydecay7 = 0, $arraydecay9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $arraydecay3 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($r,$p,$arraydecay3);
 $arraydecay4 = ((($r)) + 40|0);
 $arraydecay6 = ((($p)) + 40|0);
 $arraydecay7 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay4,$arraydecay6,$arraydecay7);
 $arraydecay9 = ((($r)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay9,$arraydecay7,$arraydecay3);
 return;
}
function _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $arraydecay15 = 0, $arraydecay3 = 0, $arraydecay4 = 0, $arraydecay6 = 0, $arraydecay7 = 0, $arraydecay9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $arraydecay3 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($r,$p,$arraydecay3);
 $arraydecay4 = ((($r)) + 40|0);
 $arraydecay6 = ((($p)) + 40|0);
 $arraydecay7 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay4,$arraydecay6,$arraydecay7);
 $arraydecay9 = ((($r)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay9,$arraydecay7,$arraydecay3);
 $arraydecay15 = ((($r)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay15,$p,$arraydecay6);
 return;
}
function _crypto_sign_ed25519_ref10_ge_p2_0($h) {
 $h = $h|0;
 var $arraydecay1 = 0, $arraydecay2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _crypto_sign_ed25519_ref10_fe_0($h);
 $arraydecay1 = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay1);
 $arraydecay2 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay2);
 return;
}
function _crypto_sign_ed25519_ref10_ge_p2_dbl($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $arraydecay3 = 0, $arraydecay4 = 0, $arraydecay5 = 0, $arraydecay7 = 0, $arraydecay9 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 _crypto_sign_ed25519_ref10_fe_sq($r,$p);
 $arraydecay3 = ((($r)) + 80|0);
 $arraydecay4 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sq($arraydecay3,$arraydecay4);
 $arraydecay5 = ((($r)) + 120|0);
 $arraydecay7 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_sq2($arraydecay5,$arraydecay7);
 $arraydecay9 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay9,$p,$arraydecay4);
 _crypto_sign_ed25519_ref10_fe_sq($t0,$arraydecay9);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay9,$arraydecay3,$r);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay3,$arraydecay3,$r);
 _crypto_sign_ed25519_ref10_fe_sub($r,$t0,$arraydecay9);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay5,$arraydecay5,$arraydecay3);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_p3_0($h) {
 $h = $h|0;
 var $arraydecay1 = 0, $arraydecay2 = 0, $arraydecay3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _crypto_sign_ed25519_ref10_fe_0($h);
 $arraydecay1 = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay1);
 $arraydecay2 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay2);
 $arraydecay3 = ((($h)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_0($arraydecay3);
 return;
}
function _crypto_sign_ed25519_ref10_ge_p3_dbl($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $q = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $q = sp;
 _crypto_sign_ed25519_ref10_ge_p3_to_p2($q,$p);
 _crypto_sign_ed25519_ref10_ge_p2_dbl($r,$q);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_p3_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $arraydecay1 = 0, $arraydecay6 = 0, $arrayidx = 0, $call = 0, $conv = 0, $conv10 = 0, $recip = 0, $shl = 0, $x = 0, $xor = 0, $y = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $recip = sp + 80|0;
 $x = sp + 40|0;
 $y = sp;
 $arraydecay1 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_invert($recip,$arraydecay1);
 _crypto_sign_ed25519_ref10_fe_mul($x,$h,$recip);
 $arraydecay6 = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($y,$arraydecay6,$recip);
 _crypto_sign_ed25519_ref10_fe_tobytes($s,$y);
 $call = (_crypto_sign_ed25519_ref10_fe_isnegative($x)|0);
 $shl = $call << 7;
 $arrayidx = ((($s)) + 31|0);
 $0 = HEAP8[$arrayidx>>0]|0;
 $conv = $0&255;
 $xor = $conv ^ $shl;
 $conv10 = $xor&255;
 HEAP8[$arrayidx>>0] = $conv10;
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_p3_to_cached($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $arraydecay1 = 0, $arraydecay10 = 0, $arraydecay11 = 0, $arraydecay12 = 0, $arraydecay3 = 0, $arraydecay8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $arraydecay1 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($r,$arraydecay1,$p);
 $arraydecay3 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay3,$arraydecay1,$p);
 $arraydecay8 = ((($r)) + 80|0);
 $arraydecay10 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_copy($arraydecay8,$arraydecay10);
 $arraydecay11 = ((($r)) + 120|0);
 $arraydecay12 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay11,$arraydecay12,1752);
 return;
}
function _crypto_sign_ed25519_ref10_ge_p3_to_p2($r,$p) {
 $r = $r|0;
 $p = $p|0;
 var $arraydecay3 = 0, $arraydecay5 = 0, $arraydecay6 = 0, $arraydecay8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _crypto_sign_ed25519_ref10_fe_copy($r,$p);
 $arraydecay3 = ((($r)) + 40|0);
 $arraydecay5 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_copy($arraydecay3,$arraydecay5);
 $arraydecay6 = ((($r)) + 80|0);
 $arraydecay8 = ((($p)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_copy($arraydecay6,$arraydecay8);
 return;
}
function _crypto_sign_ed25519_ref10_ge_precomp_0($h) {
 $h = $h|0;
 var $arraydecay1 = 0, $arraydecay2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _crypto_sign_ed25519_ref10_fe_1($h);
 $arraydecay1 = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_1($arraydecay1);
 $arraydecay2 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_0($arraydecay2);
 return;
}
function _crypto_sign_ed25519_ref10_ge_scalarmult_base($h,$a) {
 $h = $h|0;
 $a = $a|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $add18 = 0, $add37 = 0, $add45 = 0, $add54 = 0, $add9 = 0, $arrayidx = 0, $arrayidx10 = 0, $arrayidx16 = 0, $arrayidx2 = 0, $arrayidx35 = 0, $arrayidx43 = 0, $arrayidx52 = 0, $carry$036 = 0, $cmp40 = 0;
 var $cmp48 = 0, $conv1730 = 0, $conv30 = 0, $conv3629 = 0, $conv38 = 0, $div = 0, $div51 = 0, $e = 0, $exitcond = 0, $exitcond39 = 0, $i$038 = 0, $i$137 = 0, $i$235 = 0, $i$334 = 0, $inc = 0, $inc32 = 0, $mul = 0, $r = 0, $s = 0, $sext = 0;
 var $sext31 = 0, $shl = 0, $shr25 = 0, $shr533 = 0, $sub = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 464|0;
 $e = sp + 400|0;
 $r = sp + 240|0;
 $s = sp + 120|0;
 $t = sp;
 $i$038 = 0;
 while(1) {
  $arrayidx = (($a) + ($i$038)|0);
  $0 = HEAP8[$arrayidx>>0]|0;
  $1 = $0 & 15;
  $mul = $i$038 << 1;
  $arrayidx2 = (($e) + ($mul)|0);
  HEAP8[$arrayidx2>>0] = $1;
  $shr533 = ($0&255) >>> 4;
  $add9 = $mul | 1;
  $arrayidx10 = (($e) + ($add9)|0);
  HEAP8[$arrayidx10>>0] = $shr533;
  $inc = (($i$038) + 1)|0;
  $exitcond39 = ($inc|0)==(32);
  if ($exitcond39) {
   $carry$036 = 0;$i$137 = 0;
   break;
  } else {
   $i$038 = $inc;
  }
 }
 while(1) {
  $arrayidx16 = (($e) + ($i$137)|0);
  $2 = HEAP8[$arrayidx16>>0]|0;
  $conv1730 = $2&255;
  $add18 = (($conv1730) + ($carry$036))|0;
  $sext = $add18 << 24;
  $sext31 = (($sext) + 134217728)|0;
  $shr25 = $sext31 >> 28;
  $shl = $shr25 << 4;
  $sub = (($add18) - ($shl))|0;
  $conv30 = $sub&255;
  HEAP8[$arrayidx16>>0] = $conv30;
  $inc32 = (($i$137) + 1)|0;
  $exitcond = ($inc32|0)==(63);
  if ($exitcond) {
   break;
  } else {
   $carry$036 = $shr25;$i$137 = $inc32;
  }
 }
 $arrayidx35 = ((($e)) + 63|0);
 $3 = HEAP8[$arrayidx35>>0]|0;
 $conv3629 = $3&255;
 $add37 = (($conv3629) + ($shr25))|0;
 $conv38 = $add37&255;
 HEAP8[$arrayidx35>>0] = $conv38;
 _crypto_sign_ed25519_ref10_ge_p3_0($h);
 $i$235 = 1;
 while(1) {
  $div = (($i$235|0) / 2)&-1;
  $arrayidx43 = (($e) + ($i$235)|0);
  $4 = HEAP8[$arrayidx43>>0]|0;
  _select_67($t,$div,$4);
  _crypto_sign_ed25519_ref10_ge_madd($r,$h,$t);
  _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($h,$r);
  $add45 = (($i$235) + 2)|0;
  $cmp40 = ($add45|0)<(64);
  if ($cmp40) {
   $i$235 = $add45;
  } else {
   break;
  }
 }
 _crypto_sign_ed25519_ref10_ge_p3_dbl($r,$h);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p2($s,$r);
 _crypto_sign_ed25519_ref10_ge_p2_dbl($r,$s);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p2($s,$r);
 _crypto_sign_ed25519_ref10_ge_p2_dbl($r,$s);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p2($s,$r);
 _crypto_sign_ed25519_ref10_ge_p2_dbl($r,$s);
 _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($h,$r);
 $i$334 = 0;
 while(1) {
  $div51 = (($i$334|0) / 2)&-1;
  $arrayidx52 = (($e) + ($i$334)|0);
  $5 = HEAP8[$arrayidx52>>0]|0;
  _select_67($t,$div51,$5);
  _crypto_sign_ed25519_ref10_ge_madd($r,$h,$t);
  _crypto_sign_ed25519_ref10_ge_p1p1_to_p3($h,$r);
  $add54 = (($i$334) + 2)|0;
  $cmp48 = ($add54|0)<(64);
  if ($cmp48) {
   $i$334 = $add54;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _select_67($t,$pos,$b) {
 $t = $t|0;
 $pos = $pos|0;
 $b = $b|0;
 var $and = 0, $arraydecay28 = 0, $arraydecay30 = 0, $arraydecay33 = 0, $arraydecay35 = 0, $arrayidx11 = 0, $arrayidx14 = 0, $arrayidx17 = 0, $arrayidx20 = 0, $arrayidx23 = 0, $arrayidx26 = 0, $arrayidx5 = 0, $arrayidx8 = 0, $call = 0, $call12 = 0, $call15 = 0, $call18 = 0, $call21 = 0, $call24 = 0, $call27 = 0;
 var $call6 = 0, $call9 = 0, $conv = 0, $conv1 = 0, $conv4 = 0, $minust = 0, $shl = 0, $sub = 0, $sub3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $minust = sp;
 $call = (_negative($b)|0);
 $conv = $b << 24 >> 24;
 $conv1 = $call&255;
 $sub = (0 - ($conv1))|0;
 $and = $conv & $sub;
 $shl = $and << 1;
 $sub3 = (($conv) - ($shl))|0;
 $conv4 = $sub3&255;
 _crypto_sign_ed25519_ref10_ge_precomp_0($t);
 $arrayidx5 = (1792 + (($pos*960)|0)|0);
 $call6 = (_equal($conv4,1)|0);
 _cmov($t,$arrayidx5,$call6);
 $arrayidx8 = (((1792 + (($pos*960)|0)|0)) + 120|0);
 $call9 = (_equal($conv4,2)|0);
 _cmov($t,$arrayidx8,$call9);
 $arrayidx11 = (((1792 + (($pos*960)|0)|0)) + 240|0);
 $call12 = (_equal($conv4,3)|0);
 _cmov($t,$arrayidx11,$call12);
 $arrayidx14 = (((1792 + (($pos*960)|0)|0)) + 360|0);
 $call15 = (_equal($conv4,4)|0);
 _cmov($t,$arrayidx14,$call15);
 $arrayidx17 = (((1792 + (($pos*960)|0)|0)) + 480|0);
 $call18 = (_equal($conv4,5)|0);
 _cmov($t,$arrayidx17,$call18);
 $arrayidx20 = (((1792 + (($pos*960)|0)|0)) + 600|0);
 $call21 = (_equal($conv4,6)|0);
 _cmov($t,$arrayidx20,$call21);
 $arrayidx23 = (((1792 + (($pos*960)|0)|0)) + 720|0);
 $call24 = (_equal($conv4,7)|0);
 _cmov($t,$arrayidx23,$call24);
 $arrayidx26 = (((1792 + (($pos*960)|0)|0)) + 840|0);
 $call27 = (_equal($conv4,8)|0);
 _cmov($t,$arrayidx26,$call27);
 $arraydecay28 = ((($t)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_copy($minust,$arraydecay28);
 $arraydecay30 = ((($minust)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_copy($arraydecay30,$t);
 $arraydecay33 = ((($minust)) + 80|0);
 $arraydecay35 = ((($t)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_neg($arraydecay33,$arraydecay35);
 _cmov($t,$minust,$call);
 STACKTOP = sp;return;
}
function _negative($b) {
 $b = $b|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $b << 24 >> 24;
 $1 = ($0|0)<(0);
 $2 = $1 << 31 >> 31;
 $3 = (_bitshift64Lshr(($0|0),($2|0),63)|0);
 $4 = tempRet0;
 $5 = $3&255;
 return ($5|0);
}
function _equal($b,$c) {
 $b = $b|0;
 $c = $c|0;
 var $conv3 = 0, $conv4 = 0, $shr = 0, $sub = 0, $xor4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $xor4 = $c ^ $b;
 $conv3 = $xor4&255;
 $sub = (($conv3) + -1)|0;
 $shr = $sub >>> 31;
 $conv4 = $shr&255;
 return ($conv4|0);
}
function _cmov($t,$u,$b) {
 $t = $t|0;
 $u = $u|0;
 $b = $b|0;
 var $arraydecay3 = 0, $arraydecay5 = 0, $arraydecay7 = 0, $arraydecay9 = 0, $conv = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $conv = $b&255;
 _crypto_sign_ed25519_ref10_fe_cmov($t,$u,$conv);
 $arraydecay3 = ((($t)) + 40|0);
 $arraydecay5 = ((($u)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_cmov($arraydecay3,$arraydecay5,$conv);
 $arraydecay7 = ((($t)) + 80|0);
 $arraydecay9 = ((($u)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_cmov($arraydecay7,$arraydecay9,$conv);
 return;
}
function _crypto_sign_ed25519_ref10_ge_sub($r,$p,$q) {
 $r = $r|0;
 $p = $p|0;
 $q = $q|0;
 var $arraydecay1 = 0, $arraydecay10 = 0, $arraydecay13 = 0, $arraydecay19 = 0, $arraydecay20 = 0, $arraydecay22 = 0, $arraydecay26 = 0, $arraydecay28 = 0, $arraydecay5 = 0, $t0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $t0 = sp;
 $arraydecay1 = ((($p)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_add($r,$arraydecay1,$p);
 $arraydecay5 = ((($r)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay5,$arraydecay1,$p);
 $arraydecay10 = ((($r)) + 80|0);
 $arraydecay13 = ((($q)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay10,$r,$arraydecay13);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay5,$arraydecay5,$q);
 $arraydecay19 = ((($r)) + 120|0);
 $arraydecay20 = ((($q)) + 120|0);
 $arraydecay22 = ((($p)) + 120|0);
 _crypto_sign_ed25519_ref10_fe_mul($arraydecay19,$arraydecay20,$arraydecay22);
 $arraydecay26 = ((($p)) + 80|0);
 $arraydecay28 = ((($q)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_mul($r,$arraydecay26,$arraydecay28);
 _crypto_sign_ed25519_ref10_fe_add($t0,$r,$r);
 _crypto_sign_ed25519_ref10_fe_sub($r,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay5,$arraydecay10,$arraydecay5);
 _crypto_sign_ed25519_ref10_fe_sub($arraydecay10,$t0,$arraydecay19);
 _crypto_sign_ed25519_ref10_fe_add($arraydecay19,$t0,$arraydecay19);
 STACKTOP = sp;return;
}
function _crypto_sign_ed25519_ref10_ge_tobytes($s,$h) {
 $s = $s|0;
 $h = $h|0;
 var $0 = 0, $arraydecay1 = 0, $arraydecay6 = 0, $arrayidx = 0, $call = 0, $conv = 0, $conv10 = 0, $recip = 0, $shl = 0, $x = 0, $xor = 0, $y = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 128|0;
 $recip = sp + 80|0;
 $x = sp + 40|0;
 $y = sp;
 $arraydecay1 = ((($h)) + 80|0);
 _crypto_sign_ed25519_ref10_fe_invert($recip,$arraydecay1);
 _crypto_sign_ed25519_ref10_fe_mul($x,$h,$recip);
 $arraydecay6 = ((($h)) + 40|0);
 _crypto_sign_ed25519_ref10_fe_mul($y,$arraydecay6,$recip);
 _crypto_sign_ed25519_ref10_fe_tobytes($s,$y);
 $call = (_crypto_sign_ed25519_ref10_fe_isnegative($x)|0);
 $shl = $call << 7;
 $arrayidx = ((($s)) + 31|0);
 $0 = HEAP8[$arrayidx>>0]|0;
 $conv = $0&255;
 $xor = $conv ^ $shl;
 $conv10 = $xor&255;
 HEAP8[$arrayidx>>0] = $conv10;
 STACKTOP = sp;return;
}
function _crypto_sign_edwards25519sha512batch_ref10_open($m,$mlen,$sm,$0,$1,$pk) {
 $m = $m|0;
 $mlen = $mlen|0;
 $sm = $sm|0;
 $0 = $0|0;
 $1 = $1|0;
 $pk = $pk|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $A = 0, $R = 0, $add$ptr = 0, $add$ptr10 = 0;
 var $add$ptr24 = 0, $add$ptr26 = 0, $add$ptr27 = 0, $arrayidx = 0, $call = 0, $call20 = 0, $cmp21 = 0, $cmp3 = 0, $h = 0, $pkcopy = 0, $rcheck = 0, $rcopy = 0, $retval$0 = 0, $scopy = 0, $tobool = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 480|0;
 $pkcopy = sp + 440|0;
 $rcopy = sp + 408|0;
 $scopy = sp + 376|0;
 $h = sp + 312|0;
 $rcheck = sp + 280|0;
 $A = sp + 120|0;
 $R = sp;
 $2 = ($1>>>0)<(0);
 $3 = ($0>>>0)<(64);
 $4 = ($1|0)==(0);
 $5 = $4 & $3;
 $6 = $2 | $5;
 if (!($6)) {
  $arrayidx = ((($sm)) + 63|0);
  $7 = HEAP8[$arrayidx>>0]|0;
  $tobool = ($7&255)>(31);
  if (!($tobool)) {
   $call = (_crypto_sign_ed25519_ref10_ge_frombytes_negate_vartime($A,$pk)|0);
   $cmp3 = ($call|0)==(0);
   if ($cmp3) {
    dest=$pkcopy; src=$pk; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
    dest=$rcopy; src=$sm; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
    $add$ptr = ((($sm)) + 32|0);
    dest=$scopy; src=$add$ptr; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
    _memmove(($m|0),($sm|0),($0|0))|0;
    $add$ptr10 = ((($m)) + 32|0);
    dest=$add$ptr10; src=$pkcopy; stop=dest+32|0; do { HEAP8[dest>>0]=HEAP8[src>>0]|0; dest=dest+1|0; src=src+1|0; } while ((dest|0) < (stop|0));
    (_crypto_hash_sha512_ref($h,$m,$0,$1)|0);
    _crypto_sign_ed25519_ref10_sc_reduce($h);
    _crypto_sign_ed25519_ref10_ge_double_scalarmult_vartime($R,$h,$A,$scopy);
    _crypto_sign_ed25519_ref10_ge_tobytes($rcheck,$R);
    $call20 = (_crypto_verify_32_ref($rcheck,$rcopy)|0);
    $cmp21 = ($call20|0)==(0);
    if ($cmp21) {
     $add$ptr24 = ((($m)) + 64|0);
     $8 = (_i64Add(($0|0),($1|0),-64,-1)|0);
     $9 = tempRet0;
     _memmove(($m|0),($add$ptr24|0),($8|0))|0;
     $add$ptr26 = (($m) + ($0)|0);
     $add$ptr27 = ((($add$ptr26)) + -64|0);
     dest=$add$ptr27; stop=dest+64|0; do { HEAP8[dest>>0]=0|0; dest=dest+1|0; } while ((dest|0) < (stop|0));
     $10 = $mlen;
     $11 = $10;
     HEAP32[$11>>2] = $8;
     $12 = (($10) + 4)|0;
     $13 = $12;
     HEAP32[$13>>2] = $9;
     $retval$0 = 0;
     STACKTOP = sp;return ($retval$0|0);
    }
   }
  }
 }
 $14 = $mlen;
 $15 = $14;
 HEAP32[$15>>2] = -1;
 $16 = (($14) + 4)|0;
 $17 = $16;
 HEAP32[$17>>2] = -1;
 _memset(($m|0),0,($0|0))|0;
 $retval$0 = -1;
 STACKTOP = sp;return ($retval$0|0);
}
function _crypto_sign_ed25519_ref10_sc_muladd($s,$a,$b,$c) {
 $s = $s|0;
 $a = $a|0;
 $b = $b|0;
 $c = $c|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0, $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0;
 var $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0, $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0;
 var $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0, $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0;
 var $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0, $1062 = 0, $1063 = 0, $1064 = 0, $1065 = 0, $1066 = 0, $1067 = 0, $1068 = 0, $1069 = 0;
 var $107 = 0, $1070 = 0, $1071 = 0, $1072 = 0, $1073 = 0, $1074 = 0, $1075 = 0, $1076 = 0, $1077 = 0, $1078 = 0, $1079 = 0, $108 = 0, $1080 = 0, $1081 = 0, $1082 = 0, $1083 = 0, $1084 = 0, $1085 = 0, $1086 = 0, $1087 = 0;
 var $1088 = 0, $1089 = 0, $109 = 0, $1090 = 0, $1091 = 0, $1092 = 0, $1093 = 0, $1094 = 0, $1095 = 0, $1096 = 0, $1097 = 0, $1098 = 0, $1099 = 0, $11 = 0, $110 = 0, $1100 = 0, $1101 = 0, $1102 = 0, $1103 = 0, $1104 = 0;
 var $1105 = 0, $1106 = 0, $1107 = 0, $1108 = 0, $1109 = 0, $111 = 0, $1110 = 0, $1111 = 0, $1112 = 0, $1113 = 0, $1114 = 0, $1115 = 0, $1116 = 0, $1117 = 0, $1118 = 0, $1119 = 0, $112 = 0, $1120 = 0, $1121 = 0, $1122 = 0;
 var $1123 = 0, $1124 = 0, $1125 = 0, $1126 = 0, $1127 = 0, $1128 = 0, $1129 = 0, $113 = 0, $1130 = 0, $1131 = 0, $1132 = 0, $1133 = 0, $1134 = 0, $1135 = 0, $1136 = 0, $1137 = 0, $1138 = 0, $1139 = 0, $114 = 0, $1140 = 0;
 var $1141 = 0, $1142 = 0, $1143 = 0, $1144 = 0, $1145 = 0, $1146 = 0, $1147 = 0, $1148 = 0, $1149 = 0, $115 = 0, $1150 = 0, $1151 = 0, $1152 = 0, $1153 = 0, $1154 = 0, $1155 = 0, $1156 = 0, $1157 = 0, $1158 = 0, $1159 = 0;
 var $116 = 0, $1160 = 0, $1161 = 0, $1162 = 0, $1163 = 0, $1164 = 0, $1165 = 0, $1166 = 0, $1167 = 0, $1168 = 0, $1169 = 0, $117 = 0, $1170 = 0, $1171 = 0, $1172 = 0, $1173 = 0, $1174 = 0, $1175 = 0, $1176 = 0, $1177 = 0;
 var $1178 = 0, $1179 = 0, $118 = 0, $1180 = 0, $1181 = 0, $1182 = 0, $1183 = 0, $1184 = 0, $1185 = 0, $1186 = 0, $1187 = 0, $1188 = 0, $1189 = 0, $119 = 0, $1190 = 0, $1191 = 0, $1192 = 0, $1193 = 0, $1194 = 0, $1195 = 0;
 var $1196 = 0, $1197 = 0, $1198 = 0, $1199 = 0, $12 = 0, $120 = 0, $1200 = 0, $1201 = 0, $1202 = 0, $1203 = 0, $1204 = 0, $1205 = 0, $1206 = 0, $1207 = 0, $1208 = 0, $1209 = 0, $121 = 0, $1210 = 0, $1211 = 0, $1212 = 0;
 var $1213 = 0, $1214 = 0, $1215 = 0, $1216 = 0, $1217 = 0, $1218 = 0, $1219 = 0, $122 = 0, $1220 = 0, $1221 = 0, $1222 = 0, $1223 = 0, $1224 = 0, $1225 = 0, $1226 = 0, $1227 = 0, $1228 = 0, $1229 = 0, $123 = 0, $1230 = 0;
 var $1231 = 0, $1232 = 0, $1233 = 0, $1234 = 0, $1235 = 0, $1236 = 0, $1237 = 0, $1238 = 0, $1239 = 0, $124 = 0, $1240 = 0, $1241 = 0, $1242 = 0, $1243 = 0, $1244 = 0, $1245 = 0, $1246 = 0, $1247 = 0, $1248 = 0, $1249 = 0;
 var $125 = 0, $1250 = 0, $1251 = 0, $1252 = 0, $1253 = 0, $1254 = 0, $1255 = 0, $1256 = 0, $1257 = 0, $1258 = 0, $1259 = 0, $126 = 0, $1260 = 0, $1261 = 0, $1262 = 0, $1263 = 0, $1264 = 0, $1265 = 0, $1266 = 0, $1267 = 0;
 var $1268 = 0, $1269 = 0, $127 = 0, $1270 = 0, $1271 = 0, $1272 = 0, $1273 = 0, $1274 = 0, $1275 = 0, $1276 = 0, $1277 = 0, $1278 = 0, $1279 = 0, $128 = 0, $1280 = 0, $1281 = 0, $1282 = 0, $1283 = 0, $1284 = 0, $1285 = 0;
 var $1286 = 0, $1287 = 0, $1288 = 0, $1289 = 0, $129 = 0, $1290 = 0, $1291 = 0, $1292 = 0, $1293 = 0, $1294 = 0, $1295 = 0, $1296 = 0, $1297 = 0, $1298 = 0, $1299 = 0, $13 = 0, $130 = 0, $1300 = 0, $1301 = 0, $1302 = 0;
 var $1303 = 0, $1304 = 0, $1305 = 0, $1306 = 0, $1307 = 0, $1308 = 0, $1309 = 0, $131 = 0, $1310 = 0, $1311 = 0, $1312 = 0, $1313 = 0, $1314 = 0, $1315 = 0, $1316 = 0, $1317 = 0, $1318 = 0, $1319 = 0, $132 = 0, $1320 = 0;
 var $1321 = 0, $1322 = 0, $1323 = 0, $1324 = 0, $1325 = 0, $1326 = 0, $1327 = 0, $1328 = 0, $1329 = 0, $133 = 0, $1330 = 0, $1331 = 0, $1332 = 0, $1333 = 0, $1334 = 0, $1335 = 0, $1336 = 0, $1337 = 0, $1338 = 0, $1339 = 0;
 var $134 = 0, $1340 = 0, $1341 = 0, $1342 = 0, $1343 = 0, $1344 = 0, $1345 = 0, $1346 = 0, $1347 = 0, $1348 = 0, $1349 = 0, $135 = 0, $1350 = 0, $1351 = 0, $1352 = 0, $1353 = 0, $1354 = 0, $1355 = 0, $1356 = 0, $1357 = 0;
 var $1358 = 0, $1359 = 0, $136 = 0, $1360 = 0, $1361 = 0, $1362 = 0, $1363 = 0, $1364 = 0, $1365 = 0, $1366 = 0, $1367 = 0, $1368 = 0, $1369 = 0, $137 = 0, $1370 = 0, $1371 = 0, $1372 = 0, $1373 = 0, $1374 = 0, $1375 = 0;
 var $1376 = 0, $1377 = 0, $1378 = 0, $1379 = 0, $138 = 0, $1380 = 0, $1381 = 0, $1382 = 0, $1383 = 0, $1384 = 0, $1385 = 0, $1386 = 0, $1387 = 0, $1388 = 0, $1389 = 0, $139 = 0, $1390 = 0, $1391 = 0, $1392 = 0, $1393 = 0;
 var $1394 = 0, $1395 = 0, $1396 = 0, $1397 = 0, $1398 = 0, $1399 = 0, $14 = 0, $140 = 0, $1400 = 0, $1401 = 0, $1402 = 0, $1403 = 0, $1404 = 0, $1405 = 0, $1406 = 0, $1407 = 0, $1408 = 0, $1409 = 0, $141 = 0, $1410 = 0;
 var $1411 = 0, $1412 = 0, $1413 = 0, $1414 = 0, $1415 = 0, $1416 = 0, $1417 = 0, $1418 = 0, $1419 = 0, $142 = 0, $1420 = 0, $1421 = 0, $1422 = 0, $1423 = 0, $1424 = 0, $1425 = 0, $1426 = 0, $1427 = 0, $1428 = 0, $1429 = 0;
 var $143 = 0, $1430 = 0, $1431 = 0, $1432 = 0, $1433 = 0, $1434 = 0, $1435 = 0, $1436 = 0, $1437 = 0, $1438 = 0, $1439 = 0, $144 = 0, $1440 = 0, $1441 = 0, $1442 = 0, $1443 = 0, $1444 = 0, $1445 = 0, $1446 = 0, $1447 = 0;
 var $1448 = 0, $1449 = 0, $145 = 0, $1450 = 0, $1451 = 0, $1452 = 0, $1453 = 0, $1454 = 0, $1455 = 0, $1456 = 0, $1457 = 0, $1458 = 0, $1459 = 0, $146 = 0, $1460 = 0, $1461 = 0, $1462 = 0, $1463 = 0, $1464 = 0, $1465 = 0;
 var $1466 = 0, $1467 = 0, $1468 = 0, $1469 = 0, $147 = 0, $1470 = 0, $1471 = 0, $1472 = 0, $1473 = 0, $1474 = 0, $1475 = 0, $1476 = 0, $1477 = 0, $1478 = 0, $1479 = 0, $148 = 0, $1480 = 0, $1481 = 0, $1482 = 0, $1483 = 0;
 var $1484 = 0, $1485 = 0, $1486 = 0, $1487 = 0, $1488 = 0, $1489 = 0, $149 = 0, $1490 = 0, $1491 = 0, $1492 = 0, $1493 = 0, $1494 = 0, $1495 = 0, $1496 = 0, $1497 = 0, $1498 = 0, $1499 = 0, $15 = 0, $150 = 0, $1500 = 0;
 var $1501 = 0, $1502 = 0, $1503 = 0, $1504 = 0, $1505 = 0, $1506 = 0, $1507 = 0, $1508 = 0, $1509 = 0, $151 = 0, $1510 = 0, $1511 = 0, $1512 = 0, $1513 = 0, $1514 = 0, $1515 = 0, $1516 = 0, $1517 = 0, $1518 = 0, $1519 = 0;
 var $152 = 0, $1520 = 0, $1521 = 0, $1522 = 0, $1523 = 0, $1524 = 0, $1525 = 0, $1526 = 0, $1527 = 0, $1528 = 0, $1529 = 0, $153 = 0, $1530 = 0, $1531 = 0, $1532 = 0, $1533 = 0, $1534 = 0, $1535 = 0, $1536 = 0, $1537 = 0;
 var $1538 = 0, $1539 = 0, $154 = 0, $1540 = 0, $1541 = 0, $1542 = 0, $1543 = 0, $1544 = 0, $1545 = 0, $1546 = 0, $1547 = 0, $1548 = 0, $1549 = 0, $155 = 0, $1550 = 0, $1551 = 0, $1552 = 0, $1553 = 0, $1554 = 0, $1555 = 0;
 var $1556 = 0, $1557 = 0, $1558 = 0, $1559 = 0, $156 = 0, $1560 = 0, $1561 = 0, $1562 = 0, $1563 = 0, $1564 = 0, $1565 = 0, $1566 = 0, $1567 = 0, $1568 = 0, $1569 = 0, $157 = 0, $1570 = 0, $1571 = 0, $1572 = 0, $1573 = 0;
 var $1574 = 0, $1575 = 0, $1576 = 0, $1577 = 0, $1578 = 0, $1579 = 0, $158 = 0, $1580 = 0, $1581 = 0, $1582 = 0, $1583 = 0, $1584 = 0, $1585 = 0, $1586 = 0, $1587 = 0, $1588 = 0, $1589 = 0, $159 = 0, $1590 = 0, $1591 = 0;
 var $1592 = 0, $1593 = 0, $1594 = 0, $1595 = 0, $1596 = 0, $1597 = 0, $1598 = 0, $1599 = 0, $16 = 0, $160 = 0, $1600 = 0, $1601 = 0, $1602 = 0, $1603 = 0, $1604 = 0, $1605 = 0, $1606 = 0, $1607 = 0, $1608 = 0, $1609 = 0;
 var $161 = 0, $1610 = 0, $1611 = 0, $1612 = 0, $1613 = 0, $1614 = 0, $1615 = 0, $1616 = 0, $1617 = 0, $1618 = 0, $1619 = 0, $162 = 0, $1620 = 0, $1621 = 0, $1622 = 0, $1623 = 0, $1624 = 0, $1625 = 0, $1626 = 0, $1627 = 0;
 var $1628 = 0, $1629 = 0, $163 = 0, $1630 = 0, $1631 = 0, $1632 = 0, $1633 = 0, $1634 = 0, $1635 = 0, $1636 = 0, $1637 = 0, $1638 = 0, $1639 = 0, $164 = 0, $1640 = 0, $1641 = 0, $1642 = 0, $1643 = 0, $1644 = 0, $1645 = 0;
 var $1646 = 0, $1647 = 0, $1648 = 0, $1649 = 0, $165 = 0, $1650 = 0, $1651 = 0, $1652 = 0, $1653 = 0, $1654 = 0, $1655 = 0, $1656 = 0, $1657 = 0, $1658 = 0, $1659 = 0, $166 = 0, $1660 = 0, $1661 = 0, $1662 = 0, $1663 = 0;
 var $1664 = 0, $1665 = 0, $1666 = 0, $1667 = 0, $1668 = 0, $1669 = 0, $167 = 0, $1670 = 0, $1671 = 0, $1672 = 0, $1673 = 0, $1674 = 0, $1675 = 0, $1676 = 0, $1677 = 0, $1678 = 0, $1679 = 0, $168 = 0, $1680 = 0, $1681 = 0;
 var $1682 = 0, $1683 = 0, $1684 = 0, $1685 = 0, $1686 = 0, $1687 = 0, $1688 = 0, $1689 = 0, $169 = 0, $1690 = 0, $1691 = 0, $1692 = 0, $1693 = 0, $1694 = 0, $1695 = 0, $1696 = 0, $1697 = 0, $1698 = 0, $1699 = 0, $17 = 0;
 var $170 = 0, $1700 = 0, $1701 = 0, $1702 = 0, $1703 = 0, $1704 = 0, $1705 = 0, $1706 = 0, $1707 = 0, $1708 = 0, $1709 = 0, $171 = 0, $1710 = 0, $1711 = 0, $1712 = 0, $1713 = 0, $1714 = 0, $1715 = 0, $1716 = 0, $1717 = 0;
 var $1718 = 0, $1719 = 0, $172 = 0, $1720 = 0, $1721 = 0, $1722 = 0, $1723 = 0, $1724 = 0, $1725 = 0, $1726 = 0, $1727 = 0, $1728 = 0, $1729 = 0, $173 = 0, $1730 = 0, $1731 = 0, $1732 = 0, $1733 = 0, $1734 = 0, $1735 = 0;
 var $1736 = 0, $1737 = 0, $1738 = 0, $1739 = 0, $174 = 0, $1740 = 0, $1741 = 0, $1742 = 0, $1743 = 0, $1744 = 0, $1745 = 0, $1746 = 0, $1747 = 0, $1748 = 0, $1749 = 0, $175 = 0, $1750 = 0, $1751 = 0, $1752 = 0, $1753 = 0;
 var $1754 = 0, $1755 = 0, $1756 = 0, $1757 = 0, $1758 = 0, $1759 = 0, $176 = 0, $1760 = 0, $1761 = 0, $1762 = 0, $1763 = 0, $1764 = 0, $1765 = 0, $1766 = 0, $1767 = 0, $1768 = 0, $1769 = 0, $177 = 0, $1770 = 0, $1771 = 0;
 var $1772 = 0, $1773 = 0, $1774 = 0, $1775 = 0, $1776 = 0, $1777 = 0, $1778 = 0, $1779 = 0, $178 = 0, $1780 = 0, $1781 = 0, $1782 = 0, $1783 = 0, $1784 = 0, $1785 = 0, $1786 = 0, $1787 = 0, $1788 = 0, $1789 = 0, $179 = 0;
 var $1790 = 0, $1791 = 0, $1792 = 0, $1793 = 0, $1794 = 0, $1795 = 0, $1796 = 0, $1797 = 0, $1798 = 0, $1799 = 0, $18 = 0, $180 = 0, $1800 = 0, $1801 = 0, $1802 = 0, $1803 = 0, $1804 = 0, $1805 = 0, $1806 = 0, $1807 = 0;
 var $1808 = 0, $1809 = 0, $181 = 0, $1810 = 0, $1811 = 0, $1812 = 0, $1813 = 0, $1814 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0;
 var $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0;
 var $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0;
 var $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0;
 var $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0;
 var $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0;
 var $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0;
 var $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0;
 var $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0;
 var $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0;
 var $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0;
 var $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0;
 var $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0;
 var $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0;
 var $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0;
 var $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0;
 var $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0;
 var $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0;
 var $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0;
 var $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0;
 var $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0;
 var $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0;
 var $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0;
 var $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0;
 var $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0;
 var $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0;
 var $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0;
 var $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0;
 var $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0;
 var $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0;
 var $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0;
 var $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0;
 var $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0;
 var $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0;
 var $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0;
 var $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0;
 var $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0;
 var $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0;
 var $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0;
 var $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0;
 var $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0;
 var $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0;
 var $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0;
 var $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0;
 var $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0;
 var $986 = 0, $987 = 0, $988 = 0, $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $add$ptr = 0, $add$ptr103 = 0, $add$ptr107 = 0, $add$ptr11 = 0, $add$ptr111 = 0;
 var $add$ptr115 = 0, $add$ptr118 = 0, $add$ptr122 = 0, $add$ptr126 = 0, $add$ptr15 = 0, $add$ptr19 = 0, $add$ptr23 = 0, $add$ptr27 = 0, $add$ptr3 = 0, $add$ptr30 = 0, $add$ptr34 = 0, $add$ptr38 = 0, $add$ptr43 = 0, $add$ptr47 = 0, $add$ptr51 = 0, $add$ptr55 = 0, $add$ptr59 = 0, $add$ptr63 = 0, $add$ptr67 = 0, $add$ptr7 = 0;
 var $add$ptr71 = 0, $add$ptr74 = 0, $add$ptr78 = 0, $add$ptr82 = 0, $add$ptr87 = 0, $add$ptr91 = 0, $add$ptr95 = 0, $add$ptr99 = 0, $arrayidx1001 = 0, $arrayidx1004 = 0, $arrayidx895 = 0, $arrayidx899 = 0, $arrayidx902 = 0, $arrayidx905 = 0, $arrayidx910 = 0, $arrayidx913 = 0, $arrayidx918 = 0, $arrayidx921 = 0, $arrayidx924 = 0, $arrayidx929 = 0;
 var $arrayidx932 = 0, $arrayidx935 = 0, $arrayidx940 = 0, $arrayidx943 = 0, $arrayidx948 = 0, $arrayidx951 = 0, $arrayidx954 = 0, $arrayidx959 = 0, $arrayidx962 = 0, $arrayidx965 = 0, $arrayidx968 = 0, $arrayidx971 = 0, $arrayidx976 = 0, $arrayidx979 = 0, $arrayidx982 = 0, $arrayidx987 = 0, $arrayidx990 = 0, $arrayidx995 = 0, $arrayidx998 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = (_load_3_47($a)|0);
 $1 = tempRet0;
 $2 = $0 & 2097151;
 $add$ptr = ((($a)) + 2|0);
 $3 = (_load_4_48($add$ptr)|0);
 $4 = tempRet0;
 $5 = (_bitshift64Lshr(($3|0),($4|0),5)|0);
 $6 = tempRet0;
 $7 = $5 & 2097151;
 $add$ptr3 = ((($a)) + 5|0);
 $8 = (_load_3_47($add$ptr3)|0);
 $9 = tempRet0;
 $10 = (_bitshift64Lshr(($8|0),($9|0),2)|0);
 $11 = tempRet0;
 $12 = $10 & 2097151;
 $add$ptr7 = ((($a)) + 7|0);
 $13 = (_load_4_48($add$ptr7)|0);
 $14 = tempRet0;
 $15 = (_bitshift64Lshr(($13|0),($14|0),7)|0);
 $16 = tempRet0;
 $17 = $15 & 2097151;
 $add$ptr11 = ((($a)) + 10|0);
 $18 = (_load_4_48($add$ptr11)|0);
 $19 = tempRet0;
 $20 = (_bitshift64Lshr(($18|0),($19|0),4)|0);
 $21 = tempRet0;
 $22 = $20 & 2097151;
 $add$ptr15 = ((($a)) + 13|0);
 $23 = (_load_3_47($add$ptr15)|0);
 $24 = tempRet0;
 $25 = (_bitshift64Lshr(($23|0),($24|0),1)|0);
 $26 = tempRet0;
 $27 = $25 & 2097151;
 $add$ptr19 = ((($a)) + 15|0);
 $28 = (_load_4_48($add$ptr19)|0);
 $29 = tempRet0;
 $30 = (_bitshift64Lshr(($28|0),($29|0),6)|0);
 $31 = tempRet0;
 $32 = $30 & 2097151;
 $add$ptr23 = ((($a)) + 18|0);
 $33 = (_load_3_47($add$ptr23)|0);
 $34 = tempRet0;
 $35 = (_bitshift64Lshr(($33|0),($34|0),3)|0);
 $36 = tempRet0;
 $37 = $35 & 2097151;
 $add$ptr27 = ((($a)) + 21|0);
 $38 = (_load_3_47($add$ptr27)|0);
 $39 = tempRet0;
 $40 = $38 & 2097151;
 $add$ptr30 = ((($a)) + 23|0);
 $41 = (_load_4_48($add$ptr30)|0);
 $42 = tempRet0;
 $43 = (_bitshift64Lshr(($41|0),($42|0),5)|0);
 $44 = tempRet0;
 $45 = $43 & 2097151;
 $add$ptr34 = ((($a)) + 26|0);
 $46 = (_load_3_47($add$ptr34)|0);
 $47 = tempRet0;
 $48 = (_bitshift64Lshr(($46|0),($47|0),2)|0);
 $49 = tempRet0;
 $50 = $48 & 2097151;
 $add$ptr38 = ((($a)) + 28|0);
 $51 = (_load_4_48($add$ptr38)|0);
 $52 = tempRet0;
 $53 = (_bitshift64Lshr(($51|0),($52|0),7)|0);
 $54 = tempRet0;
 $55 = (_load_3_47($b)|0);
 $56 = tempRet0;
 $57 = $55 & 2097151;
 $add$ptr43 = ((($b)) + 2|0);
 $58 = (_load_4_48($add$ptr43)|0);
 $59 = tempRet0;
 $60 = (_bitshift64Lshr(($58|0),($59|0),5)|0);
 $61 = tempRet0;
 $62 = $60 & 2097151;
 $add$ptr47 = ((($b)) + 5|0);
 $63 = (_load_3_47($add$ptr47)|0);
 $64 = tempRet0;
 $65 = (_bitshift64Lshr(($63|0),($64|0),2)|0);
 $66 = tempRet0;
 $67 = $65 & 2097151;
 $add$ptr51 = ((($b)) + 7|0);
 $68 = (_load_4_48($add$ptr51)|0);
 $69 = tempRet0;
 $70 = (_bitshift64Lshr(($68|0),($69|0),7)|0);
 $71 = tempRet0;
 $72 = $70 & 2097151;
 $add$ptr55 = ((($b)) + 10|0);
 $73 = (_load_4_48($add$ptr55)|0);
 $74 = tempRet0;
 $75 = (_bitshift64Lshr(($73|0),($74|0),4)|0);
 $76 = tempRet0;
 $77 = $75 & 2097151;
 $add$ptr59 = ((($b)) + 13|0);
 $78 = (_load_3_47($add$ptr59)|0);
 $79 = tempRet0;
 $80 = (_bitshift64Lshr(($78|0),($79|0),1)|0);
 $81 = tempRet0;
 $82 = $80 & 2097151;
 $add$ptr63 = ((($b)) + 15|0);
 $83 = (_load_4_48($add$ptr63)|0);
 $84 = tempRet0;
 $85 = (_bitshift64Lshr(($83|0),($84|0),6)|0);
 $86 = tempRet0;
 $87 = $85 & 2097151;
 $add$ptr67 = ((($b)) + 18|0);
 $88 = (_load_3_47($add$ptr67)|0);
 $89 = tempRet0;
 $90 = (_bitshift64Lshr(($88|0),($89|0),3)|0);
 $91 = tempRet0;
 $92 = $90 & 2097151;
 $add$ptr71 = ((($b)) + 21|0);
 $93 = (_load_3_47($add$ptr71)|0);
 $94 = tempRet0;
 $95 = $93 & 2097151;
 $add$ptr74 = ((($b)) + 23|0);
 $96 = (_load_4_48($add$ptr74)|0);
 $97 = tempRet0;
 $98 = (_bitshift64Lshr(($96|0),($97|0),5)|0);
 $99 = tempRet0;
 $100 = $98 & 2097151;
 $add$ptr78 = ((($b)) + 26|0);
 $101 = (_load_3_47($add$ptr78)|0);
 $102 = tempRet0;
 $103 = (_bitshift64Lshr(($101|0),($102|0),2)|0);
 $104 = tempRet0;
 $105 = $103 & 2097151;
 $add$ptr82 = ((($b)) + 28|0);
 $106 = (_load_4_48($add$ptr82)|0);
 $107 = tempRet0;
 $108 = (_bitshift64Lshr(($106|0),($107|0),7)|0);
 $109 = tempRet0;
 $110 = (_load_3_47($c)|0);
 $111 = tempRet0;
 $112 = $110 & 2097151;
 $add$ptr87 = ((($c)) + 2|0);
 $113 = (_load_4_48($add$ptr87)|0);
 $114 = tempRet0;
 $115 = (_bitshift64Lshr(($113|0),($114|0),5)|0);
 $116 = tempRet0;
 $117 = $115 & 2097151;
 $add$ptr91 = ((($c)) + 5|0);
 $118 = (_load_3_47($add$ptr91)|0);
 $119 = tempRet0;
 $120 = (_bitshift64Lshr(($118|0),($119|0),2)|0);
 $121 = tempRet0;
 $122 = $120 & 2097151;
 $add$ptr95 = ((($c)) + 7|0);
 $123 = (_load_4_48($add$ptr95)|0);
 $124 = tempRet0;
 $125 = (_bitshift64Lshr(($123|0),($124|0),7)|0);
 $126 = tempRet0;
 $127 = $125 & 2097151;
 $add$ptr99 = ((($c)) + 10|0);
 $128 = (_load_4_48($add$ptr99)|0);
 $129 = tempRet0;
 $130 = (_bitshift64Lshr(($128|0),($129|0),4)|0);
 $131 = tempRet0;
 $132 = $130 & 2097151;
 $add$ptr103 = ((($c)) + 13|0);
 $133 = (_load_3_47($add$ptr103)|0);
 $134 = tempRet0;
 $135 = (_bitshift64Lshr(($133|0),($134|0),1)|0);
 $136 = tempRet0;
 $137 = $135 & 2097151;
 $add$ptr107 = ((($c)) + 15|0);
 $138 = (_load_4_48($add$ptr107)|0);
 $139 = tempRet0;
 $140 = (_bitshift64Lshr(($138|0),($139|0),6)|0);
 $141 = tempRet0;
 $142 = $140 & 2097151;
 $add$ptr111 = ((($c)) + 18|0);
 $143 = (_load_3_47($add$ptr111)|0);
 $144 = tempRet0;
 $145 = (_bitshift64Lshr(($143|0),($144|0),3)|0);
 $146 = tempRet0;
 $147 = $145 & 2097151;
 $add$ptr115 = ((($c)) + 21|0);
 $148 = (_load_3_47($add$ptr115)|0);
 $149 = tempRet0;
 $150 = $148 & 2097151;
 $add$ptr118 = ((($c)) + 23|0);
 $151 = (_load_4_48($add$ptr118)|0);
 $152 = tempRet0;
 $153 = (_bitshift64Lshr(($151|0),($152|0),5)|0);
 $154 = tempRet0;
 $155 = $153 & 2097151;
 $add$ptr122 = ((($c)) + 26|0);
 $156 = (_load_3_47($add$ptr122)|0);
 $157 = tempRet0;
 $158 = (_bitshift64Lshr(($156|0),($157|0),2)|0);
 $159 = tempRet0;
 $160 = $158 & 2097151;
 $add$ptr126 = ((($c)) + 28|0);
 $161 = (_load_4_48($add$ptr126)|0);
 $162 = tempRet0;
 $163 = (_bitshift64Lshr(($161|0),($162|0),7)|0);
 $164 = tempRet0;
 $165 = (___muldi3(($57|0),0,($2|0),0)|0);
 $166 = tempRet0;
 $167 = (_i64Add(($112|0),0,($165|0),($166|0))|0);
 $168 = tempRet0;
 $169 = (___muldi3(($62|0),0,($2|0),0)|0);
 $170 = tempRet0;
 $171 = (___muldi3(($57|0),0,($7|0),0)|0);
 $172 = tempRet0;
 $173 = (___muldi3(($67|0),0,($2|0),0)|0);
 $174 = tempRet0;
 $175 = (___muldi3(($62|0),0,($7|0),0)|0);
 $176 = tempRet0;
 $177 = (___muldi3(($57|0),0,($12|0),0)|0);
 $178 = tempRet0;
 $179 = (_i64Add(($175|0),($176|0),($177|0),($178|0))|0);
 $180 = tempRet0;
 $181 = (_i64Add(($179|0),($180|0),($173|0),($174|0))|0);
 $182 = tempRet0;
 $183 = (_i64Add(($181|0),($182|0),($122|0),0)|0);
 $184 = tempRet0;
 $185 = (___muldi3(($72|0),0,($2|0),0)|0);
 $186 = tempRet0;
 $187 = (___muldi3(($67|0),0,($7|0),0)|0);
 $188 = tempRet0;
 $189 = (___muldi3(($62|0),0,($12|0),0)|0);
 $190 = tempRet0;
 $191 = (___muldi3(($57|0),0,($17|0),0)|0);
 $192 = tempRet0;
 $193 = (___muldi3(($77|0),0,($2|0),0)|0);
 $194 = tempRet0;
 $195 = (___muldi3(($72|0),0,($7|0),0)|0);
 $196 = tempRet0;
 $197 = (___muldi3(($67|0),0,($12|0),0)|0);
 $198 = tempRet0;
 $199 = (___muldi3(($62|0),0,($17|0),0)|0);
 $200 = tempRet0;
 $201 = (___muldi3(($57|0),0,($22|0),0)|0);
 $202 = tempRet0;
 $203 = (_i64Add(($199|0),($200|0),($201|0),($202|0))|0);
 $204 = tempRet0;
 $205 = (_i64Add(($203|0),($204|0),($197|0),($198|0))|0);
 $206 = tempRet0;
 $207 = (_i64Add(($205|0),($206|0),($195|0),($196|0))|0);
 $208 = tempRet0;
 $209 = (_i64Add(($207|0),($208|0),($193|0),($194|0))|0);
 $210 = tempRet0;
 $211 = (_i64Add(($209|0),($210|0),($132|0),0)|0);
 $212 = tempRet0;
 $213 = (___muldi3(($82|0),0,($2|0),0)|0);
 $214 = tempRet0;
 $215 = (___muldi3(($77|0),0,($7|0),0)|0);
 $216 = tempRet0;
 $217 = (___muldi3(($72|0),0,($12|0),0)|0);
 $218 = tempRet0;
 $219 = (___muldi3(($67|0),0,($17|0),0)|0);
 $220 = tempRet0;
 $221 = (___muldi3(($62|0),0,($22|0),0)|0);
 $222 = tempRet0;
 $223 = (___muldi3(($57|0),0,($27|0),0)|0);
 $224 = tempRet0;
 $225 = (___muldi3(($87|0),0,($2|0),0)|0);
 $226 = tempRet0;
 $227 = (___muldi3(($82|0),0,($7|0),0)|0);
 $228 = tempRet0;
 $229 = (___muldi3(($77|0),0,($12|0),0)|0);
 $230 = tempRet0;
 $231 = (___muldi3(($72|0),0,($17|0),0)|0);
 $232 = tempRet0;
 $233 = (___muldi3(($67|0),0,($22|0),0)|0);
 $234 = tempRet0;
 $235 = (___muldi3(($62|0),0,($27|0),0)|0);
 $236 = tempRet0;
 $237 = (___muldi3(($57|0),0,($32|0),0)|0);
 $238 = tempRet0;
 $239 = (_i64Add(($235|0),($236|0),($237|0),($238|0))|0);
 $240 = tempRet0;
 $241 = (_i64Add(($239|0),($240|0),($233|0),($234|0))|0);
 $242 = tempRet0;
 $243 = (_i64Add(($241|0),($242|0),($231|0),($232|0))|0);
 $244 = tempRet0;
 $245 = (_i64Add(($243|0),($244|0),($229|0),($230|0))|0);
 $246 = tempRet0;
 $247 = (_i64Add(($245|0),($246|0),($227|0),($228|0))|0);
 $248 = tempRet0;
 $249 = (_i64Add(($247|0),($248|0),($225|0),($226|0))|0);
 $250 = tempRet0;
 $251 = (_i64Add(($249|0),($250|0),($142|0),0)|0);
 $252 = tempRet0;
 $253 = (___muldi3(($92|0),0,($2|0),0)|0);
 $254 = tempRet0;
 $255 = (___muldi3(($87|0),0,($7|0),0)|0);
 $256 = tempRet0;
 $257 = (___muldi3(($82|0),0,($12|0),0)|0);
 $258 = tempRet0;
 $259 = (___muldi3(($77|0),0,($17|0),0)|0);
 $260 = tempRet0;
 $261 = (___muldi3(($72|0),0,($22|0),0)|0);
 $262 = tempRet0;
 $263 = (___muldi3(($67|0),0,($27|0),0)|0);
 $264 = tempRet0;
 $265 = (___muldi3(($62|0),0,($32|0),0)|0);
 $266 = tempRet0;
 $267 = (___muldi3(($57|0),0,($37|0),0)|0);
 $268 = tempRet0;
 $269 = (___muldi3(($95|0),0,($2|0),0)|0);
 $270 = tempRet0;
 $271 = (___muldi3(($92|0),0,($7|0),0)|0);
 $272 = tempRet0;
 $273 = (___muldi3(($87|0),0,($12|0),0)|0);
 $274 = tempRet0;
 $275 = (___muldi3(($82|0),0,($17|0),0)|0);
 $276 = tempRet0;
 $277 = (___muldi3(($77|0),0,($22|0),0)|0);
 $278 = tempRet0;
 $279 = (___muldi3(($72|0),0,($27|0),0)|0);
 $280 = tempRet0;
 $281 = (___muldi3(($67|0),0,($32|0),0)|0);
 $282 = tempRet0;
 $283 = (___muldi3(($62|0),0,($37|0),0)|0);
 $284 = tempRet0;
 $285 = (___muldi3(($57|0),0,($40|0),0)|0);
 $286 = tempRet0;
 $287 = (_i64Add(($283|0),($284|0),($285|0),($286|0))|0);
 $288 = tempRet0;
 $289 = (_i64Add(($287|0),($288|0),($281|0),($282|0))|0);
 $290 = tempRet0;
 $291 = (_i64Add(($289|0),($290|0),($279|0),($280|0))|0);
 $292 = tempRet0;
 $293 = (_i64Add(($291|0),($292|0),($277|0),($278|0))|0);
 $294 = tempRet0;
 $295 = (_i64Add(($293|0),($294|0),($275|0),($276|0))|0);
 $296 = tempRet0;
 $297 = (_i64Add(($295|0),($296|0),($273|0),($274|0))|0);
 $298 = tempRet0;
 $299 = (_i64Add(($297|0),($298|0),($269|0),($270|0))|0);
 $300 = tempRet0;
 $301 = (_i64Add(($299|0),($300|0),($271|0),($272|0))|0);
 $302 = tempRet0;
 $303 = (_i64Add(($301|0),($302|0),($150|0),0)|0);
 $304 = tempRet0;
 $305 = (___muldi3(($100|0),0,($2|0),0)|0);
 $306 = tempRet0;
 $307 = (___muldi3(($95|0),0,($7|0),0)|0);
 $308 = tempRet0;
 $309 = (___muldi3(($92|0),0,($12|0),0)|0);
 $310 = tempRet0;
 $311 = (___muldi3(($87|0),0,($17|0),0)|0);
 $312 = tempRet0;
 $313 = (___muldi3(($82|0),0,($22|0),0)|0);
 $314 = tempRet0;
 $315 = (___muldi3(($77|0),0,($27|0),0)|0);
 $316 = tempRet0;
 $317 = (___muldi3(($72|0),0,($32|0),0)|0);
 $318 = tempRet0;
 $319 = (___muldi3(($67|0),0,($37|0),0)|0);
 $320 = tempRet0;
 $321 = (___muldi3(($62|0),0,($40|0),0)|0);
 $322 = tempRet0;
 $323 = (___muldi3(($57|0),0,($45|0),0)|0);
 $324 = tempRet0;
 $325 = (___muldi3(($105|0),0,($2|0),0)|0);
 $326 = tempRet0;
 $327 = (___muldi3(($100|0),0,($7|0),0)|0);
 $328 = tempRet0;
 $329 = (___muldi3(($95|0),0,($12|0),0)|0);
 $330 = tempRet0;
 $331 = (___muldi3(($92|0),0,($17|0),0)|0);
 $332 = tempRet0;
 $333 = (___muldi3(($87|0),0,($22|0),0)|0);
 $334 = tempRet0;
 $335 = (___muldi3(($82|0),0,($27|0),0)|0);
 $336 = tempRet0;
 $337 = (___muldi3(($77|0),0,($32|0),0)|0);
 $338 = tempRet0;
 $339 = (___muldi3(($72|0),0,($37|0),0)|0);
 $340 = tempRet0;
 $341 = (___muldi3(($67|0),0,($40|0),0)|0);
 $342 = tempRet0;
 $343 = (___muldi3(($62|0),0,($45|0),0)|0);
 $344 = tempRet0;
 $345 = (___muldi3(($57|0),0,($50|0),0)|0);
 $346 = tempRet0;
 $347 = (_i64Add(($343|0),($344|0),($345|0),($346|0))|0);
 $348 = tempRet0;
 $349 = (_i64Add(($347|0),($348|0),($341|0),($342|0))|0);
 $350 = tempRet0;
 $351 = (_i64Add(($349|0),($350|0),($339|0),($340|0))|0);
 $352 = tempRet0;
 $353 = (_i64Add(($351|0),($352|0),($337|0),($338|0))|0);
 $354 = tempRet0;
 $355 = (_i64Add(($353|0),($354|0),($335|0),($336|0))|0);
 $356 = tempRet0;
 $357 = (_i64Add(($355|0),($356|0),($333|0),($334|0))|0);
 $358 = tempRet0;
 $359 = (_i64Add(($357|0),($358|0),($329|0),($330|0))|0);
 $360 = tempRet0;
 $361 = (_i64Add(($359|0),($360|0),($331|0),($332|0))|0);
 $362 = tempRet0;
 $363 = (_i64Add(($361|0),($362|0),($327|0),($328|0))|0);
 $364 = tempRet0;
 $365 = (_i64Add(($363|0),($364|0),($325|0),($326|0))|0);
 $366 = tempRet0;
 $367 = (_i64Add(($365|0),($366|0),($160|0),0)|0);
 $368 = tempRet0;
 $369 = (___muldi3(($108|0),($109|0),($2|0),0)|0);
 $370 = tempRet0;
 $371 = (___muldi3(($105|0),0,($7|0),0)|0);
 $372 = tempRet0;
 $373 = (___muldi3(($100|0),0,($12|0),0)|0);
 $374 = tempRet0;
 $375 = (___muldi3(($95|0),0,($17|0),0)|0);
 $376 = tempRet0;
 $377 = (___muldi3(($92|0),0,($22|0),0)|0);
 $378 = tempRet0;
 $379 = (___muldi3(($87|0),0,($27|0),0)|0);
 $380 = tempRet0;
 $381 = (___muldi3(($82|0),0,($32|0),0)|0);
 $382 = tempRet0;
 $383 = (___muldi3(($77|0),0,($37|0),0)|0);
 $384 = tempRet0;
 $385 = (___muldi3(($72|0),0,($40|0),0)|0);
 $386 = tempRet0;
 $387 = (___muldi3(($67|0),0,($45|0),0)|0);
 $388 = tempRet0;
 $389 = (___muldi3(($62|0),0,($50|0),0)|0);
 $390 = tempRet0;
 $391 = (___muldi3(($57|0),0,($53|0),($54|0))|0);
 $392 = tempRet0;
 $393 = (___muldi3(($108|0),($109|0),($7|0),0)|0);
 $394 = tempRet0;
 $395 = (___muldi3(($105|0),0,($12|0),0)|0);
 $396 = tempRet0;
 $397 = (___muldi3(($100|0),0,($17|0),0)|0);
 $398 = tempRet0;
 $399 = (___muldi3(($95|0),0,($22|0),0)|0);
 $400 = tempRet0;
 $401 = (___muldi3(($92|0),0,($27|0),0)|0);
 $402 = tempRet0;
 $403 = (___muldi3(($87|0),0,($32|0),0)|0);
 $404 = tempRet0;
 $405 = (___muldi3(($82|0),0,($37|0),0)|0);
 $406 = tempRet0;
 $407 = (___muldi3(($77|0),0,($40|0),0)|0);
 $408 = tempRet0;
 $409 = (___muldi3(($72|0),0,($45|0),0)|0);
 $410 = tempRet0;
 $411 = (___muldi3(($67|0),0,($50|0),0)|0);
 $412 = tempRet0;
 $413 = (___muldi3(($62|0),0,($53|0),($54|0))|0);
 $414 = tempRet0;
 $415 = (_i64Add(($411|0),($412|0),($413|0),($414|0))|0);
 $416 = tempRet0;
 $417 = (_i64Add(($415|0),($416|0),($409|0),($410|0))|0);
 $418 = tempRet0;
 $419 = (_i64Add(($417|0),($418|0),($407|0),($408|0))|0);
 $420 = tempRet0;
 $421 = (_i64Add(($419|0),($420|0),($405|0),($406|0))|0);
 $422 = tempRet0;
 $423 = (_i64Add(($421|0),($422|0),($403|0),($404|0))|0);
 $424 = tempRet0;
 $425 = (_i64Add(($423|0),($424|0),($399|0),($400|0))|0);
 $426 = tempRet0;
 $427 = (_i64Add(($425|0),($426|0),($401|0),($402|0))|0);
 $428 = tempRet0;
 $429 = (_i64Add(($427|0),($428|0),($397|0),($398|0))|0);
 $430 = tempRet0;
 $431 = (_i64Add(($429|0),($430|0),($395|0),($396|0))|0);
 $432 = tempRet0;
 $433 = (_i64Add(($431|0),($432|0),($393|0),($394|0))|0);
 $434 = tempRet0;
 $435 = (___muldi3(($108|0),($109|0),($12|0),0)|0);
 $436 = tempRet0;
 $437 = (___muldi3(($105|0),0,($17|0),0)|0);
 $438 = tempRet0;
 $439 = (___muldi3(($100|0),0,($22|0),0)|0);
 $440 = tempRet0;
 $441 = (___muldi3(($95|0),0,($27|0),0)|0);
 $442 = tempRet0;
 $443 = (___muldi3(($92|0),0,($32|0),0)|0);
 $444 = tempRet0;
 $445 = (___muldi3(($87|0),0,($37|0),0)|0);
 $446 = tempRet0;
 $447 = (___muldi3(($82|0),0,($40|0),0)|0);
 $448 = tempRet0;
 $449 = (___muldi3(($77|0),0,($45|0),0)|0);
 $450 = tempRet0;
 $451 = (___muldi3(($72|0),0,($50|0),0)|0);
 $452 = tempRet0;
 $453 = (___muldi3(($67|0),0,($53|0),($54|0))|0);
 $454 = tempRet0;
 $455 = (___muldi3(($108|0),($109|0),($17|0),0)|0);
 $456 = tempRet0;
 $457 = (___muldi3(($105|0),0,($22|0),0)|0);
 $458 = tempRet0;
 $459 = (___muldi3(($100|0),0,($27|0),0)|0);
 $460 = tempRet0;
 $461 = (___muldi3(($95|0),0,($32|0),0)|0);
 $462 = tempRet0;
 $463 = (___muldi3(($92|0),0,($37|0),0)|0);
 $464 = tempRet0;
 $465 = (___muldi3(($87|0),0,($40|0),0)|0);
 $466 = tempRet0;
 $467 = (___muldi3(($82|0),0,($45|0),0)|0);
 $468 = tempRet0;
 $469 = (___muldi3(($77|0),0,($50|0),0)|0);
 $470 = tempRet0;
 $471 = (___muldi3(($72|0),0,($53|0),($54|0))|0);
 $472 = tempRet0;
 $473 = (_i64Add(($469|0),($470|0),($471|0),($472|0))|0);
 $474 = tempRet0;
 $475 = (_i64Add(($473|0),($474|0),($467|0),($468|0))|0);
 $476 = tempRet0;
 $477 = (_i64Add(($475|0),($476|0),($465|0),($466|0))|0);
 $478 = tempRet0;
 $479 = (_i64Add(($477|0),($478|0),($461|0),($462|0))|0);
 $480 = tempRet0;
 $481 = (_i64Add(($479|0),($480|0),($463|0),($464|0))|0);
 $482 = tempRet0;
 $483 = (_i64Add(($481|0),($482|0),($459|0),($460|0))|0);
 $484 = tempRet0;
 $485 = (_i64Add(($483|0),($484|0),($457|0),($458|0))|0);
 $486 = tempRet0;
 $487 = (_i64Add(($485|0),($486|0),($455|0),($456|0))|0);
 $488 = tempRet0;
 $489 = (___muldi3(($108|0),($109|0),($22|0),0)|0);
 $490 = tempRet0;
 $491 = (___muldi3(($105|0),0,($27|0),0)|0);
 $492 = tempRet0;
 $493 = (___muldi3(($100|0),0,($32|0),0)|0);
 $494 = tempRet0;
 $495 = (___muldi3(($95|0),0,($37|0),0)|0);
 $496 = tempRet0;
 $497 = (___muldi3(($92|0),0,($40|0),0)|0);
 $498 = tempRet0;
 $499 = (___muldi3(($87|0),0,($45|0),0)|0);
 $500 = tempRet0;
 $501 = (___muldi3(($82|0),0,($50|0),0)|0);
 $502 = tempRet0;
 $503 = (___muldi3(($77|0),0,($53|0),($54|0))|0);
 $504 = tempRet0;
 $505 = (___muldi3(($108|0),($109|0),($27|0),0)|0);
 $506 = tempRet0;
 $507 = (___muldi3(($105|0),0,($32|0),0)|0);
 $508 = tempRet0;
 $509 = (___muldi3(($100|0),0,($37|0),0)|0);
 $510 = tempRet0;
 $511 = (___muldi3(($95|0),0,($40|0),0)|0);
 $512 = tempRet0;
 $513 = (___muldi3(($92|0),0,($45|0),0)|0);
 $514 = tempRet0;
 $515 = (___muldi3(($87|0),0,($50|0),0)|0);
 $516 = tempRet0;
 $517 = (___muldi3(($82|0),0,($53|0),($54|0))|0);
 $518 = tempRet0;
 $519 = (_i64Add(($515|0),($516|0),($517|0),($518|0))|0);
 $520 = tempRet0;
 $521 = (_i64Add(($519|0),($520|0),($511|0),($512|0))|0);
 $522 = tempRet0;
 $523 = (_i64Add(($521|0),($522|0),($513|0),($514|0))|0);
 $524 = tempRet0;
 $525 = (_i64Add(($523|0),($524|0),($509|0),($510|0))|0);
 $526 = tempRet0;
 $527 = (_i64Add(($525|0),($526|0),($507|0),($508|0))|0);
 $528 = tempRet0;
 $529 = (_i64Add(($527|0),($528|0),($505|0),($506|0))|0);
 $530 = tempRet0;
 $531 = (___muldi3(($108|0),($109|0),($32|0),0)|0);
 $532 = tempRet0;
 $533 = (___muldi3(($105|0),0,($37|0),0)|0);
 $534 = tempRet0;
 $535 = (___muldi3(($100|0),0,($40|0),0)|0);
 $536 = tempRet0;
 $537 = (___muldi3(($95|0),0,($45|0),0)|0);
 $538 = tempRet0;
 $539 = (___muldi3(($92|0),0,($50|0),0)|0);
 $540 = tempRet0;
 $541 = (___muldi3(($87|0),0,($53|0),($54|0))|0);
 $542 = tempRet0;
 $543 = (___muldi3(($108|0),($109|0),($37|0),0)|0);
 $544 = tempRet0;
 $545 = (___muldi3(($105|0),0,($40|0),0)|0);
 $546 = tempRet0;
 $547 = (___muldi3(($100|0),0,($45|0),0)|0);
 $548 = tempRet0;
 $549 = (___muldi3(($95|0),0,($50|0),0)|0);
 $550 = tempRet0;
 $551 = (___muldi3(($92|0),0,($53|0),($54|0))|0);
 $552 = tempRet0;
 $553 = (_i64Add(($551|0),($552|0),($549|0),($550|0))|0);
 $554 = tempRet0;
 $555 = (_i64Add(($553|0),($554|0),($547|0),($548|0))|0);
 $556 = tempRet0;
 $557 = (_i64Add(($555|0),($556|0),($545|0),($546|0))|0);
 $558 = tempRet0;
 $559 = (_i64Add(($557|0),($558|0),($543|0),($544|0))|0);
 $560 = tempRet0;
 $561 = (___muldi3(($108|0),($109|0),($40|0),0)|0);
 $562 = tempRet0;
 $563 = (___muldi3(($105|0),0,($45|0),0)|0);
 $564 = tempRet0;
 $565 = (___muldi3(($100|0),0,($50|0),0)|0);
 $566 = tempRet0;
 $567 = (___muldi3(($95|0),0,($53|0),($54|0))|0);
 $568 = tempRet0;
 $569 = (___muldi3(($108|0),($109|0),($45|0),0)|0);
 $570 = tempRet0;
 $571 = (___muldi3(($105|0),0,($50|0),0)|0);
 $572 = tempRet0;
 $573 = (___muldi3(($100|0),0,($53|0),($54|0))|0);
 $574 = tempRet0;
 $575 = (_i64Add(($571|0),($572|0),($573|0),($574|0))|0);
 $576 = tempRet0;
 $577 = (_i64Add(($575|0),($576|0),($569|0),($570|0))|0);
 $578 = tempRet0;
 $579 = (___muldi3(($108|0),($109|0),($50|0),0)|0);
 $580 = tempRet0;
 $581 = (___muldi3(($105|0),0,($53|0),($54|0))|0);
 $582 = tempRet0;
 $583 = (_i64Add(($579|0),($580|0),($581|0),($582|0))|0);
 $584 = tempRet0;
 $585 = (___muldi3(($108|0),($109|0),($53|0),($54|0))|0);
 $586 = tempRet0;
 $587 = (_i64Add(($167|0),($168|0),1048576,0)|0);
 $588 = tempRet0;
 $589 = (_bitshift64Lshr(($587|0),($588|0),21)|0);
 $590 = tempRet0;
 $591 = (_i64Add(($169|0),($170|0),($171|0),($172|0))|0);
 $592 = tempRet0;
 $593 = (_i64Add(($591|0),($592|0),($117|0),0)|0);
 $594 = tempRet0;
 $595 = (_i64Add(($593|0),($594|0),($589|0),($590|0))|0);
 $596 = tempRet0;
 $597 = (_bitshift64Shl(($589|0),($590|0),21)|0);
 $598 = tempRet0;
 $599 = (_i64Subtract(($167|0),($168|0),($597|0),($598|0))|0);
 $600 = tempRet0;
 $601 = (_i64Add(($183|0),($184|0),1048576,0)|0);
 $602 = tempRet0;
 $603 = (_bitshift64Lshr(($601|0),($602|0),21)|0);
 $604 = tempRet0;
 $605 = (_i64Add(($189|0),($190|0),($191|0),($192|0))|0);
 $606 = tempRet0;
 $607 = (_i64Add(($605|0),($606|0),($187|0),($188|0))|0);
 $608 = tempRet0;
 $609 = (_i64Add(($607|0),($608|0),($185|0),($186|0))|0);
 $610 = tempRet0;
 $611 = (_i64Add(($609|0),($610|0),($127|0),0)|0);
 $612 = tempRet0;
 $613 = (_i64Add(($611|0),($612|0),($603|0),($604|0))|0);
 $614 = tempRet0;
 $615 = (_bitshift64Shl(($603|0),($604|0),21)|0);
 $616 = tempRet0;
 $617 = (_i64Add(($211|0),($212|0),1048576,0)|0);
 $618 = tempRet0;
 $619 = (_bitshift64Ashr(($617|0),($618|0),21)|0);
 $620 = tempRet0;
 $621 = (_i64Add(($221|0),($222|0),($223|0),($224|0))|0);
 $622 = tempRet0;
 $623 = (_i64Add(($621|0),($622|0),($219|0),($220|0))|0);
 $624 = tempRet0;
 $625 = (_i64Add(($623|0),($624|0),($217|0),($218|0))|0);
 $626 = tempRet0;
 $627 = (_i64Add(($625|0),($626|0),($215|0),($216|0))|0);
 $628 = tempRet0;
 $629 = (_i64Add(($627|0),($628|0),($213|0),($214|0))|0);
 $630 = tempRet0;
 $631 = (_i64Add(($629|0),($630|0),($137|0),0)|0);
 $632 = tempRet0;
 $633 = (_i64Add(($631|0),($632|0),($619|0),($620|0))|0);
 $634 = tempRet0;
 $635 = (_bitshift64Shl(($619|0),($620|0),21)|0);
 $636 = tempRet0;
 $637 = (_i64Add(($251|0),($252|0),1048576,0)|0);
 $638 = tempRet0;
 $639 = (_bitshift64Ashr(($637|0),($638|0),21)|0);
 $640 = tempRet0;
 $641 = (_i64Add(($265|0),($266|0),($267|0),($268|0))|0);
 $642 = tempRet0;
 $643 = (_i64Add(($641|0),($642|0),($263|0),($264|0))|0);
 $644 = tempRet0;
 $645 = (_i64Add(($643|0),($644|0),($261|0),($262|0))|0);
 $646 = tempRet0;
 $647 = (_i64Add(($645|0),($646|0),($259|0),($260|0))|0);
 $648 = tempRet0;
 $649 = (_i64Add(($647|0),($648|0),($257|0),($258|0))|0);
 $650 = tempRet0;
 $651 = (_i64Add(($649|0),($650|0),($255|0),($256|0))|0);
 $652 = tempRet0;
 $653 = (_i64Add(($651|0),($652|0),($253|0),($254|0))|0);
 $654 = tempRet0;
 $655 = (_i64Add(($653|0),($654|0),($147|0),0)|0);
 $656 = tempRet0;
 $657 = (_i64Add(($655|0),($656|0),($639|0),($640|0))|0);
 $658 = tempRet0;
 $659 = (_bitshift64Shl(($639|0),($640|0),21)|0);
 $660 = tempRet0;
 $661 = (_i64Add(($303|0),($304|0),1048576,0)|0);
 $662 = tempRet0;
 $663 = (_bitshift64Ashr(($661|0),($662|0),21)|0);
 $664 = tempRet0;
 $665 = (_i64Add(($321|0),($322|0),($323|0),($324|0))|0);
 $666 = tempRet0;
 $667 = (_i64Add(($665|0),($666|0),($319|0),($320|0))|0);
 $668 = tempRet0;
 $669 = (_i64Add(($667|0),($668|0),($317|0),($318|0))|0);
 $670 = tempRet0;
 $671 = (_i64Add(($669|0),($670|0),($315|0),($316|0))|0);
 $672 = tempRet0;
 $673 = (_i64Add(($671|0),($672|0),($313|0),($314|0))|0);
 $674 = tempRet0;
 $675 = (_i64Add(($673|0),($674|0),($311|0),($312|0))|0);
 $676 = tempRet0;
 $677 = (_i64Add(($675|0),($676|0),($307|0),($308|0))|0);
 $678 = tempRet0;
 $679 = (_i64Add(($677|0),($678|0),($309|0),($310|0))|0);
 $680 = tempRet0;
 $681 = (_i64Add(($679|0),($680|0),($305|0),($306|0))|0);
 $682 = tempRet0;
 $683 = (_i64Add(($681|0),($682|0),($155|0),0)|0);
 $684 = tempRet0;
 $685 = (_i64Add(($683|0),($684|0),($663|0),($664|0))|0);
 $686 = tempRet0;
 $687 = (_bitshift64Shl(($663|0),($664|0),21)|0);
 $688 = tempRet0;
 $689 = (_i64Add(($367|0),($368|0),1048576,0)|0);
 $690 = tempRet0;
 $691 = (_bitshift64Ashr(($689|0),($690|0),21)|0);
 $692 = tempRet0;
 $693 = (_i64Add(($389|0),($390|0),($391|0),($392|0))|0);
 $694 = tempRet0;
 $695 = (_i64Add(($693|0),($694|0),($387|0),($388|0))|0);
 $696 = tempRet0;
 $697 = (_i64Add(($695|0),($696|0),($385|0),($386|0))|0);
 $698 = tempRet0;
 $699 = (_i64Add(($697|0),($698|0),($383|0),($384|0))|0);
 $700 = tempRet0;
 $701 = (_i64Add(($699|0),($700|0),($381|0),($382|0))|0);
 $702 = tempRet0;
 $703 = (_i64Add(($701|0),($702|0),($379|0),($380|0))|0);
 $704 = tempRet0;
 $705 = (_i64Add(($703|0),($704|0),($375|0),($376|0))|0);
 $706 = tempRet0;
 $707 = (_i64Add(($705|0),($706|0),($377|0),($378|0))|0);
 $708 = tempRet0;
 $709 = (_i64Add(($707|0),($708|0),($373|0),($374|0))|0);
 $710 = tempRet0;
 $711 = (_i64Add(($709|0),($710|0),($369|0),($370|0))|0);
 $712 = tempRet0;
 $713 = (_i64Add(($711|0),($712|0),($371|0),($372|0))|0);
 $714 = tempRet0;
 $715 = (_i64Add(($713|0),($714|0),($163|0),($164|0))|0);
 $716 = tempRet0;
 $717 = (_i64Add(($715|0),($716|0),($691|0),($692|0))|0);
 $718 = tempRet0;
 $719 = (_bitshift64Shl(($691|0),($692|0),21)|0);
 $720 = tempRet0;
 $721 = (_i64Add(($433|0),($434|0),1048576,0)|0);
 $722 = tempRet0;
 $723 = (_bitshift64Ashr(($721|0),($722|0),21)|0);
 $724 = tempRet0;
 $725 = (_i64Add(($451|0),($452|0),($453|0),($454|0))|0);
 $726 = tempRet0;
 $727 = (_i64Add(($725|0),($726|0),($449|0),($450|0))|0);
 $728 = tempRet0;
 $729 = (_i64Add(($727|0),($728|0),($447|0),($448|0))|0);
 $730 = tempRet0;
 $731 = (_i64Add(($729|0),($730|0),($445|0),($446|0))|0);
 $732 = tempRet0;
 $733 = (_i64Add(($731|0),($732|0),($441|0),($442|0))|0);
 $734 = tempRet0;
 $735 = (_i64Add(($733|0),($734|0),($443|0),($444|0))|0);
 $736 = tempRet0;
 $737 = (_i64Add(($735|0),($736|0),($439|0),($440|0))|0);
 $738 = tempRet0;
 $739 = (_i64Add(($737|0),($738|0),($437|0),($438|0))|0);
 $740 = tempRet0;
 $741 = (_i64Add(($739|0),($740|0),($435|0),($436|0))|0);
 $742 = tempRet0;
 $743 = (_i64Add(($741|0),($742|0),($723|0),($724|0))|0);
 $744 = tempRet0;
 $745 = (_bitshift64Shl(($723|0),($724|0),21)|0);
 $746 = tempRet0;
 $747 = (_i64Add(($487|0),($488|0),1048576,0)|0);
 $748 = tempRet0;
 $749 = (_bitshift64Ashr(($747|0),($748|0),21)|0);
 $750 = tempRet0;
 $751 = (_i64Add(($501|0),($502|0),($503|0),($504|0))|0);
 $752 = tempRet0;
 $753 = (_i64Add(($751|0),($752|0),($499|0),($500|0))|0);
 $754 = tempRet0;
 $755 = (_i64Add(($753|0),($754|0),($495|0),($496|0))|0);
 $756 = tempRet0;
 $757 = (_i64Add(($755|0),($756|0),($497|0),($498|0))|0);
 $758 = tempRet0;
 $759 = (_i64Add(($757|0),($758|0),($493|0),($494|0))|0);
 $760 = tempRet0;
 $761 = (_i64Add(($759|0),($760|0),($491|0),($492|0))|0);
 $762 = tempRet0;
 $763 = (_i64Add(($761|0),($762|0),($489|0),($490|0))|0);
 $764 = tempRet0;
 $765 = (_i64Add(($763|0),($764|0),($749|0),($750|0))|0);
 $766 = tempRet0;
 $767 = (_bitshift64Shl(($749|0),($750|0),21)|0);
 $768 = tempRet0;
 $769 = (_i64Add(($529|0),($530|0),1048576,0)|0);
 $770 = tempRet0;
 $771 = (_bitshift64Ashr(($769|0),($770|0),21)|0);
 $772 = tempRet0;
 $773 = (_i64Add(($537|0),($538|0),($541|0),($542|0))|0);
 $774 = tempRet0;
 $775 = (_i64Add(($773|0),($774|0),($539|0),($540|0))|0);
 $776 = tempRet0;
 $777 = (_i64Add(($775|0),($776|0),($535|0),($536|0))|0);
 $778 = tempRet0;
 $779 = (_i64Add(($777|0),($778|0),($533|0),($534|0))|0);
 $780 = tempRet0;
 $781 = (_i64Add(($779|0),($780|0),($531|0),($532|0))|0);
 $782 = tempRet0;
 $783 = (_i64Add(($781|0),($782|0),($771|0),($772|0))|0);
 $784 = tempRet0;
 $785 = (_bitshift64Shl(($771|0),($772|0),21)|0);
 $786 = tempRet0;
 $787 = (_i64Add(($559|0),($560|0),1048576,0)|0);
 $788 = tempRet0;
 $789 = (_bitshift64Ashr(($787|0),($788|0),21)|0);
 $790 = tempRet0;
 $791 = (_i64Add(($565|0),($566|0),($567|0),($568|0))|0);
 $792 = tempRet0;
 $793 = (_i64Add(($791|0),($792|0),($563|0),($564|0))|0);
 $794 = tempRet0;
 $795 = (_i64Add(($793|0),($794|0),($561|0),($562|0))|0);
 $796 = tempRet0;
 $797 = (_i64Add(($795|0),($796|0),($789|0),($790|0))|0);
 $798 = tempRet0;
 $799 = (_bitshift64Shl(($789|0),($790|0),21)|0);
 $800 = tempRet0;
 $801 = (_i64Subtract(($559|0),($560|0),($799|0),($800|0))|0);
 $802 = tempRet0;
 $803 = (_i64Add(($577|0),($578|0),1048576,0)|0);
 $804 = tempRet0;
 $805 = (_bitshift64Lshr(($803|0),($804|0),21)|0);
 $806 = tempRet0;
 $807 = (_i64Add(($583|0),($584|0),($805|0),($806|0))|0);
 $808 = tempRet0;
 $809 = (_bitshift64Shl(($805|0),($806|0),21)|0);
 $810 = tempRet0;
 $811 = (_i64Subtract(($577|0),($578|0),($809|0),($810|0))|0);
 $812 = tempRet0;
 $813 = (_i64Add(($585|0),($586|0),1048576,0)|0);
 $814 = tempRet0;
 $815 = (_bitshift64Lshr(($813|0),($814|0),21)|0);
 $816 = tempRet0;
 $817 = (_bitshift64Shl(($815|0),($816|0),21)|0);
 $818 = tempRet0;
 $819 = (_i64Subtract(($585|0),($586|0),($817|0),($818|0))|0);
 $820 = tempRet0;
 $821 = (_i64Add(($595|0),($596|0),1048576,0)|0);
 $822 = tempRet0;
 $823 = (_bitshift64Lshr(($821|0),($822|0),21)|0);
 $824 = tempRet0;
 $825 = (_bitshift64Shl(($823|0),($824|0),21)|0);
 $826 = tempRet0;
 $827 = (_i64Subtract(($595|0),($596|0),($825|0),($826|0))|0);
 $828 = tempRet0;
 $829 = (_i64Add(($613|0),($614|0),1048576,0)|0);
 $830 = tempRet0;
 $831 = (_bitshift64Ashr(($829|0),($830|0),21)|0);
 $832 = tempRet0;
 $833 = (_bitshift64Shl(($831|0),($832|0),21)|0);
 $834 = tempRet0;
 $835 = (_i64Subtract(($613|0),($614|0),($833|0),($834|0))|0);
 $836 = tempRet0;
 $837 = (_i64Add(($633|0),($634|0),1048576,0)|0);
 $838 = tempRet0;
 $839 = (_bitshift64Ashr(($837|0),($838|0),21)|0);
 $840 = tempRet0;
 $841 = (_bitshift64Shl(($839|0),($840|0),21)|0);
 $842 = tempRet0;
 $843 = (_i64Subtract(($633|0),($634|0),($841|0),($842|0))|0);
 $844 = tempRet0;
 $845 = (_i64Add(($657|0),($658|0),1048576,0)|0);
 $846 = tempRet0;
 $847 = (_bitshift64Ashr(($845|0),($846|0),21)|0);
 $848 = tempRet0;
 $849 = (_bitshift64Shl(($847|0),($848|0),21)|0);
 $850 = tempRet0;
 $851 = (_i64Add(($685|0),($686|0),1048576,0)|0);
 $852 = tempRet0;
 $853 = (_bitshift64Ashr(($851|0),($852|0),21)|0);
 $854 = tempRet0;
 $855 = (_bitshift64Shl(($853|0),($854|0),21)|0);
 $856 = tempRet0;
 $857 = (_i64Add(($717|0),($718|0),1048576,0)|0);
 $858 = tempRet0;
 $859 = (_bitshift64Ashr(($857|0),($858|0),21)|0);
 $860 = tempRet0;
 $861 = (_bitshift64Shl(($859|0),($860|0),21)|0);
 $862 = tempRet0;
 $863 = (_i64Add(($743|0),($744|0),1048576,0)|0);
 $864 = tempRet0;
 $865 = (_bitshift64Ashr(($863|0),($864|0),21)|0);
 $866 = tempRet0;
 $867 = (_bitshift64Shl(($865|0),($866|0),21)|0);
 $868 = tempRet0;
 $869 = (_i64Add(($765|0),($766|0),1048576,0)|0);
 $870 = tempRet0;
 $871 = (_bitshift64Ashr(($869|0),($870|0),21)|0);
 $872 = tempRet0;
 $873 = (_bitshift64Shl(($871|0),($872|0),21)|0);
 $874 = tempRet0;
 $875 = (_i64Add(($783|0),($784|0),1048576,0)|0);
 $876 = tempRet0;
 $877 = (_bitshift64Ashr(($875|0),($876|0),21)|0);
 $878 = tempRet0;
 $879 = (_i64Add(($877|0),($878|0),($801|0),($802|0))|0);
 $880 = tempRet0;
 $881 = (_bitshift64Shl(($877|0),($878|0),21)|0);
 $882 = tempRet0;
 $883 = (_i64Subtract(($783|0),($784|0),($881|0),($882|0))|0);
 $884 = tempRet0;
 $885 = (_i64Add(($797|0),($798|0),1048576,0)|0);
 $886 = tempRet0;
 $887 = (_bitshift64Ashr(($885|0),($886|0),21)|0);
 $888 = tempRet0;
 $889 = (_i64Add(($887|0),($888|0),($811|0),($812|0))|0);
 $890 = tempRet0;
 $891 = (_bitshift64Shl(($887|0),($888|0),21)|0);
 $892 = tempRet0;
 $893 = (_i64Subtract(($797|0),($798|0),($891|0),($892|0))|0);
 $894 = tempRet0;
 $895 = (_i64Add(($807|0),($808|0),1048576,0)|0);
 $896 = tempRet0;
 $897 = (_bitshift64Lshr(($895|0),($896|0),21)|0);
 $898 = tempRet0;
 $899 = (_i64Add(($897|0),($898|0),($819|0),($820|0))|0);
 $900 = tempRet0;
 $901 = (_bitshift64Shl(($897|0),($898|0),21)|0);
 $902 = tempRet0;
 $903 = (_i64Subtract(($807|0),($808|0),($901|0),($902|0))|0);
 $904 = tempRet0;
 $905 = (___muldi3(($815|0),($816|0),666643,0)|0);
 $906 = tempRet0;
 $907 = (___muldi3(($815|0),($816|0),470296,0)|0);
 $908 = tempRet0;
 $909 = (___muldi3(($815|0),($816|0),654183,0)|0);
 $910 = tempRet0;
 $911 = (___muldi3(($815|0),($816|0),-997805,-1)|0);
 $912 = tempRet0;
 $913 = (___muldi3(($815|0),($816|0),136657,0)|0);
 $914 = tempRet0;
 $915 = (___muldi3(($815|0),($816|0),-683901,-1)|0);
 $916 = tempRet0;
 $917 = (_i64Add(($529|0),($530|0),($915|0),($916|0))|0);
 $918 = tempRet0;
 $919 = (_i64Subtract(($917|0),($918|0),($785|0),($786|0))|0);
 $920 = tempRet0;
 $921 = (_i64Add(($919|0),($920|0),($871|0),($872|0))|0);
 $922 = tempRet0;
 $923 = (___muldi3(($899|0),($900|0),666643,0)|0);
 $924 = tempRet0;
 $925 = (___muldi3(($899|0),($900|0),470296,0)|0);
 $926 = tempRet0;
 $927 = (___muldi3(($899|0),($900|0),654183,0)|0);
 $928 = tempRet0;
 $929 = (___muldi3(($899|0),($900|0),-997805,-1)|0);
 $930 = tempRet0;
 $931 = (___muldi3(($899|0),($900|0),136657,0)|0);
 $932 = tempRet0;
 $933 = (___muldi3(($899|0),($900|0),-683901,-1)|0);
 $934 = tempRet0;
 $935 = (___muldi3(($903|0),($904|0),666643,0)|0);
 $936 = tempRet0;
 $937 = (___muldi3(($903|0),($904|0),470296,0)|0);
 $938 = tempRet0;
 $939 = (___muldi3(($903|0),($904|0),654183,0)|0);
 $940 = tempRet0;
 $941 = (___muldi3(($903|0),($904|0),-997805,-1)|0);
 $942 = tempRet0;
 $943 = (___muldi3(($903|0),($904|0),136657,0)|0);
 $944 = tempRet0;
 $945 = (___muldi3(($903|0),($904|0),-683901,-1)|0);
 $946 = tempRet0;
 $947 = (_i64Add(($487|0),($488|0),($911|0),($912|0))|0);
 $948 = tempRet0;
 $949 = (_i64Add(($947|0),($948|0),($931|0),($932|0))|0);
 $950 = tempRet0;
 $951 = (_i64Add(($949|0),($950|0),($945|0),($946|0))|0);
 $952 = tempRet0;
 $953 = (_i64Subtract(($951|0),($952|0),($767|0),($768|0))|0);
 $954 = tempRet0;
 $955 = (_i64Add(($953|0),($954|0),($865|0),($866|0))|0);
 $956 = tempRet0;
 $957 = (___muldi3(($889|0),($890|0),666643,0)|0);
 $958 = tempRet0;
 $959 = (___muldi3(($889|0),($890|0),470296,0)|0);
 $960 = tempRet0;
 $961 = (___muldi3(($889|0),($890|0),654183,0)|0);
 $962 = tempRet0;
 $963 = (___muldi3(($889|0),($890|0),-997805,-1)|0);
 $964 = tempRet0;
 $965 = (___muldi3(($889|0),($890|0),136657,0)|0);
 $966 = tempRet0;
 $967 = (___muldi3(($889|0),($890|0),-683901,-1)|0);
 $968 = tempRet0;
 $969 = (___muldi3(($893|0),($894|0),666643,0)|0);
 $970 = tempRet0;
 $971 = (___muldi3(($893|0),($894|0),470296,0)|0);
 $972 = tempRet0;
 $973 = (___muldi3(($893|0),($894|0),654183,0)|0);
 $974 = tempRet0;
 $975 = (___muldi3(($893|0),($894|0),-997805,-1)|0);
 $976 = tempRet0;
 $977 = (___muldi3(($893|0),($894|0),136657,0)|0);
 $978 = tempRet0;
 $979 = (___muldi3(($893|0),($894|0),-683901,-1)|0);
 $980 = tempRet0;
 $981 = (_i64Add(($927|0),($928|0),($907|0),($908|0))|0);
 $982 = tempRet0;
 $983 = (_i64Add(($981|0),($982|0),($433|0),($434|0))|0);
 $984 = tempRet0;
 $985 = (_i64Add(($983|0),($984|0),($941|0),($942|0))|0);
 $986 = tempRet0;
 $987 = (_i64Add(($985|0),($986|0),($965|0),($966|0))|0);
 $988 = tempRet0;
 $989 = (_i64Add(($987|0),($988|0),($979|0),($980|0))|0);
 $990 = tempRet0;
 $991 = (_i64Subtract(($989|0),($990|0),($745|0),($746|0))|0);
 $992 = tempRet0;
 $993 = (_i64Add(($991|0),($992|0),($859|0),($860|0))|0);
 $994 = tempRet0;
 $995 = (___muldi3(($879|0),($880|0),666643,0)|0);
 $996 = tempRet0;
 $997 = (_i64Add(($251|0),($252|0),($995|0),($996|0))|0);
 $998 = tempRet0;
 $999 = (_i64Add(($997|0),($998|0),($839|0),($840|0))|0);
 $1000 = tempRet0;
 $1001 = (_i64Subtract(($999|0),($1000|0),($659|0),($660|0))|0);
 $1002 = tempRet0;
 $1003 = (___muldi3(($879|0),($880|0),470296,0)|0);
 $1004 = tempRet0;
 $1005 = (___muldi3(($879|0),($880|0),654183,0)|0);
 $1006 = tempRet0;
 $1007 = (_i64Add(($971|0),($972|0),($957|0),($958|0))|0);
 $1008 = tempRet0;
 $1009 = (_i64Add(($1007|0),($1008|0),($1005|0),($1006|0))|0);
 $1010 = tempRet0;
 $1011 = (_i64Add(($1009|0),($1010|0),($303|0),($304|0))|0);
 $1012 = tempRet0;
 $1013 = (_i64Add(($1011|0),($1012|0),($847|0),($848|0))|0);
 $1014 = tempRet0;
 $1015 = (_i64Subtract(($1013|0),($1014|0),($687|0),($688|0))|0);
 $1016 = tempRet0;
 $1017 = (___muldi3(($879|0),($880|0),-997805,-1)|0);
 $1018 = tempRet0;
 $1019 = (___muldi3(($879|0),($880|0),136657,0)|0);
 $1020 = tempRet0;
 $1021 = (_i64Add(($937|0),($938|0),($923|0),($924|0))|0);
 $1022 = tempRet0;
 $1023 = (_i64Add(($1021|0),($1022|0),($961|0),($962|0))|0);
 $1024 = tempRet0;
 $1025 = (_i64Add(($1023|0),($1024|0),($975|0),($976|0))|0);
 $1026 = tempRet0;
 $1027 = (_i64Add(($1025|0),($1026|0),($1019|0),($1020|0))|0);
 $1028 = tempRet0;
 $1029 = (_i64Add(($1027|0),($1028|0),($367|0),($368|0))|0);
 $1030 = tempRet0;
 $1031 = (_i64Add(($1029|0),($1030|0),($853|0),($854|0))|0);
 $1032 = tempRet0;
 $1033 = (_i64Subtract(($1031|0),($1032|0),($719|0),($720|0))|0);
 $1034 = tempRet0;
 $1035 = (___muldi3(($879|0),($880|0),-683901,-1)|0);
 $1036 = tempRet0;
 $1037 = (_i64Add(($1001|0),($1002|0),1048576,0)|0);
 $1038 = tempRet0;
 $1039 = (_bitshift64Ashr(($1037|0),($1038|0),21)|0);
 $1040 = tempRet0;
 $1041 = (_i64Add(($1003|0),($1004|0),($969|0),($970|0))|0);
 $1042 = tempRet0;
 $1043 = (_i64Add(($1041|0),($1042|0),($657|0),($658|0))|0);
 $1044 = tempRet0;
 $1045 = (_i64Subtract(($1043|0),($1044|0),($849|0),($850|0))|0);
 $1046 = tempRet0;
 $1047 = (_i64Add(($1045|0),($1046|0),($1039|0),($1040|0))|0);
 $1048 = tempRet0;
 $1049 = (_bitshift64Shl(($1039|0),($1040|0),21)|0);
 $1050 = tempRet0;
 $1051 = (_i64Add(($1015|0),($1016|0),1048576,0)|0);
 $1052 = tempRet0;
 $1053 = (_bitshift64Ashr(($1051|0),($1052|0),21)|0);
 $1054 = tempRet0;
 $1055 = (_i64Add(($959|0),($960|0),($935|0),($936|0))|0);
 $1056 = tempRet0;
 $1057 = (_i64Add(($1055|0),($1056|0),($973|0),($974|0))|0);
 $1058 = tempRet0;
 $1059 = (_i64Add(($1057|0),($1058|0),($1017|0),($1018|0))|0);
 $1060 = tempRet0;
 $1061 = (_i64Add(($1059|0),($1060|0),($685|0),($686|0))|0);
 $1062 = tempRet0;
 $1063 = (_i64Subtract(($1061|0),($1062|0),($855|0),($856|0))|0);
 $1064 = tempRet0;
 $1065 = (_i64Add(($1063|0),($1064|0),($1053|0),($1054|0))|0);
 $1066 = tempRet0;
 $1067 = (_bitshift64Shl(($1053|0),($1054|0),21)|0);
 $1068 = tempRet0;
 $1069 = (_i64Add(($1033|0),($1034|0),1048576,0)|0);
 $1070 = tempRet0;
 $1071 = (_bitshift64Ashr(($1069|0),($1070|0),21)|0);
 $1072 = tempRet0;
 $1073 = (_i64Add(($925|0),($926|0),($905|0),($906|0))|0);
 $1074 = tempRet0;
 $1075 = (_i64Add(($1073|0),($1074|0),($939|0),($940|0))|0);
 $1076 = tempRet0;
 $1077 = (_i64Add(($1075|0),($1076|0),($963|0),($964|0))|0);
 $1078 = tempRet0;
 $1079 = (_i64Add(($1077|0),($1078|0),($977|0),($978|0))|0);
 $1080 = tempRet0;
 $1081 = (_i64Add(($1079|0),($1080|0),($1035|0),($1036|0))|0);
 $1082 = tempRet0;
 $1083 = (_i64Add(($1081|0),($1082|0),($717|0),($718|0))|0);
 $1084 = tempRet0;
 $1085 = (_i64Subtract(($1083|0),($1084|0),($861|0),($862|0))|0);
 $1086 = tempRet0;
 $1087 = (_i64Add(($1085|0),($1086|0),($1071|0),($1072|0))|0);
 $1088 = tempRet0;
 $1089 = (_bitshift64Shl(($1071|0),($1072|0),21)|0);
 $1090 = tempRet0;
 $1091 = (_i64Add(($993|0),($994|0),1048576,0)|0);
 $1092 = tempRet0;
 $1093 = (_bitshift64Ashr(($1091|0),($1092|0),21)|0);
 $1094 = tempRet0;
 $1095 = (_i64Add(($929|0),($930|0),($909|0),($910|0))|0);
 $1096 = tempRet0;
 $1097 = (_i64Add(($1095|0),($1096|0),($943|0),($944|0))|0);
 $1098 = tempRet0;
 $1099 = (_i64Add(($1097|0),($1098|0),($967|0),($968|0))|0);
 $1100 = tempRet0;
 $1101 = (_i64Add(($1099|0),($1100|0),($743|0),($744|0))|0);
 $1102 = tempRet0;
 $1103 = (_i64Subtract(($1101|0),($1102|0),($867|0),($868|0))|0);
 $1104 = tempRet0;
 $1105 = (_i64Add(($1103|0),($1104|0),($1093|0),($1094|0))|0);
 $1106 = tempRet0;
 $1107 = (_bitshift64Shl(($1093|0),($1094|0),21)|0);
 $1108 = tempRet0;
 $1109 = (_i64Subtract(($993|0),($994|0),($1107|0),($1108|0))|0);
 $1110 = tempRet0;
 $1111 = (_i64Add(($955|0),($956|0),1048576,0)|0);
 $1112 = tempRet0;
 $1113 = (_bitshift64Ashr(($1111|0),($1112|0),21)|0);
 $1114 = tempRet0;
 $1115 = (_i64Add(($933|0),($934|0),($913|0),($914|0))|0);
 $1116 = tempRet0;
 $1117 = (_i64Add(($1115|0),($1116|0),($765|0),($766|0))|0);
 $1118 = tempRet0;
 $1119 = (_i64Subtract(($1117|0),($1118|0),($873|0),($874|0))|0);
 $1120 = tempRet0;
 $1121 = (_i64Add(($1119|0),($1120|0),($1113|0),($1114|0))|0);
 $1122 = tempRet0;
 $1123 = (_bitshift64Shl(($1113|0),($1114|0),21)|0);
 $1124 = tempRet0;
 $1125 = (_i64Subtract(($955|0),($956|0),($1123|0),($1124|0))|0);
 $1126 = tempRet0;
 $1127 = (_i64Add(($921|0),($922|0),1048576,0)|0);
 $1128 = tempRet0;
 $1129 = (_bitshift64Ashr(($1127|0),($1128|0),21)|0);
 $1130 = tempRet0;
 $1131 = (_i64Add(($1129|0),($1130|0),($883|0),($884|0))|0);
 $1132 = tempRet0;
 $1133 = (_bitshift64Shl(($1129|0),($1130|0),21)|0);
 $1134 = tempRet0;
 $1135 = (_i64Subtract(($921|0),($922|0),($1133|0),($1134|0))|0);
 $1136 = tempRet0;
 $1137 = (_i64Add(($1047|0),($1048|0),1048576,0)|0);
 $1138 = tempRet0;
 $1139 = (_bitshift64Ashr(($1137|0),($1138|0),21)|0);
 $1140 = tempRet0;
 $1141 = (_bitshift64Shl(($1139|0),($1140|0),21)|0);
 $1142 = tempRet0;
 $1143 = (_i64Add(($1065|0),($1066|0),1048576,0)|0);
 $1144 = tempRet0;
 $1145 = (_bitshift64Ashr(($1143|0),($1144|0),21)|0);
 $1146 = tempRet0;
 $1147 = (_bitshift64Shl(($1145|0),($1146|0),21)|0);
 $1148 = tempRet0;
 $1149 = (_i64Add(($1087|0),($1088|0),1048576,0)|0);
 $1150 = tempRet0;
 $1151 = (_bitshift64Ashr(($1149|0),($1150|0),21)|0);
 $1152 = tempRet0;
 $1153 = (_i64Add(($1151|0),($1152|0),($1109|0),($1110|0))|0);
 $1154 = tempRet0;
 $1155 = (_bitshift64Shl(($1151|0),($1152|0),21)|0);
 $1156 = tempRet0;
 $1157 = (_i64Subtract(($1087|0),($1088|0),($1155|0),($1156|0))|0);
 $1158 = tempRet0;
 $1159 = (_i64Add(($1105|0),($1106|0),1048576,0)|0);
 $1160 = tempRet0;
 $1161 = (_bitshift64Ashr(($1159|0),($1160|0),21)|0);
 $1162 = tempRet0;
 $1163 = (_i64Add(($1161|0),($1162|0),($1125|0),($1126|0))|0);
 $1164 = tempRet0;
 $1165 = (_bitshift64Shl(($1161|0),($1162|0),21)|0);
 $1166 = tempRet0;
 $1167 = (_i64Subtract(($1105|0),($1106|0),($1165|0),($1166|0))|0);
 $1168 = tempRet0;
 $1169 = (_i64Add(($1121|0),($1122|0),1048576,0)|0);
 $1170 = tempRet0;
 $1171 = (_bitshift64Ashr(($1169|0),($1170|0),21)|0);
 $1172 = tempRet0;
 $1173 = (_i64Add(($1171|0),($1172|0),($1135|0),($1136|0))|0);
 $1174 = tempRet0;
 $1175 = (_bitshift64Shl(($1171|0),($1172|0),21)|0);
 $1176 = tempRet0;
 $1177 = (_i64Subtract(($1121|0),($1122|0),($1175|0),($1176|0))|0);
 $1178 = tempRet0;
 $1179 = (___muldi3(($1131|0),($1132|0),666643,0)|0);
 $1180 = tempRet0;
 $1181 = (_i64Add(($843|0),($844|0),($1179|0),($1180|0))|0);
 $1182 = tempRet0;
 $1183 = (___muldi3(($1131|0),($1132|0),470296,0)|0);
 $1184 = tempRet0;
 $1185 = (___muldi3(($1131|0),($1132|0),654183,0)|0);
 $1186 = tempRet0;
 $1187 = (___muldi3(($1131|0),($1132|0),-997805,-1)|0);
 $1188 = tempRet0;
 $1189 = (___muldi3(($1131|0),($1132|0),136657,0)|0);
 $1190 = tempRet0;
 $1191 = (___muldi3(($1131|0),($1132|0),-683901,-1)|0);
 $1192 = tempRet0;
 $1193 = (_i64Add(($1033|0),($1034|0),($1191|0),($1192|0))|0);
 $1194 = tempRet0;
 $1195 = (_i64Add(($1193|0),($1194|0),($1145|0),($1146|0))|0);
 $1196 = tempRet0;
 $1197 = (_i64Subtract(($1195|0),($1196|0),($1089|0),($1090|0))|0);
 $1198 = tempRet0;
 $1199 = (___muldi3(($1173|0),($1174|0),666643,0)|0);
 $1200 = tempRet0;
 $1201 = (___muldi3(($1173|0),($1174|0),470296,0)|0);
 $1202 = tempRet0;
 $1203 = (_i64Add(($1181|0),($1182|0),($1201|0),($1202|0))|0);
 $1204 = tempRet0;
 $1205 = (___muldi3(($1173|0),($1174|0),654183,0)|0);
 $1206 = tempRet0;
 $1207 = (___muldi3(($1173|0),($1174|0),-997805,-1)|0);
 $1208 = tempRet0;
 $1209 = (___muldi3(($1173|0),($1174|0),136657,0)|0);
 $1210 = tempRet0;
 $1211 = (___muldi3(($1173|0),($1174|0),-683901,-1)|0);
 $1212 = tempRet0;
 $1213 = (___muldi3(($1177|0),($1178|0),666643,0)|0);
 $1214 = tempRet0;
 $1215 = (_i64Add(($835|0),($836|0),($1213|0),($1214|0))|0);
 $1216 = tempRet0;
 $1217 = (___muldi3(($1177|0),($1178|0),470296,0)|0);
 $1218 = tempRet0;
 $1219 = (___muldi3(($1177|0),($1178|0),654183,0)|0);
 $1220 = tempRet0;
 $1221 = (_i64Add(($1203|0),($1204|0),($1219|0),($1220|0))|0);
 $1222 = tempRet0;
 $1223 = (___muldi3(($1177|0),($1178|0),-997805,-1)|0);
 $1224 = tempRet0;
 $1225 = (___muldi3(($1177|0),($1178|0),136657,0)|0);
 $1226 = tempRet0;
 $1227 = (___muldi3(($1177|0),($1178|0),-683901,-1)|0);
 $1228 = tempRet0;
 $1229 = (_i64Add(($1015|0),($1016|0),($1187|0),($1188|0))|0);
 $1230 = tempRet0;
 $1231 = (_i64Add(($1229|0),($1230|0),($1139|0),($1140|0))|0);
 $1232 = tempRet0;
 $1233 = (_i64Add(($1231|0),($1232|0),($1209|0),($1210|0))|0);
 $1234 = tempRet0;
 $1235 = (_i64Add(($1233|0),($1234|0),($1227|0),($1228|0))|0);
 $1236 = tempRet0;
 $1237 = (_i64Subtract(($1235|0),($1236|0),($1067|0),($1068|0))|0);
 $1238 = tempRet0;
 $1239 = (___muldi3(($1163|0),($1164|0),666643,0)|0);
 $1240 = tempRet0;
 $1241 = (___muldi3(($1163|0),($1164|0),470296,0)|0);
 $1242 = tempRet0;
 $1243 = (_i64Add(($1215|0),($1216|0),($1241|0),($1242|0))|0);
 $1244 = tempRet0;
 $1245 = (___muldi3(($1163|0),($1164|0),654183,0)|0);
 $1246 = tempRet0;
 $1247 = (___muldi3(($1163|0),($1164|0),-997805,-1)|0);
 $1248 = tempRet0;
 $1249 = (_i64Add(($1221|0),($1222|0),($1247|0),($1248|0))|0);
 $1250 = tempRet0;
 $1251 = (___muldi3(($1163|0),($1164|0),136657,0)|0);
 $1252 = tempRet0;
 $1253 = (___muldi3(($1163|0),($1164|0),-683901,-1)|0);
 $1254 = tempRet0;
 $1255 = (___muldi3(($1167|0),($1168|0),666643,0)|0);
 $1256 = tempRet0;
 $1257 = (___muldi3(($1167|0),($1168|0),470296,0)|0);
 $1258 = tempRet0;
 $1259 = (___muldi3(($1167|0),($1168|0),654183,0)|0);
 $1260 = tempRet0;
 $1261 = (___muldi3(($1167|0),($1168|0),-997805,-1)|0);
 $1262 = tempRet0;
 $1263 = (___muldi3(($1167|0),($1168|0),136657,0)|0);
 $1264 = tempRet0;
 $1265 = (___muldi3(($1167|0),($1168|0),-683901,-1)|0);
 $1266 = tempRet0;
 $1267 = (_i64Add(($1001|0),($1002|0),($1183|0),($1184|0))|0);
 $1268 = tempRet0;
 $1269 = (_i64Subtract(($1267|0),($1268|0),($1049|0),($1050|0))|0);
 $1270 = tempRet0;
 $1271 = (_i64Add(($1269|0),($1270|0),($1205|0),($1206|0))|0);
 $1272 = tempRet0;
 $1273 = (_i64Add(($1271|0),($1272|0),($1223|0),($1224|0))|0);
 $1274 = tempRet0;
 $1275 = (_i64Add(($1273|0),($1274|0),($1251|0),($1252|0))|0);
 $1276 = tempRet0;
 $1277 = (_i64Add(($1275|0),($1276|0),($1265|0),($1266|0))|0);
 $1278 = tempRet0;
 $1279 = (___muldi3(($1153|0),($1154|0),666643,0)|0);
 $1280 = tempRet0;
 $1281 = (_i64Add(($1279|0),($1280|0),($599|0),($600|0))|0);
 $1282 = tempRet0;
 $1283 = (___muldi3(($1153|0),($1154|0),470296,0)|0);
 $1284 = tempRet0;
 $1285 = (___muldi3(($1153|0),($1154|0),654183,0)|0);
 $1286 = tempRet0;
 $1287 = (_i64Add(($823|0),($824|0),($183|0),($184|0))|0);
 $1288 = tempRet0;
 $1289 = (_i64Subtract(($1287|0),($1288|0),($615|0),($616|0))|0);
 $1290 = tempRet0;
 $1291 = (_i64Add(($1289|0),($1290|0),($1239|0),($1240|0))|0);
 $1292 = tempRet0;
 $1293 = (_i64Add(($1291|0),($1292|0),($1285|0),($1286|0))|0);
 $1294 = tempRet0;
 $1295 = (_i64Add(($1293|0),($1294|0),($1257|0),($1258|0))|0);
 $1296 = tempRet0;
 $1297 = (___muldi3(($1153|0),($1154|0),-997805,-1)|0);
 $1298 = tempRet0;
 $1299 = (___muldi3(($1153|0),($1154|0),136657,0)|0);
 $1300 = tempRet0;
 $1301 = (_i64Add(($831|0),($832|0),($211|0),($212|0))|0);
 $1302 = tempRet0;
 $1303 = (_i64Subtract(($1301|0),($1302|0),($635|0),($636|0))|0);
 $1304 = tempRet0;
 $1305 = (_i64Add(($1303|0),($1304|0),($1199|0),($1200|0))|0);
 $1306 = tempRet0;
 $1307 = (_i64Add(($1305|0),($1306|0),($1217|0),($1218|0))|0);
 $1308 = tempRet0;
 $1309 = (_i64Add(($1307|0),($1308|0),($1245|0),($1246|0))|0);
 $1310 = tempRet0;
 $1311 = (_i64Add(($1309|0),($1310|0),($1299|0),($1300|0))|0);
 $1312 = tempRet0;
 $1313 = (_i64Add(($1311|0),($1312|0),($1261|0),($1262|0))|0);
 $1314 = tempRet0;
 $1315 = (___muldi3(($1153|0),($1154|0),-683901,-1)|0);
 $1316 = tempRet0;
 $1317 = (_i64Add(($1281|0),($1282|0),1048576,0)|0);
 $1318 = tempRet0;
 $1319 = (_bitshift64Ashr(($1317|0),($1318|0),21)|0);
 $1320 = tempRet0;
 $1321 = (_i64Add(($827|0),($828|0),($1283|0),($1284|0))|0);
 $1322 = tempRet0;
 $1323 = (_i64Add(($1321|0),($1322|0),($1255|0),($1256|0))|0);
 $1324 = tempRet0;
 $1325 = (_i64Add(($1323|0),($1324|0),($1319|0),($1320|0))|0);
 $1326 = tempRet0;
 $1327 = (_bitshift64Shl(($1319|0),($1320|0),21)|0);
 $1328 = tempRet0;
 $1329 = (_i64Subtract(($1281|0),($1282|0),($1327|0),($1328|0))|0);
 $1330 = tempRet0;
 $1331 = (_i64Add(($1295|0),($1296|0),1048576,0)|0);
 $1332 = tempRet0;
 $1333 = (_bitshift64Ashr(($1331|0),($1332|0),21)|0);
 $1334 = tempRet0;
 $1335 = (_i64Add(($1243|0),($1244|0),($1297|0),($1298|0))|0);
 $1336 = tempRet0;
 $1337 = (_i64Add(($1335|0),($1336|0),($1259|0),($1260|0))|0);
 $1338 = tempRet0;
 $1339 = (_i64Add(($1337|0),($1338|0),($1333|0),($1334|0))|0);
 $1340 = tempRet0;
 $1341 = (_bitshift64Shl(($1333|0),($1334|0),21)|0);
 $1342 = tempRet0;
 $1343 = (_i64Add(($1313|0),($1314|0),1048576,0)|0);
 $1344 = tempRet0;
 $1345 = (_bitshift64Ashr(($1343|0),($1344|0),21)|0);
 $1346 = tempRet0;
 $1347 = (_i64Add(($1249|0),($1250|0),($1315|0),($1316|0))|0);
 $1348 = tempRet0;
 $1349 = (_i64Add(($1347|0),($1348|0),($1263|0),($1264|0))|0);
 $1350 = tempRet0;
 $1351 = (_i64Add(($1349|0),($1350|0),($1345|0),($1346|0))|0);
 $1352 = tempRet0;
 $1353 = (_bitshift64Shl(($1345|0),($1346|0),21)|0);
 $1354 = tempRet0;
 $1355 = (_i64Add(($1277|0),($1278|0),1048576,0)|0);
 $1356 = tempRet0;
 $1357 = (_bitshift64Ashr(($1355|0),($1356|0),21)|0);
 $1358 = tempRet0;
 $1359 = (_i64Add(($1047|0),($1048|0),($1185|0),($1186|0))|0);
 $1360 = tempRet0;
 $1361 = (_i64Add(($1359|0),($1360|0),($1207|0),($1208|0))|0);
 $1362 = tempRet0;
 $1363 = (_i64Subtract(($1361|0),($1362|0),($1141|0),($1142|0))|0);
 $1364 = tempRet0;
 $1365 = (_i64Add(($1363|0),($1364|0),($1225|0),($1226|0))|0);
 $1366 = tempRet0;
 $1367 = (_i64Add(($1365|0),($1366|0),($1253|0),($1254|0))|0);
 $1368 = tempRet0;
 $1369 = (_i64Add(($1367|0),($1368|0),($1357|0),($1358|0))|0);
 $1370 = tempRet0;
 $1371 = (_bitshift64Shl(($1357|0),($1358|0),21)|0);
 $1372 = tempRet0;
 $1373 = (_i64Subtract(($1277|0),($1278|0),($1371|0),($1372|0))|0);
 $1374 = tempRet0;
 $1375 = (_i64Add(($1237|0),($1238|0),1048576,0)|0);
 $1376 = tempRet0;
 $1377 = (_bitshift64Ashr(($1375|0),($1376|0),21)|0);
 $1378 = tempRet0;
 $1379 = (_i64Add(($1211|0),($1212|0),($1189|0),($1190|0))|0);
 $1380 = tempRet0;
 $1381 = (_i64Add(($1379|0),($1380|0),($1065|0),($1066|0))|0);
 $1382 = tempRet0;
 $1383 = (_i64Subtract(($1381|0),($1382|0),($1147|0),($1148|0))|0);
 $1384 = tempRet0;
 $1385 = (_i64Add(($1383|0),($1384|0),($1377|0),($1378|0))|0);
 $1386 = tempRet0;
 $1387 = (_bitshift64Shl(($1377|0),($1378|0),21)|0);
 $1388 = tempRet0;
 $1389 = (_i64Subtract(($1237|0),($1238|0),($1387|0),($1388|0))|0);
 $1390 = tempRet0;
 $1391 = (_i64Add(($1197|0),($1198|0),1048576,0)|0);
 $1392 = tempRet0;
 $1393 = (_bitshift64Ashr(($1391|0),($1392|0),21)|0);
 $1394 = tempRet0;
 $1395 = (_i64Add(($1157|0),($1158|0),($1393|0),($1394|0))|0);
 $1396 = tempRet0;
 $1397 = (_bitshift64Shl(($1393|0),($1394|0),21)|0);
 $1398 = tempRet0;
 $1399 = (_i64Add(($1325|0),($1326|0),1048576,0)|0);
 $1400 = tempRet0;
 $1401 = (_bitshift64Ashr(($1399|0),($1400|0),21)|0);
 $1402 = tempRet0;
 $1403 = (_bitshift64Shl(($1401|0),($1402|0),21)|0);
 $1404 = tempRet0;
 $1405 = (_i64Add(($1339|0),($1340|0),1048576,0)|0);
 $1406 = tempRet0;
 $1407 = (_bitshift64Ashr(($1405|0),($1406|0),21)|0);
 $1408 = tempRet0;
 $1409 = (_bitshift64Shl(($1407|0),($1408|0),21)|0);
 $1410 = tempRet0;
 $1411 = (_i64Add(($1351|0),($1352|0),1048576,0)|0);
 $1412 = tempRet0;
 $1413 = (_bitshift64Ashr(($1411|0),($1412|0),21)|0);
 $1414 = tempRet0;
 $1415 = (_i64Add(($1373|0),($1374|0),($1413|0),($1414|0))|0);
 $1416 = tempRet0;
 $1417 = (_bitshift64Shl(($1413|0),($1414|0),21)|0);
 $1418 = tempRet0;
 $1419 = (_i64Add(($1369|0),($1370|0),1048576,0)|0);
 $1420 = tempRet0;
 $1421 = (_bitshift64Ashr(($1419|0),($1420|0),21)|0);
 $1422 = tempRet0;
 $1423 = (_i64Add(($1389|0),($1390|0),($1421|0),($1422|0))|0);
 $1424 = tempRet0;
 $1425 = (_bitshift64Shl(($1421|0),($1422|0),21)|0);
 $1426 = tempRet0;
 $1427 = (_i64Subtract(($1369|0),($1370|0),($1425|0),($1426|0))|0);
 $1428 = tempRet0;
 $1429 = (_i64Add(($1385|0),($1386|0),1048576,0)|0);
 $1430 = tempRet0;
 $1431 = (_bitshift64Ashr(($1429|0),($1430|0),21)|0);
 $1432 = tempRet0;
 $1433 = (_bitshift64Shl(($1431|0),($1432|0),21)|0);
 $1434 = tempRet0;
 $1435 = (_i64Subtract(($1385|0),($1386|0),($1433|0),($1434|0))|0);
 $1436 = tempRet0;
 $1437 = (_i64Add(($1395|0),($1396|0),1048576,0)|0);
 $1438 = tempRet0;
 $1439 = (_bitshift64Ashr(($1437|0),($1438|0),21)|0);
 $1440 = tempRet0;
 $1441 = (_bitshift64Shl(($1439|0),($1440|0),21)|0);
 $1442 = tempRet0;
 $1443 = (_i64Subtract(($1395|0),($1396|0),($1441|0),($1442|0))|0);
 $1444 = tempRet0;
 $1445 = (___muldi3(($1439|0),($1440|0),666643,0)|0);
 $1446 = tempRet0;
 $1447 = (_i64Add(($1329|0),($1330|0),($1445|0),($1446|0))|0);
 $1448 = tempRet0;
 $1449 = (___muldi3(($1439|0),($1440|0),470296,0)|0);
 $1450 = tempRet0;
 $1451 = (___muldi3(($1439|0),($1440|0),654183,0)|0);
 $1452 = tempRet0;
 $1453 = (___muldi3(($1439|0),($1440|0),-997805,-1)|0);
 $1454 = tempRet0;
 $1455 = (___muldi3(($1439|0),($1440|0),136657,0)|0);
 $1456 = tempRet0;
 $1457 = (___muldi3(($1439|0),($1440|0),-683901,-1)|0);
 $1458 = tempRet0;
 $1459 = (_bitshift64Ashr(($1447|0),($1448|0),21)|0);
 $1460 = tempRet0;
 $1461 = (_i64Add(($1449|0),($1450|0),($1325|0),($1326|0))|0);
 $1462 = tempRet0;
 $1463 = (_i64Subtract(($1461|0),($1462|0),($1403|0),($1404|0))|0);
 $1464 = tempRet0;
 $1465 = (_i64Add(($1463|0),($1464|0),($1459|0),($1460|0))|0);
 $1466 = tempRet0;
 $1467 = (_bitshift64Shl(($1459|0),($1460|0),21)|0);
 $1468 = tempRet0;
 $1469 = (_i64Subtract(($1447|0),($1448|0),($1467|0),($1468|0))|0);
 $1470 = tempRet0;
 $1471 = (_bitshift64Ashr(($1465|0),($1466|0),21)|0);
 $1472 = tempRet0;
 $1473 = (_i64Add(($1451|0),($1452|0),($1295|0),($1296|0))|0);
 $1474 = tempRet0;
 $1475 = (_i64Subtract(($1473|0),($1474|0),($1341|0),($1342|0))|0);
 $1476 = tempRet0;
 $1477 = (_i64Add(($1475|0),($1476|0),($1401|0),($1402|0))|0);
 $1478 = tempRet0;
 $1479 = (_i64Add(($1477|0),($1478|0),($1471|0),($1472|0))|0);
 $1480 = tempRet0;
 $1481 = (_bitshift64Shl(($1471|0),($1472|0),21)|0);
 $1482 = tempRet0;
 $1483 = (_i64Subtract(($1465|0),($1466|0),($1481|0),($1482|0))|0);
 $1484 = tempRet0;
 $1485 = (_bitshift64Ashr(($1479|0),($1480|0),21)|0);
 $1486 = tempRet0;
 $1487 = (_i64Add(($1339|0),($1340|0),($1453|0),($1454|0))|0);
 $1488 = tempRet0;
 $1489 = (_i64Subtract(($1487|0),($1488|0),($1409|0),($1410|0))|0);
 $1490 = tempRet0;
 $1491 = (_i64Add(($1489|0),($1490|0),($1485|0),($1486|0))|0);
 $1492 = tempRet0;
 $1493 = (_bitshift64Shl(($1485|0),($1486|0),21)|0);
 $1494 = tempRet0;
 $1495 = (_i64Subtract(($1479|0),($1480|0),($1493|0),($1494|0))|0);
 $1496 = tempRet0;
 $1497 = (_bitshift64Ashr(($1491|0),($1492|0),21)|0);
 $1498 = tempRet0;
 $1499 = (_i64Add(($1455|0),($1456|0),($1313|0),($1314|0))|0);
 $1500 = tempRet0;
 $1501 = (_i64Subtract(($1499|0),($1500|0),($1353|0),($1354|0))|0);
 $1502 = tempRet0;
 $1503 = (_i64Add(($1501|0),($1502|0),($1407|0),($1408|0))|0);
 $1504 = tempRet0;
 $1505 = (_i64Add(($1503|0),($1504|0),($1497|0),($1498|0))|0);
 $1506 = tempRet0;
 $1507 = (_bitshift64Shl(($1497|0),($1498|0),21)|0);
 $1508 = tempRet0;
 $1509 = (_i64Subtract(($1491|0),($1492|0),($1507|0),($1508|0))|0);
 $1510 = tempRet0;
 $1511 = (_bitshift64Ashr(($1505|0),($1506|0),21)|0);
 $1512 = tempRet0;
 $1513 = (_i64Add(($1351|0),($1352|0),($1457|0),($1458|0))|0);
 $1514 = tempRet0;
 $1515 = (_i64Subtract(($1513|0),($1514|0),($1417|0),($1418|0))|0);
 $1516 = tempRet0;
 $1517 = (_i64Add(($1515|0),($1516|0),($1511|0),($1512|0))|0);
 $1518 = tempRet0;
 $1519 = (_bitshift64Shl(($1511|0),($1512|0),21)|0);
 $1520 = tempRet0;
 $1521 = (_i64Subtract(($1505|0),($1506|0),($1519|0),($1520|0))|0);
 $1522 = tempRet0;
 $1523 = (_bitshift64Ashr(($1517|0),($1518|0),21)|0);
 $1524 = tempRet0;
 $1525 = (_i64Add(($1415|0),($1416|0),($1523|0),($1524|0))|0);
 $1526 = tempRet0;
 $1527 = (_bitshift64Shl(($1523|0),($1524|0),21)|0);
 $1528 = tempRet0;
 $1529 = (_i64Subtract(($1517|0),($1518|0),($1527|0),($1528|0))|0);
 $1530 = tempRet0;
 $1531 = (_bitshift64Ashr(($1525|0),($1526|0),21)|0);
 $1532 = tempRet0;
 $1533 = (_i64Add(($1531|0),($1532|0),($1427|0),($1428|0))|0);
 $1534 = tempRet0;
 $1535 = (_bitshift64Shl(($1531|0),($1532|0),21)|0);
 $1536 = tempRet0;
 $1537 = (_i64Subtract(($1525|0),($1526|0),($1535|0),($1536|0))|0);
 $1538 = tempRet0;
 $1539 = (_bitshift64Ashr(($1533|0),($1534|0),21)|0);
 $1540 = tempRet0;
 $1541 = (_i64Add(($1423|0),($1424|0),($1539|0),($1540|0))|0);
 $1542 = tempRet0;
 $1543 = (_bitshift64Shl(($1539|0),($1540|0),21)|0);
 $1544 = tempRet0;
 $1545 = (_i64Subtract(($1533|0),($1534|0),($1543|0),($1544|0))|0);
 $1546 = tempRet0;
 $1547 = (_bitshift64Ashr(($1541|0),($1542|0),21)|0);
 $1548 = tempRet0;
 $1549 = (_i64Add(($1547|0),($1548|0),($1435|0),($1436|0))|0);
 $1550 = tempRet0;
 $1551 = (_bitshift64Shl(($1547|0),($1548|0),21)|0);
 $1552 = tempRet0;
 $1553 = (_i64Subtract(($1541|0),($1542|0),($1551|0),($1552|0))|0);
 $1554 = tempRet0;
 $1555 = (_bitshift64Ashr(($1549|0),($1550|0),21)|0);
 $1556 = tempRet0;
 $1557 = (_i64Add(($1431|0),($1432|0),($1197|0),($1198|0))|0);
 $1558 = tempRet0;
 $1559 = (_i64Subtract(($1557|0),($1558|0),($1397|0),($1398|0))|0);
 $1560 = tempRet0;
 $1561 = (_i64Add(($1559|0),($1560|0),($1555|0),($1556|0))|0);
 $1562 = tempRet0;
 $1563 = (_bitshift64Shl(($1555|0),($1556|0),21)|0);
 $1564 = tempRet0;
 $1565 = (_i64Subtract(($1549|0),($1550|0),($1563|0),($1564|0))|0);
 $1566 = tempRet0;
 $1567 = (_bitshift64Ashr(($1561|0),($1562|0),21)|0);
 $1568 = tempRet0;
 $1569 = (_i64Add(($1567|0),($1568|0),($1443|0),($1444|0))|0);
 $1570 = tempRet0;
 $1571 = (_bitshift64Shl(($1567|0),($1568|0),21)|0);
 $1572 = tempRet0;
 $1573 = (_i64Subtract(($1561|0),($1562|0),($1571|0),($1572|0))|0);
 $1574 = tempRet0;
 $1575 = (_bitshift64Ashr(($1569|0),($1570|0),21)|0);
 $1576 = tempRet0;
 $1577 = (_bitshift64Shl(($1575|0),($1576|0),21)|0);
 $1578 = tempRet0;
 $1579 = (_i64Subtract(($1569|0),($1570|0),($1577|0),($1578|0))|0);
 $1580 = tempRet0;
 $1581 = (___muldi3(($1575|0),($1576|0),666643,0)|0);
 $1582 = tempRet0;
 $1583 = (_i64Add(($1581|0),($1582|0),($1469|0),($1470|0))|0);
 $1584 = tempRet0;
 $1585 = (___muldi3(($1575|0),($1576|0),470296,0)|0);
 $1586 = tempRet0;
 $1587 = (_i64Add(($1483|0),($1484|0),($1585|0),($1586|0))|0);
 $1588 = tempRet0;
 $1589 = (___muldi3(($1575|0),($1576|0),654183,0)|0);
 $1590 = tempRet0;
 $1591 = (_i64Add(($1495|0),($1496|0),($1589|0),($1590|0))|0);
 $1592 = tempRet0;
 $1593 = (___muldi3(($1575|0),($1576|0),-997805,-1)|0);
 $1594 = tempRet0;
 $1595 = (_i64Add(($1509|0),($1510|0),($1593|0),($1594|0))|0);
 $1596 = tempRet0;
 $1597 = (___muldi3(($1575|0),($1576|0),136657,0)|0);
 $1598 = tempRet0;
 $1599 = (_i64Add(($1521|0),($1522|0),($1597|0),($1598|0))|0);
 $1600 = tempRet0;
 $1601 = (___muldi3(($1575|0),($1576|0),-683901,-1)|0);
 $1602 = tempRet0;
 $1603 = (_i64Add(($1529|0),($1530|0),($1601|0),($1602|0))|0);
 $1604 = tempRet0;
 $1605 = (_bitshift64Ashr(($1583|0),($1584|0),21)|0);
 $1606 = tempRet0;
 $1607 = (_i64Add(($1587|0),($1588|0),($1605|0),($1606|0))|0);
 $1608 = tempRet0;
 $1609 = (_bitshift64Shl(($1605|0),($1606|0),21)|0);
 $1610 = tempRet0;
 $1611 = (_i64Subtract(($1583|0),($1584|0),($1609|0),($1610|0))|0);
 $1612 = tempRet0;
 $1613 = (_bitshift64Ashr(($1607|0),($1608|0),21)|0);
 $1614 = tempRet0;
 $1615 = (_i64Add(($1591|0),($1592|0),($1613|0),($1614|0))|0);
 $1616 = tempRet0;
 $1617 = (_bitshift64Shl(($1613|0),($1614|0),21)|0);
 $1618 = tempRet0;
 $1619 = (_i64Subtract(($1607|0),($1608|0),($1617|0),($1618|0))|0);
 $1620 = tempRet0;
 $1621 = (_bitshift64Ashr(($1615|0),($1616|0),21)|0);
 $1622 = tempRet0;
 $1623 = (_i64Add(($1595|0),($1596|0),($1621|0),($1622|0))|0);
 $1624 = tempRet0;
 $1625 = (_bitshift64Shl(($1621|0),($1622|0),21)|0);
 $1626 = tempRet0;
 $1627 = (_i64Subtract(($1615|0),($1616|0),($1625|0),($1626|0))|0);
 $1628 = tempRet0;
 $1629 = (_bitshift64Ashr(($1623|0),($1624|0),21)|0);
 $1630 = tempRet0;
 $1631 = (_i64Add(($1599|0),($1600|0),($1629|0),($1630|0))|0);
 $1632 = tempRet0;
 $1633 = (_bitshift64Shl(($1629|0),($1630|0),21)|0);
 $1634 = tempRet0;
 $1635 = (_i64Subtract(($1623|0),($1624|0),($1633|0),($1634|0))|0);
 $1636 = tempRet0;
 $1637 = (_bitshift64Ashr(($1631|0),($1632|0),21)|0);
 $1638 = tempRet0;
 $1639 = (_i64Add(($1603|0),($1604|0),($1637|0),($1638|0))|0);
 $1640 = tempRet0;
 $1641 = (_bitshift64Shl(($1637|0),($1638|0),21)|0);
 $1642 = tempRet0;
 $1643 = (_i64Subtract(($1631|0),($1632|0),($1641|0),($1642|0))|0);
 $1644 = tempRet0;
 $1645 = (_bitshift64Ashr(($1639|0),($1640|0),21)|0);
 $1646 = tempRet0;
 $1647 = (_i64Add(($1645|0),($1646|0),($1537|0),($1538|0))|0);
 $1648 = tempRet0;
 $1649 = (_bitshift64Shl(($1645|0),($1646|0),21)|0);
 $1650 = tempRet0;
 $1651 = (_i64Subtract(($1639|0),($1640|0),($1649|0),($1650|0))|0);
 $1652 = tempRet0;
 $1653 = (_bitshift64Ashr(($1647|0),($1648|0),21)|0);
 $1654 = tempRet0;
 $1655 = (_i64Add(($1653|0),($1654|0),($1545|0),($1546|0))|0);
 $1656 = tempRet0;
 $1657 = (_bitshift64Shl(($1653|0),($1654|0),21)|0);
 $1658 = tempRet0;
 $1659 = (_i64Subtract(($1647|0),($1648|0),($1657|0),($1658|0))|0);
 $1660 = tempRet0;
 $1661 = (_bitshift64Ashr(($1655|0),($1656|0),21)|0);
 $1662 = tempRet0;
 $1663 = (_i64Add(($1661|0),($1662|0),($1553|0),($1554|0))|0);
 $1664 = tempRet0;
 $1665 = (_bitshift64Shl(($1661|0),($1662|0),21)|0);
 $1666 = tempRet0;
 $1667 = (_i64Subtract(($1655|0),($1656|0),($1665|0),($1666|0))|0);
 $1668 = tempRet0;
 $1669 = (_bitshift64Ashr(($1663|0),($1664|0),21)|0);
 $1670 = tempRet0;
 $1671 = (_i64Add(($1669|0),($1670|0),($1565|0),($1566|0))|0);
 $1672 = tempRet0;
 $1673 = (_bitshift64Shl(($1669|0),($1670|0),21)|0);
 $1674 = tempRet0;
 $1675 = (_i64Subtract(($1663|0),($1664|0),($1673|0),($1674|0))|0);
 $1676 = tempRet0;
 $1677 = (_bitshift64Ashr(($1671|0),($1672|0),21)|0);
 $1678 = tempRet0;
 $1679 = (_i64Add(($1677|0),($1678|0),($1573|0),($1574|0))|0);
 $1680 = tempRet0;
 $1681 = (_bitshift64Shl(($1677|0),($1678|0),21)|0);
 $1682 = tempRet0;
 $1683 = (_i64Subtract(($1671|0),($1672|0),($1681|0),($1682|0))|0);
 $1684 = tempRet0;
 $1685 = (_bitshift64Ashr(($1679|0),($1680|0),21)|0);
 $1686 = tempRet0;
 $1687 = (_i64Add(($1685|0),($1686|0),($1579|0),($1580|0))|0);
 $1688 = tempRet0;
 $1689 = (_bitshift64Shl(($1685|0),($1686|0),21)|0);
 $1690 = tempRet0;
 $1691 = (_i64Subtract(($1679|0),($1680|0),($1689|0),($1690|0))|0);
 $1692 = tempRet0;
 $1693 = $1611&255;
 HEAP8[$s>>0] = $1693;
 $1694 = (_bitshift64Lshr(($1611|0),($1612|0),8)|0);
 $1695 = tempRet0;
 $1696 = $1694&255;
 $arrayidx895 = ((($s)) + 1|0);
 HEAP8[$arrayidx895>>0] = $1696;
 $1697 = (_bitshift64Lshr(($1611|0),($1612|0),16)|0);
 $1698 = tempRet0;
 $1699 = (_bitshift64Shl(($1619|0),($1620|0),5)|0);
 $1700 = tempRet0;
 $1701 = $1699 | $1697;
 $1700 | $1698;
 $1702 = $1701&255;
 $arrayidx899 = ((($s)) + 2|0);
 HEAP8[$arrayidx899>>0] = $1702;
 $1703 = (_bitshift64Lshr(($1619|0),($1620|0),3)|0);
 $1704 = tempRet0;
 $1705 = $1703&255;
 $arrayidx902 = ((($s)) + 3|0);
 HEAP8[$arrayidx902>>0] = $1705;
 $1706 = (_bitshift64Lshr(($1619|0),($1620|0),11)|0);
 $1707 = tempRet0;
 $1708 = $1706&255;
 $arrayidx905 = ((($s)) + 4|0);
 HEAP8[$arrayidx905>>0] = $1708;
 $1709 = (_bitshift64Lshr(($1619|0),($1620|0),19)|0);
 $1710 = tempRet0;
 $1711 = (_bitshift64Shl(($1627|0),($1628|0),2)|0);
 $1712 = tempRet0;
 $1713 = $1711 | $1709;
 $1712 | $1710;
 $1714 = $1713&255;
 $arrayidx910 = ((($s)) + 5|0);
 HEAP8[$arrayidx910>>0] = $1714;
 $1715 = (_bitshift64Lshr(($1627|0),($1628|0),6)|0);
 $1716 = tempRet0;
 $1717 = $1715&255;
 $arrayidx913 = ((($s)) + 6|0);
 HEAP8[$arrayidx913>>0] = $1717;
 $1718 = (_bitshift64Lshr(($1627|0),($1628|0),14)|0);
 $1719 = tempRet0;
 $1720 = (_bitshift64Shl(($1635|0),($1636|0),7)|0);
 $1721 = tempRet0;
 $1722 = $1720 | $1718;
 $1721 | $1719;
 $1723 = $1722&255;
 $arrayidx918 = ((($s)) + 7|0);
 HEAP8[$arrayidx918>>0] = $1723;
 $1724 = (_bitshift64Lshr(($1635|0),($1636|0),1)|0);
 $1725 = tempRet0;
 $1726 = $1724&255;
 $arrayidx921 = ((($s)) + 8|0);
 HEAP8[$arrayidx921>>0] = $1726;
 $1727 = (_bitshift64Lshr(($1635|0),($1636|0),9)|0);
 $1728 = tempRet0;
 $1729 = $1727&255;
 $arrayidx924 = ((($s)) + 9|0);
 HEAP8[$arrayidx924>>0] = $1729;
 $1730 = (_bitshift64Lshr(($1635|0),($1636|0),17)|0);
 $1731 = tempRet0;
 $1732 = (_bitshift64Shl(($1643|0),($1644|0),4)|0);
 $1733 = tempRet0;
 $1734 = $1732 | $1730;
 $1733 | $1731;
 $1735 = $1734&255;
 $arrayidx929 = ((($s)) + 10|0);
 HEAP8[$arrayidx929>>0] = $1735;
 $1736 = (_bitshift64Lshr(($1643|0),($1644|0),4)|0);
 $1737 = tempRet0;
 $1738 = $1736&255;
 $arrayidx932 = ((($s)) + 11|0);
 HEAP8[$arrayidx932>>0] = $1738;
 $1739 = (_bitshift64Lshr(($1643|0),($1644|0),12)|0);
 $1740 = tempRet0;
 $1741 = $1739&255;
 $arrayidx935 = ((($s)) + 12|0);
 HEAP8[$arrayidx935>>0] = $1741;
 $1742 = (_bitshift64Lshr(($1643|0),($1644|0),20)|0);
 $1743 = tempRet0;
 $1744 = (_bitshift64Shl(($1651|0),($1652|0),1)|0);
 $1745 = tempRet0;
 $1746 = $1744 | $1742;
 $1745 | $1743;
 $1747 = $1746&255;
 $arrayidx940 = ((($s)) + 13|0);
 HEAP8[$arrayidx940>>0] = $1747;
 $1748 = (_bitshift64Lshr(($1651|0),($1652|0),7)|0);
 $1749 = tempRet0;
 $1750 = $1748&255;
 $arrayidx943 = ((($s)) + 14|0);
 HEAP8[$arrayidx943>>0] = $1750;
 $1751 = (_bitshift64Lshr(($1651|0),($1652|0),15)|0);
 $1752 = tempRet0;
 $1753 = (_bitshift64Shl(($1659|0),($1660|0),6)|0);
 $1754 = tempRet0;
 $1755 = $1753 | $1751;
 $1754 | $1752;
 $1756 = $1755&255;
 $arrayidx948 = ((($s)) + 15|0);
 HEAP8[$arrayidx948>>0] = $1756;
 $1757 = (_bitshift64Lshr(($1659|0),($1660|0),2)|0);
 $1758 = tempRet0;
 $1759 = $1757&255;
 $arrayidx951 = ((($s)) + 16|0);
 HEAP8[$arrayidx951>>0] = $1759;
 $1760 = (_bitshift64Lshr(($1659|0),($1660|0),10)|0);
 $1761 = tempRet0;
 $1762 = $1760&255;
 $arrayidx954 = ((($s)) + 17|0);
 HEAP8[$arrayidx954>>0] = $1762;
 $1763 = (_bitshift64Lshr(($1659|0),($1660|0),18)|0);
 $1764 = tempRet0;
 $1765 = (_bitshift64Shl(($1667|0),($1668|0),3)|0);
 $1766 = tempRet0;
 $1767 = $1765 | $1763;
 $1766 | $1764;
 $1768 = $1767&255;
 $arrayidx959 = ((($s)) + 18|0);
 HEAP8[$arrayidx959>>0] = $1768;
 $1769 = (_bitshift64Lshr(($1667|0),($1668|0),5)|0);
 $1770 = tempRet0;
 $1771 = $1769&255;
 $arrayidx962 = ((($s)) + 19|0);
 HEAP8[$arrayidx962>>0] = $1771;
 $1772 = (_bitshift64Lshr(($1667|0),($1668|0),13)|0);
 $1773 = tempRet0;
 $1774 = $1772&255;
 $arrayidx965 = ((($s)) + 20|0);
 HEAP8[$arrayidx965>>0] = $1774;
 $1775 = $1675&255;
 $arrayidx968 = ((($s)) + 21|0);
 HEAP8[$arrayidx968>>0] = $1775;
 $1776 = (_bitshift64Lshr(($1675|0),($1676|0),8)|0);
 $1777 = tempRet0;
 $1778 = $1776&255;
 $arrayidx971 = ((($s)) + 22|0);
 HEAP8[$arrayidx971>>0] = $1778;
 $1779 = (_bitshift64Lshr(($1675|0),($1676|0),16)|0);
 $1780 = tempRet0;
 $1781 = (_bitshift64Shl(($1683|0),($1684|0),5)|0);
 $1782 = tempRet0;
 $1783 = $1781 | $1779;
 $1782 | $1780;
 $1784 = $1783&255;
 $arrayidx976 = ((($s)) + 23|0);
 HEAP8[$arrayidx976>>0] = $1784;
 $1785 = (_bitshift64Lshr(($1683|0),($1684|0),3)|0);
 $1786 = tempRet0;
 $1787 = $1785&255;
 $arrayidx979 = ((($s)) + 24|0);
 HEAP8[$arrayidx979>>0] = $1787;
 $1788 = (_bitshift64Lshr(($1683|0),($1684|0),11)|0);
 $1789 = tempRet0;
 $1790 = $1788&255;
 $arrayidx982 = ((($s)) + 25|0);
 HEAP8[$arrayidx982>>0] = $1790;
 $1791 = (_bitshift64Lshr(($1683|0),($1684|0),19)|0);
 $1792 = tempRet0;
 $1793 = (_bitshift64Shl(($1691|0),($1692|0),2)|0);
 $1794 = tempRet0;
 $1795 = $1793 | $1791;
 $1794 | $1792;
 $1796 = $1795&255;
 $arrayidx987 = ((($s)) + 26|0);
 HEAP8[$arrayidx987>>0] = $1796;
 $1797 = (_bitshift64Lshr(($1691|0),($1692|0),6)|0);
 $1798 = tempRet0;
 $1799 = $1797&255;
 $arrayidx990 = ((($s)) + 27|0);
 HEAP8[$arrayidx990>>0] = $1799;
 $1800 = (_bitshift64Lshr(($1691|0),($1692|0),14)|0);
 $1801 = tempRet0;
 $1802 = (_bitshift64Shl(($1687|0),($1688|0),7)|0);
 $1803 = tempRet0;
 $1804 = $1800 | $1802;
 $1801 | $1803;
 $1805 = $1804&255;
 $arrayidx995 = ((($s)) + 28|0);
 HEAP8[$arrayidx995>>0] = $1805;
 $1806 = (_bitshift64Lshr(($1687|0),($1688|0),1)|0);
 $1807 = tempRet0;
 $1808 = $1806&255;
 $arrayidx998 = ((($s)) + 29|0);
 HEAP8[$arrayidx998>>0] = $1808;
 $1809 = (_bitshift64Lshr(($1687|0),($1688|0),9)|0);
 $1810 = tempRet0;
 $1811 = $1809&255;
 $arrayidx1001 = ((($s)) + 30|0);
 HEAP8[$arrayidx1001>>0] = $1811;
 $1812 = (_bitshift64Lshr(($1687|0),($1688|0),17)|0);
 $1813 = tempRet0;
 $1814 = $1812&255;
 $arrayidx1004 = ((($s)) + 31|0);
 HEAP8[$arrayidx1004>>0] = $1814;
 return;
}
function _load_3_47($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0, $arrayidx3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 tempRet0 = ($12);
 return ($11|0);
}
function _load_4_48($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0;
 var $arrayidx3 = 0, $arrayidx7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 $arrayidx7 = ((($in)) + 3|0);
 $13 = HEAP8[$arrayidx7>>0]|0;
 $14 = $13&255;
 $15 = (_bitshift64Shl(($14|0),0,24)|0);
 $16 = tempRet0;
 $17 = $11 | $15;
 $18 = $12 | $16;
 tempRet0 = ($18);
 return ($17|0);
}
function _crypto_sign_ed25519_ref10_sc_reduce($s) {
 $s = $s|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0;
 var $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0;
 var $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0, $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0;
 var $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0, $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0;
 var $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0, $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0;
 var $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0, $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0;
 var $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0, $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0;
 var $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0, $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0;
 var $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0, $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0;
 var $99 = 0, $add$ptr = 0, $add$ptr11 = 0, $add$ptr15 = 0, $add$ptr19 = 0, $add$ptr23 = 0, $add$ptr27 = 0, $add$ptr3 = 0, $add$ptr30 = 0, $add$ptr34 = 0, $add$ptr38 = 0, $add$ptr42 = 0, $add$ptr46 = 0, $add$ptr50 = 0, $add$ptr54 = 0, $add$ptr58 = 0, $add$ptr61 = 0, $add$ptr65 = 0, $add$ptr69 = 0, $add$ptr7 = 0;
 var $add$ptr73 = 0, $add$ptr77 = 0, $add$ptr81 = 0, $add$ptr85 = 0, $arrayidx462 = 0, $arrayidx469 = 0, $arrayidx472 = 0, $arrayidx480 = 0, $arrayidx488 = 0, $arrayidx491 = 0, $arrayidx499 = 0, $arrayidx502 = 0, $arrayidx510 = 0, $arrayidx518 = 0, $arrayidx521 = 0, $arrayidx529 = 0, $arrayidx532 = 0, $arrayidx538 = 0, $arrayidx546 = 0, $arrayidx549 = 0;
 var $arrayidx557 = 0, $arrayidx565 = 0, $arrayidx568 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_load_3_51($s)|0);
 $1 = tempRet0;
 $2 = $0 & 2097151;
 $add$ptr = ((($s)) + 2|0);
 $3 = (_load_4_52($add$ptr)|0);
 $4 = tempRet0;
 $5 = (_bitshift64Lshr(($3|0),($4|0),5)|0);
 $6 = tempRet0;
 $7 = $5 & 2097151;
 $add$ptr3 = ((($s)) + 5|0);
 $8 = (_load_3_51($add$ptr3)|0);
 $9 = tempRet0;
 $10 = (_bitshift64Lshr(($8|0),($9|0),2)|0);
 $11 = tempRet0;
 $12 = $10 & 2097151;
 $add$ptr7 = ((($s)) + 7|0);
 $13 = (_load_4_52($add$ptr7)|0);
 $14 = tempRet0;
 $15 = (_bitshift64Lshr(($13|0),($14|0),7)|0);
 $16 = tempRet0;
 $17 = $15 & 2097151;
 $add$ptr11 = ((($s)) + 10|0);
 $18 = (_load_4_52($add$ptr11)|0);
 $19 = tempRet0;
 $20 = (_bitshift64Lshr(($18|0),($19|0),4)|0);
 $21 = tempRet0;
 $22 = $20 & 2097151;
 $add$ptr15 = ((($s)) + 13|0);
 $23 = (_load_3_51($add$ptr15)|0);
 $24 = tempRet0;
 $25 = (_bitshift64Lshr(($23|0),($24|0),1)|0);
 $26 = tempRet0;
 $27 = $25 & 2097151;
 $add$ptr19 = ((($s)) + 15|0);
 $28 = (_load_4_52($add$ptr19)|0);
 $29 = tempRet0;
 $30 = (_bitshift64Lshr(($28|0),($29|0),6)|0);
 $31 = tempRet0;
 $32 = $30 & 2097151;
 $add$ptr23 = ((($s)) + 18|0);
 $33 = (_load_3_51($add$ptr23)|0);
 $34 = tempRet0;
 $35 = (_bitshift64Lshr(($33|0),($34|0),3)|0);
 $36 = tempRet0;
 $37 = $35 & 2097151;
 $add$ptr27 = ((($s)) + 21|0);
 $38 = (_load_3_51($add$ptr27)|0);
 $39 = tempRet0;
 $40 = $38 & 2097151;
 $add$ptr30 = ((($s)) + 23|0);
 $41 = (_load_4_52($add$ptr30)|0);
 $42 = tempRet0;
 $43 = (_bitshift64Lshr(($41|0),($42|0),5)|0);
 $44 = tempRet0;
 $45 = $43 & 2097151;
 $add$ptr34 = ((($s)) + 26|0);
 $46 = (_load_3_51($add$ptr34)|0);
 $47 = tempRet0;
 $48 = (_bitshift64Lshr(($46|0),($47|0),2)|0);
 $49 = tempRet0;
 $50 = $48 & 2097151;
 $add$ptr38 = ((($s)) + 28|0);
 $51 = (_load_4_52($add$ptr38)|0);
 $52 = tempRet0;
 $53 = (_bitshift64Lshr(($51|0),($52|0),7)|0);
 $54 = tempRet0;
 $55 = $53 & 2097151;
 $add$ptr42 = ((($s)) + 31|0);
 $56 = (_load_4_52($add$ptr42)|0);
 $57 = tempRet0;
 $58 = (_bitshift64Lshr(($56|0),($57|0),4)|0);
 $59 = tempRet0;
 $60 = $58 & 2097151;
 $add$ptr46 = ((($s)) + 34|0);
 $61 = (_load_3_51($add$ptr46)|0);
 $62 = tempRet0;
 $63 = (_bitshift64Lshr(($61|0),($62|0),1)|0);
 $64 = tempRet0;
 $65 = $63 & 2097151;
 $add$ptr50 = ((($s)) + 36|0);
 $66 = (_load_4_52($add$ptr50)|0);
 $67 = tempRet0;
 $68 = (_bitshift64Lshr(($66|0),($67|0),6)|0);
 $69 = tempRet0;
 $70 = $68 & 2097151;
 $add$ptr54 = ((($s)) + 39|0);
 $71 = (_load_3_51($add$ptr54)|0);
 $72 = tempRet0;
 $73 = (_bitshift64Lshr(($71|0),($72|0),3)|0);
 $74 = tempRet0;
 $75 = $73 & 2097151;
 $add$ptr58 = ((($s)) + 42|0);
 $76 = (_load_3_51($add$ptr58)|0);
 $77 = tempRet0;
 $78 = $76 & 2097151;
 $add$ptr61 = ((($s)) + 44|0);
 $79 = (_load_4_52($add$ptr61)|0);
 $80 = tempRet0;
 $81 = (_bitshift64Lshr(($79|0),($80|0),5)|0);
 $82 = tempRet0;
 $83 = $81 & 2097151;
 $add$ptr65 = ((($s)) + 47|0);
 $84 = (_load_3_51($add$ptr65)|0);
 $85 = tempRet0;
 $86 = (_bitshift64Lshr(($84|0),($85|0),2)|0);
 $87 = tempRet0;
 $88 = $86 & 2097151;
 $add$ptr69 = ((($s)) + 49|0);
 $89 = (_load_4_52($add$ptr69)|0);
 $90 = tempRet0;
 $91 = (_bitshift64Lshr(($89|0),($90|0),7)|0);
 $92 = tempRet0;
 $93 = $91 & 2097151;
 $add$ptr73 = ((($s)) + 52|0);
 $94 = (_load_4_52($add$ptr73)|0);
 $95 = tempRet0;
 $96 = (_bitshift64Lshr(($94|0),($95|0),4)|0);
 $97 = tempRet0;
 $98 = $96 & 2097151;
 $add$ptr77 = ((($s)) + 55|0);
 $99 = (_load_3_51($add$ptr77)|0);
 $100 = tempRet0;
 $101 = (_bitshift64Lshr(($99|0),($100|0),1)|0);
 $102 = tempRet0;
 $103 = $101 & 2097151;
 $add$ptr81 = ((($s)) + 57|0);
 $104 = (_load_4_52($add$ptr81)|0);
 $105 = tempRet0;
 $106 = (_bitshift64Lshr(($104|0),($105|0),6)|0);
 $107 = tempRet0;
 $108 = $106 & 2097151;
 $add$ptr85 = ((($s)) + 60|0);
 $109 = (_load_4_52($add$ptr85)|0);
 $110 = tempRet0;
 $111 = (_bitshift64Lshr(($109|0),($110|0),3)|0);
 $112 = tempRet0;
 $113 = (___muldi3(($111|0),($112|0),666643,0)|0);
 $114 = tempRet0;
 $115 = (___muldi3(($111|0),($112|0),470296,0)|0);
 $116 = tempRet0;
 $117 = (___muldi3(($111|0),($112|0),654183,0)|0);
 $118 = tempRet0;
 $119 = (___muldi3(($111|0),($112|0),-997805,-1)|0);
 $120 = tempRet0;
 $121 = (___muldi3(($111|0),($112|0),136657,0)|0);
 $122 = tempRet0;
 $123 = (_i64Add(($121|0),($122|0),($75|0),0)|0);
 $124 = tempRet0;
 $125 = (___muldi3(($111|0),($112|0),-683901,-1)|0);
 $126 = tempRet0;
 $127 = (_i64Add(($125|0),($126|0),($78|0),0)|0);
 $128 = tempRet0;
 $129 = (___muldi3(($108|0),0,666643,0)|0);
 $130 = tempRet0;
 $131 = (___muldi3(($108|0),0,470296,0)|0);
 $132 = tempRet0;
 $133 = (___muldi3(($108|0),0,654183,0)|0);
 $134 = tempRet0;
 $135 = (___muldi3(($108|0),0,-997805,-1)|0);
 $136 = tempRet0;
 $137 = (___muldi3(($108|0),0,136657,0)|0);
 $138 = tempRet0;
 $139 = (___muldi3(($108|0),0,-683901,-1)|0);
 $140 = tempRet0;
 $141 = (_i64Add(($123|0),($124|0),($139|0),($140|0))|0);
 $142 = tempRet0;
 $143 = (___muldi3(($103|0),0,666643,0)|0);
 $144 = tempRet0;
 $145 = (___muldi3(($103|0),0,470296,0)|0);
 $146 = tempRet0;
 $147 = (___muldi3(($103|0),0,654183,0)|0);
 $148 = tempRet0;
 $149 = (___muldi3(($103|0),0,-997805,-1)|0);
 $150 = tempRet0;
 $151 = (___muldi3(($103|0),0,136657,0)|0);
 $152 = tempRet0;
 $153 = (___muldi3(($103|0),0,-683901,-1)|0);
 $154 = tempRet0;
 $155 = (_i64Add(($153|0),($154|0),($70|0),0)|0);
 $156 = tempRet0;
 $157 = (_i64Add(($155|0),($156|0),($119|0),($120|0))|0);
 $158 = tempRet0;
 $159 = (_i64Add(($157|0),($158|0),($137|0),($138|0))|0);
 $160 = tempRet0;
 $161 = (___muldi3(($98|0),0,666643,0)|0);
 $162 = tempRet0;
 $163 = (___muldi3(($98|0),0,470296,0)|0);
 $164 = tempRet0;
 $165 = (___muldi3(($98|0),0,654183,0)|0);
 $166 = tempRet0;
 $167 = (___muldi3(($98|0),0,-997805,-1)|0);
 $168 = tempRet0;
 $169 = (___muldi3(($98|0),0,136657,0)|0);
 $170 = tempRet0;
 $171 = (___muldi3(($98|0),0,-683901,-1)|0);
 $172 = tempRet0;
 $173 = (___muldi3(($93|0),0,666643,0)|0);
 $174 = tempRet0;
 $175 = (___muldi3(($93|0),0,470296,0)|0);
 $176 = tempRet0;
 $177 = (___muldi3(($93|0),0,654183,0)|0);
 $178 = tempRet0;
 $179 = (___muldi3(($93|0),0,-997805,-1)|0);
 $180 = tempRet0;
 $181 = (___muldi3(($93|0),0,136657,0)|0);
 $182 = tempRet0;
 $183 = (___muldi3(($93|0),0,-683901,-1)|0);
 $184 = tempRet0;
 $185 = (_i64Add(($183|0),($184|0),($60|0),0)|0);
 $186 = tempRet0;
 $187 = (_i64Add(($185|0),($186|0),($169|0),($170|0))|0);
 $188 = tempRet0;
 $189 = (_i64Add(($187|0),($188|0),($149|0),($150|0))|0);
 $190 = tempRet0;
 $191 = (_i64Add(($189|0),($190|0),($115|0),($116|0))|0);
 $192 = tempRet0;
 $193 = (_i64Add(($191|0),($192|0),($133|0),($134|0))|0);
 $194 = tempRet0;
 $195 = (___muldi3(($88|0),0,666643,0)|0);
 $196 = tempRet0;
 $197 = (_i64Add(($195|0),($196|0),($32|0),0)|0);
 $198 = tempRet0;
 $199 = (___muldi3(($88|0),0,470296,0)|0);
 $200 = tempRet0;
 $201 = (___muldi3(($88|0),0,654183,0)|0);
 $202 = tempRet0;
 $203 = (_i64Add(($201|0),($202|0),($40|0),0)|0);
 $204 = tempRet0;
 $205 = (_i64Add(($203|0),($204|0),($175|0),($176|0))|0);
 $206 = tempRet0;
 $207 = (_i64Add(($205|0),($206|0),($161|0),($162|0))|0);
 $208 = tempRet0;
 $209 = (___muldi3(($88|0),0,-997805,-1)|0);
 $210 = tempRet0;
 $211 = (___muldi3(($88|0),0,136657,0)|0);
 $212 = tempRet0;
 $213 = (_i64Add(($211|0),($212|0),($50|0),0)|0);
 $214 = tempRet0;
 $215 = (_i64Add(($213|0),($214|0),($179|0),($180|0))|0);
 $216 = tempRet0;
 $217 = (_i64Add(($215|0),($216|0),($165|0),($166|0))|0);
 $218 = tempRet0;
 $219 = (_i64Add(($217|0),($218|0),($145|0),($146|0))|0);
 $220 = tempRet0;
 $221 = (_i64Add(($219|0),($220|0),($129|0),($130|0))|0);
 $222 = tempRet0;
 $223 = (___muldi3(($88|0),0,-683901,-1)|0);
 $224 = tempRet0;
 $225 = (_i64Add(($197|0),($198|0),1048576,0)|0);
 $226 = tempRet0;
 $227 = (_bitshift64Lshr(($225|0),($226|0),21)|0);
 $228 = tempRet0;
 $229 = (_i64Add(($199|0),($200|0),($37|0),0)|0);
 $230 = tempRet0;
 $231 = (_i64Add(($229|0),($230|0),($173|0),($174|0))|0);
 $232 = tempRet0;
 $233 = (_i64Add(($231|0),($232|0),($227|0),($228|0))|0);
 $234 = tempRet0;
 $235 = (_bitshift64Shl(($227|0),($228|0),21)|0);
 $236 = tempRet0;
 $237 = (_i64Subtract(($197|0),($198|0),($235|0),($236|0))|0);
 $238 = tempRet0;
 $239 = (_i64Add(($207|0),($208|0),1048576,0)|0);
 $240 = tempRet0;
 $241 = (_bitshift64Lshr(($239|0),($240|0),21)|0);
 $242 = tempRet0;
 $243 = (_i64Add(($209|0),($210|0),($45|0),0)|0);
 $244 = tempRet0;
 $245 = (_i64Add(($243|0),($244|0),($177|0),($178|0))|0);
 $246 = tempRet0;
 $247 = (_i64Add(($245|0),($246|0),($163|0),($164|0))|0);
 $248 = tempRet0;
 $249 = (_i64Add(($247|0),($248|0),($143|0),($144|0))|0);
 $250 = tempRet0;
 $251 = (_i64Add(($249|0),($250|0),($241|0),($242|0))|0);
 $252 = tempRet0;
 $253 = (_bitshift64Shl(($241|0),($242|0),21)|0);
 $254 = tempRet0;
 $255 = (_i64Add(($221|0),($222|0),1048576,0)|0);
 $256 = tempRet0;
 $257 = (_bitshift64Ashr(($255|0),($256|0),21)|0);
 $258 = tempRet0;
 $259 = (_i64Add(($223|0),($224|0),($55|0),0)|0);
 $260 = tempRet0;
 $261 = (_i64Add(($259|0),($260|0),($181|0),($182|0))|0);
 $262 = tempRet0;
 $263 = (_i64Add(($261|0),($262|0),($167|0),($168|0))|0);
 $264 = tempRet0;
 $265 = (_i64Add(($263|0),($264|0),($147|0),($148|0))|0);
 $266 = tempRet0;
 $267 = (_i64Add(($265|0),($266|0),($113|0),($114|0))|0);
 $268 = tempRet0;
 $269 = (_i64Add(($267|0),($268|0),($131|0),($132|0))|0);
 $270 = tempRet0;
 $271 = (_i64Add(($269|0),($270|0),($257|0),($258|0))|0);
 $272 = tempRet0;
 $273 = (_bitshift64Shl(($257|0),($258|0),21)|0);
 $274 = tempRet0;
 $275 = (_i64Add(($193|0),($194|0),1048576,0)|0);
 $276 = tempRet0;
 $277 = (_bitshift64Ashr(($275|0),($276|0),21)|0);
 $278 = tempRet0;
 $279 = (_i64Add(($171|0),($172|0),($65|0),0)|0);
 $280 = tempRet0;
 $281 = (_i64Add(($279|0),($280|0),($151|0),($152|0))|0);
 $282 = tempRet0;
 $283 = (_i64Add(($281|0),($282|0),($117|0),($118|0))|0);
 $284 = tempRet0;
 $285 = (_i64Add(($283|0),($284|0),($135|0),($136|0))|0);
 $286 = tempRet0;
 $287 = (_i64Add(($285|0),($286|0),($277|0),($278|0))|0);
 $288 = tempRet0;
 $289 = (_bitshift64Shl(($277|0),($278|0),21)|0);
 $290 = tempRet0;
 $291 = (_i64Subtract(($193|0),($194|0),($289|0),($290|0))|0);
 $292 = tempRet0;
 $293 = (_i64Add(($159|0),($160|0),1048576,0)|0);
 $294 = tempRet0;
 $295 = (_bitshift64Ashr(($293|0),($294|0),21)|0);
 $296 = tempRet0;
 $297 = (_i64Add(($141|0),($142|0),($295|0),($296|0))|0);
 $298 = tempRet0;
 $299 = (_bitshift64Shl(($295|0),($296|0),21)|0);
 $300 = tempRet0;
 $301 = (_i64Subtract(($159|0),($160|0),($299|0),($300|0))|0);
 $302 = tempRet0;
 $303 = (_i64Add(($127|0),($128|0),1048576,0)|0);
 $304 = tempRet0;
 $305 = (_bitshift64Ashr(($303|0),($304|0),21)|0);
 $306 = tempRet0;
 $307 = (_i64Add(($305|0),($306|0),($83|0),0)|0);
 $308 = tempRet0;
 $309 = (_bitshift64Shl(($305|0),($306|0),21)|0);
 $310 = tempRet0;
 $311 = (_i64Subtract(($127|0),($128|0),($309|0),($310|0))|0);
 $312 = tempRet0;
 $313 = (_i64Add(($233|0),($234|0),1048576,0)|0);
 $314 = tempRet0;
 $315 = (_bitshift64Lshr(($313|0),($314|0),21)|0);
 $316 = tempRet0;
 $317 = (_bitshift64Shl(($315|0),($316|0),21)|0);
 $318 = tempRet0;
 $319 = (_i64Subtract(($233|0),($234|0),($317|0),($318|0))|0);
 $320 = tempRet0;
 $321 = (_i64Add(($251|0),($252|0),1048576,0)|0);
 $322 = tempRet0;
 $323 = (_bitshift64Ashr(($321|0),($322|0),21)|0);
 $324 = tempRet0;
 $325 = (_bitshift64Shl(($323|0),($324|0),21)|0);
 $326 = tempRet0;
 $327 = (_i64Add(($271|0),($272|0),1048576,0)|0);
 $328 = tempRet0;
 $329 = (_bitshift64Ashr(($327|0),($328|0),21)|0);
 $330 = tempRet0;
 $331 = (_i64Add(($329|0),($330|0),($291|0),($292|0))|0);
 $332 = tempRet0;
 $333 = (_bitshift64Shl(($329|0),($330|0),21)|0);
 $334 = tempRet0;
 $335 = (_i64Subtract(($271|0),($272|0),($333|0),($334|0))|0);
 $336 = tempRet0;
 $337 = (_i64Add(($287|0),($288|0),1048576,0)|0);
 $338 = tempRet0;
 $339 = (_bitshift64Ashr(($337|0),($338|0),21)|0);
 $340 = tempRet0;
 $341 = (_i64Add(($339|0),($340|0),($301|0),($302|0))|0);
 $342 = tempRet0;
 $343 = (_bitshift64Shl(($339|0),($340|0),21)|0);
 $344 = tempRet0;
 $345 = (_i64Subtract(($287|0),($288|0),($343|0),($344|0))|0);
 $346 = tempRet0;
 $347 = (_i64Add(($297|0),($298|0),1048576,0)|0);
 $348 = tempRet0;
 $349 = (_bitshift64Ashr(($347|0),($348|0),21)|0);
 $350 = tempRet0;
 $351 = (_i64Add(($349|0),($350|0),($311|0),($312|0))|0);
 $352 = tempRet0;
 $353 = (_bitshift64Shl(($349|0),($350|0),21)|0);
 $354 = tempRet0;
 $355 = (_i64Subtract(($297|0),($298|0),($353|0),($354|0))|0);
 $356 = tempRet0;
 $357 = (___muldi3(($307|0),($308|0),666643,0)|0);
 $358 = tempRet0;
 $359 = (_i64Add(($357|0),($358|0),($27|0),0)|0);
 $360 = tempRet0;
 $361 = (___muldi3(($307|0),($308|0),470296,0)|0);
 $362 = tempRet0;
 $363 = (_i64Add(($237|0),($238|0),($361|0),($362|0))|0);
 $364 = tempRet0;
 $365 = (___muldi3(($307|0),($308|0),654183,0)|0);
 $366 = tempRet0;
 $367 = (_i64Add(($319|0),($320|0),($365|0),($366|0))|0);
 $368 = tempRet0;
 $369 = (___muldi3(($307|0),($308|0),-997805,-1)|0);
 $370 = tempRet0;
 $371 = (___muldi3(($307|0),($308|0),136657,0)|0);
 $372 = tempRet0;
 $373 = (___muldi3(($307|0),($308|0),-683901,-1)|0);
 $374 = tempRet0;
 $375 = (_i64Add(($373|0),($374|0),($221|0),($222|0))|0);
 $376 = tempRet0;
 $377 = (_i64Add(($375|0),($376|0),($323|0),($324|0))|0);
 $378 = tempRet0;
 $379 = (_i64Subtract(($377|0),($378|0),($273|0),($274|0))|0);
 $380 = tempRet0;
 $381 = (___muldi3(($351|0),($352|0),666643,0)|0);
 $382 = tempRet0;
 $383 = (_i64Add(($381|0),($382|0),($22|0),0)|0);
 $384 = tempRet0;
 $385 = (___muldi3(($351|0),($352|0),470296,0)|0);
 $386 = tempRet0;
 $387 = (_i64Add(($359|0),($360|0),($385|0),($386|0))|0);
 $388 = tempRet0;
 $389 = (___muldi3(($351|0),($352|0),654183,0)|0);
 $390 = tempRet0;
 $391 = (_i64Add(($363|0),($364|0),($389|0),($390|0))|0);
 $392 = tempRet0;
 $393 = (___muldi3(($351|0),($352|0),-997805,-1)|0);
 $394 = tempRet0;
 $395 = (_i64Add(($367|0),($368|0),($393|0),($394|0))|0);
 $396 = tempRet0;
 $397 = (___muldi3(($351|0),($352|0),136657,0)|0);
 $398 = tempRet0;
 $399 = (___muldi3(($351|0),($352|0),-683901,-1)|0);
 $400 = tempRet0;
 $401 = (___muldi3(($355|0),($356|0),666643,0)|0);
 $402 = tempRet0;
 $403 = (_i64Add(($401|0),($402|0),($17|0),0)|0);
 $404 = tempRet0;
 $405 = (___muldi3(($355|0),($356|0),470296,0)|0);
 $406 = tempRet0;
 $407 = (_i64Add(($383|0),($384|0),($405|0),($406|0))|0);
 $408 = tempRet0;
 $409 = (___muldi3(($355|0),($356|0),654183,0)|0);
 $410 = tempRet0;
 $411 = (_i64Add(($387|0),($388|0),($409|0),($410|0))|0);
 $412 = tempRet0;
 $413 = (___muldi3(($355|0),($356|0),-997805,-1)|0);
 $414 = tempRet0;
 $415 = (_i64Add(($391|0),($392|0),($413|0),($414|0))|0);
 $416 = tempRet0;
 $417 = (___muldi3(($355|0),($356|0),136657,0)|0);
 $418 = tempRet0;
 $419 = (_i64Add(($395|0),($396|0),($417|0),($418|0))|0);
 $420 = tempRet0;
 $421 = (___muldi3(($355|0),($356|0),-683901,-1)|0);
 $422 = tempRet0;
 $423 = (_i64Add(($315|0),($316|0),($207|0),($208|0))|0);
 $424 = tempRet0;
 $425 = (_i64Subtract(($423|0),($424|0),($253|0),($254|0))|0);
 $426 = tempRet0;
 $427 = (_i64Add(($425|0),($426|0),($369|0),($370|0))|0);
 $428 = tempRet0;
 $429 = (_i64Add(($427|0),($428|0),($397|0),($398|0))|0);
 $430 = tempRet0;
 $431 = (_i64Add(($429|0),($430|0),($421|0),($422|0))|0);
 $432 = tempRet0;
 $433 = (___muldi3(($341|0),($342|0),666643,0)|0);
 $434 = tempRet0;
 $435 = (_i64Add(($433|0),($434|0),($12|0),0)|0);
 $436 = tempRet0;
 $437 = (___muldi3(($341|0),($342|0),470296,0)|0);
 $438 = tempRet0;
 $439 = (_i64Add(($403|0),($404|0),($437|0),($438|0))|0);
 $440 = tempRet0;
 $441 = (___muldi3(($341|0),($342|0),654183,0)|0);
 $442 = tempRet0;
 $443 = (_i64Add(($407|0),($408|0),($441|0),($442|0))|0);
 $444 = tempRet0;
 $445 = (___muldi3(($341|0),($342|0),-997805,-1)|0);
 $446 = tempRet0;
 $447 = (_i64Add(($411|0),($412|0),($445|0),($446|0))|0);
 $448 = tempRet0;
 $449 = (___muldi3(($341|0),($342|0),136657,0)|0);
 $450 = tempRet0;
 $451 = (_i64Add(($415|0),($416|0),($449|0),($450|0))|0);
 $452 = tempRet0;
 $453 = (___muldi3(($341|0),($342|0),-683901,-1)|0);
 $454 = tempRet0;
 $455 = (_i64Add(($419|0),($420|0),($453|0),($454|0))|0);
 $456 = tempRet0;
 $457 = (___muldi3(($345|0),($346|0),666643,0)|0);
 $458 = tempRet0;
 $459 = (___muldi3(($345|0),($346|0),470296,0)|0);
 $460 = tempRet0;
 $461 = (___muldi3(($345|0),($346|0),654183,0)|0);
 $462 = tempRet0;
 $463 = (___muldi3(($345|0),($346|0),-997805,-1)|0);
 $464 = tempRet0;
 $465 = (___muldi3(($345|0),($346|0),136657,0)|0);
 $466 = tempRet0;
 $467 = (___muldi3(($345|0),($346|0),-683901,-1)|0);
 $468 = tempRet0;
 $469 = (_i64Add(($451|0),($452|0),($467|0),($468|0))|0);
 $470 = tempRet0;
 $471 = (___muldi3(($331|0),($332|0),666643,0)|0);
 $472 = tempRet0;
 $473 = (_i64Add(($471|0),($472|0),($2|0),0)|0);
 $474 = tempRet0;
 $475 = (___muldi3(($331|0),($332|0),470296,0)|0);
 $476 = tempRet0;
 $477 = (___muldi3(($331|0),($332|0),654183,0)|0);
 $478 = tempRet0;
 $479 = (_i64Add(($435|0),($436|0),($477|0),($478|0))|0);
 $480 = tempRet0;
 $481 = (_i64Add(($479|0),($480|0),($459|0),($460|0))|0);
 $482 = tempRet0;
 $483 = (___muldi3(($331|0),($332|0),-997805,-1)|0);
 $484 = tempRet0;
 $485 = (___muldi3(($331|0),($332|0),136657,0)|0);
 $486 = tempRet0;
 $487 = (_i64Add(($443|0),($444|0),($485|0),($486|0))|0);
 $488 = tempRet0;
 $489 = (_i64Add(($487|0),($488|0),($463|0),($464|0))|0);
 $490 = tempRet0;
 $491 = (___muldi3(($331|0),($332|0),-683901,-1)|0);
 $492 = tempRet0;
 $493 = (_i64Add(($473|0),($474|0),1048576,0)|0);
 $494 = tempRet0;
 $495 = (_bitshift64Ashr(($493|0),($494|0),21)|0);
 $496 = tempRet0;
 $497 = (_i64Add(($475|0),($476|0),($7|0),0)|0);
 $498 = tempRet0;
 $499 = (_i64Add(($497|0),($498|0),($457|0),($458|0))|0);
 $500 = tempRet0;
 $501 = (_i64Add(($499|0),($500|0),($495|0),($496|0))|0);
 $502 = tempRet0;
 $503 = (_bitshift64Shl(($495|0),($496|0),21)|0);
 $504 = tempRet0;
 $505 = (_i64Subtract(($473|0),($474|0),($503|0),($504|0))|0);
 $506 = tempRet0;
 $507 = (_i64Add(($481|0),($482|0),1048576,0)|0);
 $508 = tempRet0;
 $509 = (_bitshift64Ashr(($507|0),($508|0),21)|0);
 $510 = tempRet0;
 $511 = (_i64Add(($439|0),($440|0),($483|0),($484|0))|0);
 $512 = tempRet0;
 $513 = (_i64Add(($511|0),($512|0),($461|0),($462|0))|0);
 $514 = tempRet0;
 $515 = (_i64Add(($513|0),($514|0),($509|0),($510|0))|0);
 $516 = tempRet0;
 $517 = (_bitshift64Shl(($509|0),($510|0),21)|0);
 $518 = tempRet0;
 $519 = (_i64Add(($489|0),($490|0),1048576,0)|0);
 $520 = tempRet0;
 $521 = (_bitshift64Ashr(($519|0),($520|0),21)|0);
 $522 = tempRet0;
 $523 = (_i64Add(($447|0),($448|0),($491|0),($492|0))|0);
 $524 = tempRet0;
 $525 = (_i64Add(($523|0),($524|0),($465|0),($466|0))|0);
 $526 = tempRet0;
 $527 = (_i64Add(($525|0),($526|0),($521|0),($522|0))|0);
 $528 = tempRet0;
 $529 = (_bitshift64Shl(($521|0),($522|0),21)|0);
 $530 = tempRet0;
 $531 = (_i64Add(($469|0),($470|0),1048576,0)|0);
 $532 = tempRet0;
 $533 = (_bitshift64Ashr(($531|0),($532|0),21)|0);
 $534 = tempRet0;
 $535 = (_i64Add(($455|0),($456|0),($533|0),($534|0))|0);
 $536 = tempRet0;
 $537 = (_bitshift64Shl(($533|0),($534|0),21)|0);
 $538 = tempRet0;
 $539 = (_i64Subtract(($469|0),($470|0),($537|0),($538|0))|0);
 $540 = tempRet0;
 $541 = (_i64Add(($431|0),($432|0),1048576,0)|0);
 $542 = tempRet0;
 $543 = (_bitshift64Ashr(($541|0),($542|0),21)|0);
 $544 = tempRet0;
 $545 = (_i64Add(($371|0),($372|0),($251|0),($252|0))|0);
 $546 = tempRet0;
 $547 = (_i64Subtract(($545|0),($546|0),($325|0),($326|0))|0);
 $548 = tempRet0;
 $549 = (_i64Add(($547|0),($548|0),($399|0),($400|0))|0);
 $550 = tempRet0;
 $551 = (_i64Add(($549|0),($550|0),($543|0),($544|0))|0);
 $552 = tempRet0;
 $553 = (_bitshift64Shl(($543|0),($544|0),21)|0);
 $554 = tempRet0;
 $555 = (_i64Subtract(($431|0),($432|0),($553|0),($554|0))|0);
 $556 = tempRet0;
 $557 = (_i64Add(($379|0),($380|0),1048576,0)|0);
 $558 = tempRet0;
 $559 = (_bitshift64Ashr(($557|0),($558|0),21)|0);
 $560 = tempRet0;
 $561 = (_i64Add(($559|0),($560|0),($335|0),($336|0))|0);
 $562 = tempRet0;
 $563 = (_bitshift64Shl(($559|0),($560|0),21)|0);
 $564 = tempRet0;
 $565 = (_i64Subtract(($379|0),($380|0),($563|0),($564|0))|0);
 $566 = tempRet0;
 $567 = (_i64Add(($501|0),($502|0),1048576,0)|0);
 $568 = tempRet0;
 $569 = (_bitshift64Ashr(($567|0),($568|0),21)|0);
 $570 = tempRet0;
 $571 = (_bitshift64Shl(($569|0),($570|0),21)|0);
 $572 = tempRet0;
 $573 = (_i64Add(($515|0),($516|0),1048576,0)|0);
 $574 = tempRet0;
 $575 = (_bitshift64Ashr(($573|0),($574|0),21)|0);
 $576 = tempRet0;
 $577 = (_bitshift64Shl(($575|0),($576|0),21)|0);
 $578 = tempRet0;
 $579 = (_i64Add(($527|0),($528|0),1048576,0)|0);
 $580 = tempRet0;
 $581 = (_bitshift64Ashr(($579|0),($580|0),21)|0);
 $582 = tempRet0;
 $583 = (_i64Add(($539|0),($540|0),($581|0),($582|0))|0);
 $584 = tempRet0;
 $585 = (_bitshift64Shl(($581|0),($582|0),21)|0);
 $586 = tempRet0;
 $587 = (_i64Add(($535|0),($536|0),1048576,0)|0);
 $588 = tempRet0;
 $589 = (_bitshift64Ashr(($587|0),($588|0),21)|0);
 $590 = tempRet0;
 $591 = (_i64Add(($555|0),($556|0),($589|0),($590|0))|0);
 $592 = tempRet0;
 $593 = (_bitshift64Shl(($589|0),($590|0),21)|0);
 $594 = tempRet0;
 $595 = (_i64Subtract(($535|0),($536|0),($593|0),($594|0))|0);
 $596 = tempRet0;
 $597 = (_i64Add(($551|0),($552|0),1048576,0)|0);
 $598 = tempRet0;
 $599 = (_bitshift64Ashr(($597|0),($598|0),21)|0);
 $600 = tempRet0;
 $601 = (_i64Add(($565|0),($566|0),($599|0),($600|0))|0);
 $602 = tempRet0;
 $603 = (_bitshift64Shl(($599|0),($600|0),21)|0);
 $604 = tempRet0;
 $605 = (_i64Subtract(($551|0),($552|0),($603|0),($604|0))|0);
 $606 = tempRet0;
 $607 = (_i64Add(($561|0),($562|0),1048576,0)|0);
 $608 = tempRet0;
 $609 = (_bitshift64Ashr(($607|0),($608|0),21)|0);
 $610 = tempRet0;
 $611 = (_bitshift64Shl(($609|0),($610|0),21)|0);
 $612 = tempRet0;
 $613 = (_i64Subtract(($561|0),($562|0),($611|0),($612|0))|0);
 $614 = tempRet0;
 $615 = (___muldi3(($609|0),($610|0),666643,0)|0);
 $616 = tempRet0;
 $617 = (_i64Add(($505|0),($506|0),($615|0),($616|0))|0);
 $618 = tempRet0;
 $619 = (___muldi3(($609|0),($610|0),470296,0)|0);
 $620 = tempRet0;
 $621 = (___muldi3(($609|0),($610|0),654183,0)|0);
 $622 = tempRet0;
 $623 = (___muldi3(($609|0),($610|0),-997805,-1)|0);
 $624 = tempRet0;
 $625 = (___muldi3(($609|0),($610|0),136657,0)|0);
 $626 = tempRet0;
 $627 = (___muldi3(($609|0),($610|0),-683901,-1)|0);
 $628 = tempRet0;
 $629 = (_bitshift64Ashr(($617|0),($618|0),21)|0);
 $630 = tempRet0;
 $631 = (_i64Add(($619|0),($620|0),($501|0),($502|0))|0);
 $632 = tempRet0;
 $633 = (_i64Subtract(($631|0),($632|0),($571|0),($572|0))|0);
 $634 = tempRet0;
 $635 = (_i64Add(($633|0),($634|0),($629|0),($630|0))|0);
 $636 = tempRet0;
 $637 = (_bitshift64Shl(($629|0),($630|0),21)|0);
 $638 = tempRet0;
 $639 = (_i64Subtract(($617|0),($618|0),($637|0),($638|0))|0);
 $640 = tempRet0;
 $641 = (_bitshift64Ashr(($635|0),($636|0),21)|0);
 $642 = tempRet0;
 $643 = (_i64Add(($621|0),($622|0),($481|0),($482|0))|0);
 $644 = tempRet0;
 $645 = (_i64Subtract(($643|0),($644|0),($517|0),($518|0))|0);
 $646 = tempRet0;
 $647 = (_i64Add(($645|0),($646|0),($569|0),($570|0))|0);
 $648 = tempRet0;
 $649 = (_i64Add(($647|0),($648|0),($641|0),($642|0))|0);
 $650 = tempRet0;
 $651 = (_bitshift64Shl(($641|0),($642|0),21)|0);
 $652 = tempRet0;
 $653 = (_i64Subtract(($635|0),($636|0),($651|0),($652|0))|0);
 $654 = tempRet0;
 $655 = (_bitshift64Ashr(($649|0),($650|0),21)|0);
 $656 = tempRet0;
 $657 = (_i64Add(($515|0),($516|0),($623|0),($624|0))|0);
 $658 = tempRet0;
 $659 = (_i64Subtract(($657|0),($658|0),($577|0),($578|0))|0);
 $660 = tempRet0;
 $661 = (_i64Add(($659|0),($660|0),($655|0),($656|0))|0);
 $662 = tempRet0;
 $663 = (_bitshift64Shl(($655|0),($656|0),21)|0);
 $664 = tempRet0;
 $665 = (_i64Subtract(($649|0),($650|0),($663|0),($664|0))|0);
 $666 = tempRet0;
 $667 = (_bitshift64Ashr(($661|0),($662|0),21)|0);
 $668 = tempRet0;
 $669 = (_i64Add(($625|0),($626|0),($489|0),($490|0))|0);
 $670 = tempRet0;
 $671 = (_i64Subtract(($669|0),($670|0),($529|0),($530|0))|0);
 $672 = tempRet0;
 $673 = (_i64Add(($671|0),($672|0),($575|0),($576|0))|0);
 $674 = tempRet0;
 $675 = (_i64Add(($673|0),($674|0),($667|0),($668|0))|0);
 $676 = tempRet0;
 $677 = (_bitshift64Shl(($667|0),($668|0),21)|0);
 $678 = tempRet0;
 $679 = (_i64Subtract(($661|0),($662|0),($677|0),($678|0))|0);
 $680 = tempRet0;
 $681 = (_bitshift64Ashr(($675|0),($676|0),21)|0);
 $682 = tempRet0;
 $683 = (_i64Add(($527|0),($528|0),($627|0),($628|0))|0);
 $684 = tempRet0;
 $685 = (_i64Subtract(($683|0),($684|0),($585|0),($586|0))|0);
 $686 = tempRet0;
 $687 = (_i64Add(($685|0),($686|0),($681|0),($682|0))|0);
 $688 = tempRet0;
 $689 = (_bitshift64Shl(($681|0),($682|0),21)|0);
 $690 = tempRet0;
 $691 = (_i64Subtract(($675|0),($676|0),($689|0),($690|0))|0);
 $692 = tempRet0;
 $693 = (_bitshift64Ashr(($687|0),($688|0),21)|0);
 $694 = tempRet0;
 $695 = (_i64Add(($583|0),($584|0),($693|0),($694|0))|0);
 $696 = tempRet0;
 $697 = (_bitshift64Shl(($693|0),($694|0),21)|0);
 $698 = tempRet0;
 $699 = (_i64Subtract(($687|0),($688|0),($697|0),($698|0))|0);
 $700 = tempRet0;
 $701 = (_bitshift64Ashr(($695|0),($696|0),21)|0);
 $702 = tempRet0;
 $703 = (_i64Add(($701|0),($702|0),($595|0),($596|0))|0);
 $704 = tempRet0;
 $705 = (_bitshift64Shl(($701|0),($702|0),21)|0);
 $706 = tempRet0;
 $707 = (_i64Subtract(($695|0),($696|0),($705|0),($706|0))|0);
 $708 = tempRet0;
 $709 = (_bitshift64Ashr(($703|0),($704|0),21)|0);
 $710 = tempRet0;
 $711 = (_i64Add(($591|0),($592|0),($709|0),($710|0))|0);
 $712 = tempRet0;
 $713 = (_bitshift64Shl(($709|0),($710|0),21)|0);
 $714 = tempRet0;
 $715 = (_i64Subtract(($703|0),($704|0),($713|0),($714|0))|0);
 $716 = tempRet0;
 $717 = (_bitshift64Ashr(($711|0),($712|0),21)|0);
 $718 = tempRet0;
 $719 = (_i64Add(($717|0),($718|0),($605|0),($606|0))|0);
 $720 = tempRet0;
 $721 = (_bitshift64Shl(($717|0),($718|0),21)|0);
 $722 = tempRet0;
 $723 = (_i64Subtract(($711|0),($712|0),($721|0),($722|0))|0);
 $724 = tempRet0;
 $725 = (_bitshift64Ashr(($719|0),($720|0),21)|0);
 $726 = tempRet0;
 $727 = (_i64Add(($601|0),($602|0),($725|0),($726|0))|0);
 $728 = tempRet0;
 $729 = (_bitshift64Shl(($725|0),($726|0),21)|0);
 $730 = tempRet0;
 $731 = (_i64Subtract(($719|0),($720|0),($729|0),($730|0))|0);
 $732 = tempRet0;
 $733 = (_bitshift64Ashr(($727|0),($728|0),21)|0);
 $734 = tempRet0;
 $735 = (_i64Add(($733|0),($734|0),($613|0),($614|0))|0);
 $736 = tempRet0;
 $737 = (_bitshift64Shl(($733|0),($734|0),21)|0);
 $738 = tempRet0;
 $739 = (_i64Subtract(($727|0),($728|0),($737|0),($738|0))|0);
 $740 = tempRet0;
 $741 = (_bitshift64Ashr(($735|0),($736|0),21)|0);
 $742 = tempRet0;
 $743 = (_bitshift64Shl(($741|0),($742|0),21)|0);
 $744 = tempRet0;
 $745 = (_i64Subtract(($735|0),($736|0),($743|0),($744|0))|0);
 $746 = tempRet0;
 $747 = (___muldi3(($741|0),($742|0),666643,0)|0);
 $748 = tempRet0;
 $749 = (_i64Add(($747|0),($748|0),($639|0),($640|0))|0);
 $750 = tempRet0;
 $751 = (___muldi3(($741|0),($742|0),470296,0)|0);
 $752 = tempRet0;
 $753 = (_i64Add(($653|0),($654|0),($751|0),($752|0))|0);
 $754 = tempRet0;
 $755 = (___muldi3(($741|0),($742|0),654183,0)|0);
 $756 = tempRet0;
 $757 = (_i64Add(($665|0),($666|0),($755|0),($756|0))|0);
 $758 = tempRet0;
 $759 = (___muldi3(($741|0),($742|0),-997805,-1)|0);
 $760 = tempRet0;
 $761 = (_i64Add(($679|0),($680|0),($759|0),($760|0))|0);
 $762 = tempRet0;
 $763 = (___muldi3(($741|0),($742|0),136657,0)|0);
 $764 = tempRet0;
 $765 = (_i64Add(($691|0),($692|0),($763|0),($764|0))|0);
 $766 = tempRet0;
 $767 = (___muldi3(($741|0),($742|0),-683901,-1)|0);
 $768 = tempRet0;
 $769 = (_i64Add(($699|0),($700|0),($767|0),($768|0))|0);
 $770 = tempRet0;
 $771 = (_bitshift64Ashr(($749|0),($750|0),21)|0);
 $772 = tempRet0;
 $773 = (_i64Add(($753|0),($754|0),($771|0),($772|0))|0);
 $774 = tempRet0;
 $775 = (_bitshift64Shl(($771|0),($772|0),21)|0);
 $776 = tempRet0;
 $777 = (_i64Subtract(($749|0),($750|0),($775|0),($776|0))|0);
 $778 = tempRet0;
 $779 = (_bitshift64Ashr(($773|0),($774|0),21)|0);
 $780 = tempRet0;
 $781 = (_i64Add(($757|0),($758|0),($779|0),($780|0))|0);
 $782 = tempRet0;
 $783 = (_bitshift64Shl(($779|0),($780|0),21)|0);
 $784 = tempRet0;
 $785 = (_i64Subtract(($773|0),($774|0),($783|0),($784|0))|0);
 $786 = tempRet0;
 $787 = (_bitshift64Ashr(($781|0),($782|0),21)|0);
 $788 = tempRet0;
 $789 = (_i64Add(($761|0),($762|0),($787|0),($788|0))|0);
 $790 = tempRet0;
 $791 = (_bitshift64Shl(($787|0),($788|0),21)|0);
 $792 = tempRet0;
 $793 = (_i64Subtract(($781|0),($782|0),($791|0),($792|0))|0);
 $794 = tempRet0;
 $795 = (_bitshift64Ashr(($789|0),($790|0),21)|0);
 $796 = tempRet0;
 $797 = (_i64Add(($765|0),($766|0),($795|0),($796|0))|0);
 $798 = tempRet0;
 $799 = (_bitshift64Shl(($795|0),($796|0),21)|0);
 $800 = tempRet0;
 $801 = (_i64Subtract(($789|0),($790|0),($799|0),($800|0))|0);
 $802 = tempRet0;
 $803 = (_bitshift64Ashr(($797|0),($798|0),21)|0);
 $804 = tempRet0;
 $805 = (_i64Add(($769|0),($770|0),($803|0),($804|0))|0);
 $806 = tempRet0;
 $807 = (_bitshift64Shl(($803|0),($804|0),21)|0);
 $808 = tempRet0;
 $809 = (_i64Subtract(($797|0),($798|0),($807|0),($808|0))|0);
 $810 = tempRet0;
 $811 = (_bitshift64Ashr(($805|0),($806|0),21)|0);
 $812 = tempRet0;
 $813 = (_i64Add(($811|0),($812|0),($707|0),($708|0))|0);
 $814 = tempRet0;
 $815 = (_bitshift64Shl(($811|0),($812|0),21)|0);
 $816 = tempRet0;
 $817 = (_i64Subtract(($805|0),($806|0),($815|0),($816|0))|0);
 $818 = tempRet0;
 $819 = (_bitshift64Ashr(($813|0),($814|0),21)|0);
 $820 = tempRet0;
 $821 = (_i64Add(($819|0),($820|0),($715|0),($716|0))|0);
 $822 = tempRet0;
 $823 = (_bitshift64Shl(($819|0),($820|0),21)|0);
 $824 = tempRet0;
 $825 = (_i64Subtract(($813|0),($814|0),($823|0),($824|0))|0);
 $826 = tempRet0;
 $827 = (_bitshift64Ashr(($821|0),($822|0),21)|0);
 $828 = tempRet0;
 $829 = (_i64Add(($827|0),($828|0),($723|0),($724|0))|0);
 $830 = tempRet0;
 $831 = (_bitshift64Shl(($827|0),($828|0),21)|0);
 $832 = tempRet0;
 $833 = (_i64Subtract(($821|0),($822|0),($831|0),($832|0))|0);
 $834 = tempRet0;
 $835 = (_bitshift64Ashr(($829|0),($830|0),21)|0);
 $836 = tempRet0;
 $837 = (_i64Add(($835|0),($836|0),($731|0),($732|0))|0);
 $838 = tempRet0;
 $839 = (_bitshift64Shl(($835|0),($836|0),21)|0);
 $840 = tempRet0;
 $841 = (_i64Subtract(($829|0),($830|0),($839|0),($840|0))|0);
 $842 = tempRet0;
 $843 = (_bitshift64Ashr(($837|0),($838|0),21)|0);
 $844 = tempRet0;
 $845 = (_i64Add(($843|0),($844|0),($739|0),($740|0))|0);
 $846 = tempRet0;
 $847 = (_bitshift64Shl(($843|0),($844|0),21)|0);
 $848 = tempRet0;
 $849 = (_i64Subtract(($837|0),($838|0),($847|0),($848|0))|0);
 $850 = tempRet0;
 $851 = (_bitshift64Ashr(($845|0),($846|0),21)|0);
 $852 = tempRet0;
 $853 = (_i64Add(($851|0),($852|0),($745|0),($746|0))|0);
 $854 = tempRet0;
 $855 = (_bitshift64Shl(($851|0),($852|0),21)|0);
 $856 = tempRet0;
 $857 = (_i64Subtract(($845|0),($846|0),($855|0),($856|0))|0);
 $858 = tempRet0;
 $859 = $777&255;
 HEAP8[$s>>0] = $859;
 $860 = (_bitshift64Lshr(($777|0),($778|0),8)|0);
 $861 = tempRet0;
 $862 = $860&255;
 $arrayidx462 = ((($s)) + 1|0);
 HEAP8[$arrayidx462>>0] = $862;
 $863 = (_bitshift64Lshr(($777|0),($778|0),16)|0);
 $864 = tempRet0;
 $865 = (_bitshift64Shl(($785|0),($786|0),5)|0);
 $866 = tempRet0;
 $867 = $865 | $863;
 $866 | $864;
 $868 = $867&255;
 HEAP8[$add$ptr>>0] = $868;
 $869 = (_bitshift64Lshr(($785|0),($786|0),3)|0);
 $870 = tempRet0;
 $871 = $869&255;
 $arrayidx469 = ((($s)) + 3|0);
 HEAP8[$arrayidx469>>0] = $871;
 $872 = (_bitshift64Lshr(($785|0),($786|0),11)|0);
 $873 = tempRet0;
 $874 = $872&255;
 $arrayidx472 = ((($s)) + 4|0);
 HEAP8[$arrayidx472>>0] = $874;
 $875 = (_bitshift64Lshr(($785|0),($786|0),19)|0);
 $876 = tempRet0;
 $877 = (_bitshift64Shl(($793|0),($794|0),2)|0);
 $878 = tempRet0;
 $879 = $877 | $875;
 $878 | $876;
 $880 = $879&255;
 HEAP8[$add$ptr3>>0] = $880;
 $881 = (_bitshift64Lshr(($793|0),($794|0),6)|0);
 $882 = tempRet0;
 $883 = $881&255;
 $arrayidx480 = ((($s)) + 6|0);
 HEAP8[$arrayidx480>>0] = $883;
 $884 = (_bitshift64Lshr(($793|0),($794|0),14)|0);
 $885 = tempRet0;
 $886 = (_bitshift64Shl(($801|0),($802|0),7)|0);
 $887 = tempRet0;
 $888 = $886 | $884;
 $887 | $885;
 $889 = $888&255;
 HEAP8[$add$ptr7>>0] = $889;
 $890 = (_bitshift64Lshr(($801|0),($802|0),1)|0);
 $891 = tempRet0;
 $892 = $890&255;
 $arrayidx488 = ((($s)) + 8|0);
 HEAP8[$arrayidx488>>0] = $892;
 $893 = (_bitshift64Lshr(($801|0),($802|0),9)|0);
 $894 = tempRet0;
 $895 = $893&255;
 $arrayidx491 = ((($s)) + 9|0);
 HEAP8[$arrayidx491>>0] = $895;
 $896 = (_bitshift64Lshr(($801|0),($802|0),17)|0);
 $897 = tempRet0;
 $898 = (_bitshift64Shl(($809|0),($810|0),4)|0);
 $899 = tempRet0;
 $900 = $898 | $896;
 $899 | $897;
 $901 = $900&255;
 HEAP8[$add$ptr11>>0] = $901;
 $902 = (_bitshift64Lshr(($809|0),($810|0),4)|0);
 $903 = tempRet0;
 $904 = $902&255;
 $arrayidx499 = ((($s)) + 11|0);
 HEAP8[$arrayidx499>>0] = $904;
 $905 = (_bitshift64Lshr(($809|0),($810|0),12)|0);
 $906 = tempRet0;
 $907 = $905&255;
 $arrayidx502 = ((($s)) + 12|0);
 HEAP8[$arrayidx502>>0] = $907;
 $908 = (_bitshift64Lshr(($809|0),($810|0),20)|0);
 $909 = tempRet0;
 $910 = (_bitshift64Shl(($817|0),($818|0),1)|0);
 $911 = tempRet0;
 $912 = $910 | $908;
 $911 | $909;
 $913 = $912&255;
 HEAP8[$add$ptr15>>0] = $913;
 $914 = (_bitshift64Lshr(($817|0),($818|0),7)|0);
 $915 = tempRet0;
 $916 = $914&255;
 $arrayidx510 = ((($s)) + 14|0);
 HEAP8[$arrayidx510>>0] = $916;
 $917 = (_bitshift64Lshr(($817|0),($818|0),15)|0);
 $918 = tempRet0;
 $919 = (_bitshift64Shl(($825|0),($826|0),6)|0);
 $920 = tempRet0;
 $921 = $919 | $917;
 $920 | $918;
 $922 = $921&255;
 HEAP8[$add$ptr19>>0] = $922;
 $923 = (_bitshift64Lshr(($825|0),($826|0),2)|0);
 $924 = tempRet0;
 $925 = $923&255;
 $arrayidx518 = ((($s)) + 16|0);
 HEAP8[$arrayidx518>>0] = $925;
 $926 = (_bitshift64Lshr(($825|0),($826|0),10)|0);
 $927 = tempRet0;
 $928 = $926&255;
 $arrayidx521 = ((($s)) + 17|0);
 HEAP8[$arrayidx521>>0] = $928;
 $929 = (_bitshift64Lshr(($825|0),($826|0),18)|0);
 $930 = tempRet0;
 $931 = (_bitshift64Shl(($833|0),($834|0),3)|0);
 $932 = tempRet0;
 $933 = $931 | $929;
 $932 | $930;
 $934 = $933&255;
 HEAP8[$add$ptr23>>0] = $934;
 $935 = (_bitshift64Lshr(($833|0),($834|0),5)|0);
 $936 = tempRet0;
 $937 = $935&255;
 $arrayidx529 = ((($s)) + 19|0);
 HEAP8[$arrayidx529>>0] = $937;
 $938 = (_bitshift64Lshr(($833|0),($834|0),13)|0);
 $939 = tempRet0;
 $940 = $938&255;
 $arrayidx532 = ((($s)) + 20|0);
 HEAP8[$arrayidx532>>0] = $940;
 $941 = $841&255;
 HEAP8[$add$ptr27>>0] = $941;
 $942 = (_bitshift64Lshr(($841|0),($842|0),8)|0);
 $943 = tempRet0;
 $944 = $942&255;
 $arrayidx538 = ((($s)) + 22|0);
 HEAP8[$arrayidx538>>0] = $944;
 $945 = (_bitshift64Lshr(($841|0),($842|0),16)|0);
 $946 = tempRet0;
 $947 = (_bitshift64Shl(($849|0),($850|0),5)|0);
 $948 = tempRet0;
 $949 = $947 | $945;
 $948 | $946;
 $950 = $949&255;
 HEAP8[$add$ptr30>>0] = $950;
 $951 = (_bitshift64Lshr(($849|0),($850|0),3)|0);
 $952 = tempRet0;
 $953 = $951&255;
 $arrayidx546 = ((($s)) + 24|0);
 HEAP8[$arrayidx546>>0] = $953;
 $954 = (_bitshift64Lshr(($849|0),($850|0),11)|0);
 $955 = tempRet0;
 $956 = $954&255;
 $arrayidx549 = ((($s)) + 25|0);
 HEAP8[$arrayidx549>>0] = $956;
 $957 = (_bitshift64Lshr(($849|0),($850|0),19)|0);
 $958 = tempRet0;
 $959 = (_bitshift64Shl(($857|0),($858|0),2)|0);
 $960 = tempRet0;
 $961 = $959 | $957;
 $960 | $958;
 $962 = $961&255;
 HEAP8[$add$ptr34>>0] = $962;
 $963 = (_bitshift64Lshr(($857|0),($858|0),6)|0);
 $964 = tempRet0;
 $965 = $963&255;
 $arrayidx557 = ((($s)) + 27|0);
 HEAP8[$arrayidx557>>0] = $965;
 $966 = (_bitshift64Lshr(($857|0),($858|0),14)|0);
 $967 = tempRet0;
 $968 = (_bitshift64Shl(($853|0),($854|0),7)|0);
 $969 = tempRet0;
 $970 = $966 | $968;
 $967 | $969;
 $971 = $970&255;
 HEAP8[$add$ptr38>>0] = $971;
 $972 = (_bitshift64Lshr(($853|0),($854|0),1)|0);
 $973 = tempRet0;
 $974 = $972&255;
 $arrayidx565 = ((($s)) + 29|0);
 HEAP8[$arrayidx565>>0] = $974;
 $975 = (_bitshift64Lshr(($853|0),($854|0),9)|0);
 $976 = tempRet0;
 $977 = $975&255;
 $arrayidx568 = ((($s)) + 30|0);
 HEAP8[$arrayidx568>>0] = $977;
 $978 = (_bitshift64Lshr(($853|0),($854|0),17)|0);
 $979 = tempRet0;
 $980 = $978&255;
 HEAP8[$add$ptr42>>0] = $980;
 return;
}
function _load_3_51($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0, $arrayidx3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 tempRet0 = ($12);
 return ($11|0);
}
function _load_4_52($in) {
 $in = $in|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $arrayidx1 = 0;
 var $arrayidx3 = 0, $arrayidx7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$in>>0]|0;
 $1 = $0&255;
 $arrayidx1 = ((($in)) + 1|0);
 $2 = HEAP8[$arrayidx1>>0]|0;
 $3 = $2&255;
 $4 = (_bitshift64Shl(($3|0),0,8)|0);
 $5 = tempRet0;
 $6 = $4 | $1;
 $arrayidx3 = ((($in)) + 2|0);
 $7 = HEAP8[$arrayidx3>>0]|0;
 $8 = $7&255;
 $9 = (_bitshift64Shl(($8|0),0,16)|0);
 $10 = tempRet0;
 $11 = $6 | $9;
 $12 = $5 | $10;
 $arrayidx7 = ((($in)) + 3|0);
 $13 = HEAP8[$arrayidx7>>0]|0;
 $14 = $13&255;
 $15 = (_bitshift64Shl(($14|0),0,24)|0);
 $16 = tempRet0;
 $17 = $11 | $15;
 $18 = $12 | $16;
 tempRet0 = ($18);
 return ($17|0);
}
function _sph_sha512_init($cc) {
 $cc = $cc|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $count = 0, $val = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 $val = ((($cc)) + 128|0);
 dest=$val; src=8; stop=dest+64|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $count = ((($cc)) + 192|0);
 $0 = $count;
 $1 = $0;
 HEAP32[$1>>2] = 0;
 $2 = (($0) + 4)|0;
 $3 = $2;
 HEAP32[$3>>2] = 0;
 return;
}
function _sph_sha384($cc,$data,$len) {
 $cc = $cc|0;
 $data = $data|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $add = 0, $add$ptr = 0;
 var $add$ptr4 = 0, $and = 0, $cmp = 0, $cmp2 = 0, $cmp20 = 0, $cmp6 = 0, $count = 0, $current$023 = 0, $current$1 = 0, $data$addr$022 = 0, $len$addr$0$sub = 0, $len$addr$021 = 0, $sub = 0, $sub5 = 0, $val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $count = ((($cc)) + 192|0);
 $cmp20 = ($len|0)==(0);
 if ($cmp20) {
  return;
 }
 $0 = $count;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $and = $2 & 127;
 $val = ((($cc)) + 128|0);
 $current$023 = $and;$data$addr$022 = $data;$len$addr$021 = $len;
 while(1) {
  $sub = (128 - ($current$023))|0;
  $cmp2 = ($sub>>>0)>($len$addr$021>>>0);
  $len$addr$0$sub = $cmp2 ? $len$addr$021 : $sub;
  $add$ptr = (($cc) + ($current$023)|0);
  _memcpy(($add$ptr|0),($data$addr$022|0),($len$addr$0$sub|0))|0;
  $add$ptr4 = (($data$addr$022) + ($len$addr$0$sub)|0);
  $add = (($len$addr$0$sub) + ($current$023))|0;
  $sub5 = (($len$addr$021) - ($len$addr$0$sub))|0;
  $cmp6 = ($add|0)==(128);
  if ($cmp6) {
   _sha3_round($cc,$val);
   $current$1 = 0;
  } else {
   $current$1 = $add;
  }
  $6 = $count;
  $7 = $6;
  $8 = HEAP32[$7>>2]|0;
  $9 = (($6) + 4)|0;
  $10 = $9;
  $11 = HEAP32[$10>>2]|0;
  $12 = (_i64Add(($8|0),($11|0),($len$addr$0$sub|0),0)|0);
  $13 = tempRet0;
  $14 = $count;
  $15 = $14;
  HEAP32[$15>>2] = $12;
  $16 = (($14) + 4)|0;
  $17 = $16;
  HEAP32[$17>>2] = $13;
  $cmp = ($sub5|0)==(0);
  if ($cmp) {
   break;
  } else {
   $current$023 = $current$1;$data$addr$022 = $add$ptr4;$len$addr$021 = $sub5;
  }
 }
 return;
}
function _sha3_round($data,$r) {
 $data = $data|0;
 $r = $r|0;
 var $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0;
 var $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0;
 var $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0;
 var $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0;
 var $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0;
 var $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0;
 var $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0;
 var $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0;
 var $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0;
 var $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0;
 var $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0;
 var $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0;
 var $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0;
 var $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0;
 var $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0;
 var $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0;
 var $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0;
 var $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0;
 var $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0;
 var $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0;
 var $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0;
 var $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0, $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0;
 var $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0;
 var $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0;
 var $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0;
 var $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0;
 var $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0;
 var $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0;
 var $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0;
 var $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0;
 var $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0;
 var $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0;
 var $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0;
 var $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0;
 var $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0;
 var $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0;
 var $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0;
 var $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0;
 var $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0;
 var $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0, $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0;
 var $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0, $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0;
 var $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0, $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0;
 var $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $W = 0, $add$ptr = 0, $add117 = 0, $add162 = 0, $add207 = 0, $add252 = 0, $add297 = 0, $add342 = 0, $add387 = 0, $add414 = 0, $arrayidx = 0, $arrayidx118 = 0, $arrayidx121 = 0, $arrayidx163 = 0, $arrayidx166 = 0, $arrayidx19 = 0, $arrayidx208 = 0, $arrayidx21 = 0, $arrayidx211 = 0, $arrayidx253 = 0;
 var $arrayidx256 = 0, $arrayidx298 = 0, $arrayidx301 = 0, $arrayidx343 = 0, $arrayidx346 = 0, $arrayidx388 = 0, $arrayidx391 = 0, $arrayidx4 = 0, $arrayidx41 = 0, $arrayidx43 = 0, $arrayidx48 = 0, $arrayidx49 = 0, $arrayidx50 = 0, $arrayidx51 = 0, $arrayidx52 = 0, $arrayidx53 = 0, $arrayidx54 = 0, $arrayidx75 = 0, $arrayidx78 = 0, $cmp56 = 0;
 var $exitcond = 0, $exitcond288 = 0, $i$0287 = 0, $i$1286 = 0, $i$2285 = 0, $inc = 0, $inc45 = 0, $mul = 0, $sub = 0, $sub18 = 0, $sub20 = 0, $sub40 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 640|0;
 $W = sp;
 $i$0287 = 0;
 while(1) {
  $mul = $i$0287 << 3;
  $add$ptr = (($data) + ($mul)|0);
  $0 = (_sph_dec64be_aligned($add$ptr)|0);
  $1 = tempRet0;
  $arrayidx = (($W) + ($i$0287<<3)|0);
  $2 = $arrayidx;
  $3 = $2;
  HEAP32[$3>>2] = $0;
  $4 = (($2) + 4)|0;
  $5 = $4;
  HEAP32[$5>>2] = $1;
  $inc = (($i$0287) + 1)|0;
  $exitcond288 = ($inc|0)==(16);
  if ($exitcond288) {
   $i$1286 = 16;
   break;
  } else {
   $i$0287 = $inc;
  }
 }
 while(1) {
  $sub = (($i$1286) + -2)|0;
  $arrayidx4 = (($W) + ($sub<<3)|0);
  $6 = $arrayidx4;
  $7 = $6;
  $8 = HEAP32[$7>>2]|0;
  $9 = (($6) + 4)|0;
  $10 = $9;
  $11 = HEAP32[$10>>2]|0;
  $12 = (_bitshift64Shl(($8|0),($11|0),45)|0);
  $13 = tempRet0;
  $14 = (_bitshift64Lshr(($8|0),($11|0),19)|0);
  $15 = tempRet0;
  $16 = $12 | $14;
  $17 = $13 | $15;
  $18 = (_bitshift64Shl(($8|0),($11|0),3)|0);
  $19 = tempRet0;
  $20 = (_bitshift64Lshr(($8|0),($11|0),61)|0);
  $21 = tempRet0;
  $22 = $18 | $20;
  $23 = $19 | $21;
  $24 = (_bitshift64Lshr(($8|0),($11|0),6)|0);
  $25 = tempRet0;
  $26 = $22 ^ $24;
  $27 = $23 ^ $25;
  $28 = $26 ^ $16;
  $29 = $27 ^ $17;
  $sub18 = (($i$1286) + -7)|0;
  $arrayidx19 = (($W) + ($sub18<<3)|0);
  $30 = $arrayidx19;
  $31 = $30;
  $32 = HEAP32[$31>>2]|0;
  $33 = (($30) + 4)|0;
  $34 = $33;
  $35 = HEAP32[$34>>2]|0;
  $sub20 = (($i$1286) + -15)|0;
  $arrayidx21 = (($W) + ($sub20<<3)|0);
  $36 = $arrayidx21;
  $37 = $36;
  $38 = HEAP32[$37>>2]|0;
  $39 = (($36) + 4)|0;
  $40 = $39;
  $41 = HEAP32[$40>>2]|0;
  $42 = (_bitshift64Shl(($38|0),($41|0),63)|0);
  $43 = tempRet0;
  $44 = (_bitshift64Lshr(($38|0),($41|0),1)|0);
  $45 = tempRet0;
  $46 = $42 | $44;
  $47 = $43 | $45;
  $48 = (_bitshift64Shl(($38|0),($41|0),56)|0);
  $49 = tempRet0;
  $50 = (_bitshift64Lshr(($38|0),($41|0),8)|0);
  $51 = tempRet0;
  $52 = $48 | $50;
  $53 = $49 | $51;
  $54 = (_bitshift64Lshr(($38|0),($41|0),7)|0);
  $55 = tempRet0;
  $56 = $52 ^ $54;
  $57 = $53 ^ $55;
  $58 = $56 ^ $46;
  $59 = $57 ^ $47;
  $sub40 = (($i$1286) + -16)|0;
  $arrayidx41 = (($W) + ($sub40<<3)|0);
  $60 = $arrayidx41;
  $61 = $60;
  $62 = HEAP32[$61>>2]|0;
  $63 = (($60) + 4)|0;
  $64 = $63;
  $65 = HEAP32[$64>>2]|0;
  $66 = (_i64Add(($62|0),($65|0),($32|0),($35|0))|0);
  $67 = tempRet0;
  $68 = (_i64Add(($66|0),($67|0),($28|0),($29|0))|0);
  $69 = tempRet0;
  $70 = (_i64Add(($68|0),($69|0),($58|0),($59|0))|0);
  $71 = tempRet0;
  $arrayidx43 = (($W) + ($i$1286<<3)|0);
  $72 = $arrayidx43;
  $73 = $72;
  HEAP32[$73>>2] = $70;
  $74 = (($72) + 4)|0;
  $75 = $74;
  HEAP32[$75>>2] = $71;
  $inc45 = (($i$1286) + 1)|0;
  $exitcond = ($inc45|0)==(80);
  if ($exitcond) {
   break;
  } else {
   $i$1286 = $inc45;
  }
 }
 $76 = $r;
 $77 = $76;
 $78 = HEAP32[$77>>2]|0;
 $79 = (($76) + 4)|0;
 $80 = $79;
 $81 = HEAP32[$80>>2]|0;
 $arrayidx48 = ((($r)) + 8|0);
 $82 = $arrayidx48;
 $83 = $82;
 $84 = HEAP32[$83>>2]|0;
 $85 = (($82) + 4)|0;
 $86 = $85;
 $87 = HEAP32[$86>>2]|0;
 $arrayidx49 = ((($r)) + 16|0);
 $88 = $arrayidx49;
 $89 = $88;
 $90 = HEAP32[$89>>2]|0;
 $91 = (($88) + 4)|0;
 $92 = $91;
 $93 = HEAP32[$92>>2]|0;
 $arrayidx50 = ((($r)) + 24|0);
 $94 = $arrayidx50;
 $95 = $94;
 $96 = HEAP32[$95>>2]|0;
 $97 = (($94) + 4)|0;
 $98 = $97;
 $99 = HEAP32[$98>>2]|0;
 $arrayidx51 = ((($r)) + 32|0);
 $100 = $arrayidx51;
 $101 = $100;
 $102 = HEAP32[$101>>2]|0;
 $103 = (($100) + 4)|0;
 $104 = $103;
 $105 = HEAP32[$104>>2]|0;
 $arrayidx52 = ((($r)) + 40|0);
 $106 = $arrayidx52;
 $107 = $106;
 $108 = HEAP32[$107>>2]|0;
 $109 = (($106) + 4)|0;
 $110 = $109;
 $111 = HEAP32[$110>>2]|0;
 $arrayidx53 = ((($r)) + 48|0);
 $112 = $arrayidx53;
 $113 = $112;
 $114 = HEAP32[$113>>2]|0;
 $115 = (($112) + 4)|0;
 $116 = $115;
 $117 = HEAP32[$116>>2]|0;
 $arrayidx54 = ((($r)) + 56|0);
 $118 = $arrayidx54;
 $119 = $118;
 $120 = HEAP32[$119>>2]|0;
 $121 = (($118) + 4)|0;
 $122 = $121;
 $123 = HEAP32[$122>>2]|0;
 $124 = $102;$125 = $105;$149 = $108;$150 = $114;$152 = $111;$153 = $117;$170 = $120;$171 = $123;$180 = $78;$181 = $81;$205 = $84;$207 = $87;$211 = $90;$213 = $93;$218 = $96;$219 = $99;$i$2285 = 0;
 while(1) {
  $126 = (_bitshift64Shl(($124|0),($125|0),50)|0);
  $127 = tempRet0;
  $128 = (_bitshift64Lshr(($124|0),($125|0),14)|0);
  $129 = tempRet0;
  $130 = $126 | $128;
  $131 = $127 | $129;
  $132 = (_bitshift64Shl(($124|0),($125|0),46)|0);
  $133 = tempRet0;
  $134 = (_bitshift64Lshr(($124|0),($125|0),18)|0);
  $135 = tempRet0;
  $136 = $132 | $134;
  $137 = $133 | $135;
  $138 = $130 ^ $136;
  $139 = $131 ^ $137;
  $140 = (_bitshift64Shl(($124|0),($125|0),23)|0);
  $141 = tempRet0;
  $142 = (_bitshift64Lshr(($124|0),($125|0),41)|0);
  $143 = tempRet0;
  $144 = $140 | $142;
  $145 = $141 | $143;
  $146 = $138 ^ $144;
  $147 = $139 ^ $145;
  $148 = $149 ^ $150;
  $151 = $152 ^ $153;
  $154 = $148 & $124;
  $155 = $151 & $125;
  $156 = $154 ^ $150;
  $157 = $155 ^ $153;
  $arrayidx75 = (72 + ($i$2285<<3)|0);
  $158 = $arrayidx75;
  $159 = $158;
  $160 = HEAP32[$159>>2]|0;
  $161 = (($158) + 4)|0;
  $162 = $161;
  $163 = HEAP32[$162>>2]|0;
  $arrayidx78 = (($W) + ($i$2285<<3)|0);
  $164 = $arrayidx78;
  $165 = $164;
  $166 = HEAP32[$165>>2]|0;
  $167 = (($164) + 4)|0;
  $168 = $167;
  $169 = HEAP32[$168>>2]|0;
  $172 = (_i64Add(($156|0),($157|0),($170|0),($171|0))|0);
  $173 = tempRet0;
  $174 = (_i64Add(($172|0),($173|0),($146|0),($147|0))|0);
  $175 = tempRet0;
  $176 = (_i64Add(($174|0),($175|0),($160|0),($163|0))|0);
  $177 = tempRet0;
  $178 = (_i64Add(($176|0),($177|0),($166|0),($169|0))|0);
  $179 = tempRet0;
  $182 = (_bitshift64Shl(($180|0),($181|0),36)|0);
  $183 = tempRet0;
  $184 = (_bitshift64Lshr(($180|0),($181|0),28)|0);
  $185 = tempRet0;
  $186 = $182 | $184;
  $187 = $183 | $185;
  $188 = (_bitshift64Shl(($180|0),($181|0),30)|0);
  $189 = tempRet0;
  $190 = (_bitshift64Lshr(($180|0),($181|0),34)|0);
  $191 = tempRet0;
  $192 = $188 | $190;
  $193 = $189 | $191;
  $194 = $186 ^ $192;
  $195 = $187 ^ $193;
  $196 = (_bitshift64Shl(($180|0),($181|0),25)|0);
  $197 = tempRet0;
  $198 = (_bitshift64Lshr(($180|0),($181|0),39)|0);
  $199 = tempRet0;
  $200 = $196 | $198;
  $201 = $197 | $199;
  $202 = $194 ^ $200;
  $203 = $195 ^ $201;
  $204 = $180 & $205;
  $206 = $181 & $207;
  $208 = $180 | $205;
  $209 = $181 | $207;
  $210 = $208 & $211;
  $212 = $209 & $213;
  $214 = $210 | $204;
  $215 = $212 | $206;
  $216 = (_i64Add(($202|0),($203|0),($214|0),($215|0))|0);
  $217 = tempRet0;
  $220 = (_i64Add(($178|0),($179|0),($218|0),($219|0))|0);
  $221 = tempRet0;
  $222 = (_i64Add(($216|0),($217|0),($178|0),($179|0))|0);
  $223 = tempRet0;
  $224 = (_bitshift64Shl(($220|0),($221|0),50)|0);
  $225 = tempRet0;
  $226 = (_bitshift64Lshr(($220|0),($221|0),14)|0);
  $227 = tempRet0;
  $228 = $224 | $226;
  $229 = $225 | $227;
  $230 = (_bitshift64Shl(($220|0),($221|0),46)|0);
  $231 = tempRet0;
  $232 = (_bitshift64Lshr(($220|0),($221|0),18)|0);
  $233 = tempRet0;
  $234 = $230 | $232;
  $235 = $231 | $233;
  $236 = $228 ^ $234;
  $237 = $229 ^ $235;
  $238 = (_bitshift64Shl(($220|0),($221|0),23)|0);
  $239 = tempRet0;
  $240 = (_bitshift64Lshr(($220|0),($221|0),41)|0);
  $241 = tempRet0;
  $242 = $238 | $240;
  $243 = $239 | $241;
  $244 = $236 ^ $242;
  $245 = $237 ^ $243;
  $246 = $124 ^ $149;
  $247 = $125 ^ $152;
  $248 = $220 & $246;
  $249 = $221 & $247;
  $250 = $248 ^ $149;
  $251 = $249 ^ $152;
  $add117 = $i$2285 | 1;
  $arrayidx118 = (72 + ($add117<<3)|0);
  $252 = $arrayidx118;
  $253 = $252;
  $254 = HEAP32[$253>>2]|0;
  $255 = (($252) + 4)|0;
  $256 = $255;
  $257 = HEAP32[$256>>2]|0;
  $arrayidx121 = (($W) + ($add117<<3)|0);
  $258 = $arrayidx121;
  $259 = $258;
  $260 = HEAP32[$259>>2]|0;
  $261 = (($258) + 4)|0;
  $262 = $261;
  $263 = HEAP32[$262>>2]|0;
  $264 = (_i64Add(($254|0),($257|0),($150|0),($153|0))|0);
  $265 = tempRet0;
  $266 = (_i64Add(($264|0),($265|0),($260|0),($263|0))|0);
  $267 = tempRet0;
  $268 = (_i64Add(($266|0),($267|0),($250|0),($251|0))|0);
  $269 = tempRet0;
  $270 = (_i64Add(($268|0),($269|0),($244|0),($245|0))|0);
  $271 = tempRet0;
  $272 = (_bitshift64Shl(($222|0),($223|0),36)|0);
  $273 = tempRet0;
  $274 = (_bitshift64Lshr(($222|0),($223|0),28)|0);
  $275 = tempRet0;
  $276 = $272 | $274;
  $277 = $273 | $275;
  $278 = (_bitshift64Shl(($222|0),($223|0),30)|0);
  $279 = tempRet0;
  $280 = (_bitshift64Lshr(($222|0),($223|0),34)|0);
  $281 = tempRet0;
  $282 = $278 | $280;
  $283 = $279 | $281;
  $284 = $276 ^ $282;
  $285 = $277 ^ $283;
  $286 = (_bitshift64Shl(($222|0),($223|0),25)|0);
  $287 = tempRet0;
  $288 = (_bitshift64Lshr(($222|0),($223|0),39)|0);
  $289 = tempRet0;
  $290 = $286 | $288;
  $291 = $287 | $289;
  $292 = $284 ^ $290;
  $293 = $285 ^ $291;
  $294 = $222 & $180;
  $295 = $223 & $181;
  $296 = $222 | $180;
  $297 = $223 | $181;
  $298 = $296 & $205;
  $299 = $297 & $207;
  $300 = $298 | $294;
  $301 = $299 | $295;
  $302 = (_i64Add(($292|0),($293|0),($300|0),($301|0))|0);
  $303 = tempRet0;
  $304 = (_i64Add(($270|0),($271|0),($211|0),($213|0))|0);
  $305 = tempRet0;
  $306 = (_i64Add(($302|0),($303|0),($270|0),($271|0))|0);
  $307 = tempRet0;
  $308 = (_bitshift64Shl(($304|0),($305|0),50)|0);
  $309 = tempRet0;
  $310 = (_bitshift64Lshr(($304|0),($305|0),14)|0);
  $311 = tempRet0;
  $312 = $308 | $310;
  $313 = $309 | $311;
  $314 = (_bitshift64Shl(($304|0),($305|0),46)|0);
  $315 = tempRet0;
  $316 = (_bitshift64Lshr(($304|0),($305|0),18)|0);
  $317 = tempRet0;
  $318 = $314 | $316;
  $319 = $315 | $317;
  $320 = $312 ^ $318;
  $321 = $313 ^ $319;
  $322 = (_bitshift64Shl(($304|0),($305|0),23)|0);
  $323 = tempRet0;
  $324 = (_bitshift64Lshr(($304|0),($305|0),41)|0);
  $325 = tempRet0;
  $326 = $322 | $324;
  $327 = $323 | $325;
  $328 = $320 ^ $326;
  $329 = $321 ^ $327;
  $330 = $220 ^ $124;
  $331 = $221 ^ $125;
  $332 = $304 & $330;
  $333 = $305 & $331;
  $334 = $332 ^ $124;
  $335 = $333 ^ $125;
  $add162 = $i$2285 | 2;
  $arrayidx163 = (72 + ($add162<<3)|0);
  $336 = $arrayidx163;
  $337 = $336;
  $338 = HEAP32[$337>>2]|0;
  $339 = (($336) + 4)|0;
  $340 = $339;
  $341 = HEAP32[$340>>2]|0;
  $arrayidx166 = (($W) + ($add162<<3)|0);
  $342 = $arrayidx166;
  $343 = $342;
  $344 = HEAP32[$343>>2]|0;
  $345 = (($342) + 4)|0;
  $346 = $345;
  $347 = HEAP32[$346>>2]|0;
  $348 = (_i64Add(($338|0),($341|0),($149|0),($152|0))|0);
  $349 = tempRet0;
  $350 = (_i64Add(($348|0),($349|0),($344|0),($347|0))|0);
  $351 = tempRet0;
  $352 = (_i64Add(($350|0),($351|0),($334|0),($335|0))|0);
  $353 = tempRet0;
  $354 = (_i64Add(($352|0),($353|0),($328|0),($329|0))|0);
  $355 = tempRet0;
  $356 = (_bitshift64Shl(($306|0),($307|0),36)|0);
  $357 = tempRet0;
  $358 = (_bitshift64Lshr(($306|0),($307|0),28)|0);
  $359 = tempRet0;
  $360 = $356 | $358;
  $361 = $357 | $359;
  $362 = (_bitshift64Shl(($306|0),($307|0),30)|0);
  $363 = tempRet0;
  $364 = (_bitshift64Lshr(($306|0),($307|0),34)|0);
  $365 = tempRet0;
  $366 = $362 | $364;
  $367 = $363 | $365;
  $368 = $360 ^ $366;
  $369 = $361 ^ $367;
  $370 = (_bitshift64Shl(($306|0),($307|0),25)|0);
  $371 = tempRet0;
  $372 = (_bitshift64Lshr(($306|0),($307|0),39)|0);
  $373 = tempRet0;
  $374 = $370 | $372;
  $375 = $371 | $373;
  $376 = $368 ^ $374;
  $377 = $369 ^ $375;
  $378 = $306 & $222;
  $379 = $307 & $223;
  $380 = $306 | $222;
  $381 = $307 | $223;
  $382 = $380 & $180;
  $383 = $381 & $181;
  $384 = $382 | $378;
  $385 = $383 | $379;
  $386 = (_i64Add(($376|0),($377|0),($384|0),($385|0))|0);
  $387 = tempRet0;
  $388 = (_i64Add(($354|0),($355|0),($205|0),($207|0))|0);
  $389 = tempRet0;
  $390 = (_i64Add(($386|0),($387|0),($354|0),($355|0))|0);
  $391 = tempRet0;
  $392 = (_bitshift64Shl(($388|0),($389|0),50)|0);
  $393 = tempRet0;
  $394 = (_bitshift64Lshr(($388|0),($389|0),14)|0);
  $395 = tempRet0;
  $396 = $392 | $394;
  $397 = $393 | $395;
  $398 = (_bitshift64Shl(($388|0),($389|0),46)|0);
  $399 = tempRet0;
  $400 = (_bitshift64Lshr(($388|0),($389|0),18)|0);
  $401 = tempRet0;
  $402 = $398 | $400;
  $403 = $399 | $401;
  $404 = $396 ^ $402;
  $405 = $397 ^ $403;
  $406 = (_bitshift64Shl(($388|0),($389|0),23)|0);
  $407 = tempRet0;
  $408 = (_bitshift64Lshr(($388|0),($389|0),41)|0);
  $409 = tempRet0;
  $410 = $406 | $408;
  $411 = $407 | $409;
  $412 = $404 ^ $410;
  $413 = $405 ^ $411;
  $414 = $304 ^ $220;
  $415 = $305 ^ $221;
  $416 = $388 & $414;
  $417 = $389 & $415;
  $418 = $416 ^ $220;
  $419 = $417 ^ $221;
  $add207 = $i$2285 | 3;
  $arrayidx208 = (72 + ($add207<<3)|0);
  $420 = $arrayidx208;
  $421 = $420;
  $422 = HEAP32[$421>>2]|0;
  $423 = (($420) + 4)|0;
  $424 = $423;
  $425 = HEAP32[$424>>2]|0;
  $arrayidx211 = (($W) + ($add207<<3)|0);
  $426 = $arrayidx211;
  $427 = $426;
  $428 = HEAP32[$427>>2]|0;
  $429 = (($426) + 4)|0;
  $430 = $429;
  $431 = HEAP32[$430>>2]|0;
  $432 = (_i64Add(($422|0),($425|0),($124|0),($125|0))|0);
  $433 = tempRet0;
  $434 = (_i64Add(($432|0),($433|0),($428|0),($431|0))|0);
  $435 = tempRet0;
  $436 = (_i64Add(($434|0),($435|0),($418|0),($419|0))|0);
  $437 = tempRet0;
  $438 = (_i64Add(($436|0),($437|0),($412|0),($413|0))|0);
  $439 = tempRet0;
  $440 = (_bitshift64Shl(($390|0),($391|0),36)|0);
  $441 = tempRet0;
  $442 = (_bitshift64Lshr(($390|0),($391|0),28)|0);
  $443 = tempRet0;
  $444 = $440 | $442;
  $445 = $441 | $443;
  $446 = (_bitshift64Shl(($390|0),($391|0),30)|0);
  $447 = tempRet0;
  $448 = (_bitshift64Lshr(($390|0),($391|0),34)|0);
  $449 = tempRet0;
  $450 = $446 | $448;
  $451 = $447 | $449;
  $452 = $444 ^ $450;
  $453 = $445 ^ $451;
  $454 = (_bitshift64Shl(($390|0),($391|0),25)|0);
  $455 = tempRet0;
  $456 = (_bitshift64Lshr(($390|0),($391|0),39)|0);
  $457 = tempRet0;
  $458 = $454 | $456;
  $459 = $455 | $457;
  $460 = $452 ^ $458;
  $461 = $453 ^ $459;
  $462 = $390 & $306;
  $463 = $391 & $307;
  $464 = $390 | $306;
  $465 = $391 | $307;
  $466 = $464 & $222;
  $467 = $465 & $223;
  $468 = $466 | $462;
  $469 = $467 | $463;
  $470 = (_i64Add(($460|0),($461|0),($468|0),($469|0))|0);
  $471 = tempRet0;
  $472 = (_i64Add(($438|0),($439|0),($180|0),($181|0))|0);
  $473 = tempRet0;
  $474 = (_i64Add(($470|0),($471|0),($438|0),($439|0))|0);
  $475 = tempRet0;
  $476 = (_bitshift64Shl(($472|0),($473|0),50)|0);
  $477 = tempRet0;
  $478 = (_bitshift64Lshr(($472|0),($473|0),14)|0);
  $479 = tempRet0;
  $480 = $476 | $478;
  $481 = $477 | $479;
  $482 = (_bitshift64Shl(($472|0),($473|0),46)|0);
  $483 = tempRet0;
  $484 = (_bitshift64Lshr(($472|0),($473|0),18)|0);
  $485 = tempRet0;
  $486 = $482 | $484;
  $487 = $483 | $485;
  $488 = $480 ^ $486;
  $489 = $481 ^ $487;
  $490 = (_bitshift64Shl(($472|0),($473|0),23)|0);
  $491 = tempRet0;
  $492 = (_bitshift64Lshr(($472|0),($473|0),41)|0);
  $493 = tempRet0;
  $494 = $490 | $492;
  $495 = $491 | $493;
  $496 = $488 ^ $494;
  $497 = $489 ^ $495;
  $498 = $388 ^ $304;
  $499 = $389 ^ $305;
  $500 = $472 & $498;
  $501 = $473 & $499;
  $502 = $500 ^ $304;
  $503 = $501 ^ $305;
  $add252 = $i$2285 | 4;
  $arrayidx253 = (72 + ($add252<<3)|0);
  $504 = $arrayidx253;
  $505 = $504;
  $506 = HEAP32[$505>>2]|0;
  $507 = (($504) + 4)|0;
  $508 = $507;
  $509 = HEAP32[$508>>2]|0;
  $arrayidx256 = (($W) + ($add252<<3)|0);
  $510 = $arrayidx256;
  $511 = $510;
  $512 = HEAP32[$511>>2]|0;
  $513 = (($510) + 4)|0;
  $514 = $513;
  $515 = HEAP32[$514>>2]|0;
  $516 = (_i64Add(($506|0),($509|0),($220|0),($221|0))|0);
  $517 = tempRet0;
  $518 = (_i64Add(($516|0),($517|0),($512|0),($515|0))|0);
  $519 = tempRet0;
  $520 = (_i64Add(($518|0),($519|0),($502|0),($503|0))|0);
  $521 = tempRet0;
  $522 = (_i64Add(($520|0),($521|0),($496|0),($497|0))|0);
  $523 = tempRet0;
  $524 = (_bitshift64Shl(($474|0),($475|0),36)|0);
  $525 = tempRet0;
  $526 = (_bitshift64Lshr(($474|0),($475|0),28)|0);
  $527 = tempRet0;
  $528 = $524 | $526;
  $529 = $525 | $527;
  $530 = (_bitshift64Shl(($474|0),($475|0),30)|0);
  $531 = tempRet0;
  $532 = (_bitshift64Lshr(($474|0),($475|0),34)|0);
  $533 = tempRet0;
  $534 = $530 | $532;
  $535 = $531 | $533;
  $536 = $528 ^ $534;
  $537 = $529 ^ $535;
  $538 = (_bitshift64Shl(($474|0),($475|0),25)|0);
  $539 = tempRet0;
  $540 = (_bitshift64Lshr(($474|0),($475|0),39)|0);
  $541 = tempRet0;
  $542 = $538 | $540;
  $543 = $539 | $541;
  $544 = $536 ^ $542;
  $545 = $537 ^ $543;
  $546 = $474 & $390;
  $547 = $475 & $391;
  $548 = $474 | $390;
  $549 = $475 | $391;
  $550 = $548 & $306;
  $551 = $549 & $307;
  $552 = $550 | $546;
  $553 = $551 | $547;
  $554 = (_i64Add(($544|0),($545|0),($552|0),($553|0))|0);
  $555 = tempRet0;
  $556 = (_i64Add(($522|0),($523|0),($222|0),($223|0))|0);
  $557 = tempRet0;
  $558 = (_i64Add(($554|0),($555|0),($522|0),($523|0))|0);
  $559 = tempRet0;
  $560 = (_bitshift64Shl(($556|0),($557|0),50)|0);
  $561 = tempRet0;
  $562 = (_bitshift64Lshr(($556|0),($557|0),14)|0);
  $563 = tempRet0;
  $564 = $560 | $562;
  $565 = $561 | $563;
  $566 = (_bitshift64Shl(($556|0),($557|0),46)|0);
  $567 = tempRet0;
  $568 = (_bitshift64Lshr(($556|0),($557|0),18)|0);
  $569 = tempRet0;
  $570 = $566 | $568;
  $571 = $567 | $569;
  $572 = $564 ^ $570;
  $573 = $565 ^ $571;
  $574 = (_bitshift64Shl(($556|0),($557|0),23)|0);
  $575 = tempRet0;
  $576 = (_bitshift64Lshr(($556|0),($557|0),41)|0);
  $577 = tempRet0;
  $578 = $574 | $576;
  $579 = $575 | $577;
  $580 = $572 ^ $578;
  $581 = $573 ^ $579;
  $582 = $472 ^ $388;
  $583 = $473 ^ $389;
  $584 = $556 & $582;
  $585 = $557 & $583;
  $586 = $584 ^ $388;
  $587 = $585 ^ $389;
  $add297 = $i$2285 | 5;
  $arrayidx298 = (72 + ($add297<<3)|0);
  $588 = $arrayidx298;
  $589 = $588;
  $590 = HEAP32[$589>>2]|0;
  $591 = (($588) + 4)|0;
  $592 = $591;
  $593 = HEAP32[$592>>2]|0;
  $arrayidx301 = (($W) + ($add297<<3)|0);
  $594 = $arrayidx301;
  $595 = $594;
  $596 = HEAP32[$595>>2]|0;
  $597 = (($594) + 4)|0;
  $598 = $597;
  $599 = HEAP32[$598>>2]|0;
  $600 = (_i64Add(($596|0),($599|0),($590|0),($593|0))|0);
  $601 = tempRet0;
  $602 = (_i64Add(($600|0),($601|0),($304|0),($305|0))|0);
  $603 = tempRet0;
  $604 = (_i64Add(($602|0),($603|0),($586|0),($587|0))|0);
  $605 = tempRet0;
  $606 = (_i64Add(($604|0),($605|0),($580|0),($581|0))|0);
  $607 = tempRet0;
  $608 = (_bitshift64Shl(($558|0),($559|0),36)|0);
  $609 = tempRet0;
  $610 = (_bitshift64Lshr(($558|0),($559|0),28)|0);
  $611 = tempRet0;
  $612 = $608 | $610;
  $613 = $609 | $611;
  $614 = (_bitshift64Shl(($558|0),($559|0),30)|0);
  $615 = tempRet0;
  $616 = (_bitshift64Lshr(($558|0),($559|0),34)|0);
  $617 = tempRet0;
  $618 = $614 | $616;
  $619 = $615 | $617;
  $620 = $612 ^ $618;
  $621 = $613 ^ $619;
  $622 = (_bitshift64Shl(($558|0),($559|0),25)|0);
  $623 = tempRet0;
  $624 = (_bitshift64Lshr(($558|0),($559|0),39)|0);
  $625 = tempRet0;
  $626 = $622 | $624;
  $627 = $623 | $625;
  $628 = $620 ^ $626;
  $629 = $621 ^ $627;
  $630 = $558 & $474;
  $631 = $559 & $475;
  $632 = $558 | $474;
  $633 = $559 | $475;
  $634 = $632 & $390;
  $635 = $633 & $391;
  $636 = $634 | $630;
  $637 = $635 | $631;
  $638 = (_i64Add(($628|0),($629|0),($636|0),($637|0))|0);
  $639 = tempRet0;
  $640 = (_i64Add(($606|0),($607|0),($306|0),($307|0))|0);
  $641 = tempRet0;
  $642 = (_i64Add(($638|0),($639|0),($606|0),($607|0))|0);
  $643 = tempRet0;
  $644 = (_bitshift64Shl(($640|0),($641|0),50)|0);
  $645 = tempRet0;
  $646 = (_bitshift64Lshr(($640|0),($641|0),14)|0);
  $647 = tempRet0;
  $648 = $644 | $646;
  $649 = $645 | $647;
  $650 = (_bitshift64Shl(($640|0),($641|0),46)|0);
  $651 = tempRet0;
  $652 = (_bitshift64Lshr(($640|0),($641|0),18)|0);
  $653 = tempRet0;
  $654 = $650 | $652;
  $655 = $651 | $653;
  $656 = $648 ^ $654;
  $657 = $649 ^ $655;
  $658 = (_bitshift64Shl(($640|0),($641|0),23)|0);
  $659 = tempRet0;
  $660 = (_bitshift64Lshr(($640|0),($641|0),41)|0);
  $661 = tempRet0;
  $662 = $658 | $660;
  $663 = $659 | $661;
  $664 = $656 ^ $662;
  $665 = $657 ^ $663;
  $666 = $556 ^ $472;
  $667 = $557 ^ $473;
  $668 = $640 & $666;
  $669 = $641 & $667;
  $670 = $668 ^ $472;
  $671 = $669 ^ $473;
  $add342 = $i$2285 | 6;
  $arrayidx343 = (72 + ($add342<<3)|0);
  $672 = $arrayidx343;
  $673 = $672;
  $674 = HEAP32[$673>>2]|0;
  $675 = (($672) + 4)|0;
  $676 = $675;
  $677 = HEAP32[$676>>2]|0;
  $arrayidx346 = (($W) + ($add342<<3)|0);
  $678 = $arrayidx346;
  $679 = $678;
  $680 = HEAP32[$679>>2]|0;
  $681 = (($678) + 4)|0;
  $682 = $681;
  $683 = HEAP32[$682>>2]|0;
  $684 = (_i64Add(($680|0),($683|0),($674|0),($677|0))|0);
  $685 = tempRet0;
  $686 = (_i64Add(($684|0),($685|0),($388|0),($389|0))|0);
  $687 = tempRet0;
  $688 = (_i64Add(($686|0),($687|0),($670|0),($671|0))|0);
  $689 = tempRet0;
  $690 = (_i64Add(($688|0),($689|0),($664|0),($665|0))|0);
  $691 = tempRet0;
  $692 = (_bitshift64Shl(($642|0),($643|0),36)|0);
  $693 = tempRet0;
  $694 = (_bitshift64Lshr(($642|0),($643|0),28)|0);
  $695 = tempRet0;
  $696 = $692 | $694;
  $697 = $693 | $695;
  $698 = (_bitshift64Shl(($642|0),($643|0),30)|0);
  $699 = tempRet0;
  $700 = (_bitshift64Lshr(($642|0),($643|0),34)|0);
  $701 = tempRet0;
  $702 = $698 | $700;
  $703 = $699 | $701;
  $704 = $696 ^ $702;
  $705 = $697 ^ $703;
  $706 = (_bitshift64Shl(($642|0),($643|0),25)|0);
  $707 = tempRet0;
  $708 = (_bitshift64Lshr(($642|0),($643|0),39)|0);
  $709 = tempRet0;
  $710 = $706 | $708;
  $711 = $707 | $709;
  $712 = $704 ^ $710;
  $713 = $705 ^ $711;
  $714 = $642 & $558;
  $715 = $643 & $559;
  $716 = $642 | $558;
  $717 = $643 | $559;
  $718 = $716 & $474;
  $719 = $717 & $475;
  $720 = $718 | $714;
  $721 = $719 | $715;
  $722 = (_i64Add(($712|0),($713|0),($720|0),($721|0))|0);
  $723 = tempRet0;
  $724 = (_i64Add(($690|0),($691|0),($390|0),($391|0))|0);
  $725 = tempRet0;
  $726 = (_i64Add(($722|0),($723|0),($690|0),($691|0))|0);
  $727 = tempRet0;
  $728 = (_bitshift64Shl(($724|0),($725|0),50)|0);
  $729 = tempRet0;
  $730 = (_bitshift64Lshr(($724|0),($725|0),14)|0);
  $731 = tempRet0;
  $732 = $728 | $730;
  $733 = $729 | $731;
  $734 = (_bitshift64Shl(($724|0),($725|0),46)|0);
  $735 = tempRet0;
  $736 = (_bitshift64Lshr(($724|0),($725|0),18)|0);
  $737 = tempRet0;
  $738 = $734 | $736;
  $739 = $735 | $737;
  $740 = $732 ^ $738;
  $741 = $733 ^ $739;
  $742 = (_bitshift64Shl(($724|0),($725|0),23)|0);
  $743 = tempRet0;
  $744 = (_bitshift64Lshr(($724|0),($725|0),41)|0);
  $745 = tempRet0;
  $746 = $742 | $744;
  $747 = $743 | $745;
  $748 = $740 ^ $746;
  $749 = $741 ^ $747;
  $750 = $640 ^ $556;
  $751 = $641 ^ $557;
  $752 = $724 & $750;
  $753 = $725 & $751;
  $754 = $752 ^ $556;
  $755 = $753 ^ $557;
  $add387 = $i$2285 | 7;
  $arrayidx388 = (72 + ($add387<<3)|0);
  $756 = $arrayidx388;
  $757 = $756;
  $758 = HEAP32[$757>>2]|0;
  $759 = (($756) + 4)|0;
  $760 = $759;
  $761 = HEAP32[$760>>2]|0;
  $arrayidx391 = (($W) + ($add387<<3)|0);
  $762 = $arrayidx391;
  $763 = $762;
  $764 = HEAP32[$763>>2]|0;
  $765 = (($762) + 4)|0;
  $766 = $765;
  $767 = HEAP32[$766>>2]|0;
  $768 = (_i64Add(($764|0),($767|0),($758|0),($761|0))|0);
  $769 = tempRet0;
  $770 = (_i64Add(($768|0),($769|0),($472|0),($473|0))|0);
  $771 = tempRet0;
  $772 = (_i64Add(($770|0),($771|0),($754|0),($755|0))|0);
  $773 = tempRet0;
  $774 = (_i64Add(($772|0),($773|0),($748|0),($749|0))|0);
  $775 = tempRet0;
  $776 = (_bitshift64Shl(($726|0),($727|0),36)|0);
  $777 = tempRet0;
  $778 = (_bitshift64Lshr(($726|0),($727|0),28)|0);
  $779 = tempRet0;
  $780 = $776 | $778;
  $781 = $777 | $779;
  $782 = (_bitshift64Shl(($726|0),($727|0),30)|0);
  $783 = tempRet0;
  $784 = (_bitshift64Lshr(($726|0),($727|0),34)|0);
  $785 = tempRet0;
  $786 = $782 | $784;
  $787 = $783 | $785;
  $788 = $780 ^ $786;
  $789 = $781 ^ $787;
  $790 = (_bitshift64Shl(($726|0),($727|0),25)|0);
  $791 = tempRet0;
  $792 = (_bitshift64Lshr(($726|0),($727|0),39)|0);
  $793 = tempRet0;
  $794 = $790 | $792;
  $795 = $791 | $793;
  $796 = $788 ^ $794;
  $797 = $789 ^ $795;
  $798 = $726 & $642;
  $799 = $727 & $643;
  $800 = $726 | $642;
  $801 = $727 | $643;
  $802 = $800 & $558;
  $803 = $801 & $559;
  $804 = $802 | $798;
  $805 = $803 | $799;
  $806 = (_i64Add(($796|0),($797|0),($804|0),($805|0))|0);
  $807 = tempRet0;
  $808 = (_i64Add(($774|0),($775|0),($474|0),($475|0))|0);
  $809 = tempRet0;
  $810 = (_i64Add(($806|0),($807|0),($774|0),($775|0))|0);
  $811 = tempRet0;
  $add414 = (($i$2285) + 8)|0;
  $cmp56 = ($add414|0)<(80);
  if ($cmp56) {
   $124 = $808;$125 = $809;$149 = $724;$150 = $640;$152 = $725;$153 = $641;$170 = $556;$171 = $557;$180 = $810;$181 = $811;$205 = $726;$207 = $727;$211 = $642;$213 = $643;$218 = $558;$219 = $559;$i$2285 = $add414;
  } else {
   break;
  }
 }
 $812 = (_i64Add(($810|0),($811|0),($78|0),($81|0))|0);
 $813 = tempRet0;
 $814 = $r;
 $815 = $814;
 HEAP32[$815>>2] = $812;
 $816 = (($814) + 4)|0;
 $817 = $816;
 HEAP32[$817>>2] = $813;
 $818 = (_i64Add(($726|0),($727|0),($84|0),($87|0))|0);
 $819 = tempRet0;
 $820 = $arrayidx48;
 $821 = $820;
 HEAP32[$821>>2] = $818;
 $822 = (($820) + 4)|0;
 $823 = $822;
 HEAP32[$823>>2] = $819;
 $824 = (_i64Add(($642|0),($643|0),($90|0),($93|0))|0);
 $825 = tempRet0;
 $826 = $arrayidx49;
 $827 = $826;
 HEAP32[$827>>2] = $824;
 $828 = (($826) + 4)|0;
 $829 = $828;
 HEAP32[$829>>2] = $825;
 $830 = (_i64Add(($558|0),($559|0),($96|0),($99|0))|0);
 $831 = tempRet0;
 $832 = $arrayidx50;
 $833 = $832;
 HEAP32[$833>>2] = $830;
 $834 = (($832) + 4)|0;
 $835 = $834;
 HEAP32[$835>>2] = $831;
 $836 = (_i64Add(($808|0),($809|0),($102|0),($105|0))|0);
 $837 = tempRet0;
 $838 = $arrayidx51;
 $839 = $838;
 HEAP32[$839>>2] = $836;
 $840 = (($838) + 4)|0;
 $841 = $840;
 HEAP32[$841>>2] = $837;
 $842 = (_i64Add(($724|0),($725|0),($108|0),($111|0))|0);
 $843 = tempRet0;
 $844 = $arrayidx52;
 $845 = $844;
 HEAP32[$845>>2] = $842;
 $846 = (($844) + 4)|0;
 $847 = $846;
 HEAP32[$847>>2] = $843;
 $848 = (_i64Add(($640|0),($641|0),($114|0),($117|0))|0);
 $849 = tempRet0;
 $850 = $arrayidx53;
 $851 = $850;
 HEAP32[$851>>2] = $848;
 $852 = (($850) + 4)|0;
 $853 = $852;
 HEAP32[$853>>2] = $849;
 $854 = (_i64Add(($556|0),($557|0),($120|0),($123|0))|0);
 $855 = tempRet0;
 $856 = $arrayidx54;
 $857 = $856;
 HEAP32[$857>>2] = $854;
 $858 = (($856) + 4)|0;
 $859 = $858;
 HEAP32[$859>>2] = $855;
 STACKTOP = sp;return;
}
function _sph_dec64be_aligned($src) {
 $src = $src|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $arrayidx1 = 0, $arrayidx12 = 0, $arrayidx16 = 0, $arrayidx20 = 0, $arrayidx24 = 0, $arrayidx4 = 0, $arrayidx8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP8[$src>>0]|0;
 $1 = $0&255;
 $2 = (_bitshift64Shl(($1|0),0,56)|0);
 $3 = tempRet0;
 $arrayidx1 = ((($src)) + 1|0);
 $4 = HEAP8[$arrayidx1>>0]|0;
 $5 = $4&255;
 $6 = (_bitshift64Shl(($5|0),0,48)|0);
 $7 = tempRet0;
 $8 = $6 | $2;
 $9 = $7 | $3;
 $arrayidx4 = ((($src)) + 2|0);
 $10 = HEAP8[$arrayidx4>>0]|0;
 $11 = $10&255;
 $12 = (_bitshift64Shl(($11|0),0,40)|0);
 $13 = tempRet0;
 $14 = $8 | $12;
 $15 = $9 | $13;
 $arrayidx8 = ((($src)) + 3|0);
 $16 = HEAP8[$arrayidx8>>0]|0;
 $17 = $16&255;
 $18 = $15 | $17;
 $arrayidx12 = ((($src)) + 4|0);
 $19 = HEAP8[$arrayidx12>>0]|0;
 $20 = $19&255;
 $21 = (_bitshift64Shl(($20|0),0,24)|0);
 $22 = tempRet0;
 $23 = $14 | $21;
 $24 = $18 | $22;
 $arrayidx16 = ((($src)) + 5|0);
 $25 = HEAP8[$arrayidx16>>0]|0;
 $26 = $25&255;
 $27 = (_bitshift64Shl(($26|0),0,16)|0);
 $28 = tempRet0;
 $29 = $23 | $27;
 $30 = $24 | $28;
 $arrayidx20 = ((($src)) + 6|0);
 $31 = HEAP8[$arrayidx20>>0]|0;
 $32 = $31&255;
 $33 = (_bitshift64Shl(($32|0),0,8)|0);
 $34 = tempRet0;
 $35 = $29 | $33;
 $36 = $30 | $34;
 $arrayidx24 = ((($src)) + 7|0);
 $37 = HEAP8[$arrayidx24>>0]|0;
 $38 = $37&255;
 $39 = $35 | $38;
 tempRet0 = ($36);
 return ($39|0);
}
function _sha384_close($cc,$dst,$rnum) {
 $cc = $cc|0;
 $dst = $dst|0;
 $rnum = $rnum|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _sha384_addbits_and_close($cc,0,0,$dst,$rnum);
 return;
}
function _sha384_addbits_and_close($cc,$ub,$n,$dst,$rnum) {
 $cc = $cc|0;
 $ub = $ub|0;
 $n = $n|0;
 $dst = $dst|0;
 $rnum = $rnum|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $add$ptr = 0, $add$ptr18 = 0, $add$ptr24 = 0, $add$ptr33 = 0, $and = 0, $and1 = 0, $arrayidx = 0, $arrayidx35 = 0, $cmp = 0, $cmp3125 = 0;
 var $conv3 = 0, $count = 0, $exitcond = 0, $inc = 0, $inc36 = 0, $mul = 0, $or = 0, $shr = 0, $sub = 0, $sub15 = 0, $sub6 = 0, $u$026 = 0, $val = 0, $val29 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 $count = ((($cc)) + 192|0);
 $0 = $count;
 $1 = $0;
 $2 = HEAP32[$1>>2]|0;
 $3 = (($0) + 4)|0;
 $4 = $3;
 $5 = HEAP32[$4>>2]|0;
 $and = $2 & 127;
 $shr = 128 >>> $n;
 $sub = (0 - ($shr))|0;
 $and1 = $sub & $ub;
 $or = $and1 | $shr;
 $conv3 = $or&255;
 $inc = (($and) + 1)|0;
 $arrayidx = (($cc) + ($and)|0);
 HEAP8[$arrayidx>>0] = $conv3;
 $cmp = ($inc>>>0)>(112);
 $add$ptr = (($cc) + ($inc)|0);
 if ($cmp) {
  $sub6 = $and ^ 127;
  _memset(($add$ptr|0),0,($sub6|0))|0;
  $val = ((($cc)) + 128|0);
  _sha3_round($cc,$val);
  dest=$cc; stop=dest+112|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 } else {
  $sub15 = (111 - ($and))|0;
  _memset(($add$ptr|0),0,($sub15|0))|0;
 }
 $add$ptr18 = ((($cc)) + 112|0);
 $6 = $count;
 $7 = $6;
 $8 = HEAP32[$7>>2]|0;
 $9 = (($6) + 4)|0;
 $10 = $9;
 $11 = HEAP32[$10>>2]|0;
 $12 = (_bitshift64Lshr(($8|0),($11|0),61)|0);
 $13 = tempRet0;
 _sph_enc64be_aligned($add$ptr18,$12,$13);
 $add$ptr24 = ((($cc)) + 120|0);
 $14 = $count;
 $15 = $14;
 $16 = HEAP32[$15>>2]|0;
 $17 = (($14) + 4)|0;
 $18 = $17;
 $19 = HEAP32[$18>>2]|0;
 $20 = (_bitshift64Shl(($16|0),($19|0),3)|0);
 $21 = tempRet0;
 $22 = (_i64Add(($20|0),($21|0),($n|0),0)|0);
 $23 = tempRet0;
 _sph_enc64be_aligned($add$ptr24,$22,$23);
 $val29 = ((($cc)) + 128|0);
 _sha3_round($cc,$val29);
 $cmp3125 = ($rnum|0)==(0);
 if ($cmp3125) {
  return;
 } else {
  $u$026 = 0;
 }
 while(1) {
  $mul = $u$026 << 3;
  $add$ptr33 = (($dst) + ($mul)|0);
  $arrayidx35 = (($val29) + ($u$026<<3)|0);
  $24 = $arrayidx35;
  $25 = $24;
  $26 = HEAP32[$25>>2]|0;
  $27 = (($24) + 4)|0;
  $28 = $27;
  $29 = HEAP32[$28>>2]|0;
  _sph_enc64be($add$ptr33,$26,$29);
  $inc36 = (($u$026) + 1)|0;
  $exitcond = ($inc36|0)==($rnum|0);
  if ($exitcond) {
   break;
  } else {
   $u$026 = $inc36;
  }
 }
 return;
}
function _sph_enc64be_aligned($dst,$0,$1) {
 $dst = $dst|0;
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $arrayidx12 = 0, $arrayidx15 = 0, $arrayidx18 = 0, $arrayidx20 = 0, $arrayidx3 = 0, $arrayidx6 = 0, $arrayidx9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (_bitshift64Lshr(($0|0),($1|0),56)|0);
 $3 = tempRet0;
 $4 = $2&255;
 HEAP8[$dst>>0] = $4;
 $5 = (_bitshift64Lshr(($0|0),($1|0),48)|0);
 $6 = tempRet0;
 $7 = $5&255;
 $arrayidx3 = ((($dst)) + 1|0);
 HEAP8[$arrayidx3>>0] = $7;
 $8 = (_bitshift64Lshr(($0|0),($1|0),40)|0);
 $9 = tempRet0;
 $10 = $8&255;
 $arrayidx6 = ((($dst)) + 2|0);
 HEAP8[$arrayidx6>>0] = $10;
 $11 = $1&255;
 $arrayidx9 = ((($dst)) + 3|0);
 HEAP8[$arrayidx9>>0] = $11;
 $12 = (_bitshift64Lshr(($0|0),($1|0),24)|0);
 $13 = tempRet0;
 $14 = $12&255;
 $arrayidx12 = ((($dst)) + 4|0);
 HEAP8[$arrayidx12>>0] = $14;
 $15 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $16 = tempRet0;
 $17 = $15&255;
 $arrayidx15 = ((($dst)) + 5|0);
 HEAP8[$arrayidx15>>0] = $17;
 $18 = (_bitshift64Lshr(($0|0),($1|0),8)|0);
 $19 = tempRet0;
 $20 = $18&255;
 $arrayidx18 = ((($dst)) + 6|0);
 HEAP8[$arrayidx18>>0] = $20;
 $21 = $0&255;
 $arrayidx20 = ((($dst)) + 7|0);
 HEAP8[$arrayidx20>>0] = $21;
 return;
}
function _sph_enc64be($dst,$0,$1) {
 $dst = $dst|0;
 $0 = $0|0;
 $1 = $1|0;
 var $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $arrayidx12 = 0, $arrayidx15 = 0, $arrayidx18 = 0, $arrayidx20 = 0, $arrayidx3 = 0, $arrayidx6 = 0, $arrayidx9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = (_bitshift64Lshr(($0|0),($1|0),56)|0);
 $3 = tempRet0;
 $4 = $2&255;
 HEAP8[$dst>>0] = $4;
 $5 = (_bitshift64Lshr(($0|0),($1|0),48)|0);
 $6 = tempRet0;
 $7 = $5&255;
 $arrayidx3 = ((($dst)) + 1|0);
 HEAP8[$arrayidx3>>0] = $7;
 $8 = (_bitshift64Lshr(($0|0),($1|0),40)|0);
 $9 = tempRet0;
 $10 = $8&255;
 $arrayidx6 = ((($dst)) + 2|0);
 HEAP8[$arrayidx6>>0] = $10;
 $11 = $1&255;
 $arrayidx9 = ((($dst)) + 3|0);
 HEAP8[$arrayidx9>>0] = $11;
 $12 = (_bitshift64Lshr(($0|0),($1|0),24)|0);
 $13 = tempRet0;
 $14 = $12&255;
 $arrayidx12 = ((($dst)) + 4|0);
 HEAP8[$arrayidx12>>0] = $14;
 $15 = (_bitshift64Lshr(($0|0),($1|0),16)|0);
 $16 = tempRet0;
 $17 = $15&255;
 $arrayidx15 = ((($dst)) + 5|0);
 HEAP8[$arrayidx15>>0] = $17;
 $18 = (_bitshift64Lshr(($0|0),($1|0),8)|0);
 $19 = tempRet0;
 $20 = $18&255;
 $arrayidx18 = ((($dst)) + 6|0);
 HEAP8[$arrayidx18>>0] = $20;
 $21 = $0&255;
 $arrayidx20 = ((($dst)) + 7|0);
 HEAP8[$arrayidx20>>0] = $21;
 return;
}
function _sph_sha512_close($cc,$dst) {
 $cc = $cc|0;
 $dst = $dst|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _sha384_close($cc,$dst,8);
 _sph_sha512_init($cc);
 return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$pre = 0, $$pre$i = 0, $$pre$i$i = 0, $$pre$i133 = 0, $$pre$i186 = 0, $$pre$i27$i = 0, $$pre$phi$i$iZ2D = 0, $$pre$phi$i187Z2D = 0, $$pre$phi$i28$iZ2D = 0, $$pre$phi$iZ2D = 0, $$pre$phiZ2D = 0, $$sink$i = 0, $$sink$i$i = 0, $$sink$i166 = 0, $$sink2$i = 0, $$sink2$i183 = 0, $$sink4$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0;
 var $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0;
 var $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0;
 var $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0;
 var $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0;
 var $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0;
 var $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0;
 var $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0;
 var $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0;
 var $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F$0$i$i = 0, $F104$0 = 0, $F197$0$i = 0, $F224$0$i$i = 0, $F290$0$i = 0, $I252$0$i$i = 0, $I316$0$i = 0, $I57$0$i$i = 0, $K105$0$i$i = 0, $K305$0$i$i = 0, $K373$0$i = 0, $R$1$i = 0, $R$1$i$i = 0, $R$1$i175 = 0;
 var $R$3$i = 0, $R$3$i$i = 0, $R$3$i179 = 0, $RP$1$i = 0, $RP$1$i$i = 0, $RP$1$i174 = 0, $T$0$i = 0, $T$0$i$i = 0, $T$0$i29$i = 0, $add$i = 0, $add$i$i = 0, $add$i134 = 0, $add$i152 = 0, $add$ptr = 0, $add$ptr$i = 0, $add$ptr$i$i = 0, $add$ptr$i$i$i = 0, $add$ptr$i140 = 0, $add$ptr$i169 = 0, $add$ptr$i2$i$i = 0;
 var $add$ptr$i31$i = 0, $add$ptr$i38$i = 0, $add$ptr$i54$i = 0, $add$ptr14$i$i = 0, $add$ptr15$i$i = 0, $add$ptr16$i$i = 0, $add$ptr166 = 0, $add$ptr169 = 0, $add$ptr17$i$i = 0, $add$ptr178 = 0, $add$ptr181$i = 0, $add$ptr182 = 0, $add$ptr189$i = 0, $add$ptr190$i = 0, $add$ptr193 = 0, $add$ptr199 = 0, $add$ptr2$i$i = 0, $add$ptr205$i$i = 0, $add$ptr212$i$i = 0, $add$ptr225$i = 0;
 var $add$ptr227$i = 0, $add$ptr24$i$i = 0, $add$ptr262$i = 0, $add$ptr269$i = 0, $add$ptr273$i = 0, $add$ptr282$i = 0, $add$ptr3$i$i = 0, $add$ptr30$i$i = 0, $add$ptr369$i$i = 0, $add$ptr4$i$i = 0, $add$ptr4$i$i$i = 0, $add$ptr4$i36$i = 0, $add$ptr4$i43$i = 0, $add$ptr441$i = 0, $add$ptr5$i$i = 0, $add$ptr6$i$i = 0, $add$ptr6$i$i$i = 0, $add$ptr6$i47$i = 0, $add$ptr7$i$i = 0, $add$ptr81$i$i = 0;
 var $add$ptr95 = 0, $add$ptr98 = 0, $add10$i = 0, $add101$i = 0, $add110$i = 0, $add13$i = 0, $add14$i = 0, $add140$i = 0, $add144 = 0, $add150$i = 0, $add17$i = 0, $add17$i155 = 0, $add177$i = 0, $add18$i = 0, $add19$i = 0, $add2 = 0, $add20$i = 0, $add206$i$i = 0, $add212$i = 0, $add215$i = 0;
 var $add22$i = 0, $add246$i = 0, $add26$i$i = 0, $add268$i = 0, $add269$i$i = 0, $add274$i$i = 0, $add278$i$i = 0, $add280$i$i = 0, $add283$i$i = 0, $add337$i = 0, $add342$i = 0, $add346$i = 0, $add348$i = 0, $add351$i = 0, $add46$i = 0, $add50 = 0, $add51$i = 0, $add54 = 0, $add54$i = 0, $add58 = 0;
 var $add62 = 0, $add64 = 0, $add74$i$i = 0, $add77$i = 0, $add78$i = 0, $add79$i$i = 0, $add8 = 0, $add82$i = 0, $add83$i$i = 0, $add85$i$i = 0, $add86$i = 0, $add88$i$i = 0, $add9$i = 0, $add90$i = 0, $add92$i = 0, $and = 0, $and$i = 0, $and$i$i = 0, $and$i$i$i = 0, $and$i11$i = 0;
 var $and$i149 = 0, $and$i32$i = 0, $and$i39$i = 0, $and100$i = 0, $and103$i = 0, $and104$i = 0, $and106 = 0, $and11$add51$i = 0, $and11$i = 0, $and119$i$i = 0, $and12$i = 0, $and13$i = 0, $and13$i$i = 0, $and133$i$i = 0, $and14 = 0, $and145 = 0, $and17$i = 0, $and194$i = 0, $and194$i182 = 0, $and199$i = 0;
 var $and209$i$i = 0, $and21$i = 0, $and21$i156 = 0, $and227$i$i = 0, $and236$i = 0, $and264$i$i = 0, $and268$i$i = 0, $and273$i$i = 0, $and282$i$i = 0, $and29$i = 0, $and292$i = 0, $and295$i$i = 0, $and3$i = 0, $and3$i$i = 0, $and3$i$i$i = 0, $and3$i34$i = 0, $and3$i41$i = 0, $and30$i = 0, $and318$i$i = 0, $and32$i = 0;
 var $and32$i$i = 0, $and33$i$i = 0, $and331$i = 0, $and336$i = 0, $and341$i = 0, $and350$i = 0, $and363$i = 0, $and37$i$i = 0, $and387$i = 0, $and4 = 0, $and40$i$i = 0, $and41 = 0, $and42$i = 0, $and43 = 0, $and46 = 0, $and49 = 0, $and49$i = 0, $and49$i$i = 0, $and53 = 0, $and57 = 0;
 var $and6$i = 0, $and6$i$i = 0, $and6$i10$i = 0, $and6$i14$i = 0, $and61 = 0, $and64$i = 0, $and68$i = 0, $and69$i$i = 0, $and7 = 0, $and73$i = 0, $and73$i$i = 0, $and74 = 0, $and77$i = 0, $and78$i$i = 0, $and8$i = 0, $and80$i = 0, $and81$i = 0, $and85$i = 0, $and87$i$i = 0, $and89$i = 0;
 var $and9$i = 0, $and96$i$i = 0, $arrayidx = 0, $arrayidx$i = 0, $arrayidx$i$i = 0, $arrayidx$i157 = 0, $arrayidx$i50$i = 0, $arrayidx103 = 0, $arrayidx103$i$i = 0, $arrayidx106$i = 0, $arrayidx107$i$i = 0, $arrayidx113$i = 0, $arrayidx113$i167 = 0, $arrayidx121$i = 0, $arrayidx123$i$i = 0, $arrayidx126$i$i = 0, $arrayidx137$i = 0, $arrayidx143$i$i = 0, $arrayidx148$i = 0, $arrayidx151$i = 0;
 var $arrayidx151$i$i = 0, $arrayidx154$i = 0, $arrayidx155$i = 0, $arrayidx161$i = 0, $arrayidx165$i = 0, $arrayidx165$i177 = 0, $arrayidx178$i$i = 0, $arrayidx184$i = 0, $arrayidx184$i$i = 0, $arrayidx195$i$i = 0, $arrayidx196$i = 0, $arrayidx204$i = 0, $arrayidx212$i = 0, $arrayidx223$i$i = 0, $arrayidx228$i = 0, $arrayidx23$i = 0, $arrayidx232$i = 0, $arrayidx239$i = 0, $arrayidx245$i = 0, $arrayidx256$i = 0;
 var $arrayidx27$i = 0, $arrayidx275$i = 0, $arrayidx287$i$i = 0, $arrayidx289$i = 0, $arrayidx290$i$i = 0, $arrayidx325$i$i = 0, $arrayidx355$i = 0, $arrayidx358$i = 0, $arrayidx394$i = 0, $arrayidx40$i = 0, $arrayidx44$i = 0, $arrayidx61$i = 0, $arrayidx65$i = 0, $arrayidx66 = 0, $arrayidx71$i = 0, $arrayidx75$i = 0, $arrayidx91$i$i = 0, $arrayidx92$i$i = 0, $arrayidx94$i = 0, $arrayidx94$i165 = 0;
 var $arrayidx96$i$i = 0, $bk$i = 0, $bk$i$i = 0, $bk$i171 = 0, $bk$i22$i = 0, $bk102$i$i = 0, $bk122 = 0, $bk124 = 0, $bk139$i$i = 0, $bk145$i = 0, $bk158$i$i = 0, $bk161$i$i = 0, $bk18 = 0, $bk218$i = 0, $bk220$i = 0, $bk246$i$i = 0, $bk248$i$i = 0, $bk302$i$i = 0, $bk311$i = 0, $bk313$i = 0;
 var $bk338$i$i = 0, $bk357$i$i = 0, $bk360$i$i = 0, $bk370$i = 0, $bk407$i = 0, $bk429$i = 0, $bk432$i = 0, $bk55$i$i = 0, $bk56$i = 0, $bk67$i$i = 0, $bk74$i$i = 0, $bk85 = 0, $bk91$i$i = 0, $br$2$ph$i = 0, $call107$i = 0, $call131$i = 0, $call132$i = 0, $call275$i = 0, $call37$i = 0, $call68$i = 0;
 var $call83$i = 0, $child$i$i = 0, $child166$i$i = 0, $child289$i$i = 0, $child357$i = 0, $cmp = 0, $cmp$i = 0, $cmp$i$i$i = 0, $cmp$i12$i = 0, $cmp$i146 = 0, $cmp$i3$i$i = 0, $cmp$i33$i = 0, $cmp$i40$i = 0, $cmp$i52$i = 0, $cmp$i9$i = 0, $cmp1 = 0, $cmp1$i = 0, $cmp10 = 0, $cmp100$i$i = 0, $cmp102$i = 0;
 var $cmp104$i$i = 0, $cmp105$i = 0, $cmp106$i$i = 0, $cmp108$i = 0, $cmp108$i$i = 0, $cmp116$i = 0, $cmp118$i = 0, $cmp119$i = 0, $cmp12$i = 0, $cmp120$i$i = 0, $cmp120$i24$i = 0, $cmp123$i = 0, $cmp124$i$i = 0, $cmp126$i = 0, $cmp127$i = 0, $cmp128 = 0, $cmp128$i = 0, $cmp128$i$i = 0, $cmp133$i = 0, $cmp135$i = 0;
 var $cmp137$i = 0, $cmp138$i = 0, $cmp139 = 0, $cmp141$i = 0, $cmp146 = 0, $cmp147$i = 0, $cmp14795$i = 0, $cmp15$i = 0, $cmp151$i = 0, $cmp152$i = 0, $cmp155$i = 0, $cmp156 = 0, $cmp156$i = 0, $cmp156$i$i = 0, $cmp157$i = 0, $cmp159$i = 0, $cmp162 = 0, $cmp162$i = 0, $cmp162$i176 = 0, $cmp166$i = 0;
 var $cmp168$i$i = 0, $cmp174$i = 0, $cmp180$i = 0, $cmp185$i = 0, $cmp185$i$i = 0, $cmp186 = 0, $cmp186$i = 0, $cmp19$i = 0, $cmp190$i = 0, $cmp191$i = 0, $cmp2$i$i = 0, $cmp2$i$i$i = 0, $cmp20$i$i = 0, $cmp203$i = 0, $cmp209$i = 0, $cmp21$i = 0, $cmp215$i$i = 0, $cmp217$i = 0, $cmp218$i = 0, $cmp224$i = 0;
 var $cmp228$i = 0, $cmp229$i = 0, $cmp24$i = 0, $cmp24$i$i = 0, $cmp246$i = 0, $cmp254$i$i = 0, $cmp257$i = 0, $cmp258$i$i = 0, $cmp26$i = 0, $cmp265$i = 0, $cmp27$i$i = 0, $cmp28$i = 0, $cmp28$i$i = 0, $cmp284$i = 0, $cmp286$i = 0, $cmp29 = 0, $cmp3$i$i = 0, $cmp306$i$i = 0, $cmp31 = 0, $cmp319$i = 0;
 var $cmp319$i$i = 0, $cmp32$i = 0, $cmp32$i137 = 0, $cmp323$i = 0, $cmp327$i$i = 0, $cmp34$i = 0, $cmp34$i$i = 0, $cmp35$i = 0, $cmp36$i = 0, $cmp36$i$i = 0, $cmp374$i = 0, $cmp38$i = 0, $cmp38$i$i = 0, $cmp388$i = 0, $cmp396$i = 0, $cmp40$i = 0, $cmp43$i = 0, $cmp45$i = 0, $cmp46$i = 0, $cmp46$i$i = 0;
 var $cmp49$i = 0, $cmp5 = 0, $cmp55$i = 0, $cmp55$i161 = 0, $cmp57$i = 0, $cmp57$i162 = 0, $cmp59$i$i = 0, $cmp60$i = 0, $cmp62$i = 0, $cmp63$i = 0, $cmp63$i$i = 0, $cmp65$i = 0, $cmp66$i = 0, $cmp66$i139 = 0, $cmp69$i = 0, $cmp7$i$i = 0, $cmp70 = 0, $cmp72$i = 0, $cmp75$i$i = 0, $cmp76$i = 0;
 var $cmp81$i = 0, $cmp85$i = 0, $cmp89$i = 0, $cmp9$i$i = 0, $cmp90$i = 0, $cmp91$i = 0, $cmp93$i = 0, $cmp95$i = 0, $cmp96$i = 0, $cmp97$i = 0, $cmp97$i$i = 0, $cmp976$i = 0, $cmp99 = 0, $cond = 0, $cond$i = 0, $cond$i$i = 0, $cond$i$i$i = 0, $cond$i13$i = 0, $cond$i158 = 0, $cond$i35$i = 0;
 var $cond$i42$i = 0, $cond1$i$i = 0, $cond115$i$i = 0, $cond13$i$i = 0, $cond15$i$i = 0, $cond2$i = 0, $cond315$i$i = 0, $cond383$i = 0, $exitcond$i$i = 0, $fd$i = 0, $fd$i$i = 0, $fd$i172 = 0, $fd103$i$i = 0, $fd123 = 0, $fd140$i$i = 0, $fd146$i = 0, $fd148$i$i = 0, $fd160$i$i = 0, $fd219$i = 0, $fd247$i$i = 0;
 var $fd303$i$i = 0, $fd312$i = 0, $fd339$i$i = 0, $fd344$i$i = 0, $fd359$i$i = 0, $fd371$i = 0, $fd408$i = 0, $fd416$i = 0, $fd431$i = 0, $fd54$i$i = 0, $fd57$i = 0, $fd68$i$i = 0, $fd69 = 0, $fd78$i$i = 0, $fd9 = 0, $fd92$i$i = 0, $head = 0, $head$i = 0, $head$i$i = 0, $head$i$i$i = 0;
 var $head$i159 = 0, $head$i18$i = 0, $head$i37$i = 0, $head$i46$i = 0, $head118$i$i = 0, $head168 = 0, $head173 = 0, $head177 = 0, $head179 = 0, $head179$i = 0, $head182$i = 0, $head187$i = 0, $head189$i = 0, $head195 = 0, $head198 = 0, $head208$i$i = 0, $head211$i$i = 0, $head23$i$i = 0, $head25 = 0, $head26$i$i = 0;
 var $head265$i = 0, $head268$i = 0, $head271$i = 0, $head274$i = 0, $head279$i = 0, $head281$i = 0, $head29$i = 0, $head29$i$i = 0, $head317$i$i = 0, $head32$i$i = 0, $head34$i$i = 0, $head386$i = 0, $head7$i$i = 0, $head7$i$i$i = 0, $head7$i48$i = 0, $head94 = 0, $head97 = 0, $head99$i = 0, $i$01$i$i = 0, $idx$0$i = 0;
 var $inc$i$i = 0, $index$i = 0, $index$i$i = 0, $index$i180 = 0, $index$i25$i = 0, $index288$i$i = 0, $index356$i = 0, $magic$i$i = 0, $nb$0 = 0, $neg = 0, $neg$i = 0, $neg$i$i = 0, $neg$i136 = 0, $neg$i181 = 0, $neg103$i = 0, $neg13 = 0, $neg132$i$i = 0, $neg48$i = 0, $neg73 = 0, $next$i = 0;
 var $next$i$i = 0, $next$i$i$i = 0, $next231$i = 0, $not$cmp$i = 0, $not$cmp107$i = 0, $not$cmp114$i = 0, $not$cmp141$i = 0, $not$cmp144$i$i = 0, $not$cmp205$i = 0, $not$cmp3$i = 0, $not$cmp493$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0, $or$cond$i163 = 0, $or$cond1$i = 0, $or$cond1$i160 = 0, $or$cond2$i = 0, $or$cond3$i = 0, $or$cond4$i = 0, $or$cond5$i = 0;
 var $or$cond7$i = 0, $or$cond7$not$i = 0, $or$cond8$i = 0, $or$cond93$i = 0, $or$cond94$i = 0, $or$i = 0, $or$i$i = 0, $or$i$i$i = 0, $or$i164 = 0, $or$i45$i = 0, $or101$i$i = 0, $or110 = 0, $or167 = 0, $or172 = 0, $or176 = 0, $or178$i = 0, $or180 = 0, $or183$i = 0, $or186$i = 0, $or188$i = 0;
 var $or19$i$i = 0, $or194 = 0, $or197 = 0, $or204$i = 0, $or210$i$i = 0, $or22$i$i = 0, $or23 = 0, $or232$i$i = 0, $or26 = 0, $or264$i = 0, $or267$i = 0, $or270$i = 0, $or275$i = 0, $or278$i = 0, $or28$i$i = 0, $or280$i = 0, $or297$i = 0, $or300$i$i = 0, $or33$i$i = 0, $or368$i = 0;
 var $or40 = 0, $or44$i$i = 0, $or93 = 0, $or96 = 0, $parent$i = 0, $parent$i$i = 0, $parent$i170 = 0, $parent$i23$i = 0, $parent135$i = 0, $parent138$i$i = 0, $parent149$i = 0, $parent162$i$i = 0, $parent165$i$i = 0, $parent166$i = 0, $parent179$i$i = 0, $parent196$i$i = 0, $parent226$i = 0, $parent240$i = 0, $parent257$i = 0, $parent301$i$i = 0;
 var $parent337$i$i = 0, $parent361$i$i = 0, $parent369$i = 0, $parent406$i = 0, $parent433$i = 0, $qsize$0$i$i = 0, $retval$0 = 0, $rsize$0$i = 0, $rsize$0$lcssa$i = 0, $rsize$07$i = 0, $rsize$1$i = 0, $rsize$3$i = 0, $rsize$4$lcssa$i = 0, $rsize$48$i = 0, $rst$0$i = 0, $rst$1$i = 0, $sflags193$i = 0, $sflags235$i = 0, $shl = 0, $shl$i = 0;
 var $shl$i$i = 0, $shl$i150 = 0, $shl$i49$i = 0, $shl102 = 0, $shl105 = 0, $shl116$i$i = 0, $shl12 = 0, $shl127$i$i = 0, $shl131$i$i = 0, $shl15$i = 0, $shl18$i = 0, $shl192$i = 0, $shl195$i = 0, $shl198$i = 0, $shl22 = 0, $shl222$i$i = 0, $shl226$i$i = 0, $shl265$i$i = 0, $shl270$i$i = 0, $shl276$i$i = 0;
 var $shl279$i$i = 0, $shl288$i = 0, $shl291$i = 0, $shl294$i$i = 0, $shl31$i = 0, $shl316$i$i = 0, $shl326$i$i = 0, $shl333$i = 0, $shl338$i = 0, $shl344$i = 0, $shl347$i = 0, $shl35 = 0, $shl362$i = 0, $shl37 = 0, $shl384$i = 0, $shl39$i$i = 0, $shl395$i = 0, $shl48$i$i = 0, $shl52$i = 0, $shl60$i = 0;
 var $shl65 = 0, $shl70$i$i = 0, $shl72 = 0, $shl75$i$i = 0, $shl81$i$i = 0, $shl84$i$i = 0, $shl9$i = 0, $shl90 = 0, $shl95$i$i = 0, $shr = 0, $shr$i = 0, $shr$i$i = 0, $shr$i145 = 0, $shr$i21$i = 0, $shr101 = 0, $shr11$i = 0, $shr11$i153 = 0, $shr110$i$i = 0, $shr12$i = 0, $shr124$i$i = 0;
 var $shr15$i = 0, $shr16$i = 0, $shr16$i154 = 0, $shr19$i = 0, $shr194$i = 0, $shr20$i = 0, $shr214$i$i = 0, $shr253$i$i = 0, $shr263$i$i = 0, $shr267$i$i = 0, $shr27$i = 0, $shr272$i$i = 0, $shr277$i$i = 0, $shr281$i$i = 0, $shr283$i = 0, $shr3 = 0, $shr310$i$i = 0, $shr318$i = 0, $shr323$i$i = 0, $shr330$i = 0;
 var $shr335$i = 0, $shr340$i = 0, $shr345$i = 0, $shr349$i = 0, $shr378$i = 0, $shr392$i = 0, $shr4$i = 0, $shr42$i = 0, $shr45 = 0, $shr47 = 0, $shr48 = 0, $shr5$i = 0, $shr5$i148 = 0, $shr51 = 0, $shr52 = 0, $shr55 = 0, $shr56 = 0, $shr58$i$i = 0, $shr59 = 0, $shr60 = 0;
 var $shr63 = 0, $shr68$i$i = 0, $shr7$i = 0, $shr7$i151 = 0, $shr72$i = 0, $shr72$i$i = 0, $shr75$i = 0, $shr76$i = 0, $shr77$i$i = 0, $shr79$i = 0, $shr8$i = 0, $shr80$i = 0, $shr82$i$i = 0, $shr83$i = 0, $shr84$i = 0, $shr86$i$i = 0, $shr87$i = 0, $shr88$i = 0, $shr91$i = 0, $size$i$i = 0;
 var $size$i$i$i = 0, $size188$i = 0, $size245$i = 0, $sizebits$0$i = 0, $sizebits$0$shl52$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$0104$i = 0, $sp$1103$i = 0, $ssize$2$ph$i = 0, $sub = 0, $sub$i = 0, $sub$i135 = 0, $sub$i144 = 0, $sub$ptr$lhs$cast$i = 0, $sub$ptr$lhs$cast$i$i = 0, $sub$ptr$lhs$cast$i15$i = 0, $sub$ptr$rhs$cast$i = 0, $sub$ptr$rhs$cast$i$i = 0, $sub$ptr$rhs$cast$i16$i = 0;
 var $sub$ptr$sub$i = 0, $sub$ptr$sub$i$i = 0, $sub$ptr$sub$i17$i = 0, $sub$ptr$sub$tsize$4$i = 0, $sub10$i = 0, $sub101$i = 0, $sub101$rsize$4$i = 0, $sub112$i = 0, $sub113$i$i = 0, $sub118$i = 0, $sub14$i = 0, $sub16$i$i = 0, $sub160 = 0, $sub172$i = 0, $sub18$i$i = 0, $sub190 = 0, $sub2$i = 0, $sub22$i = 0, $sub260$i = 0, $sub262$i$i = 0;
 var $sub266$i$i = 0, $sub271$i$i = 0, $sub275$i$i = 0, $sub30$i = 0, $sub31$i = 0, $sub31$rsize$0$i = 0, $sub313$i$i = 0, $sub329$i = 0, $sub33$i = 0, $sub334$i = 0, $sub339$i = 0, $sub343$i = 0, $sub381$i = 0, $sub4$i = 0, $sub41$i = 0, $sub42 = 0, $sub44 = 0, $sub5$i$i = 0, $sub5$i$i$i = 0, $sub5$i44$i = 0;
 var $sub50$i = 0, $sub6$i = 0, $sub63$i = 0, $sub67$i = 0, $sub67$i$i = 0, $sub70$i = 0, $sub71$i$i = 0, $sub76$i$i = 0, $sub80$i$i = 0, $sub91 = 0, $sub99$i = 0, $t$0$i = 0, $t$2$i = 0, $t$4$ph$i = 0, $t$4$v$4$i = 0, $t$47$i = 0, $tbase$792$i = 0, $tobool$i$i = 0, $tobool107 = 0, $tobool195$i = 0;
 var $tobool200$i = 0, $tobool228$i$i = 0, $tobool237$i = 0, $tobool293$i = 0, $tobool296$i$i = 0, $tobool30$i = 0, $tobool364$i = 0, $tobool97$i$i = 0, $tsize$2617179$i = 0, $tsize$4$i = 0, $tsize$791$i = 0, $v$0$i = 0, $v$0$lcssa$i = 0, $v$08$i = 0, $v$1$i = 0, $v$3$i = 0, $v$4$lcssa$i = 0, $v$4$ph$i = 0, $v$49$i = 0, $xor$i$i = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $magic$i$i = sp;
 $cmp = ($bytes>>>0)<(245);
 do {
  if ($cmp) {
   $cmp1 = ($bytes>>>0)<(11);
   $add2 = (($bytes) + 11)|0;
   $and = $add2 & -8;
   $cond = $cmp1 ? 16 : $and;
   $shr = $cond >>> 3;
   $0 = HEAP32[8222]|0;
   $shr3 = $0 >>> $shr;
   $and4 = $shr3 & 3;
   $cmp5 = ($and4|0)==(0);
   if (!($cmp5)) {
    $neg = $shr3 & 1;
    $and7 = $neg ^ 1;
    $add8 = (($and7) + ($shr))|0;
    $shl = $add8 << 1;
    $arrayidx = (32928 + ($shl<<2)|0);
    $1 = ((($arrayidx)) + 8|0);
    $2 = HEAP32[$1>>2]|0;
    $fd9 = ((($2)) + 8|0);
    $3 = HEAP32[$fd9>>2]|0;
    $cmp10 = ($arrayidx|0)==($3|0);
    if ($cmp10) {
     $shl12 = 1 << $add8;
     $neg13 = $shl12 ^ -1;
     $and14 = $0 & $neg13;
     HEAP32[8222] = $and14;
    } else {
     $bk18 = ((($3)) + 12|0);
     HEAP32[$bk18>>2] = $arrayidx;
     HEAP32[$1>>2] = $3;
    }
    $shl22 = $add8 << 3;
    $or23 = $shl22 | 3;
    $head = ((($2)) + 4|0);
    HEAP32[$head>>2] = $or23;
    $add$ptr = (($2) + ($shl22)|0);
    $head25 = ((($add$ptr)) + 4|0);
    $4 = HEAP32[$head25>>2]|0;
    $or26 = $4 | 1;
    HEAP32[$head25>>2] = $or26;
    $retval$0 = $fd9;
    STACKTOP = sp;return ($retval$0|0);
   }
   $5 = HEAP32[(32896)>>2]|0;
   $cmp29 = ($cond>>>0)>($5>>>0);
   if ($cmp29) {
    $cmp31 = ($shr3|0)==(0);
    if (!($cmp31)) {
     $shl35 = $shr3 << $shr;
     $shl37 = 2 << $shr;
     $sub = (0 - ($shl37))|0;
     $or40 = $shl37 | $sub;
     $and41 = $shl35 & $or40;
     $sub42 = (0 - ($and41))|0;
     $and43 = $and41 & $sub42;
     $sub44 = (($and43) + -1)|0;
     $shr45 = $sub44 >>> 12;
     $and46 = $shr45 & 16;
     $shr47 = $sub44 >>> $and46;
     $shr48 = $shr47 >>> 5;
     $and49 = $shr48 & 8;
     $add50 = $and49 | $and46;
     $shr51 = $shr47 >>> $and49;
     $shr52 = $shr51 >>> 2;
     $and53 = $shr52 & 4;
     $add54 = $add50 | $and53;
     $shr55 = $shr51 >>> $and53;
     $shr56 = $shr55 >>> 1;
     $and57 = $shr56 & 2;
     $add58 = $add54 | $and57;
     $shr59 = $shr55 >>> $and57;
     $shr60 = $shr59 >>> 1;
     $and61 = $shr60 & 1;
     $add62 = $add58 | $and61;
     $shr63 = $shr59 >>> $and61;
     $add64 = (($add62) + ($shr63))|0;
     $shl65 = $add64 << 1;
     $arrayidx66 = (32928 + ($shl65<<2)|0);
     $6 = ((($arrayidx66)) + 8|0);
     $7 = HEAP32[$6>>2]|0;
     $fd69 = ((($7)) + 8|0);
     $8 = HEAP32[$fd69>>2]|0;
     $cmp70 = ($arrayidx66|0)==($8|0);
     if ($cmp70) {
      $shl72 = 1 << $add64;
      $neg73 = $shl72 ^ -1;
      $and74 = $0 & $neg73;
      HEAP32[8222] = $and74;
      $10 = $and74;
     } else {
      $bk85 = ((($8)) + 12|0);
      HEAP32[$bk85>>2] = $arrayidx66;
      HEAP32[$6>>2] = $8;
      $10 = $0;
     }
     $shl90 = $add64 << 3;
     $sub91 = (($shl90) - ($cond))|0;
     $or93 = $cond | 3;
     $head94 = ((($7)) + 4|0);
     HEAP32[$head94>>2] = $or93;
     $add$ptr95 = (($7) + ($cond)|0);
     $or96 = $sub91 | 1;
     $head97 = ((($add$ptr95)) + 4|0);
     HEAP32[$head97>>2] = $or96;
     $add$ptr98 = (($add$ptr95) + ($sub91)|0);
     HEAP32[$add$ptr98>>2] = $sub91;
     $cmp99 = ($5|0)==(0);
     if (!($cmp99)) {
      $9 = HEAP32[(32908)>>2]|0;
      $shr101 = $5 >>> 3;
      $shl102 = $shr101 << 1;
      $arrayidx103 = (32928 + ($shl102<<2)|0);
      $shl105 = 1 << $shr101;
      $and106 = $10 & $shl105;
      $tobool107 = ($and106|0)==(0);
      if ($tobool107) {
       $or110 = $10 | $shl105;
       HEAP32[8222] = $or110;
       $$pre = ((($arrayidx103)) + 8|0);
       $$pre$phiZ2D = $$pre;$F104$0 = $arrayidx103;
      } else {
       $11 = ((($arrayidx103)) + 8|0);
       $12 = HEAP32[$11>>2]|0;
       $$pre$phiZ2D = $11;$F104$0 = $12;
      }
      HEAP32[$$pre$phiZ2D>>2] = $9;
      $bk122 = ((($F104$0)) + 12|0);
      HEAP32[$bk122>>2] = $9;
      $fd123 = ((($9)) + 8|0);
      HEAP32[$fd123>>2] = $F104$0;
      $bk124 = ((($9)) + 12|0);
      HEAP32[$bk124>>2] = $arrayidx103;
     }
     HEAP32[(32896)>>2] = $sub91;
     HEAP32[(32908)>>2] = $add$ptr95;
     $retval$0 = $fd69;
     STACKTOP = sp;return ($retval$0|0);
    }
    $13 = HEAP32[(32892)>>2]|0;
    $cmp128 = ($13|0)==(0);
    if ($cmp128) {
     $nb$0 = $cond;
    } else {
     $sub$i = (0 - ($13))|0;
     $and$i = $13 & $sub$i;
     $sub2$i = (($and$i) + -1)|0;
     $shr$i = $sub2$i >>> 12;
     $and3$i = $shr$i & 16;
     $shr4$i = $sub2$i >>> $and3$i;
     $shr5$i = $shr4$i >>> 5;
     $and6$i = $shr5$i & 8;
     $add$i = $and6$i | $and3$i;
     $shr7$i = $shr4$i >>> $and6$i;
     $shr8$i = $shr7$i >>> 2;
     $and9$i = $shr8$i & 4;
     $add10$i = $add$i | $and9$i;
     $shr11$i = $shr7$i >>> $and9$i;
     $shr12$i = $shr11$i >>> 1;
     $and13$i = $shr12$i & 2;
     $add14$i = $add10$i | $and13$i;
     $shr15$i = $shr11$i >>> $and13$i;
     $shr16$i = $shr15$i >>> 1;
     $and17$i = $shr16$i & 1;
     $add18$i = $add14$i | $and17$i;
     $shr19$i = $shr15$i >>> $and17$i;
     $add20$i = (($add18$i) + ($shr19$i))|0;
     $arrayidx$i = (33192 + ($add20$i<<2)|0);
     $14 = HEAP32[$arrayidx$i>>2]|0;
     $head$i = ((($14)) + 4|0);
     $15 = HEAP32[$head$i>>2]|0;
     $and21$i = $15 & -8;
     $sub22$i = (($and21$i) - ($cond))|0;
     $arrayidx232$i = ((($14)) + 16|0);
     $16 = HEAP32[$arrayidx232$i>>2]|0;
     $not$cmp3$i = ($16|0)==(0|0);
     $$sink4$i = $not$cmp3$i&1;
     $arrayidx275$i = (((($14)) + 16|0) + ($$sink4$i<<2)|0);
     $17 = HEAP32[$arrayidx275$i>>2]|0;
     $cmp286$i = ($17|0)==(0|0);
     if ($cmp286$i) {
      $rsize$0$lcssa$i = $sub22$i;$v$0$lcssa$i = $14;
     } else {
      $18 = $17;$rsize$07$i = $sub22$i;$v$08$i = $14;
      while(1) {
       $head29$i = ((($18)) + 4|0);
       $19 = HEAP32[$head29$i>>2]|0;
       $and30$i = $19 & -8;
       $sub31$i = (($and30$i) - ($cond))|0;
       $cmp32$i = ($sub31$i>>>0)<($rsize$07$i>>>0);
       $sub31$rsize$0$i = $cmp32$i ? $sub31$i : $rsize$07$i;
       $$v$0$i = $cmp32$i ? $18 : $v$08$i;
       $arrayidx23$i = ((($18)) + 16|0);
       $20 = HEAP32[$arrayidx23$i>>2]|0;
       $not$cmp$i = ($20|0)==(0|0);
       $$sink$i = $not$cmp$i&1;
       $arrayidx27$i = (((($18)) + 16|0) + ($$sink$i<<2)|0);
       $21 = HEAP32[$arrayidx27$i>>2]|0;
       $cmp28$i = ($21|0)==(0|0);
       if ($cmp28$i) {
        $rsize$0$lcssa$i = $sub31$rsize$0$i;$v$0$lcssa$i = $$v$0$i;
        break;
       } else {
        $18 = $21;$rsize$07$i = $sub31$rsize$0$i;$v$08$i = $$v$0$i;
       }
      }
     }
     $add$ptr$i = (($v$0$lcssa$i) + ($cond)|0);
     $cmp35$i = ($v$0$lcssa$i>>>0)<($add$ptr$i>>>0);
     if ($cmp35$i) {
      $parent$i = ((($v$0$lcssa$i)) + 24|0);
      $22 = HEAP32[$parent$i>>2]|0;
      $bk$i = ((($v$0$lcssa$i)) + 12|0);
      $23 = HEAP32[$bk$i>>2]|0;
      $cmp40$i = ($23|0)==($v$0$lcssa$i|0);
      do {
       if ($cmp40$i) {
        $arrayidx61$i = ((($v$0$lcssa$i)) + 20|0);
        $25 = HEAP32[$arrayidx61$i>>2]|0;
        $cmp62$i = ($25|0)==(0|0);
        if ($cmp62$i) {
         $arrayidx65$i = ((($v$0$lcssa$i)) + 16|0);
         $26 = HEAP32[$arrayidx65$i>>2]|0;
         $cmp66$i = ($26|0)==(0|0);
         if ($cmp66$i) {
          $R$3$i = 0;
          break;
         } else {
          $R$1$i = $26;$RP$1$i = $arrayidx65$i;
         }
        } else {
         $R$1$i = $25;$RP$1$i = $arrayidx61$i;
        }
        while(1) {
         $arrayidx71$i = ((($R$1$i)) + 20|0);
         $27 = HEAP32[$arrayidx71$i>>2]|0;
         $cmp72$i = ($27|0)==(0|0);
         if (!($cmp72$i)) {
          $R$1$i = $27;$RP$1$i = $arrayidx71$i;
          continue;
         }
         $arrayidx75$i = ((($R$1$i)) + 16|0);
         $28 = HEAP32[$arrayidx75$i>>2]|0;
         $cmp76$i = ($28|0)==(0|0);
         if ($cmp76$i) {
          break;
         } else {
          $R$1$i = $28;$RP$1$i = $arrayidx75$i;
         }
        }
        HEAP32[$RP$1$i>>2] = 0;
        $R$3$i = $R$1$i;
       } else {
        $fd$i = ((($v$0$lcssa$i)) + 8|0);
        $24 = HEAP32[$fd$i>>2]|0;
        $bk56$i = ((($24)) + 12|0);
        HEAP32[$bk56$i>>2] = $23;
        $fd57$i = ((($23)) + 8|0);
        HEAP32[$fd57$i>>2] = $24;
        $R$3$i = $23;
       }
      } while(0);
      $cmp90$i = ($22|0)==(0|0);
      do {
       if (!($cmp90$i)) {
        $index$i = ((($v$0$lcssa$i)) + 28|0);
        $29 = HEAP32[$index$i>>2]|0;
        $arrayidx94$i = (33192 + ($29<<2)|0);
        $30 = HEAP32[$arrayidx94$i>>2]|0;
        $cmp95$i = ($v$0$lcssa$i|0)==($30|0);
        if ($cmp95$i) {
         HEAP32[$arrayidx94$i>>2] = $R$3$i;
         $cond$i = ($R$3$i|0)==(0|0);
         if ($cond$i) {
          $shl$i = 1 << $29;
          $neg$i = $shl$i ^ -1;
          $and103$i = $13 & $neg$i;
          HEAP32[(32892)>>2] = $and103$i;
          break;
         }
        } else {
         $arrayidx113$i = ((($22)) + 16|0);
         $31 = HEAP32[$arrayidx113$i>>2]|0;
         $not$cmp114$i = ($31|0)!=($v$0$lcssa$i|0);
         $$sink2$i = $not$cmp114$i&1;
         $arrayidx121$i = (((($22)) + 16|0) + ($$sink2$i<<2)|0);
         HEAP32[$arrayidx121$i>>2] = $R$3$i;
         $cmp126$i = ($R$3$i|0)==(0|0);
         if ($cmp126$i) {
          break;
         }
        }
        $parent135$i = ((($R$3$i)) + 24|0);
        HEAP32[$parent135$i>>2] = $22;
        $arrayidx137$i = ((($v$0$lcssa$i)) + 16|0);
        $32 = HEAP32[$arrayidx137$i>>2]|0;
        $cmp138$i = ($32|0)==(0|0);
        if (!($cmp138$i)) {
         $arrayidx148$i = ((($R$3$i)) + 16|0);
         HEAP32[$arrayidx148$i>>2] = $32;
         $parent149$i = ((($32)) + 24|0);
         HEAP32[$parent149$i>>2] = $R$3$i;
        }
        $arrayidx154$i = ((($v$0$lcssa$i)) + 20|0);
        $33 = HEAP32[$arrayidx154$i>>2]|0;
        $cmp155$i = ($33|0)==(0|0);
        if (!($cmp155$i)) {
         $arrayidx165$i = ((($R$3$i)) + 20|0);
         HEAP32[$arrayidx165$i>>2] = $33;
         $parent166$i = ((($33)) + 24|0);
         HEAP32[$parent166$i>>2] = $R$3$i;
        }
       }
      } while(0);
      $cmp174$i = ($rsize$0$lcssa$i>>>0)<(16);
      if ($cmp174$i) {
       $add177$i = (($rsize$0$lcssa$i) + ($cond))|0;
       $or178$i = $add177$i | 3;
       $head179$i = ((($v$0$lcssa$i)) + 4|0);
       HEAP32[$head179$i>>2] = $or178$i;
       $add$ptr181$i = (($v$0$lcssa$i) + ($add177$i)|0);
       $head182$i = ((($add$ptr181$i)) + 4|0);
       $34 = HEAP32[$head182$i>>2]|0;
       $or183$i = $34 | 1;
       HEAP32[$head182$i>>2] = $or183$i;
      } else {
       $or186$i = $cond | 3;
       $head187$i = ((($v$0$lcssa$i)) + 4|0);
       HEAP32[$head187$i>>2] = $or186$i;
       $or188$i = $rsize$0$lcssa$i | 1;
       $head189$i = ((($add$ptr$i)) + 4|0);
       HEAP32[$head189$i>>2] = $or188$i;
       $add$ptr190$i = (($add$ptr$i) + ($rsize$0$lcssa$i)|0);
       HEAP32[$add$ptr190$i>>2] = $rsize$0$lcssa$i;
       $cmp191$i = ($5|0)==(0);
       if (!($cmp191$i)) {
        $35 = HEAP32[(32908)>>2]|0;
        $shr194$i = $5 >>> 3;
        $shl195$i = $shr194$i << 1;
        $arrayidx196$i = (32928 + ($shl195$i<<2)|0);
        $shl198$i = 1 << $shr194$i;
        $and199$i = $0 & $shl198$i;
        $tobool200$i = ($and199$i|0)==(0);
        if ($tobool200$i) {
         $or204$i = $0 | $shl198$i;
         HEAP32[8222] = $or204$i;
         $$pre$i = ((($arrayidx196$i)) + 8|0);
         $$pre$phi$iZ2D = $$pre$i;$F197$0$i = $arrayidx196$i;
        } else {
         $36 = ((($arrayidx196$i)) + 8|0);
         $37 = HEAP32[$36>>2]|0;
         $$pre$phi$iZ2D = $36;$F197$0$i = $37;
        }
        HEAP32[$$pre$phi$iZ2D>>2] = $35;
        $bk218$i = ((($F197$0$i)) + 12|0);
        HEAP32[$bk218$i>>2] = $35;
        $fd219$i = ((($35)) + 8|0);
        HEAP32[$fd219$i>>2] = $F197$0$i;
        $bk220$i = ((($35)) + 12|0);
        HEAP32[$bk220$i>>2] = $arrayidx196$i;
       }
       HEAP32[(32896)>>2] = $rsize$0$lcssa$i;
       HEAP32[(32908)>>2] = $add$ptr$i;
      }
      $add$ptr225$i = ((($v$0$lcssa$i)) + 8|0);
      $retval$0 = $add$ptr225$i;
      STACKTOP = sp;return ($retval$0|0);
     } else {
      $nb$0 = $cond;
     }
    }
   } else {
    $nb$0 = $cond;
   }
  } else {
   $cmp139 = ($bytes>>>0)>(4294967231);
   if ($cmp139) {
    $nb$0 = -1;
   } else {
    $add144 = (($bytes) + 11)|0;
    $and145 = $add144 & -8;
    $38 = HEAP32[(32892)>>2]|0;
    $cmp146 = ($38|0)==(0);
    if ($cmp146) {
     $nb$0 = $and145;
    } else {
     $sub$i144 = (0 - ($and145))|0;
     $shr$i145 = $add144 >>> 8;
     $cmp$i146 = ($shr$i145|0)==(0);
     if ($cmp$i146) {
      $idx$0$i = 0;
     } else {
      $cmp1$i = ($and145>>>0)>(16777215);
      if ($cmp1$i) {
       $idx$0$i = 31;
      } else {
       $sub4$i = (($shr$i145) + 1048320)|0;
       $shr5$i148 = $sub4$i >>> 16;
       $and$i149 = $shr5$i148 & 8;
       $shl$i150 = $shr$i145 << $and$i149;
       $sub6$i = (($shl$i150) + 520192)|0;
       $shr7$i151 = $sub6$i >>> 16;
       $and8$i = $shr7$i151 & 4;
       $add$i152 = $and8$i | $and$i149;
       $shl9$i = $shl$i150 << $and8$i;
       $sub10$i = (($shl9$i) + 245760)|0;
       $shr11$i153 = $sub10$i >>> 16;
       $and12$i = $shr11$i153 & 2;
       $add13$i = $add$i152 | $and12$i;
       $sub14$i = (14 - ($add13$i))|0;
       $shl15$i = $shl9$i << $and12$i;
       $shr16$i154 = $shl15$i >>> 15;
       $add17$i155 = (($sub14$i) + ($shr16$i154))|0;
       $shl18$i = $add17$i155 << 1;
       $add19$i = (($add17$i155) + 7)|0;
       $shr20$i = $and145 >>> $add19$i;
       $and21$i156 = $shr20$i & 1;
       $add22$i = $and21$i156 | $shl18$i;
       $idx$0$i = $add22$i;
      }
     }
     $arrayidx$i157 = (33192 + ($idx$0$i<<2)|0);
     $39 = HEAP32[$arrayidx$i157>>2]|0;
     $cmp24$i = ($39|0)==(0|0);
     L74: do {
      if ($cmp24$i) {
       $rsize$3$i = $sub$i144;$t$2$i = 0;$v$3$i = 0;
       label = 57;
      } else {
       $cmp26$i = ($idx$0$i|0)==(31);
       $shr27$i = $idx$0$i >>> 1;
       $sub30$i = (25 - ($shr27$i))|0;
       $cond$i158 = $cmp26$i ? 0 : $sub30$i;
       $shl31$i = $and145 << $cond$i158;
       $rsize$0$i = $sub$i144;$rst$0$i = 0;$sizebits$0$i = $shl31$i;$t$0$i = $39;$v$0$i = 0;
       while(1) {
        $head$i159 = ((($t$0$i)) + 4|0);
        $40 = HEAP32[$head$i159>>2]|0;
        $and32$i = $40 & -8;
        $sub33$i = (($and32$i) - ($and145))|0;
        $cmp34$i = ($sub33$i>>>0)<($rsize$0$i>>>0);
        if ($cmp34$i) {
         $cmp36$i = ($sub33$i|0)==(0);
         if ($cmp36$i) {
          $rsize$48$i = 0;$t$47$i = $t$0$i;$v$49$i = $t$0$i;
          label = 61;
          break L74;
         } else {
          $rsize$1$i = $sub33$i;$v$1$i = $t$0$i;
         }
        } else {
         $rsize$1$i = $rsize$0$i;$v$1$i = $v$0$i;
        }
        $arrayidx40$i = ((($t$0$i)) + 20|0);
        $41 = HEAP32[$arrayidx40$i>>2]|0;
        $shr42$i = $sizebits$0$i >>> 31;
        $arrayidx44$i = (((($t$0$i)) + 16|0) + ($shr42$i<<2)|0);
        $42 = HEAP32[$arrayidx44$i>>2]|0;
        $cmp45$i = ($41|0)==(0|0);
        $cmp46$i = ($41|0)==($42|0);
        $or$cond1$i160 = $cmp45$i | $cmp46$i;
        $rst$1$i = $or$cond1$i160 ? $rst$0$i : $41;
        $cmp49$i = ($42|0)==(0|0);
        $not$cmp493$i = $cmp49$i ^ 1;
        $shl52$i = $not$cmp493$i&1;
        $sizebits$0$shl52$i = $sizebits$0$i << $shl52$i;
        if ($cmp49$i) {
         $rsize$3$i = $rsize$1$i;$t$2$i = $rst$1$i;$v$3$i = $v$1$i;
         label = 57;
         break;
        } else {
         $rsize$0$i = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $sizebits$0$shl52$i;$t$0$i = $42;$v$0$i = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 57) {
      $cmp55$i161 = ($t$2$i|0)==(0|0);
      $cmp57$i162 = ($v$3$i|0)==(0|0);
      $or$cond$i163 = $cmp55$i161 & $cmp57$i162;
      if ($or$cond$i163) {
       $shl60$i = 2 << $idx$0$i;
       $sub63$i = (0 - ($shl60$i))|0;
       $or$i164 = $shl60$i | $sub63$i;
       $and64$i = $38 & $or$i164;
       $cmp65$i = ($and64$i|0)==(0);
       if ($cmp65$i) {
        $nb$0 = $and145;
        break;
       }
       $sub67$i = (0 - ($and64$i))|0;
       $and68$i = $and64$i & $sub67$i;
       $sub70$i = (($and68$i) + -1)|0;
       $shr72$i = $sub70$i >>> 12;
       $and73$i = $shr72$i & 16;
       $shr75$i = $sub70$i >>> $and73$i;
       $shr76$i = $shr75$i >>> 5;
       $and77$i = $shr76$i & 8;
       $add78$i = $and77$i | $and73$i;
       $shr79$i = $shr75$i >>> $and77$i;
       $shr80$i = $shr79$i >>> 2;
       $and81$i = $shr80$i & 4;
       $add82$i = $add78$i | $and81$i;
       $shr83$i = $shr79$i >>> $and81$i;
       $shr84$i = $shr83$i >>> 1;
       $and85$i = $shr84$i & 2;
       $add86$i = $add82$i | $and85$i;
       $shr87$i = $shr83$i >>> $and85$i;
       $shr88$i = $shr87$i >>> 1;
       $and89$i = $shr88$i & 1;
       $add90$i = $add86$i | $and89$i;
       $shr91$i = $shr87$i >>> $and89$i;
       $add92$i = (($add90$i) + ($shr91$i))|0;
       $arrayidx94$i165 = (33192 + ($add92$i<<2)|0);
       $43 = HEAP32[$arrayidx94$i165>>2]|0;
       $t$4$ph$i = $43;$v$4$ph$i = 0;
      } else {
       $t$4$ph$i = $t$2$i;$v$4$ph$i = $v$3$i;
      }
      $cmp976$i = ($t$4$ph$i|0)==(0|0);
      if ($cmp976$i) {
       $rsize$4$lcssa$i = $rsize$3$i;$v$4$lcssa$i = $v$4$ph$i;
      } else {
       $rsize$48$i = $rsize$3$i;$t$47$i = $t$4$ph$i;$v$49$i = $v$4$ph$i;
       label = 61;
      }
     }
     if ((label|0) == 61) {
      while(1) {
       label = 0;
       $head99$i = ((($t$47$i)) + 4|0);
       $44 = HEAP32[$head99$i>>2]|0;
       $and100$i = $44 & -8;
       $sub101$i = (($and100$i) - ($and145))|0;
       $cmp102$i = ($sub101$i>>>0)<($rsize$48$i>>>0);
       $sub101$rsize$4$i = $cmp102$i ? $sub101$i : $rsize$48$i;
       $t$4$v$4$i = $cmp102$i ? $t$47$i : $v$49$i;
       $arrayidx106$i = ((($t$47$i)) + 16|0);
       $45 = HEAP32[$arrayidx106$i>>2]|0;
       $not$cmp107$i = ($45|0)==(0|0);
       $$sink$i166 = $not$cmp107$i&1;
       $arrayidx113$i167 = (((($t$47$i)) + 16|0) + ($$sink$i166<<2)|0);
       $46 = HEAP32[$arrayidx113$i167>>2]|0;
       $cmp97$i = ($46|0)==(0|0);
       if ($cmp97$i) {
        $rsize$4$lcssa$i = $sub101$rsize$4$i;$v$4$lcssa$i = $t$4$v$4$i;
        break;
       } else {
        $rsize$48$i = $sub101$rsize$4$i;$t$47$i = $46;$v$49$i = $t$4$v$4$i;
        label = 61;
       }
      }
     }
     $cmp116$i = ($v$4$lcssa$i|0)==(0|0);
     if ($cmp116$i) {
      $nb$0 = $and145;
     } else {
      $47 = HEAP32[(32896)>>2]|0;
      $sub118$i = (($47) - ($and145))|0;
      $cmp119$i = ($rsize$4$lcssa$i>>>0)<($sub118$i>>>0);
      if ($cmp119$i) {
       $add$ptr$i169 = (($v$4$lcssa$i) + ($and145)|0);
       $cmp123$i = ($v$4$lcssa$i>>>0)<($add$ptr$i169>>>0);
       if (!($cmp123$i)) {
        $retval$0 = 0;
        STACKTOP = sp;return ($retval$0|0);
       }
       $parent$i170 = ((($v$4$lcssa$i)) + 24|0);
       $48 = HEAP32[$parent$i170>>2]|0;
       $bk$i171 = ((($v$4$lcssa$i)) + 12|0);
       $49 = HEAP32[$bk$i171>>2]|0;
       $cmp128$i = ($49|0)==($v$4$lcssa$i|0);
       do {
        if ($cmp128$i) {
         $arrayidx151$i = ((($v$4$lcssa$i)) + 20|0);
         $51 = HEAP32[$arrayidx151$i>>2]|0;
         $cmp152$i = ($51|0)==(0|0);
         if ($cmp152$i) {
          $arrayidx155$i = ((($v$4$lcssa$i)) + 16|0);
          $52 = HEAP32[$arrayidx155$i>>2]|0;
          $cmp156$i = ($52|0)==(0|0);
          if ($cmp156$i) {
           $R$3$i179 = 0;
           break;
          } else {
           $R$1$i175 = $52;$RP$1$i174 = $arrayidx155$i;
          }
         } else {
          $R$1$i175 = $51;$RP$1$i174 = $arrayidx151$i;
         }
         while(1) {
          $arrayidx161$i = ((($R$1$i175)) + 20|0);
          $53 = HEAP32[$arrayidx161$i>>2]|0;
          $cmp162$i176 = ($53|0)==(0|0);
          if (!($cmp162$i176)) {
           $R$1$i175 = $53;$RP$1$i174 = $arrayidx161$i;
           continue;
          }
          $arrayidx165$i177 = ((($R$1$i175)) + 16|0);
          $54 = HEAP32[$arrayidx165$i177>>2]|0;
          $cmp166$i = ($54|0)==(0|0);
          if ($cmp166$i) {
           break;
          } else {
           $R$1$i175 = $54;$RP$1$i174 = $arrayidx165$i177;
          }
         }
         HEAP32[$RP$1$i174>>2] = 0;
         $R$3$i179 = $R$1$i175;
        } else {
         $fd$i172 = ((($v$4$lcssa$i)) + 8|0);
         $50 = HEAP32[$fd$i172>>2]|0;
         $bk145$i = ((($50)) + 12|0);
         HEAP32[$bk145$i>>2] = $49;
         $fd146$i = ((($49)) + 8|0);
         HEAP32[$fd146$i>>2] = $50;
         $R$3$i179 = $49;
        }
       } while(0);
       $cmp180$i = ($48|0)==(0|0);
       do {
        if ($cmp180$i) {
         $64 = $38;
        } else {
         $index$i180 = ((($v$4$lcssa$i)) + 28|0);
         $55 = HEAP32[$index$i180>>2]|0;
         $arrayidx184$i = (33192 + ($55<<2)|0);
         $56 = HEAP32[$arrayidx184$i>>2]|0;
         $cmp185$i = ($v$4$lcssa$i|0)==($56|0);
         if ($cmp185$i) {
          HEAP32[$arrayidx184$i>>2] = $R$3$i179;
          $cond2$i = ($R$3$i179|0)==(0|0);
          if ($cond2$i) {
           $shl192$i = 1 << $55;
           $neg$i181 = $shl192$i ^ -1;
           $and194$i182 = $38 & $neg$i181;
           HEAP32[(32892)>>2] = $and194$i182;
           $64 = $and194$i182;
           break;
          }
         } else {
          $arrayidx204$i = ((($48)) + 16|0);
          $57 = HEAP32[$arrayidx204$i>>2]|0;
          $not$cmp205$i = ($57|0)!=($v$4$lcssa$i|0);
          $$sink2$i183 = $not$cmp205$i&1;
          $arrayidx212$i = (((($48)) + 16|0) + ($$sink2$i183<<2)|0);
          HEAP32[$arrayidx212$i>>2] = $R$3$i179;
          $cmp217$i = ($R$3$i179|0)==(0|0);
          if ($cmp217$i) {
           $64 = $38;
           break;
          }
         }
         $parent226$i = ((($R$3$i179)) + 24|0);
         HEAP32[$parent226$i>>2] = $48;
         $arrayidx228$i = ((($v$4$lcssa$i)) + 16|0);
         $58 = HEAP32[$arrayidx228$i>>2]|0;
         $cmp229$i = ($58|0)==(0|0);
         if (!($cmp229$i)) {
          $arrayidx239$i = ((($R$3$i179)) + 16|0);
          HEAP32[$arrayidx239$i>>2] = $58;
          $parent240$i = ((($58)) + 24|0);
          HEAP32[$parent240$i>>2] = $R$3$i179;
         }
         $arrayidx245$i = ((($v$4$lcssa$i)) + 20|0);
         $59 = HEAP32[$arrayidx245$i>>2]|0;
         $cmp246$i = ($59|0)==(0|0);
         if ($cmp246$i) {
          $64 = $38;
         } else {
          $arrayidx256$i = ((($R$3$i179)) + 20|0);
          HEAP32[$arrayidx256$i>>2] = $59;
          $parent257$i = ((($59)) + 24|0);
          HEAP32[$parent257$i>>2] = $R$3$i179;
          $64 = $38;
         }
        }
       } while(0);
       $cmp265$i = ($rsize$4$lcssa$i>>>0)<(16);
       do {
        if ($cmp265$i) {
         $add268$i = (($rsize$4$lcssa$i) + ($and145))|0;
         $or270$i = $add268$i | 3;
         $head271$i = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$head271$i>>2] = $or270$i;
         $add$ptr273$i = (($v$4$lcssa$i) + ($add268$i)|0);
         $head274$i = ((($add$ptr273$i)) + 4|0);
         $60 = HEAP32[$head274$i>>2]|0;
         $or275$i = $60 | 1;
         HEAP32[$head274$i>>2] = $or275$i;
        } else {
         $or278$i = $and145 | 3;
         $head279$i = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$head279$i>>2] = $or278$i;
         $or280$i = $rsize$4$lcssa$i | 1;
         $head281$i = ((($add$ptr$i169)) + 4|0);
         HEAP32[$head281$i>>2] = $or280$i;
         $add$ptr282$i = (($add$ptr$i169) + ($rsize$4$lcssa$i)|0);
         HEAP32[$add$ptr282$i>>2] = $rsize$4$lcssa$i;
         $shr283$i = $rsize$4$lcssa$i >>> 3;
         $cmp284$i = ($rsize$4$lcssa$i>>>0)<(256);
         if ($cmp284$i) {
          $shl288$i = $shr283$i << 1;
          $arrayidx289$i = (32928 + ($shl288$i<<2)|0);
          $61 = HEAP32[8222]|0;
          $shl291$i = 1 << $shr283$i;
          $and292$i = $61 & $shl291$i;
          $tobool293$i = ($and292$i|0)==(0);
          if ($tobool293$i) {
           $or297$i = $61 | $shl291$i;
           HEAP32[8222] = $or297$i;
           $$pre$i186 = ((($arrayidx289$i)) + 8|0);
           $$pre$phi$i187Z2D = $$pre$i186;$F290$0$i = $arrayidx289$i;
          } else {
           $62 = ((($arrayidx289$i)) + 8|0);
           $63 = HEAP32[$62>>2]|0;
           $$pre$phi$i187Z2D = $62;$F290$0$i = $63;
          }
          HEAP32[$$pre$phi$i187Z2D>>2] = $add$ptr$i169;
          $bk311$i = ((($F290$0$i)) + 12|0);
          HEAP32[$bk311$i>>2] = $add$ptr$i169;
          $fd312$i = ((($add$ptr$i169)) + 8|0);
          HEAP32[$fd312$i>>2] = $F290$0$i;
          $bk313$i = ((($add$ptr$i169)) + 12|0);
          HEAP32[$bk313$i>>2] = $arrayidx289$i;
          break;
         }
         $shr318$i = $rsize$4$lcssa$i >>> 8;
         $cmp319$i = ($shr318$i|0)==(0);
         if ($cmp319$i) {
          $I316$0$i = 0;
         } else {
          $cmp323$i = ($rsize$4$lcssa$i>>>0)>(16777215);
          if ($cmp323$i) {
           $I316$0$i = 31;
          } else {
           $sub329$i = (($shr318$i) + 1048320)|0;
           $shr330$i = $sub329$i >>> 16;
           $and331$i = $shr330$i & 8;
           $shl333$i = $shr318$i << $and331$i;
           $sub334$i = (($shl333$i) + 520192)|0;
           $shr335$i = $sub334$i >>> 16;
           $and336$i = $shr335$i & 4;
           $add337$i = $and336$i | $and331$i;
           $shl338$i = $shl333$i << $and336$i;
           $sub339$i = (($shl338$i) + 245760)|0;
           $shr340$i = $sub339$i >>> 16;
           $and341$i = $shr340$i & 2;
           $add342$i = $add337$i | $and341$i;
           $sub343$i = (14 - ($add342$i))|0;
           $shl344$i = $shl338$i << $and341$i;
           $shr345$i = $shl344$i >>> 15;
           $add346$i = (($sub343$i) + ($shr345$i))|0;
           $shl347$i = $add346$i << 1;
           $add348$i = (($add346$i) + 7)|0;
           $shr349$i = $rsize$4$lcssa$i >>> $add348$i;
           $and350$i = $shr349$i & 1;
           $add351$i = $and350$i | $shl347$i;
           $I316$0$i = $add351$i;
          }
         }
         $arrayidx355$i = (33192 + ($I316$0$i<<2)|0);
         $index356$i = ((($add$ptr$i169)) + 28|0);
         HEAP32[$index356$i>>2] = $I316$0$i;
         $child357$i = ((($add$ptr$i169)) + 16|0);
         $arrayidx358$i = ((($child357$i)) + 4|0);
         HEAP32[$arrayidx358$i>>2] = 0;
         HEAP32[$child357$i>>2] = 0;
         $shl362$i = 1 << $I316$0$i;
         $and363$i = $64 & $shl362$i;
         $tobool364$i = ($and363$i|0)==(0);
         if ($tobool364$i) {
          $or368$i = $64 | $shl362$i;
          HEAP32[(32892)>>2] = $or368$i;
          HEAP32[$arrayidx355$i>>2] = $add$ptr$i169;
          $parent369$i = ((($add$ptr$i169)) + 24|0);
          HEAP32[$parent369$i>>2] = $arrayidx355$i;
          $bk370$i = ((($add$ptr$i169)) + 12|0);
          HEAP32[$bk370$i>>2] = $add$ptr$i169;
          $fd371$i = ((($add$ptr$i169)) + 8|0);
          HEAP32[$fd371$i>>2] = $add$ptr$i169;
          break;
         }
         $65 = HEAP32[$arrayidx355$i>>2]|0;
         $cmp374$i = ($I316$0$i|0)==(31);
         $shr378$i = $I316$0$i >>> 1;
         $sub381$i = (25 - ($shr378$i))|0;
         $cond383$i = $cmp374$i ? 0 : $sub381$i;
         $shl384$i = $rsize$4$lcssa$i << $cond383$i;
         $K373$0$i = $shl384$i;$T$0$i = $65;
         while(1) {
          $head386$i = ((($T$0$i)) + 4|0);
          $66 = HEAP32[$head386$i>>2]|0;
          $and387$i = $66 & -8;
          $cmp388$i = ($and387$i|0)==($rsize$4$lcssa$i|0);
          if ($cmp388$i) {
           label = 97;
           break;
          }
          $shr392$i = $K373$0$i >>> 31;
          $arrayidx394$i = (((($T$0$i)) + 16|0) + ($shr392$i<<2)|0);
          $shl395$i = $K373$0$i << 1;
          $67 = HEAP32[$arrayidx394$i>>2]|0;
          $cmp396$i = ($67|0)==(0|0);
          if ($cmp396$i) {
           label = 96;
           break;
          } else {
           $K373$0$i = $shl395$i;$T$0$i = $67;
          }
         }
         if ((label|0) == 96) {
          HEAP32[$arrayidx394$i>>2] = $add$ptr$i169;
          $parent406$i = ((($add$ptr$i169)) + 24|0);
          HEAP32[$parent406$i>>2] = $T$0$i;
          $bk407$i = ((($add$ptr$i169)) + 12|0);
          HEAP32[$bk407$i>>2] = $add$ptr$i169;
          $fd408$i = ((($add$ptr$i169)) + 8|0);
          HEAP32[$fd408$i>>2] = $add$ptr$i169;
          break;
         }
         else if ((label|0) == 97) {
          $fd416$i = ((($T$0$i)) + 8|0);
          $68 = HEAP32[$fd416$i>>2]|0;
          $bk429$i = ((($68)) + 12|0);
          HEAP32[$bk429$i>>2] = $add$ptr$i169;
          HEAP32[$fd416$i>>2] = $add$ptr$i169;
          $fd431$i = ((($add$ptr$i169)) + 8|0);
          HEAP32[$fd431$i>>2] = $68;
          $bk432$i = ((($add$ptr$i169)) + 12|0);
          HEAP32[$bk432$i>>2] = $T$0$i;
          $parent433$i = ((($add$ptr$i169)) + 24|0);
          HEAP32[$parent433$i>>2] = 0;
          break;
         }
        }
       } while(0);
       $add$ptr441$i = ((($v$4$lcssa$i)) + 8|0);
       $retval$0 = $add$ptr441$i;
       STACKTOP = sp;return ($retval$0|0);
      } else {
       $nb$0 = $and145;
      }
     }
    }
   }
  }
 } while(0);
 $69 = HEAP32[(32896)>>2]|0;
 $cmp156 = ($69>>>0)<($nb$0>>>0);
 if (!($cmp156)) {
  $sub160 = (($69) - ($nb$0))|0;
  $70 = HEAP32[(32908)>>2]|0;
  $cmp162 = ($sub160>>>0)>(15);
  if ($cmp162) {
   $add$ptr166 = (($70) + ($nb$0)|0);
   HEAP32[(32908)>>2] = $add$ptr166;
   HEAP32[(32896)>>2] = $sub160;
   $or167 = $sub160 | 1;
   $head168 = ((($add$ptr166)) + 4|0);
   HEAP32[$head168>>2] = $or167;
   $add$ptr169 = (($add$ptr166) + ($sub160)|0);
   HEAP32[$add$ptr169>>2] = $sub160;
   $or172 = $nb$0 | 3;
   $head173 = ((($70)) + 4|0);
   HEAP32[$head173>>2] = $or172;
  } else {
   HEAP32[(32896)>>2] = 0;
   HEAP32[(32908)>>2] = 0;
   $or176 = $69 | 3;
   $head177 = ((($70)) + 4|0);
   HEAP32[$head177>>2] = $or176;
   $add$ptr178 = (($70) + ($69)|0);
   $head179 = ((($add$ptr178)) + 4|0);
   $71 = HEAP32[$head179>>2]|0;
   $or180 = $71 | 1;
   HEAP32[$head179>>2] = $or180;
  }
  $add$ptr182 = ((($70)) + 8|0);
  $retval$0 = $add$ptr182;
  STACKTOP = sp;return ($retval$0|0);
 }
 $72 = HEAP32[(32900)>>2]|0;
 $cmp186 = ($72>>>0)>($nb$0>>>0);
 if ($cmp186) {
  $sub190 = (($72) - ($nb$0))|0;
  HEAP32[(32900)>>2] = $sub190;
  $73 = HEAP32[(32912)>>2]|0;
  $add$ptr193 = (($73) + ($nb$0)|0);
  HEAP32[(32912)>>2] = $add$ptr193;
  $or194 = $sub190 | 1;
  $head195 = ((($add$ptr193)) + 4|0);
  HEAP32[$head195>>2] = $or194;
  $or197 = $nb$0 | 3;
  $head198 = ((($73)) + 4|0);
  HEAP32[$head198>>2] = $or197;
  $add$ptr199 = ((($73)) + 8|0);
  $retval$0 = $add$ptr199;
  STACKTOP = sp;return ($retval$0|0);
 }
 $74 = HEAP32[8340]|0;
 $cmp$i = ($74|0)==(0);
 if ($cmp$i) {
  HEAP32[(33368)>>2] = 4096;
  HEAP32[(33364)>>2] = 4096;
  HEAP32[(33372)>>2] = -1;
  HEAP32[(33376)>>2] = -1;
  HEAP32[(33380)>>2] = 0;
  HEAP32[(33332)>>2] = 0;
  $75 = $magic$i$i;
  $xor$i$i = $75 & -16;
  $and6$i$i = $xor$i$i ^ 1431655768;
  HEAP32[$magic$i$i>>2] = $and6$i$i;
  HEAP32[8340] = $and6$i$i;
  $76 = 4096;
 } else {
  $$pre$i133 = HEAP32[(33368)>>2]|0;
  $76 = $$pre$i133;
 }
 $add$i134 = (($nb$0) + 48)|0;
 $sub$i135 = (($nb$0) + 47)|0;
 $add9$i = (($76) + ($sub$i135))|0;
 $neg$i136 = (0 - ($76))|0;
 $and11$i = $add9$i & $neg$i136;
 $cmp12$i = ($and11$i>>>0)>($nb$0>>>0);
 if (!($cmp12$i)) {
  $retval$0 = 0;
  STACKTOP = sp;return ($retval$0|0);
 }
 $77 = HEAP32[(33328)>>2]|0;
 $cmp15$i = ($77|0)==(0);
 if (!($cmp15$i)) {
  $78 = HEAP32[(33320)>>2]|0;
  $add17$i = (($78) + ($and11$i))|0;
  $cmp19$i = ($add17$i>>>0)<=($78>>>0);
  $cmp21$i = ($add17$i>>>0)>($77>>>0);
  $or$cond1$i = $cmp19$i | $cmp21$i;
  if ($or$cond1$i) {
   $retval$0 = 0;
   STACKTOP = sp;return ($retval$0|0);
  }
 }
 $79 = HEAP32[(33332)>>2]|0;
 $and29$i = $79 & 4;
 $tobool30$i = ($and29$i|0)==(0);
 L167: do {
  if ($tobool30$i) {
   $80 = HEAP32[(32912)>>2]|0;
   $cmp32$i137 = ($80|0)==(0|0);
   L169: do {
    if ($cmp32$i137) {
     label = 118;
    } else {
     $sp$0$i$i = (33336);
     while(1) {
      $81 = HEAP32[$sp$0$i$i>>2]|0;
      $cmp$i52$i = ($81>>>0)>($80>>>0);
      if (!($cmp$i52$i)) {
       $size$i$i = ((($sp$0$i$i)) + 4|0);
       $82 = HEAP32[$size$i$i>>2]|0;
       $add$ptr$i54$i = (($81) + ($82)|0);
       $cmp2$i$i = ($add$ptr$i54$i>>>0)>($80>>>0);
       if ($cmp2$i$i) {
        break;
       }
      }
      $next$i$i = ((($sp$0$i$i)) + 8|0);
      $83 = HEAP32[$next$i$i>>2]|0;
      $cmp3$i$i = ($83|0)==(0|0);
      if ($cmp3$i$i) {
       label = 118;
       break L169;
      } else {
       $sp$0$i$i = $83;
      }
     }
     $add77$i = (($add9$i) - ($72))|0;
     $and80$i = $add77$i & $neg$i136;
     $cmp81$i = ($and80$i>>>0)<(2147483647);
     if ($cmp81$i) {
      $call83$i = (_sbrk(($and80$i|0))|0);
      $88 = HEAP32[$sp$0$i$i>>2]|0;
      $89 = HEAP32[$size$i$i>>2]|0;
      $add$ptr$i140 = (($88) + ($89)|0);
      $cmp85$i = ($call83$i|0)==($add$ptr$i140|0);
      if ($cmp85$i) {
       $cmp89$i = ($call83$i|0)==((-1)|0);
       if ($cmp89$i) {
        $tsize$2617179$i = $and80$i;
       } else {
        $tbase$792$i = $call83$i;$tsize$791$i = $and80$i;
        label = 135;
        break L167;
       }
      } else {
       $br$2$ph$i = $call83$i;$ssize$2$ph$i = $and80$i;
       label = 126;
      }
     } else {
      $tsize$2617179$i = 0;
     }
    }
   } while(0);
   do {
    if ((label|0) == 118) {
     $call37$i = (_sbrk(0)|0);
     $cmp38$i = ($call37$i|0)==((-1)|0);
     if ($cmp38$i) {
      $tsize$2617179$i = 0;
     } else {
      $84 = $call37$i;
      $85 = HEAP32[(33364)>>2]|0;
      $sub41$i = (($85) + -1)|0;
      $and42$i = $sub41$i & $84;
      $cmp43$i = ($and42$i|0)==(0);
      $add46$i = (($sub41$i) + ($84))|0;
      $neg48$i = (0 - ($85))|0;
      $and49$i = $add46$i & $neg48$i;
      $sub50$i = (($and49$i) - ($84))|0;
      $add51$i = $cmp43$i ? 0 : $sub50$i;
      $and11$add51$i = (($add51$i) + ($and11$i))|0;
      $86 = HEAP32[(33320)>>2]|0;
      $add54$i = (($and11$add51$i) + ($86))|0;
      $cmp55$i = ($and11$add51$i>>>0)>($nb$0>>>0);
      $cmp57$i = ($and11$add51$i>>>0)<(2147483647);
      $or$cond$i = $cmp55$i & $cmp57$i;
      if ($or$cond$i) {
       $87 = HEAP32[(33328)>>2]|0;
       $cmp60$i = ($87|0)==(0);
       if (!($cmp60$i)) {
        $cmp63$i = ($add54$i>>>0)<=($86>>>0);
        $cmp66$i139 = ($add54$i>>>0)>($87>>>0);
        $or$cond2$i = $cmp63$i | $cmp66$i139;
        if ($or$cond2$i) {
         $tsize$2617179$i = 0;
         break;
        }
       }
       $call68$i = (_sbrk(($and11$add51$i|0))|0);
       $cmp69$i = ($call68$i|0)==($call37$i|0);
       if ($cmp69$i) {
        $tbase$792$i = $call37$i;$tsize$791$i = $and11$add51$i;
        label = 135;
        break L167;
       } else {
        $br$2$ph$i = $call68$i;$ssize$2$ph$i = $and11$add51$i;
        label = 126;
       }
      } else {
       $tsize$2617179$i = 0;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 126) {
     $sub112$i = (0 - ($ssize$2$ph$i))|0;
     $cmp91$i = ($br$2$ph$i|0)!=((-1)|0);
     $cmp93$i = ($ssize$2$ph$i>>>0)<(2147483647);
     $or$cond5$i = $cmp93$i & $cmp91$i;
     $cmp96$i = ($add$i134>>>0)>($ssize$2$ph$i>>>0);
     $or$cond3$i = $cmp96$i & $or$cond5$i;
     if (!($or$cond3$i)) {
      $cmp118$i = ($br$2$ph$i|0)==((-1)|0);
      if ($cmp118$i) {
       $tsize$2617179$i = 0;
       break;
      } else {
       $tbase$792$i = $br$2$ph$i;$tsize$791$i = $ssize$2$ph$i;
       label = 135;
       break L167;
      }
     }
     $90 = HEAP32[(33368)>>2]|0;
     $sub99$i = (($sub$i135) - ($ssize$2$ph$i))|0;
     $add101$i = (($sub99$i) + ($90))|0;
     $neg103$i = (0 - ($90))|0;
     $and104$i = $add101$i & $neg103$i;
     $cmp105$i = ($and104$i>>>0)<(2147483647);
     if (!($cmp105$i)) {
      $tbase$792$i = $br$2$ph$i;$tsize$791$i = $ssize$2$ph$i;
      label = 135;
      break L167;
     }
     $call107$i = (_sbrk(($and104$i|0))|0);
     $cmp108$i = ($call107$i|0)==((-1)|0);
     if ($cmp108$i) {
      (_sbrk(($sub112$i|0))|0);
      $tsize$2617179$i = 0;
      break;
     } else {
      $add110$i = (($and104$i) + ($ssize$2$ph$i))|0;
      $tbase$792$i = $br$2$ph$i;$tsize$791$i = $add110$i;
      label = 135;
      break L167;
     }
    }
   } while(0);
   $91 = HEAP32[(33332)>>2]|0;
   $or$i = $91 | 4;
   HEAP32[(33332)>>2] = $or$i;
   $tsize$4$i = $tsize$2617179$i;
   label = 133;
  } else {
   $tsize$4$i = 0;
   label = 133;
  }
 } while(0);
 if ((label|0) == 133) {
  $cmp127$i = ($and11$i>>>0)<(2147483647);
  if ($cmp127$i) {
   $call131$i = (_sbrk(($and11$i|0))|0);
   $call132$i = (_sbrk(0)|0);
   $cmp133$i = ($call131$i|0)!=((-1)|0);
   $cmp135$i = ($call132$i|0)!=((-1)|0);
   $or$cond4$i = $cmp133$i & $cmp135$i;
   $cmp137$i = ($call131$i>>>0)<($call132$i>>>0);
   $or$cond7$i = $cmp137$i & $or$cond4$i;
   $sub$ptr$lhs$cast$i = $call132$i;
   $sub$ptr$rhs$cast$i = $call131$i;
   $sub$ptr$sub$i = (($sub$ptr$lhs$cast$i) - ($sub$ptr$rhs$cast$i))|0;
   $add140$i = (($nb$0) + 40)|0;
   $cmp141$i = ($sub$ptr$sub$i>>>0)>($add140$i>>>0);
   $sub$ptr$sub$tsize$4$i = $cmp141$i ? $sub$ptr$sub$i : $tsize$4$i;
   $or$cond7$not$i = $or$cond7$i ^ 1;
   $cmp14795$i = ($call131$i|0)==((-1)|0);
   $not$cmp141$i = $cmp141$i ^ 1;
   $cmp147$i = $cmp14795$i | $not$cmp141$i;
   $or$cond93$i = $cmp147$i | $or$cond7$not$i;
   if (!($or$cond93$i)) {
    $tbase$792$i = $call131$i;$tsize$791$i = $sub$ptr$sub$tsize$4$i;
    label = 135;
   }
  }
 }
 if ((label|0) == 135) {
  $92 = HEAP32[(33320)>>2]|0;
  $add150$i = (($92) + ($tsize$791$i))|0;
  HEAP32[(33320)>>2] = $add150$i;
  $93 = HEAP32[(33324)>>2]|0;
  $cmp151$i = ($add150$i>>>0)>($93>>>0);
  if ($cmp151$i) {
   HEAP32[(33324)>>2] = $add150$i;
  }
  $94 = HEAP32[(32912)>>2]|0;
  $cmp157$i = ($94|0)==(0|0);
  do {
   if ($cmp157$i) {
    $95 = HEAP32[(32904)>>2]|0;
    $cmp159$i = ($95|0)==(0|0);
    $cmp162$i = ($tbase$792$i>>>0)<($95>>>0);
    $or$cond8$i = $cmp159$i | $cmp162$i;
    if ($or$cond8$i) {
     HEAP32[(32904)>>2] = $tbase$792$i;
    }
    HEAP32[(33336)>>2] = $tbase$792$i;
    HEAP32[(33340)>>2] = $tsize$791$i;
    HEAP32[(33348)>>2] = 0;
    $96 = HEAP32[8340]|0;
    HEAP32[(32924)>>2] = $96;
    HEAP32[(32920)>>2] = -1;
    $i$01$i$i = 0;
    while(1) {
     $shl$i49$i = $i$01$i$i << 1;
     $arrayidx$i50$i = (32928 + ($shl$i49$i<<2)|0);
     $97 = ((($arrayidx$i50$i)) + 12|0);
     HEAP32[$97>>2] = $arrayidx$i50$i;
     $98 = ((($arrayidx$i50$i)) + 8|0);
     HEAP32[$98>>2] = $arrayidx$i50$i;
     $inc$i$i = (($i$01$i$i) + 1)|0;
     $exitcond$i$i = ($inc$i$i|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$01$i$i = $inc$i$i;
     }
    }
    $sub172$i = (($tsize$791$i) + -40)|0;
    $add$ptr$i38$i = ((($tbase$792$i)) + 8|0);
    $99 = $add$ptr$i38$i;
    $and$i39$i = $99 & 7;
    $cmp$i40$i = ($and$i39$i|0)==(0);
    $100 = (0 - ($99))|0;
    $and3$i41$i = $100 & 7;
    $cond$i42$i = $cmp$i40$i ? 0 : $and3$i41$i;
    $add$ptr4$i43$i = (($tbase$792$i) + ($cond$i42$i)|0);
    $sub5$i44$i = (($sub172$i) - ($cond$i42$i))|0;
    HEAP32[(32912)>>2] = $add$ptr4$i43$i;
    HEAP32[(32900)>>2] = $sub5$i44$i;
    $or$i45$i = $sub5$i44$i | 1;
    $head$i46$i = ((($add$ptr4$i43$i)) + 4|0);
    HEAP32[$head$i46$i>>2] = $or$i45$i;
    $add$ptr6$i47$i = (($add$ptr4$i43$i) + ($sub5$i44$i)|0);
    $head7$i48$i = ((($add$ptr6$i47$i)) + 4|0);
    HEAP32[$head7$i48$i>>2] = 40;
    $101 = HEAP32[(33376)>>2]|0;
    HEAP32[(32916)>>2] = $101;
   } else {
    $sp$0104$i = (33336);
    while(1) {
     $102 = HEAP32[$sp$0104$i>>2]|0;
     $size188$i = ((($sp$0104$i)) + 4|0);
     $103 = HEAP32[$size188$i>>2]|0;
     $add$ptr189$i = (($102) + ($103)|0);
     $cmp190$i = ($tbase$792$i|0)==($add$ptr189$i|0);
     if ($cmp190$i) {
      label = 145;
      break;
     }
     $next$i = ((($sp$0104$i)) + 8|0);
     $104 = HEAP32[$next$i>>2]|0;
     $cmp186$i = ($104|0)==(0|0);
     if ($cmp186$i) {
      break;
     } else {
      $sp$0104$i = $104;
     }
    }
    if ((label|0) == 145) {
     $sflags193$i = ((($sp$0104$i)) + 12|0);
     $105 = HEAP32[$sflags193$i>>2]|0;
     $and194$i = $105 & 8;
     $tobool195$i = ($and194$i|0)==(0);
     if ($tobool195$i) {
      $cmp203$i = ($94>>>0)>=($102>>>0);
      $cmp209$i = ($94>>>0)<($tbase$792$i>>>0);
      $or$cond94$i = $cmp209$i & $cmp203$i;
      if ($or$cond94$i) {
       $add212$i = (($103) + ($tsize$791$i))|0;
       HEAP32[$size188$i>>2] = $add212$i;
       $106 = HEAP32[(32900)>>2]|0;
       $add$ptr$i31$i = ((($94)) + 8|0);
       $107 = $add$ptr$i31$i;
       $and$i32$i = $107 & 7;
       $cmp$i33$i = ($and$i32$i|0)==(0);
       $108 = (0 - ($107))|0;
       $and3$i34$i = $108 & 7;
       $cond$i35$i = $cmp$i33$i ? 0 : $and3$i34$i;
       $add$ptr4$i36$i = (($94) + ($cond$i35$i)|0);
       $add215$i = (($tsize$791$i) - ($cond$i35$i))|0;
       $sub5$i$i = (($106) + ($add215$i))|0;
       HEAP32[(32912)>>2] = $add$ptr4$i36$i;
       HEAP32[(32900)>>2] = $sub5$i$i;
       $or$i$i = $sub5$i$i | 1;
       $head$i37$i = ((($add$ptr4$i36$i)) + 4|0);
       HEAP32[$head$i37$i>>2] = $or$i$i;
       $add$ptr6$i$i = (($add$ptr4$i36$i) + ($sub5$i$i)|0);
       $head7$i$i = ((($add$ptr6$i$i)) + 4|0);
       HEAP32[$head7$i$i>>2] = 40;
       $109 = HEAP32[(33376)>>2]|0;
       HEAP32[(32916)>>2] = $109;
       break;
      }
     }
    }
    $110 = HEAP32[(32904)>>2]|0;
    $cmp218$i = ($tbase$792$i>>>0)<($110>>>0);
    if ($cmp218$i) {
     HEAP32[(32904)>>2] = $tbase$792$i;
    }
    $add$ptr227$i = (($tbase$792$i) + ($tsize$791$i)|0);
    $sp$1103$i = (33336);
    while(1) {
     $111 = HEAP32[$sp$1103$i>>2]|0;
     $cmp228$i = ($111|0)==($add$ptr227$i|0);
     if ($cmp228$i) {
      label = 153;
      break;
     }
     $next231$i = ((($sp$1103$i)) + 8|0);
     $112 = HEAP32[$next231$i>>2]|0;
     $cmp224$i = ($112|0)==(0|0);
     if ($cmp224$i) {
      break;
     } else {
      $sp$1103$i = $112;
     }
    }
    if ((label|0) == 153) {
     $sflags235$i = ((($sp$1103$i)) + 12|0);
     $113 = HEAP32[$sflags235$i>>2]|0;
     $and236$i = $113 & 8;
     $tobool237$i = ($and236$i|0)==(0);
     if ($tobool237$i) {
      HEAP32[$sp$1103$i>>2] = $tbase$792$i;
      $size245$i = ((($sp$1103$i)) + 4|0);
      $114 = HEAP32[$size245$i>>2]|0;
      $add246$i = (($114) + ($tsize$791$i))|0;
      HEAP32[$size245$i>>2] = $add246$i;
      $add$ptr$i$i = ((($tbase$792$i)) + 8|0);
      $115 = $add$ptr$i$i;
      $and$i11$i = $115 & 7;
      $cmp$i12$i = ($and$i11$i|0)==(0);
      $116 = (0 - ($115))|0;
      $and3$i$i = $116 & 7;
      $cond$i13$i = $cmp$i12$i ? 0 : $and3$i$i;
      $add$ptr4$i$i = (($tbase$792$i) + ($cond$i13$i)|0);
      $add$ptr5$i$i = ((($add$ptr227$i)) + 8|0);
      $117 = $add$ptr5$i$i;
      $and6$i14$i = $117 & 7;
      $cmp7$i$i = ($and6$i14$i|0)==(0);
      $118 = (0 - ($117))|0;
      $and13$i$i = $118 & 7;
      $cond15$i$i = $cmp7$i$i ? 0 : $and13$i$i;
      $add$ptr16$i$i = (($add$ptr227$i) + ($cond15$i$i)|0);
      $sub$ptr$lhs$cast$i15$i = $add$ptr16$i$i;
      $sub$ptr$rhs$cast$i16$i = $add$ptr4$i$i;
      $sub$ptr$sub$i17$i = (($sub$ptr$lhs$cast$i15$i) - ($sub$ptr$rhs$cast$i16$i))|0;
      $add$ptr17$i$i = (($add$ptr4$i$i) + ($nb$0)|0);
      $sub18$i$i = (($sub$ptr$sub$i17$i) - ($nb$0))|0;
      $or19$i$i = $nb$0 | 3;
      $head$i18$i = ((($add$ptr4$i$i)) + 4|0);
      HEAP32[$head$i18$i>>2] = $or19$i$i;
      $cmp20$i$i = ($add$ptr16$i$i|0)==($94|0);
      do {
       if ($cmp20$i$i) {
        $119 = HEAP32[(32900)>>2]|0;
        $add$i$i = (($119) + ($sub18$i$i))|0;
        HEAP32[(32900)>>2] = $add$i$i;
        HEAP32[(32912)>>2] = $add$ptr17$i$i;
        $or22$i$i = $add$i$i | 1;
        $head23$i$i = ((($add$ptr17$i$i)) + 4|0);
        HEAP32[$head23$i$i>>2] = $or22$i$i;
       } else {
        $120 = HEAP32[(32908)>>2]|0;
        $cmp24$i$i = ($add$ptr16$i$i|0)==($120|0);
        if ($cmp24$i$i) {
         $121 = HEAP32[(32896)>>2]|0;
         $add26$i$i = (($121) + ($sub18$i$i))|0;
         HEAP32[(32896)>>2] = $add26$i$i;
         HEAP32[(32908)>>2] = $add$ptr17$i$i;
         $or28$i$i = $add26$i$i | 1;
         $head29$i$i = ((($add$ptr17$i$i)) + 4|0);
         HEAP32[$head29$i$i>>2] = $or28$i$i;
         $add$ptr30$i$i = (($add$ptr17$i$i) + ($add26$i$i)|0);
         HEAP32[$add$ptr30$i$i>>2] = $add26$i$i;
         break;
        }
        $head32$i$i = ((($add$ptr16$i$i)) + 4|0);
        $122 = HEAP32[$head32$i$i>>2]|0;
        $and33$i$i = $122 & 3;
        $cmp34$i$i = ($and33$i$i|0)==(1);
        if ($cmp34$i$i) {
         $and37$i$i = $122 & -8;
         $shr$i21$i = $122 >>> 3;
         $cmp38$i$i = ($122>>>0)<(256);
         L237: do {
          if ($cmp38$i$i) {
           $fd$i$i = ((($add$ptr16$i$i)) + 8|0);
           $123 = HEAP32[$fd$i$i>>2]|0;
           $bk$i22$i = ((($add$ptr16$i$i)) + 12|0);
           $124 = HEAP32[$bk$i22$i>>2]|0;
           $cmp46$i$i = ($124|0)==($123|0);
           if ($cmp46$i$i) {
            $shl48$i$i = 1 << $shr$i21$i;
            $neg$i$i = $shl48$i$i ^ -1;
            $125 = HEAP32[8222]|0;
            $and49$i$i = $125 & $neg$i$i;
            HEAP32[8222] = $and49$i$i;
            break;
           } else {
            $bk67$i$i = ((($123)) + 12|0);
            HEAP32[$bk67$i$i>>2] = $124;
            $fd68$i$i = ((($124)) + 8|0);
            HEAP32[$fd68$i$i>>2] = $123;
            break;
           }
          } else {
           $parent$i23$i = ((($add$ptr16$i$i)) + 24|0);
           $126 = HEAP32[$parent$i23$i>>2]|0;
           $bk74$i$i = ((($add$ptr16$i$i)) + 12|0);
           $127 = HEAP32[$bk74$i$i>>2]|0;
           $cmp75$i$i = ($127|0)==($add$ptr16$i$i|0);
           do {
            if ($cmp75$i$i) {
             $child$i$i = ((($add$ptr16$i$i)) + 16|0);
             $arrayidx96$i$i = ((($child$i$i)) + 4|0);
             $129 = HEAP32[$arrayidx96$i$i>>2]|0;
             $cmp97$i$i = ($129|0)==(0|0);
             if ($cmp97$i$i) {
              $130 = HEAP32[$child$i$i>>2]|0;
              $cmp100$i$i = ($130|0)==(0|0);
              if ($cmp100$i$i) {
               $R$3$i$i = 0;
               break;
              } else {
               $R$1$i$i = $130;$RP$1$i$i = $child$i$i;
              }
             } else {
              $R$1$i$i = $129;$RP$1$i$i = $arrayidx96$i$i;
             }
             while(1) {
              $arrayidx103$i$i = ((($R$1$i$i)) + 20|0);
              $131 = HEAP32[$arrayidx103$i$i>>2]|0;
              $cmp104$i$i = ($131|0)==(0|0);
              if (!($cmp104$i$i)) {
               $R$1$i$i = $131;$RP$1$i$i = $arrayidx103$i$i;
               continue;
              }
              $arrayidx107$i$i = ((($R$1$i$i)) + 16|0);
              $132 = HEAP32[$arrayidx107$i$i>>2]|0;
              $cmp108$i$i = ($132|0)==(0|0);
              if ($cmp108$i$i) {
               break;
              } else {
               $R$1$i$i = $132;$RP$1$i$i = $arrayidx107$i$i;
              }
             }
             HEAP32[$RP$1$i$i>>2] = 0;
             $R$3$i$i = $R$1$i$i;
            } else {
             $fd78$i$i = ((($add$ptr16$i$i)) + 8|0);
             $128 = HEAP32[$fd78$i$i>>2]|0;
             $bk91$i$i = ((($128)) + 12|0);
             HEAP32[$bk91$i$i>>2] = $127;
             $fd92$i$i = ((($127)) + 8|0);
             HEAP32[$fd92$i$i>>2] = $128;
             $R$3$i$i = $127;
            }
           } while(0);
           $cmp120$i24$i = ($126|0)==(0|0);
           if ($cmp120$i24$i) {
            break;
           }
           $index$i25$i = ((($add$ptr16$i$i)) + 28|0);
           $133 = HEAP32[$index$i25$i>>2]|0;
           $arrayidx123$i$i = (33192 + ($133<<2)|0);
           $134 = HEAP32[$arrayidx123$i$i>>2]|0;
           $cmp124$i$i = ($add$ptr16$i$i|0)==($134|0);
           do {
            if ($cmp124$i$i) {
             HEAP32[$arrayidx123$i$i>>2] = $R$3$i$i;
             $cond1$i$i = ($R$3$i$i|0)==(0|0);
             if (!($cond1$i$i)) {
              break;
             }
             $shl131$i$i = 1 << $133;
             $neg132$i$i = $shl131$i$i ^ -1;
             $135 = HEAP32[(32892)>>2]|0;
             $and133$i$i = $135 & $neg132$i$i;
             HEAP32[(32892)>>2] = $and133$i$i;
             break L237;
            } else {
             $arrayidx143$i$i = ((($126)) + 16|0);
             $136 = HEAP32[$arrayidx143$i$i>>2]|0;
             $not$cmp144$i$i = ($136|0)!=($add$ptr16$i$i|0);
             $$sink$i$i = $not$cmp144$i$i&1;
             $arrayidx151$i$i = (((($126)) + 16|0) + ($$sink$i$i<<2)|0);
             HEAP32[$arrayidx151$i$i>>2] = $R$3$i$i;
             $cmp156$i$i = ($R$3$i$i|0)==(0|0);
             if ($cmp156$i$i) {
              break L237;
             }
            }
           } while(0);
           $parent165$i$i = ((($R$3$i$i)) + 24|0);
           HEAP32[$parent165$i$i>>2] = $126;
           $child166$i$i = ((($add$ptr16$i$i)) + 16|0);
           $137 = HEAP32[$child166$i$i>>2]|0;
           $cmp168$i$i = ($137|0)==(0|0);
           if (!($cmp168$i$i)) {
            $arrayidx178$i$i = ((($R$3$i$i)) + 16|0);
            HEAP32[$arrayidx178$i$i>>2] = $137;
            $parent179$i$i = ((($137)) + 24|0);
            HEAP32[$parent179$i$i>>2] = $R$3$i$i;
           }
           $arrayidx184$i$i = ((($child166$i$i)) + 4|0);
           $138 = HEAP32[$arrayidx184$i$i>>2]|0;
           $cmp185$i$i = ($138|0)==(0|0);
           if ($cmp185$i$i) {
            break;
           }
           $arrayidx195$i$i = ((($R$3$i$i)) + 20|0);
           HEAP32[$arrayidx195$i$i>>2] = $138;
           $parent196$i$i = ((($138)) + 24|0);
           HEAP32[$parent196$i$i>>2] = $R$3$i$i;
          }
         } while(0);
         $add$ptr205$i$i = (($add$ptr16$i$i) + ($and37$i$i)|0);
         $add206$i$i = (($and37$i$i) + ($sub18$i$i))|0;
         $oldfirst$0$i$i = $add$ptr205$i$i;$qsize$0$i$i = $add206$i$i;
        } else {
         $oldfirst$0$i$i = $add$ptr16$i$i;$qsize$0$i$i = $sub18$i$i;
        }
        $head208$i$i = ((($oldfirst$0$i$i)) + 4|0);
        $139 = HEAP32[$head208$i$i>>2]|0;
        $and209$i$i = $139 & -2;
        HEAP32[$head208$i$i>>2] = $and209$i$i;
        $or210$i$i = $qsize$0$i$i | 1;
        $head211$i$i = ((($add$ptr17$i$i)) + 4|0);
        HEAP32[$head211$i$i>>2] = $or210$i$i;
        $add$ptr212$i$i = (($add$ptr17$i$i) + ($qsize$0$i$i)|0);
        HEAP32[$add$ptr212$i$i>>2] = $qsize$0$i$i;
        $shr214$i$i = $qsize$0$i$i >>> 3;
        $cmp215$i$i = ($qsize$0$i$i>>>0)<(256);
        if ($cmp215$i$i) {
         $shl222$i$i = $shr214$i$i << 1;
         $arrayidx223$i$i = (32928 + ($shl222$i$i<<2)|0);
         $140 = HEAP32[8222]|0;
         $shl226$i$i = 1 << $shr214$i$i;
         $and227$i$i = $140 & $shl226$i$i;
         $tobool228$i$i = ($and227$i$i|0)==(0);
         if ($tobool228$i$i) {
          $or232$i$i = $140 | $shl226$i$i;
          HEAP32[8222] = $or232$i$i;
          $$pre$i27$i = ((($arrayidx223$i$i)) + 8|0);
          $$pre$phi$i28$iZ2D = $$pre$i27$i;$F224$0$i$i = $arrayidx223$i$i;
         } else {
          $141 = ((($arrayidx223$i$i)) + 8|0);
          $142 = HEAP32[$141>>2]|0;
          $$pre$phi$i28$iZ2D = $141;$F224$0$i$i = $142;
         }
         HEAP32[$$pre$phi$i28$iZ2D>>2] = $add$ptr17$i$i;
         $bk246$i$i = ((($F224$0$i$i)) + 12|0);
         HEAP32[$bk246$i$i>>2] = $add$ptr17$i$i;
         $fd247$i$i = ((($add$ptr17$i$i)) + 8|0);
         HEAP32[$fd247$i$i>>2] = $F224$0$i$i;
         $bk248$i$i = ((($add$ptr17$i$i)) + 12|0);
         HEAP32[$bk248$i$i>>2] = $arrayidx223$i$i;
         break;
        }
        $shr253$i$i = $qsize$0$i$i >>> 8;
        $cmp254$i$i = ($shr253$i$i|0)==(0);
        do {
         if ($cmp254$i$i) {
          $I252$0$i$i = 0;
         } else {
          $cmp258$i$i = ($qsize$0$i$i>>>0)>(16777215);
          if ($cmp258$i$i) {
           $I252$0$i$i = 31;
           break;
          }
          $sub262$i$i = (($shr253$i$i) + 1048320)|0;
          $shr263$i$i = $sub262$i$i >>> 16;
          $and264$i$i = $shr263$i$i & 8;
          $shl265$i$i = $shr253$i$i << $and264$i$i;
          $sub266$i$i = (($shl265$i$i) + 520192)|0;
          $shr267$i$i = $sub266$i$i >>> 16;
          $and268$i$i = $shr267$i$i & 4;
          $add269$i$i = $and268$i$i | $and264$i$i;
          $shl270$i$i = $shl265$i$i << $and268$i$i;
          $sub271$i$i = (($shl270$i$i) + 245760)|0;
          $shr272$i$i = $sub271$i$i >>> 16;
          $and273$i$i = $shr272$i$i & 2;
          $add274$i$i = $add269$i$i | $and273$i$i;
          $sub275$i$i = (14 - ($add274$i$i))|0;
          $shl276$i$i = $shl270$i$i << $and273$i$i;
          $shr277$i$i = $shl276$i$i >>> 15;
          $add278$i$i = (($sub275$i$i) + ($shr277$i$i))|0;
          $shl279$i$i = $add278$i$i << 1;
          $add280$i$i = (($add278$i$i) + 7)|0;
          $shr281$i$i = $qsize$0$i$i >>> $add280$i$i;
          $and282$i$i = $shr281$i$i & 1;
          $add283$i$i = $and282$i$i | $shl279$i$i;
          $I252$0$i$i = $add283$i$i;
         }
        } while(0);
        $arrayidx287$i$i = (33192 + ($I252$0$i$i<<2)|0);
        $index288$i$i = ((($add$ptr17$i$i)) + 28|0);
        HEAP32[$index288$i$i>>2] = $I252$0$i$i;
        $child289$i$i = ((($add$ptr17$i$i)) + 16|0);
        $arrayidx290$i$i = ((($child289$i$i)) + 4|0);
        HEAP32[$arrayidx290$i$i>>2] = 0;
        HEAP32[$child289$i$i>>2] = 0;
        $143 = HEAP32[(32892)>>2]|0;
        $shl294$i$i = 1 << $I252$0$i$i;
        $and295$i$i = $143 & $shl294$i$i;
        $tobool296$i$i = ($and295$i$i|0)==(0);
        if ($tobool296$i$i) {
         $or300$i$i = $143 | $shl294$i$i;
         HEAP32[(32892)>>2] = $or300$i$i;
         HEAP32[$arrayidx287$i$i>>2] = $add$ptr17$i$i;
         $parent301$i$i = ((($add$ptr17$i$i)) + 24|0);
         HEAP32[$parent301$i$i>>2] = $arrayidx287$i$i;
         $bk302$i$i = ((($add$ptr17$i$i)) + 12|0);
         HEAP32[$bk302$i$i>>2] = $add$ptr17$i$i;
         $fd303$i$i = ((($add$ptr17$i$i)) + 8|0);
         HEAP32[$fd303$i$i>>2] = $add$ptr17$i$i;
         break;
        }
        $144 = HEAP32[$arrayidx287$i$i>>2]|0;
        $cmp306$i$i = ($I252$0$i$i|0)==(31);
        $shr310$i$i = $I252$0$i$i >>> 1;
        $sub313$i$i = (25 - ($shr310$i$i))|0;
        $cond315$i$i = $cmp306$i$i ? 0 : $sub313$i$i;
        $shl316$i$i = $qsize$0$i$i << $cond315$i$i;
        $K305$0$i$i = $shl316$i$i;$T$0$i29$i = $144;
        while(1) {
         $head317$i$i = ((($T$0$i29$i)) + 4|0);
         $145 = HEAP32[$head317$i$i>>2]|0;
         $and318$i$i = $145 & -8;
         $cmp319$i$i = ($and318$i$i|0)==($qsize$0$i$i|0);
         if ($cmp319$i$i) {
          label = 194;
          break;
         }
         $shr323$i$i = $K305$0$i$i >>> 31;
         $arrayidx325$i$i = (((($T$0$i29$i)) + 16|0) + ($shr323$i$i<<2)|0);
         $shl326$i$i = $K305$0$i$i << 1;
         $146 = HEAP32[$arrayidx325$i$i>>2]|0;
         $cmp327$i$i = ($146|0)==(0|0);
         if ($cmp327$i$i) {
          label = 193;
          break;
         } else {
          $K305$0$i$i = $shl326$i$i;$T$0$i29$i = $146;
         }
        }
        if ((label|0) == 193) {
         HEAP32[$arrayidx325$i$i>>2] = $add$ptr17$i$i;
         $parent337$i$i = ((($add$ptr17$i$i)) + 24|0);
         HEAP32[$parent337$i$i>>2] = $T$0$i29$i;
         $bk338$i$i = ((($add$ptr17$i$i)) + 12|0);
         HEAP32[$bk338$i$i>>2] = $add$ptr17$i$i;
         $fd339$i$i = ((($add$ptr17$i$i)) + 8|0);
         HEAP32[$fd339$i$i>>2] = $add$ptr17$i$i;
         break;
        }
        else if ((label|0) == 194) {
         $fd344$i$i = ((($T$0$i29$i)) + 8|0);
         $147 = HEAP32[$fd344$i$i>>2]|0;
         $bk357$i$i = ((($147)) + 12|0);
         HEAP32[$bk357$i$i>>2] = $add$ptr17$i$i;
         HEAP32[$fd344$i$i>>2] = $add$ptr17$i$i;
         $fd359$i$i = ((($add$ptr17$i$i)) + 8|0);
         HEAP32[$fd359$i$i>>2] = $147;
         $bk360$i$i = ((($add$ptr17$i$i)) + 12|0);
         HEAP32[$bk360$i$i>>2] = $T$0$i29$i;
         $parent361$i$i = ((($add$ptr17$i$i)) + 24|0);
         HEAP32[$parent361$i$i>>2] = 0;
         break;
        }
       }
      } while(0);
      $add$ptr369$i$i = ((($add$ptr4$i$i)) + 8|0);
      $retval$0 = $add$ptr369$i$i;
      STACKTOP = sp;return ($retval$0|0);
     }
    }
    $sp$0$i$i$i = (33336);
    while(1) {
     $148 = HEAP32[$sp$0$i$i$i>>2]|0;
     $cmp$i$i$i = ($148>>>0)>($94>>>0);
     if (!($cmp$i$i$i)) {
      $size$i$i$i = ((($sp$0$i$i$i)) + 4|0);
      $149 = HEAP32[$size$i$i$i>>2]|0;
      $add$ptr$i$i$i = (($148) + ($149)|0);
      $cmp2$i$i$i = ($add$ptr$i$i$i>>>0)>($94>>>0);
      if ($cmp2$i$i$i) {
       break;
      }
     }
     $next$i$i$i = ((($sp$0$i$i$i)) + 8|0);
     $150 = HEAP32[$next$i$i$i>>2]|0;
     $sp$0$i$i$i = $150;
    }
    $add$ptr2$i$i = ((($add$ptr$i$i$i)) + -47|0);
    $add$ptr3$i$i = ((($add$ptr2$i$i)) + 8|0);
    $151 = $add$ptr3$i$i;
    $and$i$i = $151 & 7;
    $cmp$i9$i = ($and$i$i|0)==(0);
    $152 = (0 - ($151))|0;
    $and6$i10$i = $152 & 7;
    $cond$i$i = $cmp$i9$i ? 0 : $and6$i10$i;
    $add$ptr7$i$i = (($add$ptr2$i$i) + ($cond$i$i)|0);
    $add$ptr81$i$i = ((($94)) + 16|0);
    $cmp9$i$i = ($add$ptr7$i$i>>>0)<($add$ptr81$i$i>>>0);
    $cond13$i$i = $cmp9$i$i ? $94 : $add$ptr7$i$i;
    $add$ptr14$i$i = ((($cond13$i$i)) + 8|0);
    $add$ptr15$i$i = ((($cond13$i$i)) + 24|0);
    $sub16$i$i = (($tsize$791$i) + -40)|0;
    $add$ptr$i2$i$i = ((($tbase$792$i)) + 8|0);
    $153 = $add$ptr$i2$i$i;
    $and$i$i$i = $153 & 7;
    $cmp$i3$i$i = ($and$i$i$i|0)==(0);
    $154 = (0 - ($153))|0;
    $and3$i$i$i = $154 & 7;
    $cond$i$i$i = $cmp$i3$i$i ? 0 : $and3$i$i$i;
    $add$ptr4$i$i$i = (($tbase$792$i) + ($cond$i$i$i)|0);
    $sub5$i$i$i = (($sub16$i$i) - ($cond$i$i$i))|0;
    HEAP32[(32912)>>2] = $add$ptr4$i$i$i;
    HEAP32[(32900)>>2] = $sub5$i$i$i;
    $or$i$i$i = $sub5$i$i$i | 1;
    $head$i$i$i = ((($add$ptr4$i$i$i)) + 4|0);
    HEAP32[$head$i$i$i>>2] = $or$i$i$i;
    $add$ptr6$i$i$i = (($add$ptr4$i$i$i) + ($sub5$i$i$i)|0);
    $head7$i$i$i = ((($add$ptr6$i$i$i)) + 4|0);
    HEAP32[$head7$i$i$i>>2] = 40;
    $155 = HEAP32[(33376)>>2]|0;
    HEAP32[(32916)>>2] = $155;
    $head$i$i = ((($cond13$i$i)) + 4|0);
    HEAP32[$head$i$i>>2] = 27;
    ;HEAP32[$add$ptr14$i$i>>2]=HEAP32[(33336)>>2]|0;HEAP32[$add$ptr14$i$i+4>>2]=HEAP32[(33336)+4>>2]|0;HEAP32[$add$ptr14$i$i+8>>2]=HEAP32[(33336)+8>>2]|0;HEAP32[$add$ptr14$i$i+12>>2]=HEAP32[(33336)+12>>2]|0;
    HEAP32[(33336)>>2] = $tbase$792$i;
    HEAP32[(33340)>>2] = $tsize$791$i;
    HEAP32[(33348)>>2] = 0;
    HEAP32[(33344)>>2] = $add$ptr14$i$i;
    $156 = $add$ptr15$i$i;
    while(1) {
     $add$ptr24$i$i = ((($156)) + 4|0);
     HEAP32[$add$ptr24$i$i>>2] = 7;
     $head26$i$i = ((($156)) + 8|0);
     $cmp27$i$i = ($head26$i$i>>>0)<($add$ptr$i$i$i>>>0);
     if ($cmp27$i$i) {
      $156 = $add$ptr24$i$i;
     } else {
      break;
     }
    }
    $cmp28$i$i = ($cond13$i$i|0)==($94|0);
    if (!($cmp28$i$i)) {
     $sub$ptr$lhs$cast$i$i = $cond13$i$i;
     $sub$ptr$rhs$cast$i$i = $94;
     $sub$ptr$sub$i$i = (($sub$ptr$lhs$cast$i$i) - ($sub$ptr$rhs$cast$i$i))|0;
     $157 = HEAP32[$head$i$i>>2]|0;
     $and32$i$i = $157 & -2;
     HEAP32[$head$i$i>>2] = $and32$i$i;
     $or33$i$i = $sub$ptr$sub$i$i | 1;
     $head34$i$i = ((($94)) + 4|0);
     HEAP32[$head34$i$i>>2] = $or33$i$i;
     HEAP32[$cond13$i$i>>2] = $sub$ptr$sub$i$i;
     $shr$i$i = $sub$ptr$sub$i$i >>> 3;
     $cmp36$i$i = ($sub$ptr$sub$i$i>>>0)<(256);
     if ($cmp36$i$i) {
      $shl$i$i = $shr$i$i << 1;
      $arrayidx$i$i = (32928 + ($shl$i$i<<2)|0);
      $158 = HEAP32[8222]|0;
      $shl39$i$i = 1 << $shr$i$i;
      $and40$i$i = $158 & $shl39$i$i;
      $tobool$i$i = ($and40$i$i|0)==(0);
      if ($tobool$i$i) {
       $or44$i$i = $158 | $shl39$i$i;
       HEAP32[8222] = $or44$i$i;
       $$pre$i$i = ((($arrayidx$i$i)) + 8|0);
       $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $arrayidx$i$i;
      } else {
       $159 = ((($arrayidx$i$i)) + 8|0);
       $160 = HEAP32[$159>>2]|0;
       $$pre$phi$i$iZ2D = $159;$F$0$i$i = $160;
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $94;
      $bk$i$i = ((($F$0$i$i)) + 12|0);
      HEAP32[$bk$i$i>>2] = $94;
      $fd54$i$i = ((($94)) + 8|0);
      HEAP32[$fd54$i$i>>2] = $F$0$i$i;
      $bk55$i$i = ((($94)) + 12|0);
      HEAP32[$bk55$i$i>>2] = $arrayidx$i$i;
      break;
     }
     $shr58$i$i = $sub$ptr$sub$i$i >>> 8;
     $cmp59$i$i = ($shr58$i$i|0)==(0);
     if ($cmp59$i$i) {
      $I57$0$i$i = 0;
     } else {
      $cmp63$i$i = ($sub$ptr$sub$i$i>>>0)>(16777215);
      if ($cmp63$i$i) {
       $I57$0$i$i = 31;
      } else {
       $sub67$i$i = (($shr58$i$i) + 1048320)|0;
       $shr68$i$i = $sub67$i$i >>> 16;
       $and69$i$i = $shr68$i$i & 8;
       $shl70$i$i = $shr58$i$i << $and69$i$i;
       $sub71$i$i = (($shl70$i$i) + 520192)|0;
       $shr72$i$i = $sub71$i$i >>> 16;
       $and73$i$i = $shr72$i$i & 4;
       $add74$i$i = $and73$i$i | $and69$i$i;
       $shl75$i$i = $shl70$i$i << $and73$i$i;
       $sub76$i$i = (($shl75$i$i) + 245760)|0;
       $shr77$i$i = $sub76$i$i >>> 16;
       $and78$i$i = $shr77$i$i & 2;
       $add79$i$i = $add74$i$i | $and78$i$i;
       $sub80$i$i = (14 - ($add79$i$i))|0;
       $shl81$i$i = $shl75$i$i << $and78$i$i;
       $shr82$i$i = $shl81$i$i >>> 15;
       $add83$i$i = (($sub80$i$i) + ($shr82$i$i))|0;
       $shl84$i$i = $add83$i$i << 1;
       $add85$i$i = (($add83$i$i) + 7)|0;
       $shr86$i$i = $sub$ptr$sub$i$i >>> $add85$i$i;
       $and87$i$i = $shr86$i$i & 1;
       $add88$i$i = $and87$i$i | $shl84$i$i;
       $I57$0$i$i = $add88$i$i;
      }
     }
     $arrayidx91$i$i = (33192 + ($I57$0$i$i<<2)|0);
     $index$i$i = ((($94)) + 28|0);
     HEAP32[$index$i$i>>2] = $I57$0$i$i;
     $arrayidx92$i$i = ((($94)) + 20|0);
     HEAP32[$arrayidx92$i$i>>2] = 0;
     HEAP32[$add$ptr81$i$i>>2] = 0;
     $161 = HEAP32[(32892)>>2]|0;
     $shl95$i$i = 1 << $I57$0$i$i;
     $and96$i$i = $161 & $shl95$i$i;
     $tobool97$i$i = ($and96$i$i|0)==(0);
     if ($tobool97$i$i) {
      $or101$i$i = $161 | $shl95$i$i;
      HEAP32[(32892)>>2] = $or101$i$i;
      HEAP32[$arrayidx91$i$i>>2] = $94;
      $parent$i$i = ((($94)) + 24|0);
      HEAP32[$parent$i$i>>2] = $arrayidx91$i$i;
      $bk102$i$i = ((($94)) + 12|0);
      HEAP32[$bk102$i$i>>2] = $94;
      $fd103$i$i = ((($94)) + 8|0);
      HEAP32[$fd103$i$i>>2] = $94;
      break;
     }
     $162 = HEAP32[$arrayidx91$i$i>>2]|0;
     $cmp106$i$i = ($I57$0$i$i|0)==(31);
     $shr110$i$i = $I57$0$i$i >>> 1;
     $sub113$i$i = (25 - ($shr110$i$i))|0;
     $cond115$i$i = $cmp106$i$i ? 0 : $sub113$i$i;
     $shl116$i$i = $sub$ptr$sub$i$i << $cond115$i$i;
     $K105$0$i$i = $shl116$i$i;$T$0$i$i = $162;
     while(1) {
      $head118$i$i = ((($T$0$i$i)) + 4|0);
      $163 = HEAP32[$head118$i$i>>2]|0;
      $and119$i$i = $163 & -8;
      $cmp120$i$i = ($and119$i$i|0)==($sub$ptr$sub$i$i|0);
      if ($cmp120$i$i) {
       label = 216;
       break;
      }
      $shr124$i$i = $K105$0$i$i >>> 31;
      $arrayidx126$i$i = (((($T$0$i$i)) + 16|0) + ($shr124$i$i<<2)|0);
      $shl127$i$i = $K105$0$i$i << 1;
      $164 = HEAP32[$arrayidx126$i$i>>2]|0;
      $cmp128$i$i = ($164|0)==(0|0);
      if ($cmp128$i$i) {
       label = 215;
       break;
      } else {
       $K105$0$i$i = $shl127$i$i;$T$0$i$i = $164;
      }
     }
     if ((label|0) == 215) {
      HEAP32[$arrayidx126$i$i>>2] = $94;
      $parent138$i$i = ((($94)) + 24|0);
      HEAP32[$parent138$i$i>>2] = $T$0$i$i;
      $bk139$i$i = ((($94)) + 12|0);
      HEAP32[$bk139$i$i>>2] = $94;
      $fd140$i$i = ((($94)) + 8|0);
      HEAP32[$fd140$i$i>>2] = $94;
      break;
     }
     else if ((label|0) == 216) {
      $fd148$i$i = ((($T$0$i$i)) + 8|0);
      $165 = HEAP32[$fd148$i$i>>2]|0;
      $bk158$i$i = ((($165)) + 12|0);
      HEAP32[$bk158$i$i>>2] = $94;
      HEAP32[$fd148$i$i>>2] = $94;
      $fd160$i$i = ((($94)) + 8|0);
      HEAP32[$fd160$i$i>>2] = $165;
      $bk161$i$i = ((($94)) + 12|0);
      HEAP32[$bk161$i$i>>2] = $T$0$i$i;
      $parent162$i$i = ((($94)) + 24|0);
      HEAP32[$parent162$i$i>>2] = 0;
      break;
     }
    }
   }
  } while(0);
  $166 = HEAP32[(32900)>>2]|0;
  $cmp257$i = ($166>>>0)>($nb$0>>>0);
  if ($cmp257$i) {
   $sub260$i = (($166) - ($nb$0))|0;
   HEAP32[(32900)>>2] = $sub260$i;
   $167 = HEAP32[(32912)>>2]|0;
   $add$ptr262$i = (($167) + ($nb$0)|0);
   HEAP32[(32912)>>2] = $add$ptr262$i;
   $or264$i = $sub260$i | 1;
   $head265$i = ((($add$ptr262$i)) + 4|0);
   HEAP32[$head265$i>>2] = $or264$i;
   $or267$i = $nb$0 | 3;
   $head268$i = ((($167)) + 4|0);
   HEAP32[$head268$i>>2] = $or267$i;
   $add$ptr269$i = ((($167)) + 8|0);
   $retval$0 = $add$ptr269$i;
   STACKTOP = sp;return ($retval$0|0);
  }
 }
 $call275$i = (___errno_location()|0);
 HEAP32[$call275$i>>2] = 12;
 $retval$0 = 0;
 STACKTOP = sp;return ($retval$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$pre = 0, $$pre$phiZ2D = 0, $$sink = 0, $$sink4 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $F510$0 = 0, $I534$0 = 0, $K583$0 = 0;
 var $R$1 = 0, $R$3 = 0, $R332$1 = 0, $R332$3 = 0, $RP$1 = 0, $RP360$1 = 0, $T$0 = 0, $add$ptr = 0, $add$ptr16 = 0, $add$ptr217 = 0, $add$ptr261 = 0, $add$ptr482 = 0, $add$ptr498 = 0, $add$ptr6 = 0, $add17 = 0, $add246 = 0, $add258 = 0, $add267 = 0, $add550 = 0, $add555 = 0;
 var $add559 = 0, $add561 = 0, $add564 = 0, $and12 = 0, $and140 = 0, $and210 = 0, $and215 = 0, $and232 = 0, $and240 = 0, $and266 = 0, $and301 = 0, $and410 = 0, $and46 = 0, $and495 = 0, $and5 = 0, $and512 = 0, $and545 = 0, $and549 = 0, $and554 = 0, $and563 = 0;
 var $and574 = 0, $and592 = 0, $and8 = 0, $arrayidx108 = 0, $arrayidx113 = 0, $arrayidx130 = 0, $arrayidx149 = 0, $arrayidx157 = 0, $arrayidx182 = 0, $arrayidx188 = 0, $arrayidx198 = 0, $arrayidx362 = 0, $arrayidx374 = 0, $arrayidx379 = 0, $arrayidx400 = 0, $arrayidx419 = 0, $arrayidx427 = 0, $arrayidx454 = 0, $arrayidx460 = 0, $arrayidx470 = 0;
 var $arrayidx509 = 0, $arrayidx567 = 0, $arrayidx570 = 0, $arrayidx599 = 0, $arrayidx99 = 0, $bk = 0, $bk275 = 0, $bk321 = 0, $bk333 = 0, $bk355 = 0, $bk529 = 0, $bk531 = 0, $bk580 = 0, $bk611 = 0, $bk631 = 0, $bk634 = 0, $bk66 = 0, $bk73 = 0, $bk94 = 0, $child = 0;
 var $child171 = 0, $child361 = 0, $child443 = 0, $child569 = 0, $cmp = 0, $cmp$i = 0, $cmp100 = 0, $cmp104 = 0, $cmp109 = 0, $cmp114 = 0, $cmp127 = 0, $cmp13 = 0, $cmp131 = 0, $cmp162 = 0, $cmp173 = 0, $cmp18 = 0, $cmp189 = 0, $cmp211 = 0, $cmp22 = 0, $cmp228 = 0;
 var $cmp243 = 0, $cmp249 = 0, $cmp25 = 0, $cmp255 = 0, $cmp269 = 0, $cmp296 = 0, $cmp334 = 0, $cmp363 = 0, $cmp368 = 0, $cmp375 = 0, $cmp380 = 0, $cmp395 = 0, $cmp401 = 0, $cmp42 = 0, $cmp432 = 0, $cmp445 = 0, $cmp461 = 0, $cmp484 = 0, $cmp502 = 0, $cmp536 = 0;
 var $cmp540 = 0, $cmp584 = 0, $cmp593 = 0, $cmp601 = 0, $cmp640 = 0, $cmp74 = 0, $cond = 0, $cond255 = 0, $cond256 = 0, $dec = 0, $fd = 0, $fd273 = 0, $fd322 = 0, $fd338 = 0, $fd356 = 0, $fd530 = 0, $fd581 = 0, $fd612 = 0, $fd620 = 0, $fd633 = 0;
 var $fd67 = 0, $fd78 = 0, $fd95 = 0, $head209 = 0, $head216 = 0, $head231 = 0, $head248 = 0, $head260 = 0, $head4 = 0, $head481 = 0, $head497 = 0, $head591 = 0, $idx$neg = 0, $index = 0, $index399 = 0, $index568 = 0, $neg = 0, $neg139 = 0, $neg300 = 0, $neg409 = 0;
 var $next4$i = 0, $not$cmp150 = 0, $not$cmp420 = 0, $or = 0, $or247 = 0, $or259 = 0, $or480 = 0, $or496 = 0, $or516 = 0, $or578 = 0, $p$1 = 0, $parent = 0, $parent170 = 0, $parent183 = 0, $parent199 = 0, $parent331 = 0, $parent442 = 0, $parent455 = 0, $parent471 = 0, $parent579 = 0;
 var $parent610 = 0, $parent635 = 0, $psize$1 = 0, $psize$2 = 0, $shl138 = 0, $shl299 = 0, $shl408 = 0, $shl45 = 0, $shl508 = 0, $shl511 = 0, $shl546 = 0, $shl551 = 0, $shl557 = 0, $shl560 = 0, $shl573 = 0, $shl590 = 0, $shl600 = 0, $shr = 0, $shr268 = 0, $shr501 = 0;
 var $shr535 = 0, $shr544 = 0, $shr548 = 0, $shr553 = 0, $shr558 = 0, $shr562 = 0, $shr586 = 0, $shr597 = 0, $sp$0$i = 0, $sp$0$in$i = 0, $sub = 0, $sub547 = 0, $sub552 = 0, $sub556 = 0, $sub589 = 0, $tobool233 = 0, $tobool241 = 0, $tobool513 = 0, $tobool575 = 0, $tobool9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $cmp = ($mem|0)==(0|0);
 if ($cmp) {
  return;
 }
 $add$ptr = ((($mem)) + -8|0);
 $0 = HEAP32[(32904)>>2]|0;
 $head4 = ((($mem)) + -4|0);
 $1 = HEAP32[$head4>>2]|0;
 $and5 = $1 & -8;
 $add$ptr6 = (($add$ptr) + ($and5)|0);
 $and8 = $1 & 1;
 $tobool9 = ($and8|0)==(0);
 do {
  if ($tobool9) {
   $2 = HEAP32[$add$ptr>>2]|0;
   $and12 = $1 & 3;
   $cmp13 = ($and12|0)==(0);
   if ($cmp13) {
    return;
   }
   $idx$neg = (0 - ($2))|0;
   $add$ptr16 = (($add$ptr) + ($idx$neg)|0);
   $add17 = (($2) + ($and5))|0;
   $cmp18 = ($add$ptr16>>>0)<($0>>>0);
   if ($cmp18) {
    return;
   }
   $3 = HEAP32[(32908)>>2]|0;
   $cmp22 = ($add$ptr16|0)==($3|0);
   if ($cmp22) {
    $head209 = ((($add$ptr6)) + 4|0);
    $20 = HEAP32[$head209>>2]|0;
    $and210 = $20 & 3;
    $cmp211 = ($and210|0)==(3);
    if (!($cmp211)) {
     $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
     break;
    }
    $add$ptr217 = (($add$ptr16) + ($add17)|0);
    $head216 = ((($add$ptr16)) + 4|0);
    $or = $add17 | 1;
    $and215 = $20 & -2;
    HEAP32[(32896)>>2] = $add17;
    HEAP32[$head209>>2] = $and215;
    HEAP32[$head216>>2] = $or;
    HEAP32[$add$ptr217>>2] = $add17;
    return;
   }
   $shr = $2 >>> 3;
   $cmp25 = ($2>>>0)<(256);
   if ($cmp25) {
    $fd = ((($add$ptr16)) + 8|0);
    $4 = HEAP32[$fd>>2]|0;
    $bk = ((($add$ptr16)) + 12|0);
    $5 = HEAP32[$bk>>2]|0;
    $cmp42 = ($5|0)==($4|0);
    if ($cmp42) {
     $shl45 = 1 << $shr;
     $neg = $shl45 ^ -1;
     $6 = HEAP32[8222]|0;
     $and46 = $6 & $neg;
     HEAP32[8222] = $and46;
     $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
     break;
    } else {
     $bk66 = ((($4)) + 12|0);
     HEAP32[$bk66>>2] = $5;
     $fd67 = ((($5)) + 8|0);
     HEAP32[$fd67>>2] = $4;
     $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
     break;
    }
   }
   $parent = ((($add$ptr16)) + 24|0);
   $7 = HEAP32[$parent>>2]|0;
   $bk73 = ((($add$ptr16)) + 12|0);
   $8 = HEAP32[$bk73>>2]|0;
   $cmp74 = ($8|0)==($add$ptr16|0);
   do {
    if ($cmp74) {
     $child = ((($add$ptr16)) + 16|0);
     $arrayidx99 = ((($child)) + 4|0);
     $10 = HEAP32[$arrayidx99>>2]|0;
     $cmp100 = ($10|0)==(0|0);
     if ($cmp100) {
      $11 = HEAP32[$child>>2]|0;
      $cmp104 = ($11|0)==(0|0);
      if ($cmp104) {
       $R$3 = 0;
       break;
      } else {
       $R$1 = $11;$RP$1 = $child;
      }
     } else {
      $R$1 = $10;$RP$1 = $arrayidx99;
     }
     while(1) {
      $arrayidx108 = ((($R$1)) + 20|0);
      $12 = HEAP32[$arrayidx108>>2]|0;
      $cmp109 = ($12|0)==(0|0);
      if (!($cmp109)) {
       $R$1 = $12;$RP$1 = $arrayidx108;
       continue;
      }
      $arrayidx113 = ((($R$1)) + 16|0);
      $13 = HEAP32[$arrayidx113>>2]|0;
      $cmp114 = ($13|0)==(0|0);
      if ($cmp114) {
       break;
      } else {
       $R$1 = $13;$RP$1 = $arrayidx113;
      }
     }
     HEAP32[$RP$1>>2] = 0;
     $R$3 = $R$1;
    } else {
     $fd78 = ((($add$ptr16)) + 8|0);
     $9 = HEAP32[$fd78>>2]|0;
     $bk94 = ((($9)) + 12|0);
     HEAP32[$bk94>>2] = $8;
     $fd95 = ((($8)) + 8|0);
     HEAP32[$fd95>>2] = $9;
     $R$3 = $8;
    }
   } while(0);
   $cmp127 = ($7|0)==(0|0);
   if ($cmp127) {
    $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
   } else {
    $index = ((($add$ptr16)) + 28|0);
    $14 = HEAP32[$index>>2]|0;
    $arrayidx130 = (33192 + ($14<<2)|0);
    $15 = HEAP32[$arrayidx130>>2]|0;
    $cmp131 = ($add$ptr16|0)==($15|0);
    if ($cmp131) {
     HEAP32[$arrayidx130>>2] = $R$3;
     $cond255 = ($R$3|0)==(0|0);
     if ($cond255) {
      $shl138 = 1 << $14;
      $neg139 = $shl138 ^ -1;
      $16 = HEAP32[(32892)>>2]|0;
      $and140 = $16 & $neg139;
      HEAP32[(32892)>>2] = $and140;
      $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
      break;
     }
    } else {
     $arrayidx149 = ((($7)) + 16|0);
     $17 = HEAP32[$arrayidx149>>2]|0;
     $not$cmp150 = ($17|0)!=($add$ptr16|0);
     $$sink = $not$cmp150&1;
     $arrayidx157 = (((($7)) + 16|0) + ($$sink<<2)|0);
     HEAP32[$arrayidx157>>2] = $R$3;
     $cmp162 = ($R$3|0)==(0|0);
     if ($cmp162) {
      $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
      break;
     }
    }
    $parent170 = ((($R$3)) + 24|0);
    HEAP32[$parent170>>2] = $7;
    $child171 = ((($add$ptr16)) + 16|0);
    $18 = HEAP32[$child171>>2]|0;
    $cmp173 = ($18|0)==(0|0);
    if (!($cmp173)) {
     $arrayidx182 = ((($R$3)) + 16|0);
     HEAP32[$arrayidx182>>2] = $18;
     $parent183 = ((($18)) + 24|0);
     HEAP32[$parent183>>2] = $R$3;
    }
    $arrayidx188 = ((($child171)) + 4|0);
    $19 = HEAP32[$arrayidx188>>2]|0;
    $cmp189 = ($19|0)==(0|0);
    if ($cmp189) {
     $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
    } else {
     $arrayidx198 = ((($R$3)) + 20|0);
     HEAP32[$arrayidx198>>2] = $19;
     $parent199 = ((($19)) + 24|0);
     HEAP32[$parent199>>2] = $R$3;
     $21 = $add$ptr16;$p$1 = $add$ptr16;$psize$1 = $add17;
    }
   }
  } else {
   $21 = $add$ptr;$p$1 = $add$ptr;$psize$1 = $and5;
  }
 } while(0);
 $cmp228 = ($21>>>0)<($add$ptr6>>>0);
 if (!($cmp228)) {
  return;
 }
 $head231 = ((($add$ptr6)) + 4|0);
 $22 = HEAP32[$head231>>2]|0;
 $and232 = $22 & 1;
 $tobool233 = ($and232|0)==(0);
 if ($tobool233) {
  return;
 }
 $and240 = $22 & 2;
 $tobool241 = ($and240|0)==(0);
 if ($tobool241) {
  $23 = HEAP32[(32912)>>2]|0;
  $cmp243 = ($add$ptr6|0)==($23|0);
  $24 = HEAP32[(32908)>>2]|0;
  if ($cmp243) {
   $25 = HEAP32[(32900)>>2]|0;
   $add246 = (($25) + ($psize$1))|0;
   HEAP32[(32900)>>2] = $add246;
   HEAP32[(32912)>>2] = $p$1;
   $or247 = $add246 | 1;
   $head248 = ((($p$1)) + 4|0);
   HEAP32[$head248>>2] = $or247;
   $cmp249 = ($p$1|0)==($24|0);
   if (!($cmp249)) {
    return;
   }
   HEAP32[(32908)>>2] = 0;
   HEAP32[(32896)>>2] = 0;
   return;
  }
  $cmp255 = ($add$ptr6|0)==($24|0);
  if ($cmp255) {
   $26 = HEAP32[(32896)>>2]|0;
   $add258 = (($26) + ($psize$1))|0;
   HEAP32[(32896)>>2] = $add258;
   HEAP32[(32908)>>2] = $21;
   $or259 = $add258 | 1;
   $head260 = ((($p$1)) + 4|0);
   HEAP32[$head260>>2] = $or259;
   $add$ptr261 = (($21) + ($add258)|0);
   HEAP32[$add$ptr261>>2] = $add258;
   return;
  }
  $and266 = $22 & -8;
  $add267 = (($and266) + ($psize$1))|0;
  $shr268 = $22 >>> 3;
  $cmp269 = ($22>>>0)<(256);
  do {
   if ($cmp269) {
    $fd273 = ((($add$ptr6)) + 8|0);
    $27 = HEAP32[$fd273>>2]|0;
    $bk275 = ((($add$ptr6)) + 12|0);
    $28 = HEAP32[$bk275>>2]|0;
    $cmp296 = ($28|0)==($27|0);
    if ($cmp296) {
     $shl299 = 1 << $shr268;
     $neg300 = $shl299 ^ -1;
     $29 = HEAP32[8222]|0;
     $and301 = $29 & $neg300;
     HEAP32[8222] = $and301;
     break;
    } else {
     $bk321 = ((($27)) + 12|0);
     HEAP32[$bk321>>2] = $28;
     $fd322 = ((($28)) + 8|0);
     HEAP32[$fd322>>2] = $27;
     break;
    }
   } else {
    $parent331 = ((($add$ptr6)) + 24|0);
    $30 = HEAP32[$parent331>>2]|0;
    $bk333 = ((($add$ptr6)) + 12|0);
    $31 = HEAP32[$bk333>>2]|0;
    $cmp334 = ($31|0)==($add$ptr6|0);
    do {
     if ($cmp334) {
      $child361 = ((($add$ptr6)) + 16|0);
      $arrayidx362 = ((($child361)) + 4|0);
      $33 = HEAP32[$arrayidx362>>2]|0;
      $cmp363 = ($33|0)==(0|0);
      if ($cmp363) {
       $34 = HEAP32[$child361>>2]|0;
       $cmp368 = ($34|0)==(0|0);
       if ($cmp368) {
        $R332$3 = 0;
        break;
       } else {
        $R332$1 = $34;$RP360$1 = $child361;
       }
      } else {
       $R332$1 = $33;$RP360$1 = $arrayidx362;
      }
      while(1) {
       $arrayidx374 = ((($R332$1)) + 20|0);
       $35 = HEAP32[$arrayidx374>>2]|0;
       $cmp375 = ($35|0)==(0|0);
       if (!($cmp375)) {
        $R332$1 = $35;$RP360$1 = $arrayidx374;
        continue;
       }
       $arrayidx379 = ((($R332$1)) + 16|0);
       $36 = HEAP32[$arrayidx379>>2]|0;
       $cmp380 = ($36|0)==(0|0);
       if ($cmp380) {
        break;
       } else {
        $R332$1 = $36;$RP360$1 = $arrayidx379;
       }
      }
      HEAP32[$RP360$1>>2] = 0;
      $R332$3 = $R332$1;
     } else {
      $fd338 = ((($add$ptr6)) + 8|0);
      $32 = HEAP32[$fd338>>2]|0;
      $bk355 = ((($32)) + 12|0);
      HEAP32[$bk355>>2] = $31;
      $fd356 = ((($31)) + 8|0);
      HEAP32[$fd356>>2] = $32;
      $R332$3 = $31;
     }
    } while(0);
    $cmp395 = ($30|0)==(0|0);
    if (!($cmp395)) {
     $index399 = ((($add$ptr6)) + 28|0);
     $37 = HEAP32[$index399>>2]|0;
     $arrayidx400 = (33192 + ($37<<2)|0);
     $38 = HEAP32[$arrayidx400>>2]|0;
     $cmp401 = ($add$ptr6|0)==($38|0);
     if ($cmp401) {
      HEAP32[$arrayidx400>>2] = $R332$3;
      $cond256 = ($R332$3|0)==(0|0);
      if ($cond256) {
       $shl408 = 1 << $37;
       $neg409 = $shl408 ^ -1;
       $39 = HEAP32[(32892)>>2]|0;
       $and410 = $39 & $neg409;
       HEAP32[(32892)>>2] = $and410;
       break;
      }
     } else {
      $arrayidx419 = ((($30)) + 16|0);
      $40 = HEAP32[$arrayidx419>>2]|0;
      $not$cmp420 = ($40|0)!=($add$ptr6|0);
      $$sink4 = $not$cmp420&1;
      $arrayidx427 = (((($30)) + 16|0) + ($$sink4<<2)|0);
      HEAP32[$arrayidx427>>2] = $R332$3;
      $cmp432 = ($R332$3|0)==(0|0);
      if ($cmp432) {
       break;
      }
     }
     $parent442 = ((($R332$3)) + 24|0);
     HEAP32[$parent442>>2] = $30;
     $child443 = ((($add$ptr6)) + 16|0);
     $41 = HEAP32[$child443>>2]|0;
     $cmp445 = ($41|0)==(0|0);
     if (!($cmp445)) {
      $arrayidx454 = ((($R332$3)) + 16|0);
      HEAP32[$arrayidx454>>2] = $41;
      $parent455 = ((($41)) + 24|0);
      HEAP32[$parent455>>2] = $R332$3;
     }
     $arrayidx460 = ((($child443)) + 4|0);
     $42 = HEAP32[$arrayidx460>>2]|0;
     $cmp461 = ($42|0)==(0|0);
     if (!($cmp461)) {
      $arrayidx470 = ((($R332$3)) + 20|0);
      HEAP32[$arrayidx470>>2] = $42;
      $parent471 = ((($42)) + 24|0);
      HEAP32[$parent471>>2] = $R332$3;
     }
    }
   }
  } while(0);
  $or480 = $add267 | 1;
  $head481 = ((($p$1)) + 4|0);
  HEAP32[$head481>>2] = $or480;
  $add$ptr482 = (($21) + ($add267)|0);
  HEAP32[$add$ptr482>>2] = $add267;
  $43 = HEAP32[(32908)>>2]|0;
  $cmp484 = ($p$1|0)==($43|0);
  if ($cmp484) {
   HEAP32[(32896)>>2] = $add267;
   return;
  } else {
   $psize$2 = $add267;
  }
 } else {
  $and495 = $22 & -2;
  HEAP32[$head231>>2] = $and495;
  $or496 = $psize$1 | 1;
  $head497 = ((($p$1)) + 4|0);
  HEAP32[$head497>>2] = $or496;
  $add$ptr498 = (($21) + ($psize$1)|0);
  HEAP32[$add$ptr498>>2] = $psize$1;
  $psize$2 = $psize$1;
 }
 $shr501 = $psize$2 >>> 3;
 $cmp502 = ($psize$2>>>0)<(256);
 if ($cmp502) {
  $shl508 = $shr501 << 1;
  $arrayidx509 = (32928 + ($shl508<<2)|0);
  $44 = HEAP32[8222]|0;
  $shl511 = 1 << $shr501;
  $and512 = $44 & $shl511;
  $tobool513 = ($and512|0)==(0);
  if ($tobool513) {
   $or516 = $44 | $shl511;
   HEAP32[8222] = $or516;
   $$pre = ((($arrayidx509)) + 8|0);
   $$pre$phiZ2D = $$pre;$F510$0 = $arrayidx509;
  } else {
   $45 = ((($arrayidx509)) + 8|0);
   $46 = HEAP32[$45>>2]|0;
   $$pre$phiZ2D = $45;$F510$0 = $46;
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$1;
  $bk529 = ((($F510$0)) + 12|0);
  HEAP32[$bk529>>2] = $p$1;
  $fd530 = ((($p$1)) + 8|0);
  HEAP32[$fd530>>2] = $F510$0;
  $bk531 = ((($p$1)) + 12|0);
  HEAP32[$bk531>>2] = $arrayidx509;
  return;
 }
 $shr535 = $psize$2 >>> 8;
 $cmp536 = ($shr535|0)==(0);
 if ($cmp536) {
  $I534$0 = 0;
 } else {
  $cmp540 = ($psize$2>>>0)>(16777215);
  if ($cmp540) {
   $I534$0 = 31;
  } else {
   $sub = (($shr535) + 1048320)|0;
   $shr544 = $sub >>> 16;
   $and545 = $shr544 & 8;
   $shl546 = $shr535 << $and545;
   $sub547 = (($shl546) + 520192)|0;
   $shr548 = $sub547 >>> 16;
   $and549 = $shr548 & 4;
   $add550 = $and549 | $and545;
   $shl551 = $shl546 << $and549;
   $sub552 = (($shl551) + 245760)|0;
   $shr553 = $sub552 >>> 16;
   $and554 = $shr553 & 2;
   $add555 = $add550 | $and554;
   $sub556 = (14 - ($add555))|0;
   $shl557 = $shl551 << $and554;
   $shr558 = $shl557 >>> 15;
   $add559 = (($sub556) + ($shr558))|0;
   $shl560 = $add559 << 1;
   $add561 = (($add559) + 7)|0;
   $shr562 = $psize$2 >>> $add561;
   $and563 = $shr562 & 1;
   $add564 = $and563 | $shl560;
   $I534$0 = $add564;
  }
 }
 $arrayidx567 = (33192 + ($I534$0<<2)|0);
 $index568 = ((($p$1)) + 28|0);
 HEAP32[$index568>>2] = $I534$0;
 $child569 = ((($p$1)) + 16|0);
 $arrayidx570 = ((($p$1)) + 20|0);
 HEAP32[$arrayidx570>>2] = 0;
 HEAP32[$child569>>2] = 0;
 $47 = HEAP32[(32892)>>2]|0;
 $shl573 = 1 << $I534$0;
 $and574 = $47 & $shl573;
 $tobool575 = ($and574|0)==(0);
 do {
  if ($tobool575) {
   $or578 = $47 | $shl573;
   HEAP32[(32892)>>2] = $or578;
   HEAP32[$arrayidx567>>2] = $p$1;
   $parent579 = ((($p$1)) + 24|0);
   HEAP32[$parent579>>2] = $arrayidx567;
   $bk580 = ((($p$1)) + 12|0);
   HEAP32[$bk580>>2] = $p$1;
   $fd581 = ((($p$1)) + 8|0);
   HEAP32[$fd581>>2] = $p$1;
  } else {
   $48 = HEAP32[$arrayidx567>>2]|0;
   $cmp584 = ($I534$0|0)==(31);
   $shr586 = $I534$0 >>> 1;
   $sub589 = (25 - ($shr586))|0;
   $cond = $cmp584 ? 0 : $sub589;
   $shl590 = $psize$2 << $cond;
   $K583$0 = $shl590;$T$0 = $48;
   while(1) {
    $head591 = ((($T$0)) + 4|0);
    $49 = HEAP32[$head591>>2]|0;
    $and592 = $49 & -8;
    $cmp593 = ($and592|0)==($psize$2|0);
    if ($cmp593) {
     label = 73;
     break;
    }
    $shr597 = $K583$0 >>> 31;
    $arrayidx599 = (((($T$0)) + 16|0) + ($shr597<<2)|0);
    $shl600 = $K583$0 << 1;
    $50 = HEAP32[$arrayidx599>>2]|0;
    $cmp601 = ($50|0)==(0|0);
    if ($cmp601) {
     label = 72;
     break;
    } else {
     $K583$0 = $shl600;$T$0 = $50;
    }
   }
   if ((label|0) == 72) {
    HEAP32[$arrayidx599>>2] = $p$1;
    $parent610 = ((($p$1)) + 24|0);
    HEAP32[$parent610>>2] = $T$0;
    $bk611 = ((($p$1)) + 12|0);
    HEAP32[$bk611>>2] = $p$1;
    $fd612 = ((($p$1)) + 8|0);
    HEAP32[$fd612>>2] = $p$1;
    break;
   }
   else if ((label|0) == 73) {
    $fd620 = ((($T$0)) + 8|0);
    $51 = HEAP32[$fd620>>2]|0;
    $bk631 = ((($51)) + 12|0);
    HEAP32[$bk631>>2] = $p$1;
    HEAP32[$fd620>>2] = $p$1;
    $fd633 = ((($p$1)) + 8|0);
    HEAP32[$fd633>>2] = $51;
    $bk634 = ((($p$1)) + 12|0);
    HEAP32[$bk634>>2] = $T$0;
    $parent635 = ((($p$1)) + 24|0);
    HEAP32[$parent635>>2] = 0;
    break;
   }
  }
 } while(0);
 $52 = HEAP32[(32920)>>2]|0;
 $dec = (($52) + -1)|0;
 HEAP32[(32920)>>2] = $dec;
 $cmp640 = ($dec|0)==(0);
 if ($cmp640) {
  $sp$0$in$i = (33344);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $cmp$i = ($sp$0$i|0)==(0|0);
  $next4$i = ((($sp$0$i)) + 8|0);
  if ($cmp$i) {
   break;
  } else {
   $sp$0$in$i = $next4$i;
  }
 }
 HEAP32[(32920)>>2] = -1;
 return;
}
function _emscripten_get_global_libc() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (33384|0);
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $call = 0, $call1 = 0, $call2 = 0, $fd = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer = sp;
 $fd = ((($f)) + 60|0);
 $0 = HEAP32[$fd>>2]|0;
 $call = (_dummy($0)|0);
 HEAP32[$vararg_buffer>>2] = $call;
 $call1 = (___syscall6(6,($vararg_buffer|0))|0);
 $call2 = (___syscall_ret($call1)|0);
 STACKTOP = sp;return ($call2|0);
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $call = 0, $call1 = 0, $cmp = 0, $fd = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $fd = ((($f)) + 60|0);
 $0 = HEAP32[$fd>>2]|0;
 $1 = $ret;
 HEAP32[$vararg_buffer>>2] = $0;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $1;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $call = (___syscall140(140,($vararg_buffer|0))|0);
 $call1 = (___syscall_ret($call)|0);
 $cmp = ($call1|0)<(0);
 if ($cmp) {
  HEAP32[$ret>>2] = -1;
  $2 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $2 = $$pre;
 }
 STACKTOP = sp;return ($2|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $call = 0, $cmp = 0, $retval$0 = 0, $sub = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $cmp = ($r>>>0)>(4294963200);
 if ($cmp) {
  $sub = (0 - ($r))|0;
  $call = (___errno_location()|0);
  HEAP32[$call>>2] = $sub;
  $retval$0 = -1;
 } else {
  $retval$0 = $r;
 }
 return ($retval$0|0);
}
function ___errno_location() {
 var $call = 0, $errno_val = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $call = (___pthread_self_220()|0);
 $errno_val = ((($call)) + 64|0);
 return ($errno_val|0);
}
function ___pthread_self_220() {
 var $call = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $call = (_pthread_self()|0);
 return ($call|0);
}
function _pthread_self() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (32512|0);
}
function _dummy($fd) {
 $fd = $fd|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return ($fd|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $add = 0, $add$ptr = 0, $add$ptr32 = 0, $buf8 = 0, $buf_size = 0, $call = 0, $call40 = 0;
 var $call7 = 0, $call741 = 0, $call746 = 0, $cmp = 0, $cmp12 = 0, $cmp17 = 0, $cmp24 = 0, $cmp42 = 0, $cnt$0 = 0, $dec = 0, $fd = 0, $incdec$ptr = 0, $iov$043 = 0, $iov$1 = 0, $iov_base2 = 0, $iov_len = 0, $iov_len19 = 0, $iov_len23 = 0, $iov_len3 = 0, $iov_len36 = 0;
 var $iovcnt$045 = 0, $iovcnt$1 = 0, $iovs = 0, $or = 0, $rem$044 = 0, $retval$0 = 0, $sub = 0, $sub$ptr$sub = 0, $sub21 = 0, $sub28 = 0, $sub37 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, $wbase = 0, $wend = 0, $wend14 = 0;
 var $wpos = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $wbase = ((($f)) + 28|0);
 $0 = HEAP32[$wbase>>2]|0;
 HEAP32[$iovs>>2] = $0;
 $iov_len = ((($iovs)) + 4|0);
 $wpos = ((($f)) + 20|0);
 $1 = HEAP32[$wpos>>2]|0;
 $sub$ptr$sub = (($1) - ($0))|0;
 HEAP32[$iov_len>>2] = $sub$ptr$sub;
 $iov_base2 = ((($iovs)) + 8|0);
 HEAP32[$iov_base2>>2] = $buf;
 $iov_len3 = ((($iovs)) + 12|0);
 HEAP32[$iov_len3>>2] = $len;
 $add = (($sub$ptr$sub) + ($len))|0;
 $fd = ((($f)) + 60|0);
 $2 = HEAP32[$fd>>2]|0;
 $3 = $iovs;
 HEAP32[$vararg_buffer>>2] = $2;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $3;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = 2;
 $call40 = (___syscall146(146,($vararg_buffer|0))|0);
 $call741 = (___syscall_ret($call40)|0);
 $cmp42 = ($add|0)==($call741|0);
 L1: do {
  if ($cmp42) {
   label = 3;
  } else {
   $call746 = $call741;$iov$043 = $iovs;$iovcnt$045 = 2;$rem$044 = $add;
   while(1) {
    $cmp12 = ($call746|0)<(0);
    if ($cmp12) {
     break;
    }
    $sub21 = (($rem$044) - ($call746))|0;
    $iov_len23 = ((($iov$043)) + 4|0);
    $8 = HEAP32[$iov_len23>>2]|0;
    $cmp24 = ($call746>>>0)>($8>>>0);
    $incdec$ptr = ((($iov$043)) + 8|0);
    $iov$1 = $cmp24 ? $incdec$ptr : $iov$043;
    $dec = $cmp24 << 31 >> 31;
    $iovcnt$1 = (($dec) + ($iovcnt$045))|0;
    $sub28 = $cmp24 ? $8 : 0;
    $cnt$0 = (($call746) - ($sub28))|0;
    $9 = HEAP32[$iov$1>>2]|0;
    $add$ptr32 = (($9) + ($cnt$0)|0);
    HEAP32[$iov$1>>2] = $add$ptr32;
    $iov_len36 = ((($iov$1)) + 4|0);
    $10 = HEAP32[$iov_len36>>2]|0;
    $sub37 = (($10) - ($cnt$0))|0;
    HEAP32[$iov_len36>>2] = $sub37;
    $11 = HEAP32[$fd>>2]|0;
    $12 = $iov$1;
    HEAP32[$vararg_buffer3>>2] = $11;
    $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
    HEAP32[$vararg_ptr6>>2] = $12;
    $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
    HEAP32[$vararg_ptr7>>2] = $iovcnt$1;
    $call = (___syscall146(146,($vararg_buffer3|0))|0);
    $call7 = (___syscall_ret($call)|0);
    $cmp = ($sub21|0)==($call7|0);
    if ($cmp) {
     label = 3;
     break L1;
    } else {
     $call746 = $call7;$iov$043 = $iov$1;$iovcnt$045 = $iovcnt$1;$rem$044 = $sub21;
    }
   }
   $wend14 = ((($f)) + 16|0);
   HEAP32[$wend14>>2] = 0;
   HEAP32[$wbase>>2] = 0;
   HEAP32[$wpos>>2] = 0;
   $6 = HEAP32[$f>>2]|0;
   $or = $6 | 32;
   HEAP32[$f>>2] = $or;
   $cmp17 = ($iovcnt$045|0)==(2);
   if ($cmp17) {
    $retval$0 = 0;
   } else {
    $iov_len19 = ((($iov$043)) + 4|0);
    $7 = HEAP32[$iov_len19>>2]|0;
    $sub = (($len) - ($7))|0;
    $retval$0 = $sub;
   }
  }
 } while(0);
 if ((label|0) == 3) {
  $buf8 = ((($f)) + 44|0);
  $4 = HEAP32[$buf8>>2]|0;
  $buf_size = ((($f)) + 48|0);
  $5 = HEAP32[$buf_size>>2]|0;
  $add$ptr = (($4) + ($5)|0);
  $wend = ((($f)) + 16|0);
  HEAP32[$wend>>2] = $add$ptr;
  HEAP32[$wbase>>2] = $4;
  HEAP32[$wpos>>2] = $4;
  $retval$0 = $len;
 }
 STACKTOP = sp;return ($retval$0|0);
}
function ___stdout_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $2 = 0, $and = 0, $call = 0, $call3 = 0, $fd = 0, $lbf = 0, $tobool = 0, $tobool2 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $write = 0, $wsz = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vararg_buffer = sp;
 $wsz = sp + 16|0;
 $write = ((($f)) + 36|0);
 HEAP32[$write>>2] = 3;
 $0 = HEAP32[$f>>2]|0;
 $and = $0 & 64;
 $tobool = ($and|0)==(0);
 if ($tobool) {
  $fd = ((($f)) + 60|0);
  $1 = HEAP32[$fd>>2]|0;
  $2 = $wsz;
  HEAP32[$vararg_buffer>>2] = $1;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21523;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $2;
  $call = (___syscall54(54,($vararg_buffer|0))|0);
  $tobool2 = ($call|0)==(0);
  if (!($tobool2)) {
   $lbf = ((($f)) + 75|0);
   HEAP8[$lbf>>0] = -1;
  }
 }
 $call3 = (___stdio_write($f,$buf,$len)|0);
 STACKTOP = sp;return ($call3|0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___ofl_lock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___lock((33448|0));
 return (33456|0);
}
function ___ofl_unlock() {
 var label = 0, sp = 0;
 sp = STACKTOP;
 ___unlock((33448|0));
 return;
}
function _fflush($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $call = 0, $call1 = 0, $call11 = 0, $call118 = 0, $call17 = 0, $call23 = 0, $call7 = 0, $cmp = 0, $cmp15 = 0, $cmp21 = 0, $cond10 = 0, $cond20 = 0, $f$addr$0 = 0, $f$addr$019 = 0;
 var $f$addr$022 = 0, $lock = 0, $lock14 = 0, $next = 0, $or = 0, $phitmp = 0, $r$0$lcssa = 0, $r$021 = 0, $r$1 = 0, $retval$0 = 0, $tobool = 0, $tobool12 = 0, $tobool1220 = 0, $tobool25 = 0, $tobool5 = 0, $wbase = 0, $wpos = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $tobool = ($f|0)==(0|0);
 do {
  if ($tobool) {
   $1 = HEAP32[8220]|0;
   $tobool5 = ($1|0)==(0|0);
   if ($tobool5) {
    $cond10 = 0;
   } else {
    $2 = HEAP32[8220]|0;
    $call7 = (_fflush($2)|0);
    $cond10 = $call7;
   }
   $call11 = (___ofl_lock()|0);
   $f$addr$019 = HEAP32[$call11>>2]|0;
   $tobool1220 = ($f$addr$019|0)==(0|0);
   if ($tobool1220) {
    $r$0$lcssa = $cond10;
   } else {
    $f$addr$022 = $f$addr$019;$r$021 = $cond10;
    while(1) {
     $lock14 = ((($f$addr$022)) + 76|0);
     $3 = HEAP32[$lock14>>2]|0;
     $cmp15 = ($3|0)>(-1);
     if ($cmp15) {
      $call17 = (___lockfile($f$addr$022)|0);
      $cond20 = $call17;
     } else {
      $cond20 = 0;
     }
     $wpos = ((($f$addr$022)) + 20|0);
     $4 = HEAP32[$wpos>>2]|0;
     $wbase = ((($f$addr$022)) + 28|0);
     $5 = HEAP32[$wbase>>2]|0;
     $cmp21 = ($4>>>0)>($5>>>0);
     if ($cmp21) {
      $call23 = (___fflush_unlocked($f$addr$022)|0);
      $or = $call23 | $r$021;
      $r$1 = $or;
     } else {
      $r$1 = $r$021;
     }
     $tobool25 = ($cond20|0)==(0);
     if (!($tobool25)) {
      ___unlockfile($f$addr$022);
     }
     $next = ((($f$addr$022)) + 56|0);
     $f$addr$0 = HEAP32[$next>>2]|0;
     $tobool12 = ($f$addr$0|0)==(0|0);
     if ($tobool12) {
      $r$0$lcssa = $r$1;
      break;
     } else {
      $f$addr$022 = $f$addr$0;$r$021 = $r$1;
     }
    }
   }
   ___ofl_unlock();
   $retval$0 = $r$0$lcssa;
  } else {
   $lock = ((($f)) + 76|0);
   $0 = HEAP32[$lock>>2]|0;
   $cmp = ($0|0)>(-1);
   if (!($cmp)) {
    $call118 = (___fflush_unlocked($f)|0);
    $retval$0 = $call118;
    break;
   }
   $call = (___lockfile($f)|0);
   $phitmp = ($call|0)==(0);
   $call1 = (___fflush_unlocked($f)|0);
   if ($phitmp) {
    $retval$0 = $call1;
   } else {
    ___unlockfile($f);
    $retval$0 = $call1;
   }
  }
 } while(0);
 return ($retval$0|0);
}
function ___fflush_unlocked($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $cmp = 0, $cmp4 = 0, $rend = 0, $retval$0 = 0, $rpos = 0, $seek = 0, $sub$ptr$lhs$cast = 0, $sub$ptr$rhs$cast = 0, $sub$ptr$sub = 0, $tobool = 0, $wbase = 0, $wend = 0, $wpos = 0;
 var $write = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $wpos = ((($f)) + 20|0);
 $0 = HEAP32[$wpos>>2]|0;
 $wbase = ((($f)) + 28|0);
 $1 = HEAP32[$wbase>>2]|0;
 $cmp = ($0>>>0)>($1>>>0);
 if ($cmp) {
  $write = ((($f)) + 36|0);
  $2 = HEAP32[$write>>2]|0;
  (FUNCTION_TABLE_iiii[$2 & 3]($f,0,0)|0);
  $3 = HEAP32[$wpos>>2]|0;
  $tobool = ($3|0)==(0|0);
  if ($tobool) {
   $retval$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $rpos = ((($f)) + 4|0);
  $4 = HEAP32[$rpos>>2]|0;
  $rend = ((($f)) + 8|0);
  $5 = HEAP32[$rend>>2]|0;
  $cmp4 = ($4>>>0)<($5>>>0);
  if ($cmp4) {
   $sub$ptr$lhs$cast = $4;
   $sub$ptr$rhs$cast = $5;
   $sub$ptr$sub = (($sub$ptr$lhs$cast) - ($sub$ptr$rhs$cast))|0;
   $seek = ((($f)) + 40|0);
   $6 = HEAP32[$seek>>2]|0;
   (FUNCTION_TABLE_iiii[$6 & 3]($f,$sub$ptr$sub,1)|0);
  }
  $wend = ((($f)) + 16|0);
  HEAP32[$wend>>2] = 0;
  HEAP32[$wbase>>2] = 0;
  HEAP32[$wpos>>2] = 0;
  HEAP32[$rend>>2] = 0;
  HEAP32[$rpos>>2] = 0;
  $retval$0 = 0;
 }
 return ($retval$0|0);
}
function runPostSets() {
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var end = 0, aligned_end = 0, block_aligned_end = 0, value4 = 0;
    end = (ptr + num)|0;

    value = value & 0xff;
    if ((num|0) >= 67 /* 64 bytes for an unrolled loop + 3 bytes for unaligned head*/) {
      while ((ptr&3) != 0) {
        HEAP8[((ptr)>>0)]=value;
        ptr = (ptr+1)|0;
      }

      aligned_end = (end & -4)|0;
      block_aligned_end = (aligned_end - 64)|0;
      value4 = value | (value << 8) | (value << 16) | (value << 24);

      while((ptr|0) <= (block_aligned_end|0)) {
        HEAP32[((ptr)>>2)]=value4;
        HEAP32[(((ptr)+(4))>>2)]=value4;
        HEAP32[(((ptr)+(8))>>2)]=value4;
        HEAP32[(((ptr)+(12))>>2)]=value4;
        HEAP32[(((ptr)+(16))>>2)]=value4;
        HEAP32[(((ptr)+(20))>>2)]=value4;
        HEAP32[(((ptr)+(24))>>2)]=value4;
        HEAP32[(((ptr)+(28))>>2)]=value4;
        HEAP32[(((ptr)+(32))>>2)]=value4;
        HEAP32[(((ptr)+(36))>>2)]=value4;
        HEAP32[(((ptr)+(40))>>2)]=value4;
        HEAP32[(((ptr)+(44))>>2)]=value4;
        HEAP32[(((ptr)+(48))>>2)]=value4;
        HEAP32[(((ptr)+(52))>>2)]=value4;
        HEAP32[(((ptr)+(56))>>2)]=value4;
        HEAP32[(((ptr)+(60))>>2)]=value4;
        ptr = (ptr + 64)|0;
      }

      while ((ptr|0) < (aligned_end|0) ) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    // The remaining bytes.
    while ((ptr|0) < (end|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (end-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function ___muldsi3($a, $b) {
    $a = $a | 0;
    $b = $b | 0;
    var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
    $1 = $a & 65535;
    $2 = $b & 65535;
    $3 = Math_imul($2, $1) | 0;
    $6 = $a >>> 16;
    $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
    $11 = $b >>> 16;
    $12 = Math_imul($11, $1) | 0;
    return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
    $a$0 = $a$0 | 0;
    $a$1 = $a$1 | 0;
    $b$0 = $b$0 | 0;
    $b$1 = $b$1 | 0;
    var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
    $x_sroa_0_0_extract_trunc = $a$0;
    $y_sroa_0_0_extract_trunc = $b$0;
    $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
    $1$1 = tempRet0;
    $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
    return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function _sbrk(increment) {
    increment = increment|0;
    var oldDynamicTop = 0;
    var oldDynamicTopOnChange = 0;
    var newDynamicTop = 0;
    var totalMemory = 0;
    increment = ((increment + 15) & -16)|0;
    oldDynamicTop = HEAP32[DYNAMICTOP_PTR>>2]|0;
    newDynamicTop = oldDynamicTop + increment | 0;

    if (((increment|0) > 0 & (newDynamicTop|0) < (oldDynamicTop|0)) // Detect and fail if we would wrap around signed 32-bit int.
      | (newDynamicTop|0) < 0) { // Also underflow, sbrk() should be able to be used to subtract.
      abortOnCannotGrowMemory()|0;
      ___setErrNo(12);
      return -1;
    }

    HEAP32[DYNAMICTOP_PTR>>2] = newDynamicTop;
    totalMemory = getTotalMemory()|0;
    if ((newDynamicTop|0) > (totalMemory|0)) {
      if ((enlargeMemory()|0) == 0) {
        HEAP32[DYNAMICTOP_PTR>>2] = oldDynamicTop;
        ___setErrNo(12);
        return -1;
      }
    }
    return oldDynamicTop|0;
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    var aligned_dest_end = 0;
    var block_aligned_dest_end = 0;
    var dest_end = 0;
    // Test against a benchmarked cutoff limit for when HEAPU8.set() becomes faster to use.
    if ((num|0) >=
      8192
    ) {
      return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    }

    ret = dest|0;
    dest_end = (dest + num)|0;
    if ((dest&3) == (src&3)) {
      // The initial unaligned < 4-byte front.
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      aligned_dest_end = (dest_end & -4)|0;
      block_aligned_dest_end = (aligned_dest_end - 64)|0;
      while ((dest|0) <= (block_aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        HEAP32[(((dest)+(4))>>2)]=((HEAP32[(((src)+(4))>>2)])|0);
        HEAP32[(((dest)+(8))>>2)]=((HEAP32[(((src)+(8))>>2)])|0);
        HEAP32[(((dest)+(12))>>2)]=((HEAP32[(((src)+(12))>>2)])|0);
        HEAP32[(((dest)+(16))>>2)]=((HEAP32[(((src)+(16))>>2)])|0);
        HEAP32[(((dest)+(20))>>2)]=((HEAP32[(((src)+(20))>>2)])|0);
        HEAP32[(((dest)+(24))>>2)]=((HEAP32[(((src)+(24))>>2)])|0);
        HEAP32[(((dest)+(28))>>2)]=((HEAP32[(((src)+(28))>>2)])|0);
        HEAP32[(((dest)+(32))>>2)]=((HEAP32[(((src)+(32))>>2)])|0);
        HEAP32[(((dest)+(36))>>2)]=((HEAP32[(((src)+(36))>>2)])|0);
        HEAP32[(((dest)+(40))>>2)]=((HEAP32[(((src)+(40))>>2)])|0);
        HEAP32[(((dest)+(44))>>2)]=((HEAP32[(((src)+(44))>>2)])|0);
        HEAP32[(((dest)+(48))>>2)]=((HEAP32[(((src)+(48))>>2)])|0);
        HEAP32[(((dest)+(52))>>2)]=((HEAP32[(((src)+(52))>>2)])|0);
        HEAP32[(((dest)+(56))>>2)]=((HEAP32[(((src)+(56))>>2)])|0);
        HEAP32[(((dest)+(60))>>2)]=((HEAP32[(((src)+(60))>>2)])|0);
        dest = (dest+64)|0;
        src = (src+64)|0;
      }
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    } else {
      // In the unaligned copy case, unroll a bit as well.
      aligned_dest_end = (dest_end - 4)|0;
      while ((dest|0) < (aligned_dest_end|0) ) {
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        HEAP8[(((dest)+(1))>>0)]=((HEAP8[(((src)+(1))>>0)])|0);
        HEAP8[(((dest)+(2))>>0)]=((HEAP8[(((src)+(2))>>0)])|0);
        HEAP8[(((dest)+(3))>>0)]=((HEAP8[(((src)+(3))>>0)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
      }
    }
    // The remaining unaligned < 4 byte tail.
    while ((dest|0) < (dest_end|0)) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
    }
    return ret|0;
}
function _memmove(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if (((src|0) < (dest|0)) & ((dest|0) < ((src + num)|0))) {
      // Unlikely case: Copy backwards in a safe manner
      ret = dest;
      src = (src + num)|0;
      dest = (dest + num)|0;
      while ((num|0) > 0) {
        dest = (dest - 1)|0;
        src = (src - 1)|0;
        num = (num - 1)|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      }
      dest = ret;
    } else {
      _memcpy(dest, src, num) | 0;
    }
    return dest | 0;
}

  
function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&1](a1|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&3](a1|0,a2|0,a3|0)|0;
}

function b0(p0) {
 p0 = p0|0; abort(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; abort(1);return 0;
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_ii = [b0,___stdio_close];
var FUNCTION_TABLE_iiii = [b1,___stdout_write,___stdio_seek,___stdio_write];

  return { stackSave: stackSave, _curve25519_sign: _curve25519_sign, getTempRet0: getTempRet0, _bitshift64Lshr: _bitshift64Lshr, _i64Subtract: _i64Subtract, _bitshift64Shl: _bitshift64Shl, _curve25519_verify: _curve25519_verify, _fflush: _fflush, _bitshift64Ashr: _bitshift64Ashr, _memset: _memset, _sbrk: _sbrk, _memcpy: _memcpy, stackAlloc: stackAlloc, ___muldi3: ___muldi3, _crypto_sign_ed25519_ref10_ge_scalarmult_base: _crypto_sign_ed25519_ref10_ge_scalarmult_base, _curve25519_donna: _curve25519_donna, setTempRet0: setTempRet0, _i64Add: _i64Add, _emscripten_get_global_libc: _emscripten_get_global_libc, ___errno_location: ___errno_location, ___muldsi3: ___muldsi3, _free: _free, runPostSets: runPostSets, setThrew: setThrew, establishStackSpace: establishStackSpace, _memmove: _memmove, _sph_sha512_init: _sph_sha512_init, stackRestore: stackRestore, _malloc: _malloc, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_ii: dynCall_ii, dynCall_iiii: dynCall_iiii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);

var stackSave = Module["stackSave"] = asm["stackSave"];
var _curve25519_sign = Module["_curve25519_sign"] = asm["_curve25519_sign"];
var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _curve25519_verify = Module["_curve25519_verify"] = asm["_curve25519_verify"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var _bitshift64Ashr = Module["_bitshift64Ashr"] = asm["_bitshift64Ashr"];
var _memset = Module["_memset"] = asm["_memset"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var ___muldi3 = Module["___muldi3"] = asm["___muldi3"];
var _crypto_sign_ed25519_ref10_ge_scalarmult_base = Module["_crypto_sign_ed25519_ref10_ge_scalarmult_base"] = asm["_crypto_sign_ed25519_ref10_ge_scalarmult_base"];
var _curve25519_donna = Module["_curve25519_donna"] = asm["_curve25519_donna"];
var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _emscripten_get_global_libc = Module["_emscripten_get_global_libc"] = asm["_emscripten_get_global_libc"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var ___muldsi3 = Module["___muldsi3"] = asm["___muldsi3"];
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var setThrew = Module["setThrew"] = asm["setThrew"];
var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _sph_sha512_init = Module["_sph_sha512_init"] = asm["_sph_sha512_init"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
;
Runtime.stackAlloc = Module['stackAlloc'];
Runtime.stackSave = Module['stackSave'];
Runtime.stackRestore = Module['stackRestore'];
Runtime.establishStackSpace = Module['establishStackSpace'];
Runtime.setTempRet0 = Module['setTempRet0'];
Runtime.getTempRet0 = Module['getTempRet0'];


// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;






/**
 * @constructor
 * @extends {Error}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      var toLog = e;
      if (e && typeof e === 'object' && e.stack) {
        toLog = [e, e.stack];
      }
      Module.printErr('exception thrown: ' + toLog);
      Module['quit'](1, e);
    }
  } finally {
    calledMain = true;
  }
}




/** @type {function(Array=)} */
function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return;

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    process['exit'](status);
  }
  Module['quit'](status, new ExitStatus(status));
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}





// {{MODULE_ADDITIONS}}




/* vim: ts=4:sw=4:expandtab */
var Internal = Internal || {};

(function() {
    'use strict';

    // Insert some bytes into the emscripten memory and return a pointer
    function _allocate(bytes) {
        var address = Module._malloc(bytes.length);
        Module.HEAPU8.set(bytes, address);

        return address;
    }

    function _readBytes(address, length, array) {
        array.set(Module.HEAPU8.subarray(address, address + length));
    }

    var basepoint = new Uint8Array(32);
    basepoint[0] = 9;

    Internal.curve25519 = {
        keyPair: function(privKey) {
            var priv = new Uint8Array(privKey);
            priv[0]  &= 248;
            priv[31] &= 127;
            priv[31] |= 64;

            // Where to store the result
            var publicKey_ptr = Module._malloc(32);

            // Get a pointer to the private key
            var privateKey_ptr = _allocate(priv);

            // The basepoint for generating public keys
            var basepoint_ptr = _allocate(basepoint);

            // The return value is just 0, the operation is done in place
            var err = Module._curve25519_donna(publicKey_ptr,
                                            privateKey_ptr,
                                            basepoint_ptr);

            var res = new Uint8Array(32);
            _readBytes(publicKey_ptr, 32, res);

            Module._free(publicKey_ptr);
            Module._free(privateKey_ptr);
            Module._free(basepoint_ptr);

            return { pubKey: res.buffer, privKey: priv.buffer };
        },
        sharedSecret: function(pubKey, privKey) {
            // Where to store the result
            var sharedKey_ptr = Module._malloc(32);

            // Get a pointer to our private key
            var privateKey_ptr = _allocate(new Uint8Array(privKey));

            // Get a pointer to their public key, the basepoint when you're
            // generating a shared secret
            var basepoint_ptr = _allocate(new Uint8Array(pubKey));

            // Return value is 0 here too of course
            var err = Module._curve25519_donna(sharedKey_ptr,
                                               privateKey_ptr,
                                               basepoint_ptr);

            var res = new Uint8Array(32);
            _readBytes(sharedKey_ptr, 32, res);

            Module._free(sharedKey_ptr);
            Module._free(privateKey_ptr);
            Module._free(basepoint_ptr);

            return res.buffer;
        },
        sign: function(privKey, message) {
            // Where to store the result
            var signature_ptr = Module._malloc(64);

            // Get a pointer to our private key
            var privateKey_ptr = _allocate(new Uint8Array(privKey));

            // Get a pointer to the message
            var message_ptr = _allocate(new Uint8Array(message));

            var err = Module._curve25519_sign(signature_ptr,
                                              privateKey_ptr,
                                              message_ptr,
                                              message.byteLength);

            var res = new Uint8Array(64);
            _readBytes(signature_ptr, 64, res);

            Module._free(signature_ptr);
            Module._free(privateKey_ptr);
            Module._free(message_ptr);

            return res.buffer;
        },
        verify: function(pubKey, message, sig) {
            // Get a pointer to their public key
            var publicKey_ptr = _allocate(new Uint8Array(pubKey));

            // Get a pointer to the signature
            var signature_ptr = _allocate(new Uint8Array(sig));

            // Get a pointer to the message
            var message_ptr = _allocate(new Uint8Array(message));

            var res = Module._curve25519_verify(signature_ptr,
                                                publicKey_ptr,
                                                message_ptr,
                                                message.byteLength);

            Module._free(publicKey_ptr);
            Module._free(signature_ptr);
            Module._free(message_ptr);

            return res !== 0;
        }
    };

    Internal.curve25519_async = {
        keyPair: function(privKey) {
            return new Promise(function(resolve) {
                resolve(Internal.curve25519.keyPair(privKey));
            });
        },
        sharedSecret: function(pubKey, privKey) {
            return new Promise(function(resolve) {
                resolve(Internal.curve25519.sharedSecret(pubKey, privKey));
            });
        },
        sign: function(privKey, message) {
            return new Promise(function(resolve) {
                resolve(Internal.curve25519.sign(privKey, message));
            });
        },
        verify: function(pubKey, message, sig) {
            return new Promise(function(resolve, reject) {
                if (Internal.curve25519.verify(pubKey, message, sig)) {
                    reject(new Error("Invalid signature"));
                } else {
                    resolve();
                }
            });
        },
    };

})();

var Internal = Internal || {};
// I am the worker
this.onmessage = function(e) {
    Internal.curve25519_async[e.data.methodName].apply(null, e.data.args).then(function(result) {
        postMessage({ id: e.data.id, result: result });
    }).catch(function(error) {
        postMessage({ id: e.data.id, error: error.message });
    });
};

})();