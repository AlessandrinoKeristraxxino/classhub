import type { Json } from "./database";

export type Lesson = {
  id: string;
  owner_id: string;
  title: string;
  subject: string;
  date: string;
  description: string;
  chapters: LessonChapter[];
  attachment_path: string | null;
  attachment_name: string | null;
};

export type LessonSubchapter = {
  [key: string]: Json | undefined;
  id: string;
  title: string;
  content: string;
};

export type LessonChapter = {
  [key: string]: Json | undefined;
  id: string;
  title: string;
  content: string;
  subchapters: LessonSubchapter[];
};
