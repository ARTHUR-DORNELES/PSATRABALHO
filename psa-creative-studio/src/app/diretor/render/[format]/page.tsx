import { notFound } from "next/navigation";
import { SpecRenderer } from "@/components/html-creatives/SpecRenderer";
import { HtmlCreativeViewer } from "@/components/HtmlCreativeViewer";
import { sanitizeSpec } from "@/lib/layout-spec";
import { getFormat } from "@/lib/formats";

export const dynamic = "force-dynamic";

export default function RenderDiretorPage({
  params,
  searchParams,
}: {
  params: { format: string };
  searchParams: { spec?: string; photo?: string };
}) {
  if (!searchParams.spec) notFound();

  let spec = null;
  try {
    spec = sanitizeSpec(JSON.parse(searchParams.spec));
  } catch {
    spec = null;
  }
  if (!spec) notFound();

  const f = getFormat(params.format);

  return (
    <HtmlCreativeViewer>
      <SpecRenderer spec={spec} w={f.w} h={f.h} photoUrl={searchParams.photo ?? null} />
    </HtmlCreativeViewer>
  );
}
