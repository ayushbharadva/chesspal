import skillData from '../../content/skills.json';

import { type SkillTheme } from '@/content/types';

export interface Skill {
  id: SkillTheme;
  name: string;
  summary: string;
  card: string;
  lookFor: string;
  goal: string;
  hint: string;
}
export interface SkillUnit {
  id: string;
  title: string;
  skills: SkillTheme[];
}

export const skills = skillData.skills as Skill[];
export const skillUnits = skillData.units as SkillUnit[];
export const skillById = Object.fromEntries(skills.map((skill) => [skill.id, skill])) as Record<
  SkillTheme,
  Skill
>;
