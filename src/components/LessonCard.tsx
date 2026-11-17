import { useEffect, useState } from "react";
import { ChevronDown, Download, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getLessonAttachmentUrl } from "../lib/lessons";
import type { Lesson } from "../types/lesson";

interface LessonCardProps {
  lesson: Lesson;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (lesson: Lesson) => void;
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="lesson-card-content">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function LessonCard({
  lesson,
  canDelete,
  isDeleting,
  onDelete,
}: LessonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isLoadingAttachment, setIsLoadingAttachment] = useState(false);
  const contentId = `lesson-content-${lesson.id}`;

  useEffect(() => {
    if (!isExpanded || !lesson.attachment_path || attachmentUrl) {
      return;
    }

    let isMounted = true;
    void getLessonAttachmentUrl(lesson.attachment_path)
      .then((url) => {
        if (isMounted) {
          setAttachmentUrl(url);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAttachmentError(
            error instanceof Error
              ? error.message
              : "Impossibile caricare l'allegato.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingAttachment(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [attachmentUrl, isExpanded, lesson.attachment_path]);

  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${lesson.date}T00:00:00`));

  return (
    <article className="lesson-card">
      <div className="lesson-card-header">
        <span className="lesson-card-subject">{lesson.subject}</span>
        <div className="lesson-card-actions">
          <time className="lesson-card-date" dateTime={lesson.date}>
            {formattedDate}
          </time>
          {canDelete && (
            <button
              className="icon-button lesson-delete-button"
              type="button"
              aria-label={`Elimina la lezione ${lesson.title}`}
              title="Elimina lezione"
              disabled={isDeleting}
              onClick={() => onDelete(lesson)}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <h2 className="lesson-card-title">{lesson.title}</h2>
      {lesson.chapters.length > 0 && (
        <p className="lesson-card-chapter-count">
          {lesson.chapters.length}{" "}
          {lesson.chapters.length === 1 ? "capitolo" : "capitoli"}
        </p>
      )}
      <button
        className="lesson-expand-button"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => {
          if (!isExpanded) {
            setAttachmentUrl("");
            setAttachmentError("");
            setIsLoadingAttachment(Boolean(lesson.attachment_path));
          }
          setIsExpanded((current) => !current);
        }}
      >
        {isExpanded ? "Riduci" : "Espandi lezione"}
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={isExpanded ? "lesson-chevron-open" : ""}
        />
      </button>
      {isExpanded && (
        <div className="lesson-expanded-content" id={contentId}>
          {lesson.description && (
            <section className="lesson-introduction">
              <span className="lesson-reader-label">Introduzione</span>
              <MarkdownContent content={lesson.description} />
            </section>
          )}
          {lesson.chapters.length > 0 && (
            <div className="lesson-reader">
              <nav className="lesson-table-of-contents" aria-label="Indice della lezione">
                <span className="lesson-reader-label">In questa lezione</span>
                <ol>
                  {lesson.chapters.map((chapter, chapterIndex) => {
                    const chapterId = `${contentId}-${chapter.id}`;
                    return (
                      <li key={chapter.id}>
                        <a href={`#${chapterId}`}>
                          <span>{chapterIndex + 1}.</span> {chapter.title}
                        </a>
                        {chapter.subchapters.length > 0 && (
                          <ol>
                            {chapter.subchapters.map(
                              (subchapter, subchapterIndex) => (
                                <li key={subchapter.id}>
                                  <a href={`#${chapterId}-${subchapter.id}`}>
                                    <span>
                                      {chapterIndex + 1}.{subchapterIndex + 1}
                                    </span>{" "}
                                    {subchapter.title}
                                  </a>
                                </li>
                              ),
                            )}
                          </ol>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
              <div className="lesson-chapter-list">
                {lesson.chapters.map((chapter, chapterIndex) => {
                  const chapterId = `${contentId}-${chapter.id}`;
                  return (
                    <section
                      className="lesson-reader-chapter"
                      id={chapterId}
                      key={chapter.id}
                    >
                      <span className="lesson-reader-label">
                        Capitolo {chapterIndex + 1}
                      </span>
                      <h3>{chapter.title}</h3>
                      <MarkdownContent content={chapter.content} />
                      {chapter.subchapters.map(
                        (subchapter, subchapterIndex) => (
                          <section
                            className="lesson-reader-subchapter"
                            id={`${chapterId}-${subchapter.id}`}
                            key={subchapter.id}
                          >
                            <span className="lesson-reader-label">
                              {chapterIndex + 1}.{subchapterIndex + 1}
                            </span>
                            <h4>{subchapter.title}</h4>
                            <MarkdownContent content={subchapter.content} />
                          </section>
                        ),
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          )}
          {lesson.attachment_path && lesson.attachment_name && (
            <div className="lesson-attachment">
              {isLoadingAttachment && <span>Caricamento allegato...</span>}
              {attachmentError && (
                <p className="form-message form-error">{attachmentError}</p>
              )}
              {attachmentUrl && (
                <a
                  className="lesson-attachment-link"
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={16} aria-hidden="true" />
                  {lesson.attachment_name}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
