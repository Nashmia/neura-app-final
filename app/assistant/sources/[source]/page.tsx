import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { knowledgeBase } from "@/scripts/knowledge-base";

/**
 * One article from the Care Assistant's knowledge base: the same text the
 * assistant retrieves and cites as [1], [2]... Opened from the source chips
 * under an answer (in a new tab, so the conversation stays open).
 */
export default async function SourcePage({ params }: { params: Promise<{ source: string }> }) {
  const { source } = await params;
  const article = knowledgeBase.find((a) => a.source === decodeURIComponent(source));
  if (!article) notFound();

  return (
    <AppShell
      eyebrow="Care guidance"
      title={article.title}
      description="From Neura's curated caregiving library, which the Care Assistant uses to answer questions."
      actions={<Button asChild variant="outline"><Link href="/assistant"><ArrowLeft className="mr-1 size-4" />Care Assistant</Link></Button>}
    >
      <Card className="max-w-3xl">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-accent-ink"><BookOpen className="size-4" />Guidance article</div>
          <p className="text-[17px] leading-8 text-slate-800">{article.text}</p>
          <p className="mt-8 border-t border-border pt-5 text-sm leading-6 text-slate-500">
            General caregiving guidance written for Neura from public advice (such as the Alzheimer&apos;s Association, the US National Institute on Aging and the NHS). It is not medical advice; for decisions about care or medication, speak to the patient&apos;s doctor.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
