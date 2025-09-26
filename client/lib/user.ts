const STORAGE_KEY = "prd_user_id";
const TEAM_KEY = "prd_user_team";

export function getCurrentUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getCurrentUserTeam(): string | null {
  return localStorage.getItem(TEAM_KEY);
}

export function setCurrentUserTeam(team: string) {
  localStorage.setItem(TEAM_KEY, team);
}
