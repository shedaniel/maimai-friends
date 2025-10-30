import { flag } from "flags/next";

export const useEnableChinaRegion = flag<boolean>({
  key: "enableChinaRegion",
  defaultValue: false,
  async decide() {
    return false;
  },
});

export const useNewTokenDialog = flag<boolean>({
  key: "newTokenDialog",
  defaultValue: false,
  async decide() {
    return false;
  },
});
