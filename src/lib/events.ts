import { supabase } from "./supabase";

export type DashboardEvent = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  starts_at: string;
};

function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase non è configurato.");
  }
  return supabase;
}

export async function fetchEvents(): Promise<DashboardEvent[]> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("id, owner_id, title, description, starts_at")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function createEvent(
  event: Pick<DashboardEvent, "title" | "description" | "starts_at">,
  ownerId: string,
): Promise<DashboardEvent> {
  const { data, error } = await getSupabase()
    .from("events")
    .insert({ ...event, owner_id: ownerId })
    .select("id, owner_id, title, description, starts_at")
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await getSupabase().from("events").delete().eq("id", eventId);
  if (error) {
    throw error;
  }
}
