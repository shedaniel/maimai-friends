export type Region = "intl" | "jp";

export interface VersionInfo {
  id: number;
  name: string;
  shortName: string;
  intlReleaseDate: string | null; // YYYY/MM/DD format, null if not released yet
  jpReleaseDate: string | null; // YYYY/MM/DD format, null if not released yet
}

export const VERSIONS: VersionInfo[] = [
  {
    id: 0,
    name: "maimai DX",
    shortName: "DX",
    intlReleaseDate: "2019/11/25",
    jpReleaseDate: "2018/12/07"
  },
  {
    id: 1,
    name: "maimai DX PLUS",
    shortName: "DX PLUS",
    intlReleaseDate: "2020/07/29",
    jpReleaseDate: "2020/01/23"
  },
  {
    id: 2,
    name: "maimai DX スプラッシュ",
    shortName: "Splash",
    intlReleaseDate: "2021/01/29",
    jpReleaseDate: "2020/09/17"
  },
  {
    id: 3,
    name: "maimai DX スプラッシュ PLUS",
    shortName: "Splash PLUS",
    intlReleaseDate: "2021/07/30",
    jpReleaseDate: "2021/03/18"
  },
  {
    id: 4,
    name: "maimai DX UNiVERSE",
    shortName: "UNiVERSE",
    intlReleaseDate: "2022/01/27",
    jpReleaseDate: "2021/09/16"
  },
  {
    id: 5,
    name: "maimai DX UNiVERSE PLUS",
    shortName: "UNiVERSE PLUS",
    intlReleaseDate: "2022/07/28",
    jpReleaseDate: "2022/03/24"
  },
  {
    id: 6,
    name: "maimai DX FESTiVAL",
    shortName: "FESTiVAL",
    intlReleaseDate: "2023/01/19",
    jpReleaseDate: "2022/09/15"
  },
  {
    id: 7,
    name: "maimai DX FESTiVAL PLUS",
    shortName: "FESTiVAL PLUS",
    intlReleaseDate: "2023/07/27",
    jpReleaseDate: "2023/03/23"
  },
  {
    id: 8,
    name: "maimai DX BUDDiES",
    shortName: "BUDDiES",
    intlReleaseDate: "2024/01/18",
    jpReleaseDate: "2023/09/14"
  },
  {
    id: 9,
    name: "maimai DX BUDDiES PLUS",
    shortName: "BUDDiES PLUS",
    intlReleaseDate: "2024/07/25",
    jpReleaseDate: "2024/03/21"
  },
  {
    id: 10,
    name: "maimai DX PRiSM",
    shortName: "PRiSM",
    intlReleaseDate: "2025/01/16",
    jpReleaseDate: "2024/09/12"
  },
  {
    id: 11,
    name: "maimai DX PRiSM PLUS",
    shortName: "PRiSM PLUS",
    intlReleaseDate: "2025/07/24",
    jpReleaseDate: "2025/03/13"
  }
];

/**
 * Parse date string in YYYY/MM/DD format to Date object
 */
function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
}

/**
 * Get all available versions for a region (excluding null release dates)
 */
function getAvailableVersions(region: Region): VersionInfo[] {
  return VERSIONS.filter(v => {
    const dateString = region === "intl" ? v.intlReleaseDate : v.jpReleaseDate;
    return dateString !== null;
  });
}

/**
 * Get the latest available version for a given region
 */
export function getLatestAvailableVersion(region: Region): number {
  const availableVersions = getAvailableVersions(region);
  if (availableVersions.length === 0) {
    throw new Error(`No versions available for region ${region}`);
  }
  
  // Sort by release date (descending) and return the latest
  const sortedVersions = availableVersions.sort((a, b) => {
    const dateA = parseDate(region === "intl" ? a.intlReleaseDate! : a.jpReleaseDate!);
    const dateB = parseDate(region === "intl" ? b.intlReleaseDate! : b.jpReleaseDate!);
    return dateB.getTime() - dateA.getTime();
  });

  return sortedVersions[0].id;
}

/**
 * Get the version that was current on a specific date for a given region
 */
export function getVersionFromDate(date: Date, region: Region): number {
  const availableVersions = getAvailableVersions(region);
  
  // Sort versions by release date for the given region (descending)
  const sortedVersions = availableVersions.sort((a, b) => {
    const dateA = parseDate(region === "intl" ? a.intlReleaseDate! : a.jpReleaseDate!);
    const dateB = parseDate(region === "intl" ? b.intlReleaseDate! : b.jpReleaseDate!);
    return dateB.getTime() - dateA.getTime();
  });

  // Find the latest version that was released on or before the given date
  for (const version of sortedVersions) {
    const releaseDate = parseDate(region === "intl" ? version.intlReleaseDate! : version.jpReleaseDate!);
    if (date >= releaseDate) {
      return version.id;
    }
  }

  // If no version was released before the given date, return the earliest available version
  const earliestVersion = availableVersions.sort((a, b) => {
    const dateA = parseDate(region === "intl" ? a.intlReleaseDate! : a.jpReleaseDate!);
    const dateB = parseDate(region === "intl" ? b.intlReleaseDate! : b.jpReleaseDate!);
    return dateA.getTime() - dateB.getTime();
  })[0];

  return earliestVersion.id;
}

/**
 * Get the current version for a given region based on today's date
 * Falls back to latest available version if current date is beyond all releases
 */
export function getCurrentVersion(region: Region): number {
  try {
    return getVersionFromDate(new Date(), region);
  } catch {
    // Fallback to latest available version
    return getLatestAvailableVersion(region);
  }
}

/**
 * Get version info by version ID
 */
export function getVersionInfo(versionId: number): VersionInfo | null {
  return VERSIONS.find(v => v.id === versionId) || null;
}

/**
 * Get all versions sorted by release date for a specific region
 * Only includes versions that have been released (non-null dates)
 */
export function getVersionsSortedByDate(region: Region, ascending = true): VersionInfo[] {
  const availableVersions = getAvailableVersions(region);
  return availableVersions.sort((a, b) => {
    const dateA = parseDate(region === "intl" ? a.intlReleaseDate! : a.jpReleaseDate!);
    const dateB = parseDate(region === "intl" ? b.intlReleaseDate! : b.jpReleaseDate!);
    return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });
}

/**
 * Check if a version is currently available in a region
 */
export function isVersionAvailable(versionId: number, region: Region, date: Date = new Date()): boolean {
  const version = getVersionInfo(versionId);
  if (!version) return false;
  
  const dateString = region === "intl" ? version.intlReleaseDate : version.jpReleaseDate;
  if (!dateString) return false; // Not released yet
  
  const releaseDate = parseDate(dateString);
  return date >= releaseDate;
}
