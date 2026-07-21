export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export type ReferenceKind = "style" | "logo";

export interface ReferenceImage {
  id: string;
  name: string;
  storagePath: string;
  publicUrl: string;
  kind: ReferenceKind;
  createdAt: string;
}

export interface CopyEntry {
  id: string;
  persona: string;
  prioridade: string | null;
  numeroAngulo: string | null;
  angulo: string | null;
  textoPrincipal: string;
  headline: string;
  cta: string | null;
  createdAt: string;
}

export interface CreativeVersion {
  id: string;
  creativeId: string;
  versionNumber: number;
  storagePath: string;
  publicUrl: string;
  promptUsado: string | null;
  instrucaoRefinamento: string | null;
  createdAt: string;
}

export interface Creative {
  id: string;
  copyEntryId: string | null;
  createdAt: string;
  versions: CreativeVersion[];
}

/** Creative + os dados já resolvidos de referências/copy, pra renderizar a galeria sem N+1. */
export interface CreativeWithDetails extends Creative {
  referenceImages: ReferenceImage[];
  copyEntry: CopyEntry | null;
}

/** Imagem gerada por IA salva na Biblioteca de imagem (arquivo no Storage). */
export interface SavedImage {
  id: string;
  projectId: string | null;
  storagePath: string;
  publicUrl: string;
  prompt: string | null;
  format: string | null;
  createdAt: string;
}

/** Criativo salvo na Biblioteca — guarda a "planta" (LayoutSpec) em jsonb. */
export interface SavedCreative {
  id: string;
  projectId: string | null;
  spec: unknown; // LayoutSpec (validado no render com sanitizeSpec)
  concept: string | null;
  format: string;
  persona: string | null;
  source: string;
  createdAt: string;
}
