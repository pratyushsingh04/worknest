import type { RunnableTool } from './free-ai';

// The assistant with no language model behind it. It recognises what a question is about
// from its wording (English or Hinglish), runs the matching tool and writes the answer from
// a template. It only handles the questions listed in `help`, but it needs no key and never fails over.

type Row = Record<string, any>;

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`(^|[^a-z])${w}`, 'i').test(text));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const nice = (s: string) => s.replace(/_/g, ' ').toLowerCase();
const on = (date: string | null | undefined) => (date ? ` (due ${date})` : '');

async function call(tools: RunnableTool[], name: string, input: Record<string, unknown> = {}): Promise<any> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return null;
  return JSON.parse(String(await tool.run(input)));
}

function projectLines(projects: Row[]) {
  return projects.map((p) => `- **${p.name}**: ${p.percentComplete}% complete, ${nice(p.status)}${on(p.due)}${p.team ? `, ${p.team} team` : ''}${p.company ? ` at ${p.company}` : ''}`);
}

function describeProject(p: Row) {
  const lines = [`**${p.name}** is ${p.percentComplete}% complete and ${nice(p.status)}${on(p.dueDate)}.`];
  if (p.team) lines.push(`The ${p.team.name} team is on it${p.team.lead ? `, led by ${p.team.lead.name}` : ''}.`);
  const waiting = (p.milestones as Row[]).filter((m) => m.status === 'AWAITING_APPROVAL');
  if (waiting.length) lines.push(`Waiting for approval: ${waiting.map((m) => m.title).join(', ')}.`);
  if (p.milestones.length) lines.push('Milestones:', ...(p.milestones as Row[]).map((m) => `- ${m.title}: ${nice(m.status)}`));
  if (p.openTasks.length) lines.push(`${plural(p.openTasks.length, 'task')} still open, such as ${(p.openTasks as Row[]).slice(0, 3).map((t) => t.title).join(', ')}.`);
  const last = p.latestUpdates[0];
  if (last) lines.push(`Latest update: ${last.who ?? 'The team'} ${last.what}.`);
  return lines.join('\n');
}

/** Finds a project the person named in their question, by matching against the names they can see. */
function namedProject(text: string, projects: Row[]) {
  const lower = text.toLowerCase();
  return projects.find((p) => lower.includes(String(p.name).toLowerCase())) ?? projects.find((p) => String(p.name).toLowerCase().split(/\s+/).some((w) => w.length > 4 && lower.includes(w)));
}

const staffHelp = (lead: boolean) =>
  [
    "I'm running in basic mode, so I answer a fixed set of questions. Try one of these:",
    '- What are my tasks?',
    '- How are the projects doing? (or name a project)',
    '- How much leave do I have? Did I check in today?',
    ...(lead ? ["- Who hasn't checked in today?", '- Any client requests waiting?', '- What are clients looking for?'] : []),
  ].join('\n');

const clientHelp = [
  "I'm running in basic mode, so I answer a fixed set of questions. Try one of these:",
  '- Where do my projects stand? (or name a project)',
  '- Is anything waiting for my approval?',
  '- Find a company for mobile apps',
  '- What happened to my requests?',
].join('\n');

async function answerStaff(text: string, tools: RunnableTool[], lead: boolean): Promise<string> {
  if (lead && has(text, 'who', 'kaun', 'team', 'absent', 'present', 'checked in', 'check in', 'nahi aaya', 'on leave today')) {
    const t = await call(tools, 'get_team_today');
    if (t) {
      const by = (state: string) => (t.people as Row[]).filter((p) => p.today === state).map((p) => p.name);
      const missing = by('NOT_CHECKED_IN');
      const lines = [`Today (${t.date}), out of ${plural(t.headcount, 'person', 'people')}: ${by('PRESENT').length} on time, ${by('LATE').length} late, ${by('ON_LEAVE').length} on leave, ${missing.length} not checked in.`];
      if (missing.length) lines.push(`Not checked in: ${missing.join(', ')}.`);
      if (by('LATE').length) lines.push(`Late: ${by('LATE').join(', ')}.`);
      if (t.leaveRequestsWaiting.length) lines.push(`${plural(t.leaveRequestsWaiting.length, 'leave request')} waiting for a decision.`);
      return lines.join('\n');
    }
  }
  if (lead && has(text, 'need', 'looking for', 'lead')) {
    const needs: Row[] = (await call(tools, 'list_open_client_needs')) ?? [];
    if (!needs.length) return 'No client has an open need right now.';
    return [`${plural(needs.length, 'open client need')}:`, ...needs.slice(0, 8).map((n) => `- **${n.title}**${n.budget ? `, budget ${n.budget}` : ''}, ${plural(n.responses, 'response')}${n.weResponded ? ' (you responded)' : ''}`), 'Open Client needs to send a proposal.'].join('\n');
  }
  if (lead && has(text, 'request')) {
    const requests: Row[] = (await call(tools, 'list_client_requests')) ?? [];
    const open = requests.filter((r) => r.status === 'NEW' || r.status === 'IN_REVIEW' || r.status === 'ACCEPTED');
    if (!open.length) return 'No client requests are waiting on you.';
    return [`${plural(open.length, 'client request')} waiting:`, ...open.slice(0, 8).map((r) => `- **${r.title}** from ${r.client} for the ${r.team} team: ${nice(r.status)}`), 'Open Requests to accept one or start a project.'].join('\n');
  }
  if (has(text, 'leave', 'chhutti', 'chutti', 'attendance', 'check in', 'checked in', 'balance', 'holiday')) {
    const a = await call(tools, 'get_my_attendance_and_leave');
    const balance = (a.leaveBalance as Row[]).map((b) => `${nice(b.type)} ${b.remaining} of ${b.allowed}`).join(', ');
    const late = (a.last14Days as Row[]).filter((d) => d.status === 'LATE').length;
    return [`You ${a.checkedInToday ? 'have' : "haven't"} checked in today.`, `Leave left: ${balance}.`, `In your last ${plural(a.last14Days.length, 'working day')} on record you were late ${plural(late, 'time')}.`].join('\n');
  }
  if (has(text, 'task', 'kaam', 'work on', 'to do', 'todo', 'overdue', 'pending', 'assigned')) {
    const tasks: Row[] = await call(tools, 'get_my_tasks');
    if (!tasks.length) return 'You have no open tasks right now.';
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today);
    return [`You have ${plural(tasks.length, 'open task')}${overdue.length ? `, ${overdue.length} overdue` : ''}:`, ...tasks.slice(0, 10).map((t) => `- **${t.title}** (${t.project}): ${nice(t.status)}, ${nice(t.priority)} priority${on(t.dueDate)}`)].join('\n');
  }
  if (has(text, 'project', 'behind', 'progress', 'status', 'deliver', 'milestone')) {
    const projects: Row[] = await call(tools, 'list_projects');
    if (!projects.length) return "You aren't on any projects yet.";
    const named = namedProject(text, projects);
    if (named) return describeProject(await call(tools, 'get_project', { name: named.name }));
    const today = new Date().toISOString().slice(0, 10);
    const behind = projects.filter((p) => p.status !== 'COMPLETED' && p.due && p.due < today);
    if (has(text, 'behind', 'late', 'overdue')) return behind.length ? [`${plural(behind.length, 'project')} past the due date:`, ...projectLines(behind)].join('\n') : 'No project is past its due date.';
    return [`${plural(projects.length, 'project')}${behind.length ? `, ${behind.length} past the due date` : ''}:`, ...projectLines(projects.slice(0, 10))].join('\n');
  }
  return staffHelp(lead);
}

