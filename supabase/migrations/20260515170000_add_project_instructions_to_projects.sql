alter table public.projects
  add column if not exists project_instructions text;

comment on column public.projects.project_instructions is 'Project-level operating instructions that must be included in AI workflow context for chats, prompts, campaigns, directions, and reference-based work.';
