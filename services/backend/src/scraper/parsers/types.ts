/**
 * Shared types for all content parsers.
 * Every parser implements the Parser interface.
 */

export interface ContentMetadata {
  title: string;
  author: string | null;
  artist: string | null;
  synopsis: string | null;
  coverImageUrl: string | null;
  sourceSite: string;
  language: string;
  genres: string[];
  tags: string[];
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'UNKNOWN';
  type: 'WEB_NOVEL' | 'LIGHT_NOVEL' | 'COMIC' | 'MANGA' | 'EBOOK' | 'WEBTOON';
}

export interface ChapterRef {
  number: number;
  title: string | null;
  url: string;
  publishedAt: Date | null;
}

export interface Parser {
  /** Returns true if this parser can handle the given URL */
  canHandle(url: string): boolean;
  /** Extract content metadata (title, author, synopsis, etc.) from the series page */
  extractMetadata(url: string): Promise<ContentMetadata>;
  /** Extract the ordered list of chapter URLs */
  extractChapterList(url: string): Promise<ChapterRef[]>;
  /** Extract the full HTML/text body of a single chapter */
  extractChapterBody(chapterUrl: string): Promise<string>;
}
