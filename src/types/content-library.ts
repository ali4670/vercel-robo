export interface ContentLibraryItem {
  id: string;
  title: string;
  file_type: "video" | "pdf" | "image" | "document" | "quiz" | "assignment";
  storage_url: string;
  storage_path: string | null;
  file_hash: string | null;
  file_size: number | null;
  mime_type: string | null;
  metadata: Record<string, any>;
  usage_count?: number;
  created_by: string | null;
  created_at: string;
}

export interface QuizTemplate {
  id: string;
  title: string;
  questions: QuizQuestion[];
  passing_score: number;
  created_by: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "written" | "file";
  question: string;
  options?: string[];
  correctOptionIndex?: number;
}

export interface AssignmentTemplate {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  content_library_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  student_count?: number;
  created_at: string;
}

export interface LevelTemplate {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  level_order: number;
  drip_interval_days: number;
  is_published: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LectureTemplate {
  id: string;
  level_template_id: string;
  title: string;
  description: string | null;
  slot_number: number;
  drip_days: number;
  is_live: boolean;
  is_big_exam: boolean;
  assignment_required: boolean;
  assignment_template_id: string | null;
  content_blocks: ContentBlock[];
  created_at: string;
}

export interface ExamTemplate {
  id: string;
  level_template_id: string;
  title: string;
  questions: QuizQuestion[];
  passing_score: number;
  created_at: string;
}

export interface GroupLevelAssignment {
  id: string;
  group_id: string;
  level_template_id: string;
  drip_override_days: number | null;
  custom_title: string | null;
  assigned_at: string;
}

export interface ContentBlock {
  id: string;
  type: "text" | "code" | "image" | "pdf" | "download" | "word" | "canvas" | "quiz";
  content: string;
  metadata?: {
    filename?: string;
    filesize?: string;
    quiz?: {
      question: string;
      options: string[];
      correctOptionIndex: number;
    };
  };
}

export interface LectureInput {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  pdf_url: string;
  slot_number: number;
  is_live?: boolean;
  content_blocks?: ContentBlock[];
  quiz_data?: any[];
  is_big_exam?: boolean;
  drip_days?: number;
  assignment_required?: boolean;
  assignment_template_id?: string | null;
}
