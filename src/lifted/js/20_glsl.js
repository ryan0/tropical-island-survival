/* Lifted from legacy/src/js/20_glsl.js. The imports here and the exports at the end are new; the rest is build 78's. */
import './05_core.js';   /* first, so that the files still run in build 78's order */
import {GLSL_SRC} from 'virtual:shader-chunks';

/* Shader chunks live in src/glsl/*.glsl (and src/shared/*.glsl); the build embeds them as GLSL_SRC (name -> text).

   glsl(name)            the chunk with its  #include "other"  lines replaced by those chunks. A chunk is only ever
                         included once per call, so two chunks may both include a third.
   glslFill(name, vars)  fills the {{PLACEHOLDER}}s of a chunk, once, by whoever owns the numbers
                         (e.g. the wave trains are written into "waves" by 36_waves.js).

   three.js's own  #include <chunk>  lines use angle brackets and are left alone. */
function glsl(name,seen){
  seen=seen||{};
  if(seen[name])return '';
  seen[name]=true;
  var src=GLSL_SRC[name];
  if(src===undefined)throw new Error('missing shader chunk: '+name);
  var left=/\{\{(\w+)\}\}/.exec(src);
  if(left)throw new Error('shader chunk '+name+': placeholder {{'+left[1]+'}} was never filled in (glslFill)');
  return src.replace(/^[ \t]*#include "([\w.]+)"[ \t]*$/gm,function(_,n){return glsl(n,seen);});
}
function glslFill(name,vars){
  if(GLSL_SRC[name]===undefined)throw new Error('missing shader chunk: '+name);
  GLSL_SRC[name]=GLSL_SRC[name].replace(/\{\{(\w+)\}\}/g,function(_,k){
    if(!(k in vars))throw new Error('shader chunk '+name+': no value for {{'+k+'}}');
    return vars[k];
  });
}

export {glsl,glslFill};
