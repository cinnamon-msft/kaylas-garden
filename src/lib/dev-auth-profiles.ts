export const devProfiles = {
  local: {
    id: "dev-feeder",
    name: "Dev Feeder",
    email: "dev-feeder@example.test",
    username: "dev-feeder",
    gardenName: "Dev Feeder's Garden",
    location: "Seattle, WA",
  },
  remote: {
    id: "remote-feeder",
    name: "Remote Feeder",
    email: "remote-feeder@example.test",
    username: "remote-feeder",
    gardenName: "Remote Feeder's Garden",
    location: "Seattle, WA",
  },
} as const;

export type DevProfileKey = keyof typeof devProfiles;
export type DevProfile = (typeof devProfiles)[DevProfileKey];

export const localDevProfileKey: DevProfileKey = "local";
export const remoteDevProfileKey: DevProfileKey = "remote";

export function getDevProfile(profileKey?: string | null): DevProfile | undefined {
  const requestedProfile = profileKey || localDevProfileKey;

  if (requestedProfile === localDevProfileKey || requestedProfile === remoteDevProfileKey) {
    return devProfiles[requestedProfile];
  }

  return undefined;
}

export function getDevProfileEntries(): Array<[DevProfileKey, DevProfile]> {
  return Object.entries(devProfiles) as Array<[DevProfileKey, DevProfile]>;
}
