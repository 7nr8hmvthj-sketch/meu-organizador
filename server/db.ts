import { eq, and, gte, lte, sql, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  events, InsertEvent, Event,
  expenses, InsertExpense, Expense,
  medications, InsertMedication, Medication,
  medicationLogs, InsertMedicationLog, MedicationLog,
  userPreferences, InsertUserPreference, UserPreference,
  diaryEntries, InsertDiaryEntry, DiaryEntry
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ EVENTS FUNCTIONS ============

export async function createEvent(event: InsertEvent): Promise<Event> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(events).values(event);
  const inserted = await db.select().from(events).where(eq(events.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function getEventById(id: number): Promise<Event | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0] || null;
}

export async function getEventsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(events).where(eq(events.userId, userId)).orderBy(events.date);
  
  // Converter datas para string no formato YYYY-MM-DD usando UTC para evitar problemas de timezone
  return result.map(event => ({
    ...event,
    date: event.date instanceof Date 
      ? `${event.date.getUTCFullYear()}-${String(event.date.getUTCMonth() + 1).padStart(2, '0')}-${String(event.date.getUTCDate()).padStart(2, '0')}`
      : String(event.date)
  }));
}

export async function getEventsByDateRange(userId: number, startDate: string, endDate: string): Promise<Event[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(events)
    .where(and(
      eq(events.userId, userId),
      gte(events.date, new Date(startDate)),
      lte(events.date, new Date(endDate))
    ))
    .orderBy(events.date);
}

export async function updateEvent(id: number, userId: number, data: Partial<InsertEvent>): Promise<Event | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(events).set(data).where(and(eq(events.id, id), eq(events.userId, userId)));
  const updated = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return updated[0] || null;
}

export async function deleteEvent(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
  return true;
}

// ============ EXPENSES FUNCTIONS ============

export async function createExpense(expense: InsertExpense): Promise<Expense> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(expenses).values(expense);
  const inserted = await db.select().from(expenses).where(eq(expenses.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function getExpensesByUserId(userId: number): Promise<Expense[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(expenses.dueDay);
}

export async function updateExpense(id: number, userId: number, data: Partial<InsertExpense>): Promise<Expense | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(expenses).set(data).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  const updated = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return updated[0] || null;
}

export async function deleteExpense(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  return true;
}

export async function resetExpensesPaidStatus(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(expenses).set({ isPaid: false, paidMonth: null, paidYear: null }).where(eq(expenses.userId, userId));
}

// ============ MEDICATIONS FUNCTIONS ============

export async function createMedication(medication: InsertMedication): Promise<Medication> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(medications).values(medication);
  const inserted = await db.select().from(medications).where(eq(medications.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function getMedicationsByUserId(userId: number): Promise<Medication[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(medications).where(eq(medications.userId, userId)).orderBy(medications.order);
}

export async function updateMedication(id: number, userId: number, data: Partial<InsertMedication>): Promise<Medication | null> {
  const db = await getDb();
  if (!db) return null;
  
  await db.update(medications).set(data).where(and(eq(medications.id, id), eq(medications.userId, userId)));
  const updated = await db.select().from(medications).where(eq(medications.id, id)).limit(1);
  return updated[0] || null;
}

export async function deleteMedication(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(medicationLogs).where(eq(medicationLogs.medicationId, id));
  await db.delete(medications).where(and(eq(medications.id, id), eq(medications.userId, userId)));
  return true;
}

// ============ MEDICATION LOGS FUNCTIONS ============

export async function logMedicationTaken(log: InsertMedicationLog): Promise<MedicationLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(medicationLogs).values(log);
  const inserted = await db.select().from(medicationLogs).where(eq(medicationLogs.id, Number(result[0].insertId))).limit(1);
  return inserted[0];
}

export async function getMedicationLogsByDate(userId: number, date: string): Promise<MedicationLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(medicationLogs)
    .where(and(
      eq(medicationLogs.userId, userId),
      eq(medicationLogs.takenDate, new Date(date))
    ));
}

export async function deleteMedicationLog(medicationId: number, userId: number, date: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(medicationLogs).where(and(
    eq(medicationLogs.medicationId, medicationId),
    eq(medicationLogs.userId, userId),
    eq(medicationLogs.takenDate, new Date(date))
  ));
  return true;
}

// ============ USER PREFERENCES FUNCTIONS ============

export async function getUserPreferences(userId: number): Promise<UserPreference | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0] || null;
}

