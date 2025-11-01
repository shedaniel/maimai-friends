import { flag } from "flags/next";

export interface Flags {
  enableChinaRegion: boolean;
  newTokenDialog: boolean;
  historyCard: boolean;
  recommendationFilters: boolean;
}

export const useFlags = async (): Promise<Flags> => {
  return {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    enableChinaRegion: await useEnableChinaRegion(),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    newTokenDialog: await useNewTokenDialog(),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    historyCard: await useHistoryCard(),
    // eslint-disable-next-line react-hooks/rules-of-hooks
    recommendationFilters: await useRecommendationFilters(),
  };
}

export const defaultFlags: Flags = {
  enableChinaRegion: false,
  newTokenDialog: true,
  historyCard: false,
  recommendationFilters: false,
};

export const useEnableChinaRegion = flag<boolean>({
  key: "enableChinaRegion",
  defaultValue: false,
  async decide() {
    return false;
  },
});

export const useNewTokenDialog = flag<boolean>({
  key: "newTokenDialog",
  defaultValue: true,
  async decide() {
    return true;
  },
});

export const useHistoryCard = flag<boolean>({
  key: "historyCard",
  defaultValue: false,
  async decide() {
    return false;
  },
});

export const useRecommendationFilters = flag<boolean>({
  key: "recommendationFilters",
  defaultValue: true,
  async decide() {
    return true;
  },
});