async function answerClient(text: string, tools: RunnableTool[]): Promise<string> {
  if (has(text, 'find', 'search', 'compan', 'dhoond', 'agency', 'who can', 'hire')) {
    const stop = new Set(['find', 'search', 'a', 'an', 'the', 'company', 'companies', 'for', 'that', 'who', 'can', 'me', 'to', 'build', 'builds', 'make', 'makes', 'i', 'need', 'want', 'hire', 'some', 'good', 'with', 'in', 'of', 'do', 'does', 'koi', 'dhoondo', 'chahiye', 'wali', 'ke', 'liye']);
    const query = text.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').split(/\s+/).filter((w) => w && !stop.has(w)).join(' ');
    const found = await call(tools, 'search_companies', { query });
    const matches: Row[] = found.matches;
    if (!found.totalListed) return 'No companies are listed on WorkNest yet.';
    if (!matches.length) return `No listed company matches "${query}". Try a broader word, or open Companies to browse all ${found.totalListed}.`;
    return [`${plural(matches.length, 'company', 'companies')}${query ? ` matching "${query}"` : ''}:`, ...matches.map((c) => `- **${c.name}** (${[c.city, c.country].filter(Boolean).join(', ')}): ${c.tagline}. ${plural(c.projectsDelivered, 'project')} delivered.`), 'Open Companies to see their teams and send a request.'].join('\n');
  }
  if (has(text, 'request', 'need', 'proposal')) {
    const mine = await call(tools, 'list_my_requests_and_needs');
    const lines: string[] = [];
    if (mine.requests.length) lines.push(`Your requests:`, ...(mine.requests as Row[]).slice(0, 8).map((r) => `- **${r.title}** to ${r.company} (${r.team} team): ${nice(r.status)}`));
    if (mine.needs.length) lines.push(`Your needs:`, ...(mine.needs as Row[]).map((n) => `- **${n.title}**: ${nice(n.status)}, ${plural(n.proposals.length, 'proposal')}`));
    return lines.length ? lines.join('\n') : "You haven't sent any requests or posted any needs yet.";
  }
  if (has(text, 'project', 'approv', 'sign', 'waiting', 'progress', 'status', 'stand', 'update', 'team', 'milestone', 'kahan', 'kitna')) {
    const projects: Row[] = await call(tools, 'list_my_projects');
    if (!projects.length) return "You don't have any projects yet. Open Companies to find one and send a request.";
    const named = namedProject(text, projects);
    if (named) return describeProject(await call(tools, 'get_project', { name: named.name }));
    if (has(text, 'approv', 'sign', 'waiting')) {
      const waiting: string[] = [];
      for (const p of projects.slice(0, 8)) {
        const detail = await call(tools, 'get_project', { name: p.name });
        for (const m of (detail.milestones as Row[] | undefined) ?? []) if (m.status === 'AWAITING_APPROVAL') waiting.push(`- **${m.title}** in ${p.name} (${p.company})`);
      }
      return waiting.length ? ['Waiting for your approval:', ...waiting, 'Open the project to approve it or ask for changes.'].join('\n') : 'Nothing is waiting for your approval.';
    }
    return [`You have ${plural(projects.length, 'project')}:`, ...projectLines(projects)].join('\n');
  }
  return clientHelp;
}

/** Answers from templates. `role` decides which questions it understands. */
export async function basicAnswer(text: string, role: string, tools: RunnableTool[]): Promise<string> {
  return role === 'CLIENT' ? answerClient(text, tools) : answerStaff(text, tools, role === 'ADMIN' || role === 'MANAGER');
}
