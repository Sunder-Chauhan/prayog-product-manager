export const GUIDE_KEY: string;
export type AssemblyStep = {title?: string; text?: string; variant?: string; image?: string; youtube?: string};
export function youtubeId(value: unknown): string | null;
export function readGuide(value: unknown): {steps: AssemblyStep[]};
