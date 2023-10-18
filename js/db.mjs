const database = {}
const count = {}
const view = {}

const state = {
  file:null,
  estimated_size: 0
}

export { state, database, count, view };

export function init(file){
  state.file = file;
  state.estimated_size = Math.floor(file.size / 160) * 16
}

export async function fixSizes(key, type=Uint32Array){
    let buffer = new ArrayBuffer(count[key] * type.BYTES_PER_ELEMENT);
    let a = new type( buffer );
    let b = new type( database[key], 0, count[key]);
    a.set(b,0);
    database[key] = buffer;
    view[key] = a;
}

export async function insert(table, items, type=Uint32Array){
  performance.clearMarks('insert')
  performance.mark('insert');

  if(!database[table]){
    database[table] = new ArrayBuffer(state.estimated_size * type.BYTES_PER_ELEMENT);
    const arrayView = new type(database[table]);
    view[table] = arrayView;
    performance.mark('insert', {end:true});
  }

  const init = count[table] || 0;
  count[table] = init + items.length
  view[table].set(items, init);

  performance.mark('insert', {end:true});
}

export function get(table, props={quantity:1000, init:0, filter:(item) => item}, type=Uint32Array){
  if(!table){
    return console.error('Please specify a database for the search')
  }
  
  if(!database[table]){
    return console.error('Database not found')
  }

  let init = props.init*type.BYTES_PER_ELEMENT;
  if(init < 0){
    init = 0;
  }

  const max = database[table].byteLength / type.BYTES_PER_ELEMENT - init;

  let quantity = props.quantity;
  if(quantity > max){
    quantity = max;
  }

  return new type(database[table], init, quantity);
}

export function mergeBuffers(A, B, type=Uint32Array){
  const length = A.byteLength + B.byteLength;
  const result = new ArrayBuffer(length);
  const view   = new type(result);
  const viewA = new type(A);
  const viewB = new type(B);

  view.set(viewA, 0)
  view.set(viewB, A.byteLength/type.BYTES_PER_ELEMENT);

  return result;
}