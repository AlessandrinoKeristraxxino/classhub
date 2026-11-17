import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Plus, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { createEvent, deleteEvent, fetchEvents, type DashboardEvent } from "../lib/events";
import {
  fetchDashboardBlocks,
  getSafeDashboardLink,
  type DashboardBlock,
} from "../lib/dashboard-blocks";
import { getErrorMessage } from "../lib/error-message";

export default function Home() {
  const { isConfigured, session } = useAuth();
  const userId = session?.user.id;
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [dashboardBlocks, setDashboardBlocks] = useState<DashboardBlock[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => {
    const localDate = new Date(Date.now() + 60 * 60 * 1000);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    return localDate.toISOString().slice(0, 16);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;
    void fetchEvents()
      .then((result) => {
        if (isMounted) {
          setEvents(result);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            getErrorMessage(error, "Impossibile caricare gli eventi."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !isConfigured) {
      return;
    }

    let isMounted = true;
    void fetchDashboardBlocks()
      .then((result) => {
        if (isMounted) {
          setDashboardBlocks(result);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            getErrorMessage(
              error,
              "Impossibile caricare i contenuti personalizzati della home.",
            ),
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isConfigured, userId]);

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setPendingAction(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const newEvent = await createEvent(
        {
          title: title.trim(),
          description: description.trim(),
          starts_at: new Date(startsAt).toISOString(),
        },
        session.user.id,
      );
      setEvents((current) =>
        [...current, newEvent].sort(
          (first, second) =>
            new Date(first.starts_at).getTime() -
            new Date(second.starts_at).getTime(),
        ),
      );
      setTitle("");
      setDescription("");
      setIsFormOpen(false);
      setSuccessMessage("Evento aggiunto alla dashboard.");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Impossibile aggiungere l'evento."),
      );
    } finally {
      setPendingAction(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setErrorMessage("");
    try {
      await deleteEvent(eventId);
      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Impossibile eliminare l'evento."));
    }
  }

  return (
    <section className="page-section">
      <div className="welcome-panel">
        <div className="welcome-copy">
          <span className="eyebrow">LA TUA AREA DI STUDIO</span>
          <h1 className="page-title">Benvenuto su ClassHub</h1>
          <p className="page-description">
            Organizza lezioni, appuntamenti e materiali per avere sempre chiaro
            il tuo prossimo passo.
          </p>
          <Link className="button button-primary" to="/lessons">
            Vai alle lezioni
          </Link>
        </div>
        <div className="welcome-icon" aria-hidden="true">
          <CalendarDays size={58} strokeWidth={1.5} />
        </div>
      </div>

      {dashboardBlocks.length > 0 && (
        <section className="dashboard-custom-blocks" aria-label="Contenuti in evidenza">
          {dashboardBlocks.map((block) => {
            const safeLink = getSafeDashboardLink(block.link_url ?? "");
            const isExternalLink = Boolean(
              safeLink && /^https?:\/\//i.test(safeLink),
            );

            if (block.block_type === "text") {
              return (
                <article className="dashboard-text-block" key={block.id}>
                  <p>{block.body}</p>
                </article>
              );
            }

            if (block.block_type === "link") {
              return (
                <article className="dashboard-link-block" key={block.id}>
                  <div>
                    <h2>{block.title}</h2>
                    {block.body && <p>{block.body}</p>}
                  </div>
                  {safeLink && (
                    <a
                      className="button button-primary"
                      href={safeLink}
                      target={isExternalLink ? "_blank" : undefined}
                      rel={isExternalLink ? "noreferrer" : undefined}
                    >
                      {block.link_label || "Apri"}
                    </a>
                  )}
                </article>
              );
            }

            return (
              <article className="dashboard-info-block" key={block.id}>
                <h2>{block.title}</h2>
                <p>{block.body}</p>
              </article>
            );
          })}
        </section>
      )}

      <section className="dashboard-events" aria-labelledby="events-title">
        <div className="dashboard-events-heading">
          <div>
            <span className="eyebrow">ORGANIZZATI AL MEGLIO</span>
            <h2 id="events-title">Prossimi eventi</h2>
            <p>Le verifiche, le lezioni e gli appuntamenti da non dimenticare.</p>
          </div>
          {session && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setIsFormOpen((current) => !current);
                setErrorMessage("");
                setSuccessMessage("");
              }}
            >
              {isFormOpen ? (
                <X size={17} aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
              {isFormOpen ? "Annulla" : "Aggiungi evento"}
            </button>
          )}
        </div>

        {!isConfigured ? (
          <p className="events-empty">
            Configura Supabase per salvare gli eventi della tua dashboard.
          </p>
        ) : !session ? (
          <p className="events-empty">
            <Link to="/account">Accedi</Link> per aggiungere e consultare i tuoi
            eventi.
          </p>
        ) : (
          <>
            {isFormOpen && (
              <form className="event-form account-card" onSubmit={handleCreateEvent}>
                <label>
                  Titolo evento
                  <input
                    value={title}
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Data e ora
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    required
                  />
                </label>
                <label className="event-description-field">
                  Dettagli (facoltativi)
                  <textarea
                    value={description}
                    maxLength={2000}
                    rows={3}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={pendingAction}
                >
                  {pendingAction ? "Salvataggio..." : "Salva evento"}
                </button>
              </form>
            )}

            {errorMessage && (
              <p className="form-message form-error" role="alert">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p className="form-message form-success" role="status">
                {successMessage}
              </p>
            )}
            {isLoading ? (
              <p role="status">Caricamento eventi...</p>
            ) : events.length > 0 ? (
              <div className="event-list">
                {events.map((event) => (
                  <article className="event-card" key={event.id}>
                    <div className="event-date-icon" aria-hidden="true">
                      <CalendarDays size={20} />
                    </div>
                    <div className="event-copy">
                      <h3>{event.title}</h3>
                      <p className="event-time">
                        <Clock3 size={15} aria-hidden="true" />
                        {new Intl.DateTimeFormat("it-IT", {
                          dateStyle: "long",
                          timeStyle: "short",
                        }).format(new Date(event.starts_at))}
                      </p>
                      {event.description && <p>{event.description}</p>}
                    </div>
                    <button
                      className="icon-button event-delete"
                      type="button"
                      aria-label={`Elimina evento ${event.title}`}
                      onClick={() => void handleDeleteEvent(event.id)}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="events-empty">
                <CalendarDays size={25} aria-hidden="true" />
                <h3>Nessun evento in programma</h3>
                <p>Aggiungi una verifica o un appuntamento per ritrovarlo qui.</p>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  );
}