export async function upsertUserPreferences(userId: number, prefs: Partial<InsertUserPreference>): Promise<UserPreference> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserPreferences(userId);
  
  if (existing) {
    await db.update(userPreferences).set(prefs).where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({ userId, ...prefs });
  }
  
  const result = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return result[0];
}

// ============ DIARY FUNCTIONS ============

export async function getDiaryEntry(userId: number, dateStr: string): Promise<DiaryEntry | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(diaryEntries)
    .where(and(
      eq(diaryEntries.userId, userId),
      eq(diaryEntries.date, new Date(dateStr + "T12:00:00Z"))
    ))
    .limit(1);
  
  if (result[0]) {
    return {
      ...result[0],
      date: result[0].date instanceof Date 
        ? `${result[0].date.getUTCFullYear()}-${String(result[0].date.getUTCMonth() + 1).padStart(2, '0')}-${String(result[0].date.getUTCDate()).padStart(2, '0')}`
        : String(result[0].date)
    } as DiaryEntry;
  }
  return null;
}

export async function upsertDiaryEntry(
  userId: number, 
  dateStr: string, 
  title: string | null, 
  content: string | null, 
  tags: string | null
): Promise<DiaryEntry> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const dateValue = new Date(dateStr + "T12:00:00Z");
  const existing = await getDiaryEntry(userId, dateStr);
  
  if (existing) {
    await db.update(diaryEntries)
      .set({ title, content, tags })
      .where(and(
        eq(diaryEntries.userId, userId),
        eq(diaryEntries.date, dateValue)
      ));
  } else {
    await db.insert(diaryEntries).values({
      userId,
      date: dateValue,
      title,
      content,
      tags
    });
  }
  
  const result = await getDiaryEntry(userId, dateStr);
  return result!;
}

export async function getDiaryEntriesByUserId(userId: number): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(sql`${diaryEntries.date} DESC`);
  
  return result.map(entry => ({
    ...entry,
    date: entry.date instanceof Date 
      ? `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}-${String(entry.date.getUTCDate()).padStart(2, '0')}`
      : String(entry.date)
  })) as DiaryEntry[];
}

export async function searchDiaryEntries(userId: number, searchTerm: string): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const searchPattern = `%${searchTerm}%`;
  
  const result = await db.select().from(diaryEntries)
    .where(and(
      eq(diaryEntries.userId, userId),
      or(
        like(diaryEntries.title, searchPattern),
        like(diaryEntries.content, searchPattern),
        like(diaryEntries.tags, searchPattern)
      )
    ))
    .orderBy(sql`${diaryEntries.date} DESC`);
  
  return result.map(entry => ({
    ...entry,
    date: entry.date instanceof Date 
      ? `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}-${String(entry.date.getUTCDate()).padStart(2, '0')}`
      : String(entry.date)
  })) as DiaryEntry[];
}

export async function getDiaryEntriesByTag(userId: number, tag: string): Promise<DiaryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  
  const tagPattern = `%${tag}%`;
  
  const result = await db.select().from(diaryEntries)
    .where(and(
      eq(diaryEntries.userId, userId),
      like(diaryEntries.tags, tagPattern)
    ))
    .orderBy(sql`${diaryEntries.date} DESC`);
  
  return result.map(entry => ({
    ...entry,
    date: entry.date instanceof Date 
      ? `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, '0')}-${String(entry.date.getUTCDate()).padStart(2, '0')}`
      : String(entry.date)
  })) as DiaryEntry[];
}

export async function getAllDiaryTags(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({ tags: diaryEntries.tags })
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId));
  
  const allTags = new Set<string>();
  result.forEach(entry => {
    if (entry.tags) {
      entry.tags.split(',').forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) allTags.add(trimmed);
      });
    }
  });
  
  return Array.from(allTags).sort();
}

export async function deleteDiaryEntry(userId: number, dateStr: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const dateValue = new Date(dateStr + "T12:00:00Z");
  await db.delete(diaryEntries).where(and(
    eq(diaryEntries.userId, userId),
    eq(diaryEntries.date, dateValue)
  ));
  return true;
}
