import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

export function getHuggingFacePiperVoiceUrls(voiceId: string): { modelUrl: string; configUrl: string } {
  // Piper voice ids are like: ar_JO-kareem-low
  // HuggingFace layout is: <lang>/<locale>/<name>/<quality>/<voiceId>.onnx
  const parts = voiceId.split("-");
  if (parts.length !== 3) throw new Error(`Invalid piper voice id: ${voiceId}`);

  const [locale, name, quality] = parts;
  const lang = locale.split("_")[0];
  if (!lang || !locale || !name || !quality) throw new Error(`Invalid piper voice id: ${voiceId}`);

  const basePath = `${HF_BASE}/${lang}/${locale}/${name}/${quality}/${voiceId}.onnx`;
  return {
    modelUrl: basePath,
    configUrl: `${basePath}.json`
  };
}

export async function listAvailablePiperVoicesFromHuggingFace(options?: {
  fetch?: typeof fetch;
}): Promise<string[]> {
  const fetchImpl = options?.fetch ?? fetch;
  if (!fetchImpl) throw new Error("fetch is not available");

  // rhasspy/piper-voices provides a catalog file with all voice IDs and metadata
  const url = "https://huggingface.co/rhasspy/piper-voices/raw/v1.0.0/voices.json";
  const res = await fetchImpl(url, { redirect: "follow" } as any);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as unknown;

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const ids = Object.keys(json as Record<string, unknown>).filter(Boolean);
    ids.sort();
    return ids;
  }

  throw new Error("Unexpected voices.json format");
}

export async function installPiperVoiceFromHuggingFace(options: {
  voiceId: string;
  cacheDir: string;
  fetch?: typeof fetch;
}): Promise<{ installed: true; voiceId: string }> {
  const fetchImpl = options.fetch ?? fetch;
  if (!fetchImpl) throw new Error("fetch is not available");

  const { modelUrl, configUrl } = getHuggingFacePiperVoiceUrls(options.voiceId);
  const voiceDir = join(options.cacheDir, options.voiceId);
  await mkdir(voiceDir, { recursive: true });

  const download = async (url: string): Promise<Uint8Array> => {
    const res = await fetchImpl(url, {
      // match browser behaviour enough for HuggingFace; no special headers required
      redirect: "follow"
    } as any);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf;
  };

  const [model, config] = await Promise.all([download(modelUrl), download(configUrl)]);

  await writeFile(join(voiceDir, "model.onnx"), model);
  await writeFile(join(voiceDir, "model.onnx.json"), config);

  return { installed: true as const, voiceId: options.voiceId };
}
