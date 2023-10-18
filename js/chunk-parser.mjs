import { scaped_string, json_controls } from './regex.mjs'

export const state = {
  ident : 0,
  pointer: 0,
  trailling: '',

  is_object_history : [],
  is_object : false,
}

const types = {
  'variable'  : 0,  
  'object'    : 1,
  'array'     : 2,
}

export function reset(){
  Object.assign(
    state,
    {
      ident:0,
      line:null,
      is_object_history:[],
      is_object:false,
      ident_index:{}
    }
  )
}

function findLast(chunk){
  const indexes = [
    chunk.lastIndexOf(','),
    chunk.lastIndexOf('}'),
    chunk.lastIndexOf(']'),
    chunk.lastIndexOf('['),
    chunk.lastIndexOf('{')
  ]
  .filter(item => item !== -1)
  ;
  const index = Math.max.apply(null, indexes);

  if(index === Infinity){
    return null;
  }

  return index+1;
}

const openings = ['[', '{'];
const closings = [']', '],', '}', '},'];
const variable = ',';

function makeConfig(item){
  let array  = ['[',']','],'];
  let object = ['{', '}', '},'];

  if(array.indexOf(item) !== -1){
    return (state.ident << 3) | ( types.array << 1 ) | 1
  }

  if(object.indexOf(item) !== -1 ){
    return (state.ident << 3) | ( types.object ) << 1  | 1
  }

  return (state.ident << 3) | ( types.variable ) << 1  | 1
}

export function parse(chunk){
  const lines = [];
  const config = [];
  chunk = state
            .trailling
            .concat( chunk )
            .replaceAll(
              scaped_string, 
              match => '$'.repeat(match.length)
            );

  const last = findLast(chunk);

  if(last !== null){
    state.trailling = chunk.slice(last);
    chunk = chunk.slice(0,last);
  }

  let m;
  let item = '';
  while ((m = json_controls.exec(chunk)) !== null) {
    if (m.index === json_controls.lastIndex) {
        json_controls.lastIndex++;
    }

    item = m.shift();

    if( openings.indexOf( item ) != -1 ){
      lines.push( state.pointer + m.index + 1);
      config.push( makeConfig(item) );
      state.ident++
      continue;
    }

    if( item === variable ){
      lines.push( state.pointer + m.index + 1);
      config.push( makeConfig( item ) );
      continue;
    }

    if( closings.indexOf(item) != -1 ){
      lines.push( state.pointer + m.index + m.length );
      config.push( makeConfig( item ) );
      state.ident--;
      continue;
    }
  }

  state.pointer += chunk.length;

  return {
    lines,
    config
  }
}