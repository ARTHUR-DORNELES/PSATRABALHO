import { notFound } from "next/navigation";
import { CreativeTemplate } from "@/components/html-creatives/CreativeTemplate";
import { HtmlCreativeViewer } from "@/components/HtmlCreativeViewer";
import { buildSampleProps, getTemplate, TEMPLATES } from "@/lib/html-creative-brand";

export const dynamic = "force-dynamic";

export default function RenderCatalogSamplePage({
  params,
}: {
  params: { templateId: string; format: string };
}) {
  if (params.format !== "feed" && params.format !== "story") notFound();
  const known = TEMPLATES.some((t) => t.id === params.templateId);
  if (!known) notFound();

  const template = getTemplate(params.templateId);

  return (
    <HtmlCreativeViewer>
      <CreativeTemplate templateId={template.id} {...buildSampleProps(params.format)} />
    </HtmlCreativeViewer>
  );
}
