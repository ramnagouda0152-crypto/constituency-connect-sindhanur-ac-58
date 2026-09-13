import { OFFICIAL_VILLAGES_AC58 } from '../data/villagesList.ts';

export const getVillageName = (villageId?: string | null): string => {
  if (!villageId) return 'All Constituency';
  return OFFICIAL_VILLAGES_AC58.find(v => v.village_id === villageId)?.village_name || villageId;
};
