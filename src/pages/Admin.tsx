import { useEffect, useState, type FormEvent } from "react";
import { Plus, Shield, Trash2, UserRound } from "lucide-react";
import AuthPanel from "../components/AuthPanel";
import { useAuth } from "../contexts/AuthContext";
import { isClassHubAdmin } from "../lib/authorization";
import {
  createDashboardBlock,
  deleteDashboardBlock,
  fetchDashboardBlocks,
  getSafeDashboardLink,
  updateDashboardBlock,
  type DashboardBlock,
  type DashboardBlockType,
} from "../lib/dashboard-blocks";
import { getErrorMessage } from "../lib/error-message";
import { supabase } from "../lib/supabase";

type Role = {
  id: string;
  name: string;
  description: string;
};

type Permission = {
  id: string;
  permission_key: string;
  description: string;
};

type ProfileRow = {
  user_id: string;
  email: string;
  display_name: string;
};

type RolePermission = {
  role_id: string;
  permission_id: string;
};

type UserRole = {
  user_id: string;
  role_id: string;
};

const permissionDescriptions: Record<string, string> = {
  "lessons.create": "Creare nuove lezioni.",
  "lessons.delete_own": "Eliminare le lezioni create dall'utente.",
  "lessons.delete_any": "Eliminare qualsiasi lezione.",
  "events.create": "Aggiungere eventi alla propria dashboard.",
  "events.delete_own": "Eliminare i propri eventi.",
  "events.delete_any": "Eliminare eventi di qualsiasi utente.",
  "dashboard.manage": "Aggiungere, modificare e rimuovere i contenuti condivisi della dashboard.",
};

