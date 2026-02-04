import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// --- MIDDLEWARES ---

const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const cookies = ctx.req.headers.cookie || "";
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
  
  if (!authCookie) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login necessário." });
  }

  let user;
  try {
    const cookieValue = decodeURIComponent(authCookie.split('=')[1]);
    user = JSON.parse(cookieValue);
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão inválida." });
  }

  return next({ ctx: { ...ctx, user: user as { username: string; role: string; userId: number } } });
});

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores." });
  }
  return next();
});

// Simple auth credentials
const VALID_CREDENTIALS = {
  "USER": { password: "Wert123.", role: "admin", userId: 1 },
  "JESSICA": { password: "123", role: "trainer", userId: 150023 },
  "ISA": { password: "123", role: "trainer", userId: 150024 },
};

// Força meio-dia UTC para evitar bug de dia anterior por timezone
const parseDateSafe = (dateString: string) => {
  if (dateString.length === 10) return new Date(`${dateString}T12:00:00Z`);
  return new Date(dateString);
};

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return null;
      try { return JSON.parse(decodeURIComponent(authCookie.split('=')[1])); } catch { return null; }
    }),
    
    simpleLogin: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = VALID_CREDENTIALS[input.username.toUpperCase() as keyof typeof VALID_CREDENTIALS];
        if (user && input.password === user.password) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          const userInfo = JSON.stringify({ username: input.username.toUpperCase(), role: user.role, userId: user.userId });
          ctx.res.cookie("simple_auth", userInfo, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, role: user.role, username: input.username.toUpperCase() };
        }
        return { success: false, error: "Credenciais inválidas" };
      }),
    
    checkSimpleAuth: publicProcedure.query(({ ctx }) => {
      const cookies = ctx.req.headers.cookie || "";
      const authCookie = cookies.split(';').find(c => c.trim().startsWith('simple_auth='));
      if (!authCookie) return { isAuthenticated: false, user: null };
      try {
        const userInfo = JSON.parse(decodeURIComponent(authCookie.split('=')[1]));
        return { isAuthenticated: true, user: userInfo };
      } catch { return { isAuthenticated: false, user: null }; }
    }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("simple_auth", { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // Events/Shifts router
  events: router({
    // Trainers veem agenda do Admin (ID 1)
    list: publicProcedure.query(async () => await db.getEventsByUserId(1)),
    
    listByDateRange: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => await db.getEventsByDateRange(1, input.startDate, input.endDate)),
    
    create: protectedProcedure
      .input(z.object({ date: z.string(), type: z.string(), description: z.string().optional(), isShift: z.boolean().default(true) }))
      .mutation(async ({ input, ctx }) => {
        return await db.createEvent({
          userId: 1, // Trainers agendam para o Admin
          date: parseDateSafe(input.date),
          type: input.type,
          description: input.description || null,
          isShift: input.isShift,
          createdBy: ctx.user.username, // Salva quem criou o evento
        });
      }),
    
    update: protectedProcedure
      .input(z.object({ id: z.number(), date: z.string().optional(), type: z.string().optional(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        // Verifica se o usuário pode editar (admin ou criador do evento)
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        // Treinadoras só podem editar eventos que elas criaram (Musculação/Pilates)
        if (ctx.user.role === "trainer") {
          if (event.createdBy !== ctx.user.username) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode editar treinos que você criou." });
          }
        }
        
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.date) updateData.date = parseDateSafe(data.date);
        if (data.type) updateData.type = data.type;
        if (data.description !== undefined) updateData.description = data.description;
        return await db.updateEvent(id, 1, updateData);
      }),
    
    passShift: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => await db.updateEvent(input.id, 1, { isPassed: true, passedReason: input.reason })),
    
    undoPass: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => await db.updateEvent(input.id, 1, { isPassed: false, passedReason: null })),
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => await db.updateEvent(input.id, 1, { isCancelled: true })),
    
    undoCancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => await db.updateEvent(input.id, 1, { isCancelled: false })),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verifica se o usuário pode excluir (admin ou criador do evento)
        const event = await db.getEventById(input.id);
        if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Evento não encontrado." });
        
        // Treinadoras só podem excluir eventos que elas criaram (Musculação/Pilates)
        if (ctx.user.role === "trainer") {
          if (event.createdBy !== ctx.user.username) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode excluir treinos que você criou." });
          }
        }
        
        return await db.deleteEvent(input.id, 1);
      }),
  }),

  // Expenses router - Admin only
  expenses: router({
    list: adminProcedure.query(async ({ ctx }) => await db.getExpensesByUserId(ctx.user.userId)),
    
    create: adminProcedure
      .input(z.object({ name: z.string(), amount: z.string(), dueDay: z.number(), category: z.enum(["fixed", "variable"]) }))
      .mutation(async ({ input, ctx }) => await db.createExpense({ userId: ctx.user.userId, name: input.name, amount: input.amount, dueDay: input.dueDay, category: input.category })),
    
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), amount: z.string().optional(), dueDay: z.number().optional(), category: z.enum(["fixed", "variable"]).optional() }))
      .mutation(async ({ input, ctx }) => { const { id, ...data } = input; return await db.updateExpense(id, ctx.user.userId, data); }),
    
    togglePaid: adminProcedure
      .input(z.object({ id: z.number(), isPaid: z.boolean(), month: z.number().optional(), year: z.number().optional() }))
      .mutation(async ({ input, ctx }) => await db.updateExpense(input.id, ctx.user.userId, { isPaid: input.isPaid, paidMonth: input.isPaid ? input.month : null, paidYear: input.isPaid ? input.year : null })),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => await db.deleteExpense(input.id, ctx.user.userId)),
    
    resetPaidStatus: adminProcedure.mutation(async ({ ctx }) => { await db.resetExpensesPaidStatus(ctx.user.userId); return { success: true }; }),
  }),

  // Medications router
  medications: router({
    list: adminProcedure.query(async ({ ctx }) => await db.getMedicationsByUserId(ctx.user.userId)),
    
    create: adminProcedure
      .input(z.object({ name: z.string(), time: z.string(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => await db.createMedication({ userId: ctx.user.userId, name: input.name, time: input.time, order: input.order || 0 })),
    
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), time: z.string().optional(), order: z.number().optional() }))
      .mutation(async ({ input, ctx }) => { const { id, ...data } = input; return await db.updateMedication(id, ctx.user.userId, data); }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => await db.deleteMedication(input.id, ctx.user.userId)),
    
    getLogs: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => await db.getMedicationLogsByDate(ctx.user.userId, input.date)),
    
    logTaken: adminProcedure
      .input(z.object({ medicationId: z.number(), date: z.string() }))
      .mutation(async ({ input, ctx }) => await db.logMedicationTaken({ userId: ctx.user.userId, medicationId: input.medicationId, takenDate: parseDateSafe(input.date) })),
    
    undoTaken: adminProcedure
      .input(z.object({ medicationId: z.number(), date: z.string() }))
      .mutation(async ({ input, ctx }) => await db.deleteMedicationLog(input.medicationId, ctx.user.userId, input.date)),
  }),

  // Diary router - Admin only (private diary)
  diary: router({
    // Get diary entry for a specific date
    get: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getDiaryEntry(ctx.user.userId, input.date);
      }),
    
    // Save or update diary entry
    save: adminProcedure
      .input(z.object({ 
        date: z.string(), 
        title: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        tags: z.string().nullable().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.upsertDiaryEntry(
          ctx.user.userId, 
          input.date, 
          input.title || null, 
          input.content || null,
          input.tags || null
        );
      }),
    
    // List all diary entries
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getDiaryEntriesByUserId(ctx.user.userId);
    }),
    
    // Search diary entries by keyword
    search: adminProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.searchDiaryEntries(ctx.user.userId, input.query);
      }),
    
    // Get entries by tag
    byTag: adminProcedure
      .input(z.object({ tag: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.getDiaryEntriesByTag(ctx.user.userId, input.tag);
      }),
    
    // Get all tags used
    tags: adminProcedure.query(async ({ ctx }) => {
      return await db.getAllDiaryTags(ctx.user.userId);
    }),
    
    // Delete diary entry
    delete: adminProcedure
      .input(z.object({ date: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return await db.deleteDiaryEntry(ctx.user.userId, input.date);
      }),
  }),

  // User preferences router
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => await db.getUserPreferences(ctx.user.userId)),
    setTheme: protectedProcedure
      .input(z.object({ theme: z.enum(["light", "dark"]) }))
      .mutation(async ({ input, ctx }) => await db.upsertUserPreferences(ctx.user.userId, { theme: input.theme })),
  }),
});

export type AppRouter = typeof appRouter;
