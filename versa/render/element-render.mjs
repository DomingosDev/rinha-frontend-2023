import * as db from 'db'

const types = {
  0: renderVariable,  
  1: renderObject,
  2: renderArray
}

const keyvalueReg = /^\s*"(?<name>.*)"\s*:\s*((?<text>".*")|(?<number>\d+.?(\d+)([eE][+-])?\d*)|(?<primitive>(true|false|null))),?$/
const primitiveReg = /^(("(?<text>.*)")|(?<number>\d+.?(\d+)([eE][+-])?\d*)|(?<primitive>(true|false|null))),?$/
const namedArrayReg = /^\s*"(?<name>.*)"\s*:\s*\[\s*$/;
const namedObjReg = /^\s*"(?<name>.*)"\s*:\s*\{\s*$/;

const templates = {
  item : '<div class="render__item {{class}}"  data-id="{{id}}">{{>info}}{{>contents}}{{>info}}</div>',
  contents: '<div class="render__item-contents">{{contents}}</div>',
  info:  '<div class="render__item-info"></div>',

  name: '<div class="render__item-name">{{name}}</div>',
  value: '<div class="render__item-value">{{value}}</div>',
  decoration: '<div class="render__item-decoration">{{decoration}}</div>',
  ident: '<div class="render__item-ident" style="padding-left:{{ident}}px"></div>'
}

for(let i in templates){
  templates[i] = compile(templates[i]);
}

function compile(template){
  return template
    .replaceAll(/\{\{\>(?<partial>[^\}]+)\}\}/g, (match) => {
      return templates[match.slice(3,-2)] || '';
    });
}

export function render(text, id){
  const config = db.view.config[id];
    const active = config & 1;
    const type   = (config & 6) >> 1;
    const ident  = config  >> 3;

    const data = {
      id,
      ident: ident * 20,
      name:'',
      value:'',
      decoration:'',
      class: '',
      padding: '',
    };

    let template = types[type]({id, text, ident}, data);

    if(!template){
      return false;
    }
    
    return templates['item']
      .replace('{{contents}}', template)
      .replaceAll(
        /{{[^}]*}}/g, 
        (variable) => data[variable.slice(2,-2)]
      );
}


function findMyPos(id, ident){
  let pos = 0;

  for(let i=id-1;i>0;i--){
    let current = (db.view.config[i] >> 3 );
    
    if(current == ident){
      pos += 1
    }

    if( current < ident ){
      return pos;
    }   
  }

  return pos;
}


function renderObject({id, text, ident}, data){
  let cleared = text.replaceAll(/\s/g, '');
  let pos = findMyPos(id, ident);

  if(cleared == '{'){
    if( pos == 0 && !ident){
      data.decoration = '{'
      return compile('{{>ident}}{{>decoration}}');
    }

    data.class = 'is-muted';
    data.value  = `${pos}:`;
    return compile('{{>ident}}{{>value}}')
    
  }

  if( ['}', '},'].indexOf(cleared) != -1 ){
    return false;
  }

  const match = namedObjReg.exec(text);
  return false;
}

function renderVariable({id, text, ident}, data){

  let keyvalue = keyvalueReg.exec(text)
  if(keyvalue){
    data.value = keyvalue.groups.text || keyvalue.groups.number || keyvalue.groups.primitive;
    data.name  = keyvalue.groups.name
    return compile('{{>ident}}{{>name}} : {{>value}}')    
  }

  let primitive = primitiveReg.exec(text.trim())
  if(primitive){
    let pos = findMyPos(id, ident);
    data.class = 'is-muted';
    data.value  = `${pos}: ${text}`;
    return compile('{{>ident}}{{>value}}');
  }

  data.name = text;
  return compile('{{>ident}}{{>name}}')
}

function renderArray({id, text, ident}, data){
  let cleared = text.replaceAll(/\s/g, '');
  if(cleared == '['){
    let pos = findMyPos(id, ident);
    if( pos == -1 ){
      data.decoration = '['
      return compile('{{>ident}}{{>decoration}}');
    }

    data.class = 'is-muted';
    data.name  = `${pos}:`;
    return compile('{{>ident}}{{>name}}')
  }

  const match = namedArrayReg.exec(text);
  if(match){
    data.name = match.groups.name.concat(':')
    data.decoration = '[';
    return compile('{{>ident}}{{>name}}{{>decoration}}');
  }

  data.value = text;
  return compile('{{>ident}}{{>value}}');
}
