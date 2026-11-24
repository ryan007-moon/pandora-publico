export const BRASILIA = 'America/Sao_Paulo';

/** Real catalog identifiers for formations eligible for the Pandora technology hackathon. */
export const TECHNOLOGY_COURSE_CODES = ['PAND-ADS', 'PAND-ES', 'PAND-TEC'] as const;
export function isTechnologyCourse(code: string): boolean {
  return (TECHNOLOGY_COURSE_CODES as readonly string[]).includes(code);
}


export const activityStatuses = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  submitted: 'Entregue',
  reviewed: 'Revisada',
} as const;

export type ActivityCategory = 'activity' | 'project';
export type CourseShowcase = {
  course_id: string;
  area: string;
  overview: string;
  photo_url: string;
  photo_alt: string;
  photo_credit: string;
  photo_source: string;
  topics: string[];
};

export type CourseSubject = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  summary: string;
  photo_url: string;
  photo_alt: string;
  photo_source: string;
  classroom_id: string | null;
  weekday: number | null;
  starts_at: string | null;
  ends_at: string | null;
  learning_goals: string[];
  faculty: { full_name: string; specialty: string; is_fictional: boolean } | null;
};

export type ActivityStatus = keyof typeof activityStatuses;
export type Activity = {
  id: string;
  course_id: string;
  class_student_id: string;
  subject_id: string | null;
  title: string;
  body: string;
  due_at: string;
  status: ActivityStatus;
  category: ActivityCategory;
  is_demo: boolean;
  submission_text?: string | null;
  submission_url?: string | null;
  submitted_at?: string | null;
  attachment_path?: string | null;
  review_feedback?: string | null;
  reviewed_score?: number | null;
  reviewed_at?: string | null;
};
export function isCompleted(activity: Activity) {
  return activity.status === 'submitted' || activity.status === 'reviewed';
}

export type Replay = {id:string;course_id:string;subject_id:string;lesson_date:string;title:string;summary:string;question:string;answer:string};
export type Competency = {id:string;activity_id:string;dimension:string;skill:string;evidence:string;created_at:string};
export const COMPETENCY_DIMENSIONS = [
 ['tecnica','Técnica'],['analise','Análise'],['comunicacao','Comunicação'],['colaboracao','Colaboração'],['gestao','Gestão'],['criatividade','Criatividade']
] as const;
export type AcademicRecords = {
  replays?: Replay[];
  competencies?: Competency[];
  userId: string;
  name: string;
  courses: { id: string; title: string; code: string; description: string; demo_weekday: number | null; demo_starts_at: string | null }[];
  showcases: CourseShowcase[];
  subjects: CourseSubject[];
  materials: { id: string; course_id: string; title: string; body: string; file_path: string | null }[];
  grades: { id: string; course_id: string; assessment: string; score: number; is_demo: boolean; subject_id: string | null }[];
  announcements: { id: string; course_id: string; class_student_id: string | null; title: string; body: string; created_at: string }[];
  activities: Activity[];
};

export function subjectScore(grades: AcademicRecords['grades'], subjectId: string) {
  const scoped = grades.filter(grade => grade.subject_id === subjectId);
  const official = scoped.filter(grade => !grade.is_demo);
  const selected = official.length ? official : scoped;
  return {
    score: selected.length ? selected.reduce((sum, grade) => sum + Number(grade.score), 0) / selected.length : null,
    isDemo: selected.length > 0 && official.length === 0,
  };
}

const calendarClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: BRASILIA, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function brasiliaInput(date: Date | string) {
  return calendarClock.format(new Date(date)).replace(' ', 'T');
}

export function brasiliaInstant(input: unknown) {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return null;
  const utcGuess = new Date(input + ':00Z');
  if (!Number.isFinite(utcGuess.getTime())) return null;
  const localGuess = new Date(brasiliaInput(utcGuess) + ':00Z');
  const instant = new Date(2 * utcGuess.getTime() - localGuess.getTime());
  return brasiliaInput(instant) === input ? instant.toISOString() : null;
}

export function brasiliaLabel(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASILIA, dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(date));
}
export type AcademicHighlight = {
  id: string;
  imagem: string;
  alt: string;
  kicker: string;
  titulo: string;
  legenda: string;
  href: string;
  cta: string;
};

export function courseHighlights(records: AcademicRecords, courseId: string, now = Date.now()): AcademicHighlight[] {
  const course = records.courses.find(item => item.id === courseId);
  if (!course) return [];

  const subjects = records.subjects.filter(item => item.course_id === courseId);
  const cover = records.showcases.find(item => item.course_id === courseId);
  const activities = records.activities.filter(item => item.course_id === courseId && !isCompleted(item)
    && (!item.subject_id || subjects.some(subject => subject.id === item.subject_id)));
  const deadlines = [...activities].sort((a, b) => {
    const aDue = Date.parse(a.due_at);
    const bDue = Date.parse(b.due_at);
    return Number(aDue < now) - Number(bDue < now) || aDue - bDue;
  });
  const slides: AcademicHighlight[] = [];
  const images = new Set<string>();
  const coursePath = `/cursos/${courseId}`;

  for (const activity of deadlines) {
    if (slides.length === 4) break;
    const subject = subjects.find(item => item.id === activity.subject_id);
    const photo = subject?.photo_url || cover?.photo_url;
    if (!photo || images.has(photo)) continue;
    images.add(photo);
    const path = subject ? `${coursePath}/materias/${subject.id}` : coursePath;
    slides.push({
      id: activity.id, imagem: photo, alt: subject?.photo_alt || cover?.photo_alt || '',
      kicker: `${activity.category === 'project' ? 'Projeto' : 'Entrega'} · ${brasiliaLabel(activity.due_at)}${activity.is_demo ? ' · Exemplo' : ''}`,
      titulo: activity.title, legenda: subject?.title || course.title,
      href: `${path}#${activity.id}`, cta: 'Ver atividade',
    });
  }

  for (const subject of subjects) {
    if (slides.length === 4) break;
    if (!subject.photo_url || images.has(subject.photo_url)) continue;
    images.add(subject.photo_url);
    slides.push({
      id: subject.id, imagem: subject.photo_url, alt: subject.photo_alt,
      kicker: course.title, titulo: subject.title, legenda: subject.summary,
      href: `${coursePath}/materias/${subject.id}`, cta: 'Explorar matéria',
    });
  }

  if (slides.length === 0 && cover?.photo_url) {
    slides.push({
      id: course.id, imagem: cover.photo_url, alt: cover.photo_alt,
      kicker: cover.area, titulo: course.title, legenda: cover.overview,
      href: coursePath, cta: 'Abrir formação',
    });
  }
  return slides;
}