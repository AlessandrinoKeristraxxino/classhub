import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { Plus, Search, Trash2, X } from "lucide-react";
import AuthPanel from "../components/AuthPanel";
import LessonCard from "../components/LessonCard";
import { useAuth } from "../contexts/AuthContext";
import { getErrorMessage } from "../lib/error-message";
import { createLesson, deleteLesson, fetchLessons } from "../lib/lessons";
import { supabase } from "../lib/supabase";
import type {
  Lesson,
  LessonChapter,
  LessonSubchapter,
} from "../types/lesson";

type SortOrder = "newest" | "oldest" | "title";
type LessonForm = {
  title: string;
  subject: string;
  date: string;
  description: string;
  chapters: LessonChapter[];
};

function createEmptySubchapter(): LessonSubchapter {
  return { id: crypto.randomUUID(), title: "", content: "" };
}

function createEmptyChapter(): LessonChapter {
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    subchapters: [],
  };
}

const initialForm: LessonForm = {
  title: "",
  subject: "",
  date: new Intl.DateTimeFormat("sv-SE").format(new Date()),
  description: "",
  chapters: [createEmptyChapter()],
};

export default function Lessons() {
  const { isConfigured, isLoading: isAuthLoading, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState("");
  const [canDeleteOwn, setCanDeleteOwn] = useState(false);
  const [canDeleteAny, setCanDeleteAny] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<LessonForm>(initialForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const isCreateFormOpen = searchParams.get("new") === "1";
  const userId = session?.user.id;

  useEffect(() => {
    if (isAuthLoading || !isConfigured || !userId) {
      return;
    }

    let isMounted = true;
    void fetchLessons()
      .then((rows) => {
        if (isMounted) {
          setLessons(rows);
          setLoadedUserId(userId);
          setPageError("");
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadedUserId(userId);
          setPageError(
            getErrorMessage(error, "Impossibile caricare le lezioni."),
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, userId]);

  useEffect(() => {
    if (!userId || !supabase) {
      return;
    }

    let isMounted = true;
    void Promise.all([
      supabase.rpc("has_classhub_permission", {
        permission_name: "lessons.delete_own",
      }),
      supabase.rpc("has_classhub_permission", {
        permission_name: "lessons.delete_any",
      }),
    ])
      .then(([ownResult, anyResult]) => {
        const error = ownResult.error ?? anyResult.error;
        if (error) {
          throw error;
        }
        if (isMounted) {
          setCanDeleteOwn(ownResult.data === true);
          setCanDeleteAny(anyResult.data === true);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setPageError(
            getErrorMessage(error, "Impossibile verificare i permessi delle lezioni."),
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const userLessons = userId && loadedUserId === userId ? lessons : [];
  const isLoadingLessons =
    isAuthLoading || (!!userId && loadedUserId !== userId);
  const visibleLessons = userLessons
    .filter((lesson) =>
      `${lesson.title} ${lesson.subject} ${lesson.description} ${lesson.chapters
        .map((chapter) =>
          [
            chapter.title,
            chapter.content,
            ...chapter.subchapters.flatMap((subchapter) => [
              subchapter.title,
              subchapter.content,
            ]),
          ].join(" "),
        )
        .join(" ")}`
        .toLocaleLowerCase("it")
        .includes(query.trim().toLocaleLowerCase("it")),
    )
    .sort((first, second) => {
      if (sortOrder === "title") {
        return first.title.localeCompare(second.title, "it");
      }

      const dateDifference =
        new Date(second.date).getTime() - new Date(first.date).getTime();
      return sortOrder === "oldest" ? -dateDifference : dateDifference;
    });

  function toggleCreateForm(open: boolean) {
    setFormError("");
    setSearchParams(open ? { new: "1" } : {});
  }

  function updateChapter(
    chapterId: string,
    field: "title" | "content",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, [field]: value } : chapter,
      ),
    }));
  }

  function updateSubchapter(
    chapterId: string,
    subchapterId: string,
    field: "title" | "content",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      chapters: current.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              subchapters: chapter.subchapters.map((subchapter) =>
                subchapter.id === subchapterId
                  ? { ...subchapter, [field]: value }
                  : subchapter,
              ),
            }
          : chapter,
      ),
    }));
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setFormError("Accedi per creare una lezione.");
      return;
    }
    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setFormError("L'allegato deve essere più piccolo di 10 MB.");
      return;
    }

    setIsCreating(true);
    setFormError("");
    setPageError("");
    try {
      const lesson = await createLesson(
        {
          title: form.title.trim(),
          subject: form.subject.trim(),
          date: form.date,
          description: form.description.trim(),
          chapters: form.chapters,
        },
        session.user.id,
        attachment ?? undefined,
      );
      setLessons((current) => [lesson, ...current]);
      setForm(initialForm);
      setAttachment(null);
      toggleCreateForm(false);
    } catch (error) {
      setFormError(getErrorMessage(error, "Impossibile creare la lezione."));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteLesson(lesson: Lesson) {
    if (
      !window.confirm(
        `Vuoi eliminare la lezione "${lesson.title}"? Questa azione non si può annullare.`,
      )
    ) {
      return;
    }

    setDeletingLessonId(lesson.id);
    setPageError("");
    try {
      const { cleanupWarning } = await deleteLesson(lesson.id);
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      if (cleanupWarning) {
        setPageError(cleanupWarning);
      }
    } catch (error) {
      setPageError(getErrorMessage(error, "Impossibile eliminare la lezione."));
    } finally {
      setDeletingLessonId("");
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">IL TUO PERCORSO</span>
          <h1 className="page-title">Lezioni</h1>
          <p className="page-description">
            Consulta, crea e organizza le lezioni e i materiali dei tuoi corsi.
          </p>
        </div>
        {session && (
          <button
            className="button button-primary lesson-create-toggle"
            type="button"
            onClick={() => toggleCreateForm(!isCreateFormOpen)}
          >
            {isCreateFormOpen ? (
              <X size={18} aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            {isCreateFormOpen ? "Annulla" : "Nuova lezione"}
          </button>
        )}
      </div>

      {!isConfigured ? (
        <div className="setup-notice" role="alert">
          <h2>Configura Supabase</h2>
          <p>
            Aggiungi <code>VITE_SUPABASE_URL</code> e{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> o{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> al file <code>.env</code>, poi
            riavvia l'app. Applica anche la migration{" "}
            <code>supabase/migrations/20261112000000_create_lessons.sql</code>{" "}
            al tuo progetto Supabase.
          </p>
        </div>
      ) : isAuthLoading ? (
        <p role="status">Verifica della sessione...</p>
      ) : !session ? (
        <AuthPanel />
      ) : (
        <>
          {isCreateFormOpen && (
            <form className="lesson-form-card" onSubmit={handleCreateLesson}>
              <h2>Crea una lezione</h2>
              <div className="lesson-form-grid">
                <label>
                  Titolo
                  <input
                    value={form.title}
                    maxLength={160}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Materia
                  <input
                    value={form.subject}
                    maxLength={100}
                    onChange={(event) =>
                      setForm({ ...form, subject: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Data
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm({ ...form, date: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="lesson-description-field">
                  Introduzione (facoltativa, Markdown supportato)
                  <textarea
                    value={form.description}
                    maxLength={20000}
                    rows={6}
                    placeholder={"# Titolo\nScrivi *in corsivo* o **in grassetto**..."}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
                <div className="lesson-chapters-editor lesson-description-field">
                  <div className="lesson-chapters-heading">
                    <div>
                      <h3>Struttura della lezione</h3>
                      <p>
                        Organizza gli argomenti in capitoli e sottocapitoli.
                        Puoi usare Markdown nei contenuti.
                      </p>
                    </div>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          chapters: [...current.chapters, createEmptyChapter()],
                        }))
                      }
                    >
                      <Plus size={16} aria-hidden="true" />
                      Aggiungi capitolo
                    </button>
                  </div>
                  {form.chapters.map((chapter, chapterIndex) => (
                    <fieldset className="lesson-chapter-editor" key={chapter.id}>
                      <legend>Capitolo {chapterIndex + 1}</legend>
                      <label>
                        Titolo capitolo
                        <input
                          value={chapter.title}
                          maxLength={120}
                          onChange={(event) =>
                            updateChapter(
                              chapter.id,
                              "title",
                              event.target.value,
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        Contenuto (Markdown)
                        <textarea
                          value={chapter.content}
                          maxLength={12000}
                          rows={5}
                          placeholder="Spiega l'argomento, aggiungi esempi o elenchi..."
                          onChange={(event) =>
                            updateChapter(
                              chapter.id,
                              "content",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      {chapter.subchapters.map((subchapter, subchapterIndex) => (
                        <div
                          className="lesson-subchapter-editor"
                          key={subchapter.id}
                        >
                          <div className="lesson-subchapter-heading">
                            <strong>
                              {chapterIndex + 1}.{subchapterIndex + 1}{" "}
                              Sottocapitolo
                            </strong>
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Rimuovi sottocapitolo ${subchapterIndex + 1}`}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  chapters: current.chapters.map((item) =>
                                    item.id === chapter.id
                                      ? {
                                          ...item,
                                          subchapters: item.subchapters.filter(
                                            (part) => part.id !== subchapter.id,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                          <label>
                            Titolo sottocapitolo
                            <input
                              value={subchapter.title}
                              maxLength={120}
                              onChange={(event) =>
                                updateSubchapter(
                                  chapter.id,
                                  subchapter.id,
                                  "title",
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </label>
                          <label>
                            Contenuto (Markdown)
                            <textarea
                              value={subchapter.content}
                              maxLength={12000}
                              rows={4}
                              onChange={(event) =>
                                updateSubchapter(
                                  chapter.id,
                                  subchapter.id,
                                  "content",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                      ))}
                      <div className="lesson-chapter-actions">
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              chapters: current.chapters.map((item) =>
                                item.id === chapter.id
                                  ? {
                                      ...item,
                                      subchapters: [
                                        ...item.subchapters,
                                        createEmptySubchapter(),
                                      ],
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          <Plus size={16} aria-hidden="true" />
                          Aggiungi sottocapitolo
                        </button>
                        {form.chapters.length > 1 && (
                          <button
                            className="text-button lesson-remove-chapter"
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                chapters: current.chapters.filter(
                                  (item) => item.id !== chapter.id,
                                ),
                              }))
                            }
                          >
                            Rimuovi capitolo
                          </button>
                        )}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <label className="lesson-description-field">
                  Allegato (facoltativo, massimo 10 MB)
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,application/pdf,image/jpeg,image/png,image/webp,text/plain,text/markdown"
                    onChange={(event) =>
                      setAttachment(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
              {formError && (
                <p className="form-message form-error" role="alert">
                  {formError}
                </p>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? "Salvataggio..." : "Salva lezione"}
              </button>
            </form>
          )}

          <div className="lesson-controls">
            <label className="lesson-search">
              <Search size={18} aria-hidden="true" />
              <span className="visually-hidden">Cerca lezioni</span>
              <input
                type="search"
                placeholder="Cerca per titolo, materia o contenuto..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="lesson-sort">
              <span>Ordina per</span>
              <select
                value={sortOrder}
                onChange={(event) => {
                  const { value } = event.target;
                  if (
                    value === "newest" ||
                    value === "oldest" ||
                    value === "title"
                  ) {
                    setSortOrder(value);
                  }
                }}
              >
                <option value="newest">Più recenti</option>
                <option value="oldest">Meno recenti</option>
                <option value="title">Titolo (A-Z)</option>
              </select>
            </label>
          </div>

          {pageError && (
            <p className="form-message form-error" role="alert">
              {pageError}
            </p>
          )}
          {isLoadingLessons ? (
            <p role="status">Caricamento lezioni...</p>
          ) : visibleLessons.length > 0 ? (
            <div className="lesson-grid">
              {visibleLessons.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  canDelete={
                    canDeleteAny || (canDeleteOwn && lesson.owner_id === userId)
                  }
                  isDeleting={deletingLessonId === lesson.id}
                  onDelete={(item) => void handleDeleteLesson(item)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                {userLessons.length === 0
                  ? "Ancora nessuna lezione"
                  : "Nessuna lezione trovata"}
              </h2>
              <p>
                {userLessons.length === 0
                  ? "Crea la tua prima lezione per raccogliere qui appunti e materiali."
                  : "Prova a modificare la ricerca per trovare una lezione."}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
