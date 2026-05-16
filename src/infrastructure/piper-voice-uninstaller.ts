import { access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

export async function uninstallPiperVoice(options: {
  voiceId: string;
  cacheDir: string;
}): Promise<{ removed: boolean; voiceId: string }> {
  const voiceDir = join(options.cacheDir, options.voiceId);

  try {
    await access(voiceDir, constants.F_OK);
  } catch {
    return { removed: false, voiceId: options.voiceId };
  }

  await rm(voiceDir, { recursive: true, force: true });
  return { removed: true, voiceId: options.voiceId };
}
