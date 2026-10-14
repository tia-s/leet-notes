import type { CollectionEntry } from 'astro:content';

export function sortNotesByDate(notes: CollectionEntry<'notes'>[]): CollectionEntry<'notes'>[] {
  return notes.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());
}

export function filterNotesByCategory(notes: CollectionEntry<'notes'>[], category: string): CollectionEntry<'notes'>[] {
  if (!category || category === 'all') return notes;
  return notes.filter((note) => note.data.category === category);
}