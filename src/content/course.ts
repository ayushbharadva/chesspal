import sectionOne from '../../content/course/section-1.json';
import sectionTwo from '../../content/course/section-2.json';
import sectionThree from '../../content/course/section-3.json';
import sectionFour from '../../content/course/section-4.json';

import { type CourseLesson, type CourseSection, type CourseUnit } from '@/content/types';

/** Sections in order; a section still being written has no units and is left off the path. */
export const courseSections = (
  [sectionOne, sectionTwo, sectionThree, sectionFour] as CourseSection[]
).filter((section) => section.units.length > 0);

export interface CourseEntry {
  lesson: CourseLesson;
  unit: CourseUnit;
  section: CourseSection;
  /** Position on the whole path, from 0. */
  index: number;
}

export const courseLessons: CourseEntry[] = courseSections
  .flatMap((section) =>
    section.units.flatMap((unit) => unit.lessons.map((lesson) => ({ lesson, unit, section }))),
  )
  .map((entry, index) => ({ ...entry, index }));

export const courseLessonById = Object.fromEntries(
  courseLessons.map((entry) => [entry.lesson.id, entry]),
) as Record<string, CourseEntry>;
