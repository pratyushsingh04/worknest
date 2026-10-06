import Anthropic from '@anthropic-ai/sdk';
import { freeComplete, freeProvider } from './free-ai';

// Turns meeting notes into a short summary, the decisions taken and who owes what.
// Uses a language model when one is configured; otherwise picks the lines out by their wording.

export interface ActionItem {
  owner: string | null;
  task: string;
  due: string | null;
}

export interface MeetingSummary {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  mode: 'ai' | 'basic';
}

interface MeetingInput {
  title: string;
  agenda: string | null;
  notes: string;
  attendees: string[];
  date: string;
}

const SYSTEM = `You summarise internal company meetings for the people who were in them and for colleagues who missed them.

You get the meeting's title, date, agenda, attendee names and the notes or transcript. Work only from that text: do not add decisions, owners or dates that the notes do not state. If the notes do not say who owns something, leave the owner empty rather than guessing. Use attendee names exactly as given.

Reply with one JSON object and nothing else, in this shape:
{"summary": "three to five plain sentences on what was discussed and where things stand", "decisions": ["each decision that was actually made, one sentence each"], "actionItems": [{"owner": "name or null", "task": "what they will do", "due": "date or deadline as written in the notes, or null"}]}

Write the summary in the language the notes are written in. Empty arrays are correct when the notes contain no decisions or no action items.`;

const hasClaude = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
let client: Anthropic | null = null;

function prompt(m: MeetingInput) {
  return `Title: ${m.title}\nDate: ${m.date}\nAttendees: ${m.attendees.join(', ') || 'not recorded'}\nAgenda: ${m.agenda?.trim() || 'none given'}\n\nNotes:\n${m.notes}`;
}

/** Reads the model's JSON, tolerating a code fence or stray text around it. */
function parse(raw: string): Omit<MeetingSummary, 'mode'> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const summary = text(data.summary);
    if (!summary) return null;
    const decisions = Array.isArray(data.decisions) ? data.decisions.map(text).filter((d): d is string => !!d).slice(0, 20) : [];
    const actionItems = Array.isArray(data.actionItems)
      ? data.actionItems
          .map((a) => (a && typeof a === 'object' ? (a as Record<string, unknown>) : {}))
          .map((a) => ({ owner: text(a.owner), task: text(a.task) ?? '', due: text(a.due) }))
          .filter((a) => a.task)
          .slice(0, 30)
      : [];
    return { summary, decisions, actionItems };
  } catch {
    return null;
  }
}

const sentences = (text: string) =>
  text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length > 3);

/** No model: the opening lines become the summary, and decisions and tasks are found by their wording. */
export function basicSummary(m: MeetingInput): MeetingSummary {
  const lines = sentences(m.notes);
  const isDecision = (l: string) => /\b(decided|decision|agreed|approved|finali[sz]ed|will go with|going with|confirmed|tay hua|final kiya)\b/i.test(l);
  const isAction = (l: string) => /\b(will|to do|todo|action|needs? to|should|must|by (mon|tue|wed|thu|fri|sat|sun|tomorrow|next|end|\d)|assign|follow up|karega|karegi|karna hai|bhejega)\b/i.test(l);
  const first = (name: string) => name.split(' ')[0];

  const decisions = lines.filter(isDecision).slice(0, 10);
  const actionItems = lines
    .filter((l) => isAction(l) && !isDecision(l))
    .slice(0, 15)
    .map((task) => {
      const owner = m.attendees.find((a) => new RegExp(`\\b${first(a).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(task)) ?? null;
      const due = task.match(/\bby ([^.,;]+)/i)?.[1]?.trim() ?? null;
      return { owner, task, due };
    });
  const rest = lines.filter((l) => !isDecision(l) && !isAction(l));
  const summary = (rest.length ? rest : lines).slice(0, 4).join(' ');
  return { summary: summary || 'The notes are too short to summarise.', decisions, actionItems, mode: 'basic' };
}

export async function summariseMeeting(m: MeetingInput): Promise<MeetingSummary> {
  try {
    if (hasClaude()) {
      client ??= new Anthropic();
      const res = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 16000,
        output_config: { effort: 'low' },
        // If a safety classifier declines, the API retries on a fallback model in the same call.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt(m) }],
      });
      const text = res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      const parsed = res.stop_reason === 'refusal' ? null : parse(text);
      if (parsed) return { ...parsed, mode: 'ai' };
    } else {
      const free = freeProvider();
      if (free) {
        const parsed = parse(await freeComplete(free, SYSTEM, prompt(m)));
        if (parsed) return { ...parsed, mode: 'ai' };
      }
    }
  } catch (err) {
    // A busy or misconfigured model must not block the summary; the basic one still helps.
    console.error('Summary: model failed, using the basic summary.', err instanceof Error ? err.message : err);
  }
  return basicSummary(m);
}
