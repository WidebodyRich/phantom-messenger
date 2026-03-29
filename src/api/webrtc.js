import client from './client';

export async function getTurnCredentials() {
  return client.get('/api/turn/credentials');
}
