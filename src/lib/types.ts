export type SkillMod = {
  key: string;
  value: number;
  raw: string;
};

export type RankEntry = {
  name: string;
  nodeId: string;
  displayName: string;
  treeId: number;
  tier: number | null;
  grid: number | null;
  rank: number | null;
  reqProf: string;
  prereqLevel: number | null;
  parent: string;
  skillsRequired: string[];
  skillsRequiredCount: number | null;
  preclusionSkills: string[];
  xpType: string;
  xpCost: number;
  skillAbility: string[];
  commands: string[];
  skillMods: SkillMod[];
};

export type VisibleNode = {
  nodeId: string;
  treeId: number;
  tier: number | null;
  grid: number | null;
  displayName: string;
  maxRank: number;
  skillsRequired: string[];
  skillsRequiredCount: number | null;
  preclusionSkills: string[];
  reqProf: string;
  prereqLevel: number | null;
  ranks: RankEntry[];
};

export type TreeData = {
  id: number;
  key: string;
  uiBackgroundId: string;
  nodes: VisibleNode[];
};

export type ExpertiseMeta = {
  generatedAt: string;
  sourceFiles: string[];
  warningCount: number;
};

export type ExpertisePayload = {
  meta: ExpertiseMeta;
  trees: TreeData[];
};
