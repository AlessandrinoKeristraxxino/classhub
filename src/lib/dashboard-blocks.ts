import { supabase } from "./supabase";

export type DashboardBlockType = "box" | "text" | "link";

export type DashboardBlock = {
  id: string;
  block_type: DashboardBlockType;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  sort_order: number;
};

function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase non è configurato.");
  }
  return supabase;
}

export function getSafeDashboardLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function fetchDashboardBlocks(): Promise<DashboardBlock[]> {
  const { data, error } = await getSupabase()
    .from("dashboard_blocks")
    .select(
      "id, block_type, title, body, link_url, link_label, sort_order",
    )
    .order("sort_order")
    .order("created_at")
    .returns<DashboardBlock[]>();

  if (error) {
    throw error;
  }
  return data;
}

export async function createDashboardBlock(
  block: Omit<DashboardBlock, "id">,
): Promise<DashboardBlock> {
  const { data, error } = await getSupabase()
    .from("dashboard_blocks")
    .insert(block)
    .select(
      "id, block_type, title, body, link_url, link_label, sort_order",
    )
    .returns<DashboardBlock>()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function updateDashboardBlock(
  id: string,
  block: Omit<DashboardBlock, "id">,
): Promise<DashboardBlock> {
  const { data, error } = await getSupabase()
    .from("dashboard_blocks")
    .update(block)
    .eq("id", id)
    .select(
      "id, block_type, title, body, link_url, link_label, sort_order",
    )
    .returns<DashboardBlock>()
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteDashboardBlock(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("dashboard_blocks")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
