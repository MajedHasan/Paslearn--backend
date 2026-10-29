/**
 * Provider interface — implement this with OpenAI / Claude / local model.
 * Every method maps to a `AiJobType`. Swap the registered provider at startup.
 */
export interface AiProvider {
  name: string;

  generateQuiz(input: {
    title: string;
    content: string;
    count?: number;
  }): Promise<{ questions: any[] }>;

  summarize(input: {
    title: string;
    content: string;
  }): Promise<{ summary: string }>;

  transcribe(input: { mediaUrl: string }): Promise<{ transcript: string }>;

  chatbot(input: { context: string; question: string }): Promise<{ answer: string }>;

  translate(input: { text: string; targetLang: string }): Promise<{ translation: string }>;

  personalizedPath(input: {
    userId: string;
    courseId: string;
    completedLessonIds: string[];
    allLessonIds: string[];
  }): Promise<{ recommendedOrder: string[]; reasoning: string }>;

  generateOutline(input: {
    topic: string;
    level: "beginner" | "intermediate" | "advanced";
    lessonCount?: number;
  }): Promise<{ sections: any[] }>;

  suggestDescription(input: { title: string; category?: string }): Promise<{ suggestions: string[] }>;

  suggestTags(input: { title: string; description: string }): Promise<{ tags: string[]; category?: string }>;
}

// ─────────────────────────────────────────────────────────────
// Stub provider — returns deterministic fake data.
// Replace with `registerAiProvider(new OpenAiProvider(...))` in server.ts.
// ─────────────────────────────────────────────────────────────

export class StubAiProvider implements AiProvider {
  name = "stub";

  async generateQuiz(input: { title: string; content: string; count?: number }) {
    const count = input.count || 3;
    return {
      questions: Array.from({ length: count }, (_, i) => ({
        type: "single_choice",
        prompt: `[STUB] Sample question ${i + 1} about "${input.title}"`,
        points: 1,
        options: [
          { id: "a", text: "Option A", isCorrect: i === 0 },
          { id: "b", text: "Option B", isCorrect: i !== 0 },
          { id: "c", text: "Option C", isCorrect: false },
        ],
      })),
    };
  }

  async summarize(input: { title: string; content: string }) {
    return {
      summary: `[STUB] Here's a summary of "${input.title}": ${input.content.slice(0, 200)}…`,
    };
  }

  async transcribe(input: { mediaUrl: string }) {
    return {
      transcript: `[STUB] Transcript of ${input.mediaUrl} — this placeholder will be replaced when a real provider is registered.`,
    };
  }

  async chatbot(input: { context: string; question: string }) {
    return {
      answer: `[STUB] You asked: "${input.question}". This is a placeholder answer — the real provider isn't configured yet.`,
    };
  }

  async translate(input: { text: string; targetLang: string }) {
    return { translation: `[STUB ${input.targetLang}] ${input.text}` };
  }

  async personalizedPath(input: { completedLessonIds: string[]; allLessonIds: string[] }) {
    const remaining = input.allLessonIds.filter((id) => !input.completedLessonIds.includes(id));
    return {
      recommendedOrder: [...remaining, ...input.completedLessonIds],
      reasoning: `[STUB] Suggest completing ${remaining.length} remaining lessons first for continuous momentum.`,
    };
  }

  async generateOutline(input: { topic: string; level: string; lessonCount?: number }) {
    const n = input.lessonCount || 3;
    return {
      sections: [
        {
          title: `[STUB] Introduction to ${input.topic}`,
          lessons: Array.from({ length: n }, (_, i) => ({
            title: `Lesson ${i + 1}: Foundations`,
            type: "video",
          })),
        },
      ],
    };
  }

  async suggestDescription(input: { title: string; category?: string }) {
    return {
      suggestions: [
        `[STUB] Learn ${input.title} from scratch — no prior experience needed.`,
        `[STUB] Master ${input.title} with hands-on projects and real-world examples.`,
        `[STUB] The complete ${input.title} course for ${input.category || "beginners"}.`,
      ],
    };
  }

  async suggestTags(input: { title: string; description: string }) {
    return {
      tags: ["stub-tag-1", "stub-tag-2", "stub-tag-3"],
      category: "development",
    };
  }
}

// ── Registry ──
let _provider: AiProvider = new StubAiProvider();

export function registerAiProvider(p: AiProvider) {
  _provider = p;
  console.log(`[ai] provider registered: ${p.name}`);
}

export function getAiProvider(): AiProvider {
  return _provider;
}