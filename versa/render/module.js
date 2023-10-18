import {Component, emit} from 'Component'
import * as db from 'db';
import * as element from './element-render.mjs';

const line_height = 28;


export default class RenderComponent extends Component{
	name = "render"
  buffers = []
  current_size = null
  current_line = 0;
	
  elements = {
	}

  global = {
    'update@render': this.update,
    'init@render': this.init
  }

  install(base){
    base.state('active', true);
    this.buffers = base
                    .element('main')
                      .append(`<div class="render__buffer"></div>`)
                      .append(`<div class="render__buffer"></div>`)
                    .elements('buffer')
                      .map(buffer => buffer);

    base
      .elements('buffer')
      .pop()
        .node
          .remove()

    const main = base.element('main');
    main.node.addEventListener('scroll', this.scroll.bind(this, base, main))
  }

  formatSize(size){
    if(size > 1000**3){
      return (size / 1000**3).toFixed(2).concat('GB')
    }
    if(size > 1000**2){
      return (size / 1000**2).toFixed(2).concat('MB')
    }
    if(size > 1000){
      return (size / 1000).toFixed(2).concat('KB')
    }

    return size.toString().concat('bytes')
  }

  init(base, {payload}){
    base
      .state('active', true)
        .element('title')
          .html(payload.name)
        .element('file-size', true)
          .html(this.formatSize(payload.size))
        .element('loading', true)
          .state('active', true)
  }

  update( base, {payload}){
    const size = payload.size;
    const height = line_height * size;
    this.current_size = base.node.clientHeight;
    base.element('main').node.dataset['height'] = height;
    this.render(base);
    const percent = Math.floor(payload.loaded / payload.total * 100) ;
    base.element('loading-line').node.style.cssText = ''
  }

  async render(base){

    const viewport = Math.ceil(this.current_size / line_height);
    const middle = Math.floor(viewport / 2)
    let   init = this.current_line - middle;
    if(init < 0){ init = 0 }
    const end  = init + viewport + 1;
    const quantity = end - init;

    const lines = Array.from(db.get('lines', {quantity, init}));

    if(!this.current_line){
      lines.unshift(0);
    }

    const items = [];

    for(let i=1; i<lines.length; i++){
      let last = lines[i-1];
      let item = lines[i];
      let content = await db.state.file.slice(last, item).text();
      let html = element.render(content, i+init-1);
      if(html){
        items.push(html);
      }
    }

    const current = this.buffers.shift();
    const next = this.buffers.shift();

    next.html(items.join(''));
    current.node.replaceWith(next.node)

    this.buffers.push(next);
    this.buffers.push(current);
  }

  scroll(base, element, event){
    const top = Math.abs((event.payload)? event.payload.top : element.node.scrollTop);

    this.current_line = Math.floor(top / line_height / 2);
    this.render(base);
  }

}