export default function Admin() {
  const { isConfigured, isLoading, session } = useAuth();
  const isAdmin = isClassHubAdmin(session?.user.email);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [dashboardBlocks, setDashboardBlocks] = useState<DashboardBlock[]>([]);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [newBlockType, setNewBlockType] =
    useState<DashboardBlockType>("box");
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockBody, setNewBlockBody] = useState("");
  const [newBlockLink, setNewBlockLink] = useState("");
  const [newBlockLinkLabel, setNewBlockLinkLabel] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [canManageDashboard, setCanManageDashboard] = useState(false);

  useEffect(() => {
    if (!isAdmin || !supabase) {
      return;
    }

    let isMounted = true;
    void Promise.all([
      supabase.from("roles").select("id, name, description").order("name"),
      supabase
        .from("permissions")
        .select("id, permission_key, description")
        .order("permission_key"),
      supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .order("email"),
      supabase.from("role_permissions").select("role_id, permission_id"),
      supabase.from("user_roles").select("user_id, role_id"),
      fetchDashboardBlocks(),
    ])
      .then(
        ([
          roleResult,
          permissionResult,
          profileResult,
          rpResult,
          urResult,
          blocks,
        ]) => {
        const firstError =
          roleResult.error ??
          permissionResult.error ??
          profileResult.error ??
          rpResult.error ??
          urResult.error;
        if (firstError) {
          throw firstError;
        }
        if (isMounted) {
          setRoles(roleResult.data ?? []);
          setPermissions(permissionResult.data ?? []);
          setProfiles(profileResult.data ?? []);
          setRolePermissions(rpResult.data ?? []);
          setUserRoles(urResult.data ?? []);
          setDashboardBlocks(blocks);
        }
      },
      )
      .catch((error: unknown) => {
        if (isMounted) {
          setPageError(
            getErrorMessage(error, "Impossibile caricare i dati amministrativi."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingData(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!session?.user.id || isAdmin || !supabase) {
      return;
    }

    let isMounted = true;
    void supabase
      .rpc("has_classhub_permission", {
        permission_name: "dashboard.manage",
      })
      .then(async ({ data, error }) => {
        if (error) {
          throw error;
        }
        const hasPermission = data === true;
        if (isMounted) {
          setCanManageDashboard(hasPermission);
        }
        if (hasPermission) {
          const blocks = await fetchDashboardBlocks();
          if (isMounted) {
            setDashboardBlocks(blocks);
          }
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setPageError(
            getErrorMessage(error, "Impossibile verificare i permessi amministrativi."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingData(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, session?.user.id]);

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setPendingAction("create-role");
    setPageError("");
    try {
      const { data, error } = await supabase
        .from("roles")
        .insert({ name: roleName.trim(), description: roleDescription.trim() })
        .select("id, name, description")
        .single();
      if (error) {
        throw error;
      }
      setRoles((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, "it")));
      setRoleName("");
      setRoleDescription("");
    } catch (error) {
      setPageError(getErrorMessage(error, "Impossibile creare il ruolo."));
    } finally {
      setPendingAction("");
    }
  }

  async function handleCreatePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }

    setPendingAction("create-permission");
    setPageError("");
    try {
      const { data, error } = await supabase
        .from("permissions")
        .insert({
          permission_key: permissionKey.trim(),
          description: permissionDescription.trim(),
        })
        .select("id, permission_key, description")
        .single();
      if (error) {
        throw error;
      }
      setPermissions((current) =>
        [...current, data].sort((a, b) =>
          a.permission_key.localeCompare(b.permission_key, "it"),
        ),
      );
      setPermissionKey("");
      setPermissionDescription("");
    } catch (error) {
      setPageError(getErrorMessage(error, "Impossibile creare il permesso."));
    } finally {
      setPendingAction("");
    }
  }

  async function togglePermission(
    roleId: string,
    permissionId: string,
    isEnabled: boolean,
  ) {
    if (!supabase) {
      return;
    }

    const actionId = `${roleId}:${permissionId}`;
    setPendingAction(actionId);
    setPageError("");
    try {
      const result = isEnabled
        ? await supabase
            .from("role_permissions")
            .delete()
            .eq("role_id", roleId)
            .eq("permission_id", permissionId)
        : await supabase
            .from("role_permissions")
            .insert({ role_id: roleId, permission_id: permissionId });
      if (result.error) {
        throw result.error;
      }
      setRolePermissions((current) =>
        isEnabled
          ? current.filter(
              (item) =>
                item.role_id !== roleId || item.permission_id !== permissionId,
            )
          : [...current, { role_id: roleId, permission_id: permissionId }],
      );
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Impossibile aggiornare i permessi del ruolo."),
      );
    } finally {
      setPendingAction("");
    }
  }

  async function assignRole(userId: string) {
    const roleId = selectedRoles[userId];
    if (!supabase || !roleId) {
      return;
    }

    setPendingAction(`assign:${userId}`);
    setPageError("");
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: session?.user.id,
      });
      if (error) {
        throw error;
      }
      setUserRoles((current) => [...current, { user_id: userId, role_id: roleId }]);
      setSelectedRoles((current) => ({ ...current, [userId]: "" }));
    } catch (error) {
      setPageError(getErrorMessage(error, "Impossibile assegnare il ruolo."));
    } finally {
      setPendingAction("");
    }
  }

  async function removeRole(userId: string, roleId: string) {
    if (!supabase) {
      return;
    }

    setPendingAction(`remove:${userId}:${roleId}`);
    setPageError("");
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);
      if (error) {
        throw error;
      }
      setUserRoles((current) =>
        current.filter(
          (item) => item.user_id !== userId || item.role_id !== roleId,
        ),
      );
    } catch (error) {
      setPageError(getErrorMessage(error, "Impossibile rimuovere il ruolo."));
    } finally {
      setPendingAction("");
    }
  }

  function getBlockPayload(block: DashboardBlock) {
    const linkUrl =
      block.block_type === "link"
        ? getSafeDashboardLink(block.link_url ?? "")
        : null;
    if (block.block_type === "link" && !linkUrl) {
      throw new Error("Inserisci un link HTTP(S) o un percorso interno valido.");
    }

    return {
      block_type: block.block_type,
      title: block.title.trim(),
      body: block.body.trim(),
      link_url: linkUrl,
      link_label:
        block.block_type === "link" ? block.link_label?.trim() || "Apri" : null,
      sort_order: block.sort_order,
    };
  }

  async function handleCreateDashboardBlock(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const linkUrl =
      newBlockType === "link" ? getSafeDashboardLink(newBlockLink) : null;
    if (newBlockType === "link" && !linkUrl) {
      setPageError("Inserisci un link HTTP(S) o un percorso interno valido.");
      return;
    }
    if (!newBlockTitle.trim() && newBlockType !== "text") {
      setPageError("Inserisci un titolo per questo contenuto.");
      return;
    }
    if (!newBlockBody.trim() && newBlockType !== "link") {
      setPageError("Inserisci il testo da mostrare nella dashboard.");
      return;
    }

    setPendingAction("create-dashboard-block");
    setPageError("");
    try {
      const block = await createDashboardBlock({
        block_type: newBlockType,
        title: newBlockTitle.trim(),
        body: newBlockBody.trim(),
        link_url: linkUrl,
        link_label:
          newBlockType === "link" ? newBlockLinkLabel.trim() || "Apri" : null,
        sort_order: dashboardBlocks.length,
      });
      setDashboardBlocks((current) => [...current, block]);
      setNewBlockTitle("");
      setNewBlockBody("");
      setNewBlockLink("");
      setNewBlockLinkLabel("");
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Impossibile aggiungere il contenuto alla home."),
      );
    } finally {
      setPendingAction("");
    }
  }

  async function handleSaveDashboardBlock(block: DashboardBlock) {
    setPendingAction(`save-block:${block.id}`);
    setPageError("");
    try {
      const updatedBlock = await updateDashboardBlock(
        block.id,
        getBlockPayload(block),
      );
      setDashboardBlocks((current) =>
        current.map((item) => (item.id === block.id ? updatedBlock : item)),
      );
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Impossibile salvare il contenuto della home."),
      );
    } finally {
      setPendingAction("");
    }
  }

  async function handleDeleteDashboardBlock(block: DashboardBlock) {
    setPendingAction(`delete-block:${block.id}`);
    setPageError("");
    try {
      await deleteDashboardBlock(block.id);
      setDashboardBlocks((current) =>
        current.filter((item) => item.id !== block.id),
      );
    } catch (error) {
      setPageError(
        getErrorMessage(error, "Impossibile rimuovere il contenuto della home."),
      );
    } finally {
      setPendingAction("");
    }
  }

  function updateBlock(
    id: string,
    field: "title" | "body" | "link_url" | "link_label",
    value: string,
  ) {
    setDashboardBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, [field]: value } : block,
      ),
    );
  }

  if (!isConfigured) {
    return (
      <section className="page-section">
        <h1 className="page-title">Amministrazione</h1>
        <div className="setup-notice" role="alert">
          <h2>Configura Supabase</h2>
          <p>Configura Supabase e applica le migration per gestire ClassHub.</p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return <p role="status">Verifica della sessione...</p>;
  }

  if (!session) {
    return (
      <section className="page-section">
        <div>
          <span className="eyebrow">GESTIONE CLASSHUB</span>
          <h1 className="page-title">Amministrazione</h1>
        </div>
        <AuthPanel />
      </section>
    );
  }

  if (!isAdmin && !canManageDashboard && !isLoadingData) {
    return (
      <section className="page-section">
        <div className="access-denied">
          <Shield size={28} aria-hidden="true" />
          <h1>Accesso riservato</h1>
          <p>Questa sezione è disponibile solo per l'amministratore.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GESTIONE CLASSHUB</span>
          <h1 className="page-title">Amministrazione</h1>
          <p className="page-description">
            Crea ruoli, definisci permessi e assegnali agli utenti.
          </p>
        </div>
      </div>

      {pageError && (
        <p className="form-message form-error" role="alert">
          {pageError}
        </p>
      )}
      {isLoadingData ? (
        <p role="status">Caricamento dei dati amministrativi...</p>
      ) : (
        <>
          {isAdmin && (
            <>
          <div className="admin-setup-grid">
            <section className="account-card" aria-labelledby="create-role-title">
              <div className="account-card-heading">
                <span className="account-icon" aria-hidden="true">
                  <Shield size={21} />
                </span>
                <div>
                  <h2 id="create-role-title">Crea un ruolo</h2>
                  <p>I ruoli raccolgono i permessi da assegnare agli utenti.</p>
                </div>
              </div>
              <form className="lesson-form" onSubmit={handleCreateRole}>
                <label>
                  Nome ruolo
                  <input
                    value={roleName}
                    maxLength={80}
                    minLength={2}
                    onChange={(event) => setRoleName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Descrizione
                  <input
                    value={roleDescription}
                    maxLength={500}
                    onChange={(event) => setRoleDescription(event.target.value)}
                  />
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={pendingAction === "create-role"}
                >
                  Crea ruolo
                </button>
              </form>
            </section>

            <section
              className="account-card"
              aria-labelledby="create-permission-title"
            >
              <div className="account-card-heading">
                <span className="account-icon" aria-hidden="true">
                  <UserRound size={21} />
                </span>
                <div>
                  <h2 id="create-permission-title">Crea un permesso</h2>
                  <p>
                    I permessi elencati sotto sono già collegati alle funzioni
                    dell'app. Quelli personalizzati richiedono un'integrazione
                    nel codice.
                  </p>
                </div>
              </div>
              <form className="lesson-form" onSubmit={handleCreatePermission}>
                <label>
                  Chiave permesso
                  <input
                    value={permissionKey}
                    pattern="[a-z][a-z0-9._-]{1,79}"
                    maxLength={80}
                    placeholder="lessons.publish"
                    onChange={(event) => setPermissionKey(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Descrizione
                  <input
                    value={permissionDescription}
                    maxLength={500}
                    onChange={(event) =>
                      setPermissionDescription(event.target.value)
                    }
                  />
                </label>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={pendingAction === "create-permission"}
                >
                  Crea permesso
                </button>
              </form>
            </section>
          </div>

          <section
            className="admin-section"
            aria-labelledby="permission-catalog-title"
          >
            <div className="admin-section-heading">
              <div>
                <h2 id="permission-catalog-title">Permessi disponibili</h2>
                <p>Assegna questi permessi ai ruoli nella sezione sottostante.</p>
              </div>
            </div>
            <div className="permission-catalog">
              {Object.entries(permissionDescriptions).map(([key, description]) => (
                <article className="permission-catalog-item" key={key}>
                  <code>{key}</code>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section" aria-labelledby="roles-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="roles-title">Ruoli e permessi</h2>
                <p>Seleziona i permessi che ogni ruolo può utilizzare.</p>
              </div>
              <span className="admin-count">{roles.length} ruoli</span>
            </div>
            {roles.length === 0 ? (
              <p className="admin-empty">Non ci sono ancora ruoli.</p>
            ) : (
              <div className="admin-role-grid">
                {roles.map((role) => (
                  <article className="admin-role-card" key={role.id}>
                    <h3>{role.name}</h3>
                    <p>{role.description || "Nessuna descrizione."}</p>
                    <div className="admin-permission-list">
                      {permissions.length === 0 ? (
                        <span className="admin-empty">
                          Crea prima un permesso.
                        </span>
                      ) : (
                        permissions.map((permission) => {
                          const isEnabled = rolePermissions.some(
                            (item) =>
                              item.role_id === role.id &&
                              item.permission_id === permission.id,
                          );
                          const actionId = `${role.id}:${permission.id}`;
                          return (
                            <label
                              className="admin-permission"
                              key={permission.id}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                disabled={pendingAction === actionId}
                                onChange={() =>
                                  void togglePermission(
                                    role.id,
                                    permission.id,
                                    isEnabled,
                                  )
                                }
                              />
                              <span>
                                <strong>{permission.permission_key}</strong>
                                {permission.description && (
                                  <small>{permission.description}</small>
                                )}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
            </>
          )}

          {(isAdmin || canManageDashboard) && <section
            className="admin-section"
            aria-labelledby="dashboard-editor-title"
          >
            <div className="admin-section-heading">
              <div>
                <h2 id="dashboard-editor-title">Contenuti della home</h2>
                <p>
                  Aggiungi box informativi, testo libero e link, poi modifica o
                  rimuovi i contenuti pubblicati.
                </p>
              </div>
              <span className="admin-count">
                {dashboardBlocks.length} contenuti
              </span>
            </div>

            <form
              className="account-card dashboard-block-form"
              onSubmit={handleCreateDashboardBlock}
            >
              <label>
                Tipo contenuto
                <select
                  value={newBlockType}
                  onChange={(event) =>
                    setNewBlockType(event.target.value as DashboardBlockType)
                  }
                >
                  <option value="box">Box informativo</option>
                  <option value="text">Testo</option>
                  <option value="link">Link</option>
                </select>
              </label>
              {newBlockType !== "text" && (
                <label>
                  Titolo
                  <input
                    value={newBlockTitle}
                    maxLength={160}
                    onChange={(event) => setNewBlockTitle(event.target.value)}
                    required
                  />
                </label>
              )}
              {newBlockType !== "link" && (
                <label className="dashboard-block-wide">
                  Testo
                  <textarea
                    value={newBlockBody}
                    maxLength={5000}
                    rows={4}
                    onChange={(event) => setNewBlockBody(event.target.value)}
                    required
                  />
                </label>
              )}
              {newBlockType === "link" && (
                <>
                  <label>
                    Indirizzo link
                    <input
                      type="text"
                      value={newBlockLink}
                      placeholder="/lessons oppure https://..."
                      onChange={(event) => setNewBlockLink(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Testo del pulsante
                    <input
                      value={newBlockLinkLabel}
                      maxLength={60}
                      placeholder="Scopri di più"
                      onChange={(event) =>
                        setNewBlockLinkLabel(event.target.value)
                      }
                    />
                  </label>
                </>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={pendingAction === "create-dashboard-block"}
              >
                <Plus size={16} aria-hidden="true" />
                Aggiungi alla home
              </button>
            </form>

            {dashboardBlocks.length > 0 ? (
              <div className="admin-dashboard-blocks">
                {dashboardBlocks.map((block, index) => (
                  <article className="admin-dashboard-block" key={block.id}>
                    <div className="admin-dashboard-block-header">
                      <strong>
                        {block.block_type === "box"
                          ? "Box informativo"
                          : block.block_type === "text"
                            ? "Testo"
                            : "Link"}{" "}
                        {index + 1}
                      </strong>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Rimuovi contenuto ${index + 1}`}
                        disabled={pendingAction === `delete-block:${block.id}`}
                        onClick={() => void handleDeleteDashboardBlock(block)}
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                    {block.block_type !== "text" && (
                      <label>
                        Titolo
                        <input
                          value={block.title}
                          maxLength={160}
                          onChange={(event) =>
                            updateBlock(block.id, "title", event.target.value)
                          }
                        />
                      </label>
                    )}
                    {block.block_type !== "link" && (
                      <label>
                        Testo
                        <textarea
                          value={block.body}
                          maxLength={5000}
                          rows={4}
                          onChange={(event) =>
                            updateBlock(block.id, "body", event.target.value)
                          }
                        />
                      </label>
                    )}
                    {block.block_type === "link" && (
                      <div className="dashboard-block-link-fields">
                        <label>
                          Indirizzo link
                          <input
                            value={block.link_url ?? ""}
                            onChange={(event) =>
                              updateBlock(
                                block.id,
                                "link_url",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                        <label>
                          Testo del pulsante
                          <input
                            value={block.link_label ?? ""}
                            maxLength={60}
                            onChange={(event) =>
                              updateBlock(
                                block.id,
                                "link_label",
                                event.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                    )}
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={pendingAction === `save-block:${block.id}`}
                      onClick={() => void handleSaveDashboardBlock(block)}
                    >
                      Salva modifiche
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty">
                Non hai ancora aggiunto contenuti personalizzati alla home.
              </p>
            )}
          </section>}

          {isAdmin && (
            <>
          <section className="admin-section" aria-labelledby="users-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="users-title">Utenti</h2>
                <p>Gestisci le assegnazioni di ruolo per ogni account.</p>
              </div>
              <span className="admin-count">{profiles.length} utenti</span>
            </div>
            {profiles.length === 0 ? (
              <p className="admin-empty">Non ci sono ancora utenti.</p>
            ) : (
              <div className="admin-users">
                {profiles.map((profile) => {
                  const assignedRoles = userRoles
                    .filter((item) => item.user_id === profile.user_id)
                    .map((item) => ({
                      id: item.role_id,
                      name:
                        roles.find((role) => role.id === item.role_id)?.name ??
                        "Ruolo rimosso",
                    }));
                  const availableRoles = roles.filter(
                    (role) =>
                      !assignedRoles.some((assigned) => assigned.id === role.id),
                  );

                  return (
                    <div className="admin-user-row" key={profile.user_id}>
                      <div className="admin-user-identity">
                        <strong>{profile.display_name || profile.email}</strong>
                        <span>{profile.email}</span>
                      </div>
                      <div className="admin-user-roles">
                        {assignedRoles.map((role) => (
                          <span className="admin-role-tag" key={role.id}>
                            {role.name}
                            <button
                              type="button"
                              aria-label={`Rimuovi il ruolo ${role.name} da ${profile.email}`}
                              disabled={
                                pendingAction ===
                                `remove:${profile.user_id}:${role.id}`
                              }
                              onClick={() =>
                                void removeRole(profile.user_id, role.id)
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="admin-assign-role">
                        <label className="visually-hidden" htmlFor={`role-${profile.user_id}`}>
                          Assegna ruolo a {profile.email}
                        </label>
                        <select
                          id={`role-${profile.user_id}`}
                          value={selectedRoles[profile.user_id] ?? ""}
                          onChange={(event) =>
                            setSelectedRoles((current) => ({
                              ...current,
                              [profile.user_id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Scegli un ruolo</option>
                          {availableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={
                            !selectedRoles[profile.user_id] ||
                            pendingAction === `assign:${profile.user_id}`
                          }
                          onClick={() => void assignRole(profile.user_id)}
                        >
                          Assegna
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
