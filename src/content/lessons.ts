import practiceData from '../../content/opening-practice.json';

import { guideById } from '@/content';
import { type GuideLesson, type OpeningBranch, type TransferExercise } from '@/content/types';

export const lessonByGuideId = Object.fromEntries(
  (practiceData as GuideLesson[]).map((lesson) => [lesson.guideId, lesson]),
) as Record<string, GuideLesson>;

export function branchesForGuide(guideId: string): OpeningBranch[] {
  const guide = guideById[guideId];
  if (!guide) return [];
  return [
    {
      id: 'main',
      title: 'Main example',
      description: guide.description,
      moves: guide.moves,
      notes: guide.notes,
      sourceUrl: guide.sourceUrl,
    },
    ...(lessonByGuideId[guideId]?.branches ?? []),
  ];
}

export function branchForGuide(guideId: string, branchId: string) {
  return branchesForGuide(guideId).find((branch) => branch.id === branchId);
}

export function transfersForGuide(guideId: string): TransferExercise[] {
  return lessonByGuideId[guideId]?.transfers ?? [];
}

export const transferById = Object.fromEntries(
  (practiceData as GuideLesson[]).flatMap((lesson) =>
    lesson.transfers.map((exercise) => [exercise.id, exercise]),
  ),
) as Record<string, TransferExercise>;
