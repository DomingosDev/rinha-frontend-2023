const {faker} = require('@faker-js/faker');
const fs = require('fs');
const { finished } = require('node:stream/promises');
const args = process.argv.slice(2);
let mark = +new Date;
let start = +new Date;

if( help() ){
  return;
}

const size_regex = /^\d+([k|m|g])?$/;
const profiles = [];
const config = {
  file: args.shift(),
  array: false,
  corrupt: false,
  encode_corruption: false,
  size: 1,
  nested:2,
  max_connections: 2,
  stream: null,
  current_size: 0,
  verbose: false
};

if( args.indexOf('-v') !== -1 ){
  console.log(`Gerando arquivo com a config:\n${JSON.stringify(config, null, 2)}`);
}

setConfig();         displayDuration('Setup inicial');
generateProfiles();  displayDuration('Perfils gerados');
init();              displayDuration('Arquivo inicial');
addData();           displayDuration('Adicionar dados');
write();             displayDuration('Arquivo finalizado');

(async () => { 
  await corrupt();
  config.corrupt && displayDuration('Arquivo corrompido'); 
  end();
})()

return;

function help(){
  if(args.indexOf('--help') === -1){
    
    return;
  }
  console.log(`
[Gerador de json aleatório]
uso: node gen.js [arquivo]

Parametros:
  [tamanho][medida] = Tamanho do arquivo na medida ex: 100 100m 100k 100g
  --array = gerar arquivo que inicia como array
  --corrupt = gerar arquivo corrompido
  --encode-corrupt = gerar um arquivo corrompido com caractere inválido
  --nested  = nível máximo de objetos aninhados
  --max-connections: máximo de conexões que um user pode ter em seu array connections
  -v = modo verboso ( demostra os tempos de execução das funções )

Exemplo de uso:
node gen.json json/array.100mb.json 100mb --array
`);
  return true;
}

function generateProfiles(){
  for(let i=0; i<20; i++){
    profiles.push(JSON.stringify(createRandomUser()));
  }
}

async function setConfig(){
  for(const item of args){
    if(item == '--corrupt'){
      config.corrupt = true;
      continue;
    }

    if(item == '--encode-corrupt'){
      config.corrupt = true;
      config.encode_corruption = true;
      continue;
    }

    if(item == '-v'){
      config.verbose = true;
    }

    if(item == '--array'){
      config.array = true;
      continue;
    }

    if(item.indexOf('--nested=') === 0){
      config.nested = parseInt(item.slice(9))
      continue;
    }

    if(item.indexOf('--max-connections=') === 0){
      config.max_connections = parseInt(item.slice(18))
    }

    let size = size_regex.exec(item);
    if( size ){
      config.size = calculateSize(size);
      continue;
    }
  }
}

function calculateSize([size, modifier]){
  const multipliers = {
    'k': 1024,
    'm': 1024 * 1024,
    'g': 1024 * 1024 * 1024
  }

  if( modifier ){
    size = size.split(modifier).join('')
  }

  return parseInt(size) * ((modifier)? multipliers[modifier] : 1);
}

function init(){
  const header = (config.array)? '[' : '{"success":true,"data":[';
  config.current_size = header.length
  fs.writeFileSync(config.file, header);
  config.stream = fs.createWriteStream(config.file, {flags:'a'}); 
}

function addData(){
  while( config.current_size < config.size){
    let key = Math.ceil(Math.random() * 10000) % profiles.length
    let user_data = profiles[key];
    if( config.current_size + user_data.length < config.size ){
      user_data += ',';
    }
    config.stream.write(user_data);
    config.current_size += user_data.length
  }
}

function createRandomUser(deep = 0) {
  const connections_size = Math.ceil((Math.random()*1000) % config.max_connections);
  const has_connections = !!((Math.random() * 100) % 2);
  let connections = null

  if( has_connections && deep <= config.nested ){
    connections = Array.from(
      new Array(connections_size).keys()
    ).map(
      createRandomUser.bind(null, deep+1)
    );
  }

  return {
    _id: faker.string.uuid(),
    nid: faker.number.int(5250),
    active: faker.number.binary(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    balance: faker.number.float(),
    subscriptionTier: faker.helpers.arrayElement(['free', 'basic', 'business']),
    profile:{
      avatar: faker.image.avatar(),
      email: faker.internet.email(),
      sex: faker.person.sexType(),
      birthday: faker.date.birthdate(),
    },
    connections
  };
}

function write(){
  config.stream.write(']')

  if( !config.array ){
    config.stream.write('}')
  }

  config.stream.end();
}

async function corrupt(){
  if(!config.corrupt){
    return;
  }

  await finished(config.stream);
  const { size } = fs.statSync(config.file);
  const pos = Math.floor( (Math.random() * 10000) % size);
  const text = (config.encode_corruption)?`\xf0\x28[corruption]\x8c\xbc` : '"[corruption]"' ;

  fs.open(config.file, "r+", (err, fd) => {
    if(err){
      return;
    }
    const buffer = Buffer.from(text);
    fs.write(fd, buffer, 0, buffer.length, pos, () => {});
  });
}

function end(){
  console.log(`${config.file} salvo, tempo total de execução: ${((+new Date - start)/1000).toFixed(2)}s`)
};

function displayDuration(name){
  if(!config.verbose){
    return;
  }

  console.log(`${name} executado em ${+new Date - mark}ms`);
  mark = +new Date;
}