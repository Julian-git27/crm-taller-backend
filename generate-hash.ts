// Crea un archivo temporal generate-hash.ts
import * as bcrypt from 'bcrypt';

async function generateHash() {
  const password = '123456';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hash para "123456":', hash);
  console.log('Longitud:', hash.length);
}

generateHash();