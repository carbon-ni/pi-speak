import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HuggingFaceClient } from "../api/hugging-face.js";

export async function listAvailablePiperVoices(options?: {
  fetch?: typeof fetch;
  client?: HuggingFaceClient;
}): Promise<string[]> {
  const client = options?.client ?? new HuggingFaceClient({ fetch: options?.fetch });
  return client.listPiperVoiceIds();
}

export async function installPiperVoice(options: {
  voiceId: string;
  cacheDir: string;
  fetch?: typeof fetch;
  client?: HuggingFaceClient;
}): Promise<{ installed: true; voiceId: string }> {
  const client = options.client ?? new HuggingFaceClient({ fetch: options.fetch });
  const voiceDir = join(options.cacheDir, options.voiceId);
  await mkdir(voiceDir, { recursive: true });

  const { model, config } = await client.downloadPiperVoice(options.voiceId);

  await writeFile(join(voiceDir, "model.onnx"), model);
  await writeFile(join(voiceDir, "model.onnx.json"), config);

  return { installed: true as const, voiceId: options.voiceId };
}
