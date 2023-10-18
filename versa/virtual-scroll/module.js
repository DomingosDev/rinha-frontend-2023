import {Component, emit} from 'Component'
import { app } from '../../js/app.mjs';

export default class VirtualScrollComponent extends Component{
	name = "virtual-scroll"
	
  elements = {
    target:{
      wheel: this.scroll,
      keydown: this.keydown
    },
    bar: {
      mousemove: this.move
    },
    button: {
      mouseup:   this.deactivateButton,
      mousedown: this.activateButton
    }
	}

  install(base){
    const viewport = base.node.clientHeight;
    const height = parseInt(base.node.dataset['height']);
    const ratio = (viewport / height * 100).toFixed(2);
    const button = base.element('button').node;

    button.style.cssText = `height:${ratio}%;`;
    button.dataset['ratio'] = ratio;

    document.body.addEventListener('keydown', this.keydown.bind(this, base, base.element('target')) )
  }

  getCurrentTop(css){
    if(!css){
      return 0;
    }
    const text = '--vscroll-top:'
    const textEnd = 'px';

    const init = css.indexOf(text) + text.length;
    const end  = css.indexOf(textEnd, init);
    return css.slice(init, end);
  }

  scroll(base, element, event){
    const max = 0;
    const min = base.node.clientHeight - parseInt(element.node.dataset['height']);
    let actual = parseInt(this.getCurrentTop(base.node.style.cssText)); 

    actual += ( event.deltaY < 0 )? 28 : -28

    if(actual > max){
      actual = max
    }

    if(actual < min){
      actual = min
    }

    base.node.style.cssText = `--vscroll-top:${actual}px`;

    const _event = new Event("scroll");
    _event.payload = {
      top: actual
    }
    element.node.dispatchEvent(_event);
  }

  move(base, element, event){
    if(!event.buttons){
      return;
    }

    if(!element.node.dataset['lastpos']){
      return;
    }

    let movement = event.clientY - parseInt(element.node.dataset['lastpos']);
    const button = base.element('button').node
    const ratio = parseFloat(button.dataset['ratio']);
    const max = base.node.clientHeight * (1 -(ratio/100))
    const min = 0;
    
    if(movement < 0){
      movement = 0;
    }
    
    if(movement > max){
      movement = Math.ceil(max);      
    }
   
    base.element('button').node.style.cssText = `top:${movement}px; height:${ratio}%`
  }

  activateButton(base, element, event){
    base.element('bar').node.dataset['lastpos'] = event.clientY;
    element.state('active', true)
  }

  deactivateButton(base, element, event){
    // console.log( element );
    base.element('bar').node.dataset['lastpos'] = null;
    element.state('active', false)
  }

  keydown(base, element, event){
    if( [33,34].indexOf(event.which) == -1 ){
      return;
    }

    let direction = (event.which == 34)? 1 : -1;
    this.scroll(base, element, {deltaY:direction});
  }

}