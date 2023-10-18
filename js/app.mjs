import {BEM, on, emit} from 'Component'
import * as parser from './chunk-parser.mjs';
import * as formatter from './json-formatter.mjs';
import * as db from './db.mjs'

export const app = {
  /**
   * Flags de controle da aplicação
  **/
  stop: false,      // flag para parar o processamento atual
  done: false,      // finalizou um processamento
  has_error: false, // existem linhas fora do padrão JSON
  db: db,


  // Configurações da armazenagem de dados
  /**
   *  O array padrão começou desperdiçar processamento 
   *  a partir do índice 65535 no firefox e ~46000 no chrome
   *  então divido esse array gigante em array menores
   *  
   *  ver array-db.js
  **/
  line_count: 0,      // total plano de linhas    
  db_limit: 2**15-1,//2**32-1,  // Chaves de array com no máximo 16 bits
  lines:[],         
  deep: 1,          
  

  // Fila de processamento de chunks
  /**
  *  uma chunk padrão do reader é 65535 caracteres,
  *  o que deixa lentas as operações quando convertidas para array
  **/
  chunk_size: 65534/2,
  queue: [], // onde ficará armazenada a fila de processamento

  // Controle do render
  /**
   * O tempo médio do processamneto de uma chunk de 65535 caracteres era de 12ms
   * o que resultava em sobrecarga de reescrita no render
   * essas variáveis aplicam um debounce no envio, 
   * só serão enviadas mensagens a cada X ms, 
   * definidos no render_debounce_time
   * **/
  render_debounce_time:1000,  // aplicar fine-tuning caso hava overhead no render
  last_render_notify:0,     // Guarda ultimo timestamp do envio ao render

  file: '',
  _count: 0,
  pointer: 0,
  start_time: 0
};

window.app = app;
// ouve o evento file-loaded emitido pelo loader component
on('file-loaded@app', processFile)
export default app;

async function processFile({payload}){
  reset();

  app.formater_state = parser.state;
  parser.reset();            
  formatter.reset();                                       
  performance.mark('Process File');
  db.init(payload.file);
  app.file = payload.file;
  app.start_time = +new Date

  processChunk(payload.file)

  emit(
    'init@render',
    { 
      size: payload.size, 
      name: payload.name,
      database: db
    }
  )
}

function reset(){
  Object.assign(
    app, 
    {
      stop:false,
      done: false,
      corrupt: false,
      lines:[],
      queue:[]
    }
  )
}

async function processChunk(file){
  const chunk_size = 2**15-1; // 32kb por vez, para evitar o overflow de 65535 itens em um array
  const decoded = await file.slice(app.pointer, app.pointer+chunk_size).text();

  if( !decoded ){
    return done();
  }

  const {lines, config} = parser.parse(decoded);
  db.insert('lines', lines);
  db.insert('config', config);

  app.line_count += lines.length;
  app.pointer+=chunk_size

  notifyRender()
  setTimeout(() => processChunk(file))
}

async function done(){
  await db.fixSizes('lines');
  await db.fixSizes('config');

  if(app.has_error){
    console.log( 'Processo corrompido' );
  }

  const time = (+new Date) - app.start_time;

  emit('done@render', {size:app.line_count});
  emit('success@toast',{
    title:`File has been fully loaded (${formatTime(time)})`,
    // subtitle:'Starting row validation'
  })
}

function formatTime(ms){
  if(ms < 1000){
    return ms.toString().concat('ms')
  }

  let seconds = ms / 1000;
  if( seconds < 60 ){
    return seconds.toFixed(2).concat('s')
  }

  let minutes = seconds / 60;
  if( minutes < 60 ){
    return minutes.toFixed(2).concat('m')
  }

  let hours = minutes / 60;
  return hours.toFixed(2).concat('h')
}

function notifyRender(){
  let now = +new Date;
  if(!app.last_render_notify || (now - app.last_render_notify) > app.render_debounce_time ){
    emit('update@render', { size:app.line_count, loaded: app.pointer, total: app.file.size })
    app.last_render_notify = now;
  }
}