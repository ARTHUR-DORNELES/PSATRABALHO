import { notFound } from "next/navigation";
import { getCopyEntryById, getReferenceImageById } from "@/lib/db";
import { CreativeTemplate } from "@/components/html-creatives/CreativeTemplate";
import { HtmlCreativeViewer } from "@/components/HtmlCreativeViewer";
import { buildPhotoNote, getTemplate } from "@/lib/html-creative-brand";

export const dynamic = "force-dynamic";

export default async function RenderHtmlCreativePage({
  params,
  searchParams,
}: {
  params: { copyEntryId: string; format: string };
  searchParams: { logo?: string; template?: string };
}) {
  if (params.format !== "feed" && params.format !== "story") notFound();

  let copyEntry;
  try {
    copyEntry = await getCopyEntryById(params.copyEntryId);
  } catch {
    notFound();
  }

  let logoUrl: string | null = null;
  if (searchParams.logo) {
    try {
      logoUrl = (await getReferenceImageById(searchParams.logo)).publicUrl;
    } catch {
      logoUrl = null;
    }
  }

  const template = getTemplate(searchParams.template);

  return (
    <HtmlCreativeViewer>
      <CreativeTemplate
        templateId={template.id}
        format={params.format}
        persona={copyEntry.persona}
        headline={copyEntry.headline}
        textoPrincipal={copyEntry.textoPrincipal}
        cta={copyEntry.cta}
        logoUrl={logoUrl}
        photoNote={buildPhotoNote(copyEntry.persona, copyEntry.angulo)}
      />
    </HtmlCreativeViewer>
  );
}
