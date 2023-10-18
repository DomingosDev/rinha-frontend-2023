/**
 * Formata JSON parcial para o formato adotado na Rinha de Frontend
 * 
 * Problemas conhecidos:
 * 1. Ao corromper um JSON com um caractere " não escapado 
 * ele perde a referência e a partir daquele ponto as linhas se tornam inválidas.
 */
let trailing = ''

export function reset(){
  trailing = '';
}

export function format(text){
  let inContext = false;
  let last
  let result = trailing
    .concat(text)
    .split('"')
    .map((item, index, arr) => {
      last = arr[index-1];

      if( !inContext ){
        inContext = true;
        item = item.replaceAll(/\s/g, '')
                  .replaceAll('}', '\n}')
                  .replaceAll(']', '\n]')
                  .replaceAll('[', '[\n')
                  .replaceAll('{','{\n')
                  .replaceAll('],', '],\n')
                  .replaceAll(',', ',\n')
                  .replaceAll(/\n+/g, '\n')

        return item;
      }

      inContext  = ( /(?<size>\\+)$/.exec(item)?.groups?.size || '').length % 2;
      return item;
    })
    .join('"')
    .trim();

    if( inContext ){
      trailing = '';
      return result;
    }

    const pos = result.lastIndexOf('\n')
    trailing  = result.slice(pos);
    return result.slice(0,pos);
}