import * as db from 'db'

const types = {
  0: renderVariable,  
  1: renderObject,
  2: renderArray
}

const keyvalueReg = /^\s*"(?<name>.*)"\s*:\s*((?<text>".*")|(?<number>\d+.?(\d+)([eE][+-])?\d*)|(?<primitive>(true|false|null))),?$/
const primitiveReg = /^(("(?<text>.*)")|(?<number>\d+.?(\d+)([eE][+-])?\d*)|(?<primitive>(true|false|null)))$/
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
    const ident  = (config & 31) >> 3;
    const data = {
      id,
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
  for(let i=id;i>0;i++){
      if( db.view.lines[i] >> 3 != ident ){
        return id-i+1;
    }   
  }
}


function renderObject({id, text, ident}, data){
  let cleared = text.replaceAll(/\s/g, '');
  let pos = findMyPos(id, ident);

  if(cleared == '{'){
    if( pos == undefined ){
      data.decoration = '{'
      data.ident = ident * 20;
      return compile('{{>ident}}{{>decoration}}');
    }

    data.class = 'is-muted';
    data.value  = `${pos}:`;
    data.ident = (ident-1) * 20;
    return compile('{{>ident}}{{>value}}')
    
  }

  if( ['}', '},'].indexOf(cleared) != -1 ){
    return false;
  }

  const match = namedObjReg.exec(text);
  return false;

}

function renderVariable({id, text, ident}, data){
  data.ident = ident * 20;

  let match = keyvalueReg.exec(text)
  if(match){
    data.value = match.groups.text || match.groups.number || match.groups.primitive;
    data.name  = match.groups.name
    return compile('{{>ident}}{{>name}} : {{>value}}')    
  }


  let pos = findMyPos(id, ident);
  data.class = 'is-muted';
  data.value  = `${pos}: ${text}`;
  data.ident = (ident-1) * 20;
  return compile('{{>ident}}{{>value}}');
}

function renderArray({id, text, ident}, data){
  
  data.ident = ident * 20;

  const match = namedArrayReg.exec(text);
  if(match){
    data.name = match.groups.name.concat(':')
    data.decoration = '[';
    data.ident = ident * 20;
    return compile('{{>ident}}{{>name}}{{>decoration}}');
  }

  return compile('{{>ident}}{{>value}}');
}
