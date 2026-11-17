import { supabase } from "./supabase";
import type { Json } from "../types/database";
import type { Lesson, LessonChapter, LessonSubchapter } from "../types/lesson";

function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase non è configurato.");
  }
  return supabase;
}

export async function fetchLessons(): Promise<Lesson[]> {
  const { data, error } = await getSupabase()
    .from("lessons")
    .select(
      "id, owner_id, title, subject, date, description, chapters, attachment_path, attachment_name",
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((lesson) => ({
    ...lesson,
    chapters: parseChapters(lesson.chapters),
  }));
}

type NewLesson = Pick<Lesson, "title" | "subject" | "date" | "description"> & {
  chapters: LessonChapter[];
};

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSubchapter(value: Json): LessonSubchapter | null {
  if (
    !isJsonObject(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.content !== "string"
  ) {
    return null;
  }
  return { id: value.id, title: value.title, content: value.content };
}

function parseChapters(value: Json): LessonChapter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !isJsonObject(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.content !== "string" ||
      !Array.isArray(item.subchapters)
    ) {
      return [];
    }

    return [
      {
        id: item.id,
        title: item.title,
        content: item.content,
        subchapters: item.subchapters.flatMap((subchapter) => {
          const parsed = parseSubchapter(subchapter);
          return parsed ? [parsed] : [];
        }),
      },
    ];
  });
}

export async function createLesson(
  lesson: NewLesson,
  ownerId: string,
  attachment?: File,
): Promise<Lesson> {
  const client = getSupabase();
  const lessonId = crypto.randomUUID();
  let attachmentPath: string | null = null;

  if (attachment) {
    const safeFileName = attachment.name.replace(/[\\/]/g, "_");
    attachmentPath = `${ownerId}/${lessonId}/${safeFileName}`;
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      txt: "text/plain",
      md: "text/markdown",
    };
    const extension = safeFileName.split(".").pop()?.toLowerCase() ?? "";
    const contentType = attachment.type || mimeTypes[extension];
    if (!contentType || !Object.values(mimeTypes).includes(contentType)) {
      throw new Error(
        "Formato allegato non supportato. Usa PDF, JPG, PNG, WebP, TXT o MD.",
      );
    }

    const { error } = await client.storage
      .from("lesson-files")
      .upload(attachmentPath, attachment, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw error;
    }
  }

  const { data, error } = await client
    .from("lessons")
    .insert({
      ...lesson,
      id: lessonId,
      owner_id: ownerId,
      attachment_path: attachmentPath,
      attachment_name: attachment?.name ?? null,
      chapters: lesson.chapters,
    })
    .select(
      "id, owner_id, title, subject, date, description, chapters, attachment_path, attachment_name",
    )
    .single();

  if (error) {
    if (attachmentPath) {
      const { error: cleanupError } = await client.storage
        .from("lesson-files")
        .remove([attachmentPath]);
      if (cleanupError) {
        throw new Error(
          `Creazione della lezione non riuscita (${error.message}); anche la rimozione dell'allegato è fallita (${cleanupError.message}).`,
        );
      }
    }
    throw error;
  }

  return { ...data, chapters: parseChapters(data.chapters) };
}

export async function deleteLesson(
  lessonId: string,
): Promise<{ cleanupWarning: string | null }> {
  const client = getSupabase();
  const { data, error } = await client
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .select("attachment_path")
    .single();

  if (error) {
    throw error;
  }

  if (data.attachment_path) {
    const { error: storageError } = await client.storage
      .from("lesson-files")
      .remove([data.attachment_path]);
    if (storageError) {
      return {
        cleanupWarning: `La lezione è stata eliminata, ma non è stato possibile rimuovere l'allegato (${storageError.message}).`,
      };
    }
  }

  return { cleanupWarning: null };
}

export async function getLessonAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from("lesson-files")
    .createSignedUrl(path, 300);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
