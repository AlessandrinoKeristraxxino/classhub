import { supabase } from "./supabase";
import type { Profile } from "../types/profile";

function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase non è configurato.");
  }
  return supabase;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("user_id, email, display_name, avatar_path, created_at")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfileAvatar(
  userId: string,
  file: File,
): Promise<Profile> {
  const contentTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!contentTypes.includes(file.type)) {
    throw new Error("Scegli un'immagine JPG, PNG o WebP.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("L'immagine del profilo deve essere più piccola di 2 MB.");
  }

  const client = getSupabase();
  const { data: currentProfile, error: profileError } = await client
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", userId)
    .single();

  if (profileError) {
    throw new Error(
      `Impossibile caricare il profilo. Verifica che le migration Supabase siano applicate. (${profileError.message})`,
    );
  }

  const extension = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from("profile-avatars")
    .upload(path, file, {
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(
      `Impossibile caricare l'immagine. Verifica il bucket "profile-avatars" e le relative policy Storage. (${uploadError.message})`,
    );
  }

  const { data, error } = await client
    .from("profiles")
    .update({ avatar_path: path })
    .eq("user_id", userId)
    .select("user_id, email, display_name, avatar_path, created_at")
    .single();

  if (error) {
    const { error: cleanupError } = await client.storage
      .from("profile-avatars")
      .remove([path]);
    if (cleanupError) {
      throw new Error(
        `Impossibile salvare il profilo (${error.message}); inoltre non è stato possibile rimuovere l'immagine caricata (${cleanupError.message}).`,
      );
    }
    throw error;
  }

  if (currentProfile.avatar_path) {
    const { error: removeError } = await client.storage
      .from("profile-avatars")
      .remove([currentProfile.avatar_path]);
    if (removeError) {
      throw new Error(
        `Immagine aggiornata, ma non è stato possibile eliminare la precedente (${removeError.message}).`,
      );
    }
  }

  return data;
}

export function getProfileAvatarUrl(path: string | null): string | null {
  if (!path || !supabase) {
    return null;
  }

  return supabase.storage.from("profile-avatars").getPublicUrl(path).data
    .publicUrl;
}
