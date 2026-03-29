import client from './client';

export async function listGroups() {
  return client.get('/api/groups');
}

export async function createGroup({ name, description }) {
  return client.post('/api/groups', { name, description });
}

export async function getGroup(groupId) {
  return client.get(`/api/groups/${groupId}`);
}
