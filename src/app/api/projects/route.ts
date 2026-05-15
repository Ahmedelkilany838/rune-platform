import { NextResponse } from "next/server";
import { getActiveWorkspace } from "@/lib/auth/get-active-workspace";
import type { StoredProject } from "@/lib/chat-storage";
import { createClient } from "@/lib/supabase/server";

type ProjectRow = {
  created_at: string;
  description: string | null;
  id: string;
  objective: string | null;
  platforms: string[] | null;
  project_instructions: string | null;
  project_name: string;
  project_type: string;
  status: string;
  updated_at: string;
};

type CreateProjectPayload = {
  description?: unknown;
  instructions?: unknown;
  name?: unknown;
  objective?: unknown;
  platforms?: unknown;
  project_type?: unknown;
};

const MAX_PROJECT_NAME_LENGTH = 120;
const MAX_PROJECT_TEXT_LENGTH = 6000;
const DEFAULT_PROJECT_TYPE = "creative_direction";
const ALLOWED_PROJECT_TYPES = new Set([
  "single_prompt",
  "creative_direction",
  "art_direction",
  "product_ad",
  "social_content",
  "video_prompt",
  "campaign",
  "reference_analysis",
  "brand_system"
]);

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizePlatforms(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeProjectType(value: unknown) {
  const projectType = normalizeText(value, 80);
  return ALLOWED_PROJECT_TYPES.has(projectType) ? projectType : DEFAULT_PROJECT_TYPE;
}

function mapProject(row: ProjectRow): StoredProject {
  return {
    id: row.id,
    name: row.project_name,
    description: row.description ?? "",
    instructions: row.project_instructions ?? row.objective ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET() {
  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, project_name, project_type, status, description, objective, project_instructions, platforms, created_at, updated_at")
    .eq("workspace_id", activeWorkspace.workspace.id)
    .neq("status", "deleted")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: "projects_query_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projects: ((data ?? []) as ProjectRow[]).map(mapProject) });
}

export async function POST(request: Request) {
  const activeWorkspace = await getActiveWorkspace();

  if (!activeWorkspace.ok) {
    const status = activeWorkspace.error === "not_authenticated" ? 401 : 403;
    return NextResponse.json({ ok: false, error: activeWorkspace.error }, { status });
  }

  let payload: CreateProjectPayload;

  try {
    payload = (await request.json()) as CreateProjectPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = normalizeText(payload.name, MAX_PROJECT_NAME_LENGTH);
  const description = normalizeText(payload.description, MAX_PROJECT_TEXT_LENGTH);
  const objective = normalizeText(payload.objective, MAX_PROJECT_TEXT_LENGTH);
  const instructions = normalizeText(payload.instructions, MAX_PROJECT_TEXT_LENGTH);
  const platforms = normalizePlatforms(payload.platforms);
  const projectType = normalizeProjectType(payload.project_type);

  if (!name) {
    return NextResponse.json({ ok: false, error: "project_name_required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: activeWorkspace.workspace.id,
      created_by: activeWorkspace.profile.id,
      project_name: name,
      project_type: projectType,
      status: "active",
      description: description || null,
      objective: objective || description || null,
      project_instructions: instructions || null,
      platforms
    })
    .select("id, project_name, project_type, status, description, objective, project_instructions, platforms, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: "project_create_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, project: mapProject(data as ProjectRow) }, { status: 201 });
}
