export const ADMIN_EMAIL = "alessandro.luigi.napoli@gmail.com";

export function isClassHubAdmin(email: string | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
