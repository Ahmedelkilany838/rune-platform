alter table public.projects drop constraint if exists projects_project_type_check;

alter table public.projects
add constraint projects_project_type_check
check (
  project_type = any (
    array[
      'workspace_project'::text,
      'single_prompt'::text,
      'creative_direction'::text,
      'art_direction'::text,
      'product_ad'::text,
      'social_content'::text,
      'video_prompt'::text,
      'campaign'::text,
      'reference_analysis'::text,
      'brand_system'::text
    ]
  )
);

alter table public.projects drop constraint if exists projects_status_check;

alter table public.projects
add constraint projects_status_check
check (
  status = any (
    array[
      'draft'::text,
      'active'::text,
      'archived'::text,
      'completed'::text,
      'deleted'::text
    ]
  )
);
