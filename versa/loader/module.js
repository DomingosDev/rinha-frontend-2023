import {Component, emit} from 'Component'

let is_google_fonts_loaded = false;

export default class LoaderComponent extends Component{
	name="loader"
	
  elements = {
    input: {
			change: this.load
		},
	}

  install(base){

    if(is_google_fonts_loaded){
      base.element('title').node.focus();
      base.state('active', true);
      return;
    }

    const font = document.createElement('link')
    font.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap')
    font.setAttribute('rel', 'stylesheet')
    font.onload = () => {
      is_google_fonts_loaded = true;
      this.install(base)
    }
    document.body.appendChild(font)
  }

  async load(base, element, event){
    const file = event.target.files[0];
    base.state('active', false);
    emit(
      'file-loaded@app', 
      { 
        name: file.name,
        size: file.size,
        file
      }
    );
  }
}