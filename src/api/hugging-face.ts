const PIPER_VOICES_BASE = "https://huggingface.co/rhasspy/piper-voices";
const PIPER_VOICES_VERSION = "v1.0.0";

type FetchLike = typeof fetch;

export type PiperVoiceUrls = {
  modelUrl: string;
  configUrl: string;
};

export type PiperVoiceAssets = {
  model: Uint8Array;
  config: Uint8Array;
};

export function getHuggingFacePiperVoiceUrls(voiceId: string): PiperVoiceUrls {
  // Piper voice ids are like: ar_JO-kareem-low
  // HuggingFace layout is: <lang>/<locale>/<name>/<quality>/<voiceId>.onnx
  const parts = voiceId.split("-");
  if (parts.length !== 3) throw new Error(`Invalid piper voice id: ${voiceId}`);

  const [locale, name, quality] = parts;
  const lang = locale.split("_")[0];
  if (!lang || !locale || !name || !quality) throw new Error(`Invalid piper voice id: ${voiceId}`);

  const basePath = `${PIPER_VOICES_BASE}/resolve/${PIPER_VOICES_VERSION}/${lang}/${locale}/${name}/${quality}/${voiceId}.onnx`;
  return {
    modelUrl: basePath,
    configUrl: `${basePath}.json`
  };
}

export class HuggingFaceClient {
  private readonly fetchImpl: FetchLike;

  constructor(options?: { fetch?: FetchLike }) {
    this.fetchImpl = options?.fetch ?? fetch;
    if (!this.fetchImpl) throw new Error("fetch is not available");
  }

  async listPiperVoiceIds(): Promise<string[]> {
    // rhasspy/piper-voices provides a catalog file with all voice IDs and metadata
    const url = `${PIPER_VOICES_BASE}/raw/${PIPER_VOICES_VERSION}/voices.json`;
    const json = await this.downloadJson(url);

    if (json && typeof json === "object" && !Array.isArray(json)) {
      const ids = Object.keys(json as Record<string, unknown>).filter(Boolean);
      ids.sort();
      return ids;
    }

    throw new Error("Unexpected voices.json format");
  }

  async downloadPiperVoice(voiceId: string): Promise<PiperVoiceAssets> {
    const { modelUrl, configUrl } = getHuggingFacePiperVoiceUrls(voiceId);
    const [model, config] = await Promise.all([this.downloadBytes(modelUrl), this.downloadBytes(configUrl)]);
    return { model, config };
  }

  private async downloadJson(url: string): Promise<unknown> {
    const res = await this.fetchImpl(url, { redirect: "follow" } as any);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    return res.json() as Promise<unknown>;
  }

  private async downloadBytes(url: string): Promise<Uint8Array> {
    const res = await this.fetchImpl(url, { redirect: "follow" } as any);
    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}
