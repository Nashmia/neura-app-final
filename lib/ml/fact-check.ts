import type { NliPair, NliScores } from "./protocol";

/**
 * Checks each sentence of a Care Assistant reply against the material the reply was given (retrieved
 * guidance + the patient's records) with a natural-language-inference model: does any source passage
 * entail the sentence? Passages are pre-selected by word overlap so only a few pairs per sentence go
 * through the model. Written without lookbehind regexes so it runs on older Safari.
 * Only entailment is reported: in testing the small model's "contradiction" fired on correct advice
 * phrased as instructions, and a false "conflicts with the sources" warning would mislead caregivers.
 */

export type Segment = { text: string; check: boolean };
export type Verdict = "supported" | "unverified";
export type SentenceCheck = { index: number; verdict: Verdict; score: number };

const ENTAIL_THRESHOLD = 0.5;
const CANDIDATES_PER_SENTENCE = 4;
const MIN_WORDS = 5;

/** Splits a reply into sentence segments (keeping their trailing spaces/newlines) and marks which are checkable claims. */
export function splitReply(text: string): Segment[] {
  const segments: Segment[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let end = -1;
    if (ch === "\n") {
      end = i;
      while (end < text.length && /\s/.test(text[end])) end++;
    } else if (".!?".includes(ch)) {
      let j = i + 1;
      // Keep closing quotes/brackets and citation markers like " [1]" or "[1, 2]" with the sentence.
      while (j < text.length && "\"')”’".includes(text[j])) j++;
      const citation = /^\s*\[\d+(?:\s*,\s*\d+)*\]/.exec(text.slice(j));
      if (citation) j += citation[0].length;
      if (j >= text.length || /\s/.test(text[j])) {
        end = j;
        while (end < text.length && /\s/.test(text[end])) end++;
      }
    }
    if (end > start) {
      segments.push(segmentOf(text.slice(start, end)));
      start = end;
      i = end - 1;
    }
  }
  if (start < text.length) segments.push(segmentOf(text.slice(start)));
  return segments;
}

export function claimText(text: string): string {
  return text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/[*_#`]/g, "").replace(/^\s*(?:[-–—•]|\d+[.)])\s+/, "").replace(/\s+/g, " ").trim();
}

function segmentOf(text: string): Segment {
  const claim = claimText(text);
  const words = claim.split(" ").filter(Boolean).length;
  const heading = /^\s*(?:[-–—•*]\s+)?\*\*[^*]+\*\*:?\s*$/.test(text) || /^\s*#/.test(text); // "**What to try**" or "# Title"
  return { text, check: words >= MIN_WORDS && !heading && !claim.endsWith("?") && !claim.endsWith(":") };
}

const STOP = new Set("the a an and or but if of to in on for with at by from is are was were be been it its this that these those as can may might will would should could you your they them their he she his her we our not no do does did have has had so than then there when what which who how about into over also just more most very".split(" "));

function contentWords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      .filter((w) => w.length > 2 && !STOP.has(w))
      .map((w) => w.replace(/(ing|ed|es|s)$/, ""))
  );
}

/** Source passages: windows of two consecutive sentences/lines from each evidence text. */
export function buildPassages(evidence: string[]): string[] {
  const passages: string[] = [];
  for (const doc of evidence) {
    const sentences = splitReply(doc).map((s) => claimText(s.text)).filter((s) => s.length > 15);
    for (let i = 0; i < sentences.length; i++) passages.push(sentences.slice(i, i + 2).join(" "));
  }
  return passages;
}

/** The passages sharing the most content words with the claim (none if nothing overlaps). */
export function candidatePassages(claim: string, passages: string[], k = CANDIDATES_PER_SENTENCE): string[] {
  const words = contentWords(claim);
  return passages
    .map((p) => {
      const pw = contentWords(p);
      let overlap = 0;
      words.forEach((w) => pw.has(w) && overlap++);
      return { p, overlap };
    })
    .filter((x) => x.overlap >= 2)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, k)
    .map((x) => x.p);
}

export async function factCheck(
  reply: string,
  evidence: string[],
  nli: (pairs: NliPair[]) => Promise<NliScores[]>
): Promise<{ segments: Segment[]; checks: SentenceCheck[] }> {
  const segments = splitReply(reply);
  const passages = buildPassages(evidence);
  const pairs: NliPair[] = [];
  const owners: number[] = [];
  segments.forEach((segment, index) => {
    if (!segment.check) return;
    const claim = claimText(segment.text);
    for (const premise of candidatePassages(claim, passages)) {
      pairs.push({ premise, hypothesis: claim });
      owners.push(index);
    }
  });
  const scores = pairs.length ? await nli(pairs) : [];

  const checks: SentenceCheck[] = [];
  segments.forEach((segment, index) => {
    if (!segment.check) return;
    const mine = scores.filter((_, i) => owners[i] === index);
    const entail = Math.max(0, ...mine.map((s) => s.entailment));
    checks.push({ index, verdict: entail >= ENTAIL_THRESHOLD ? "supported" : "unverified", score: Math.round(entail * 100) / 100 });
  });
  return { segments, checks };
}
