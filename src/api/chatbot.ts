import client from './client';

export async function chatWithTranscript(transcriptId: string, message: string) {
  const resp = await client.post('/chat', { transcriptId, message });
  return resp.data;
}
