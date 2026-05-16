export type ReadableContentSource = "latest" | "selection" | "message";

export type ReadableContent = {
  sourceId: string;
  sourceType: ReadableContentSource;
  title?: string;
  text: string;
  createdAt: number;
};
