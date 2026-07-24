"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import {
  LOAN_CHAT_MODES,
  emptyLoanState,
  conversationTitleFromMessage,
} from "@/lib/chat-loan-intake";

const SESSION_COOKIE_FALLBACK_PREFIX = "max_chat_";

export async function resolveClerkUserId() {
  try {
    const { userId } = await auth();
    return userId || null;
  } catch {
    return null;
  }
}

function mapMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    payload: row.payload || null,
    createdAt: row.createdAt,
    sender: row.role === "user" ? "user" : "bot",
    text: row.content,
    cars: row.payload?.cars || [],
    offers: row.payload?.offers || [],
    fieldPrompt: row.payload?.fieldPrompt || null,
    loanSubmitted: row.payload?.loanSubmitted || null,
  };
}

export async function ensureChatConversation(sessionId, { title } = {}) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const clerkUserId = await resolveClerkUserId();

  let conversation = await db.chatConversation.findFirst({
    where: {
      sessionId,
      mode: { not: LOAN_CHAT_MODES.SUBMITTED },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await db.chatConversation.create({
      data: {
        sessionId,
        clerkUserId,
        title: title || "محادثة جديدة",
        mode: LOAN_CHAT_MODES.IDLE,
        loanState: emptyLoanState(),
      },
    });
  } else if (clerkUserId && !conversation.clerkUserId) {
    conversation = await db.chatConversation.update({
      where: { id: conversation.id },
      data: { clerkUserId },
    });
  }

  return conversation;
}

export async function createNewChatConversation(sessionId) {
  const clerkUserId = await resolveClerkUserId();
  return db.chatConversation.create({
    data: {
      sessionId: sessionId || `${SESSION_COOKIE_FALLBACK_PREFIX}${Date.now()}`,
      clerkUserId,
      title: "محادثة جديدة",
      mode: LOAN_CHAT_MODES.IDLE,
      loanState: emptyLoanState(),
    },
  });
}

export async function listChatConversations(sessionId) {
  const clerkUserId = await resolveClerkUserId();
  const or = [{ sessionId }];
  if (clerkUserId) or.push({ clerkUserId });

  const rows = await db.chatConversation.findMany({
    where: { OR: or },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      mode: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title || "محادثة",
    mode: row.mode,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    messageCount: row._count.messages,
  }));
}

export async function loadChatConversation(conversationId, sessionId) {
  const clerkUserId = await resolveClerkUserId();
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return { success: false, message: "المحادثة غير موجودة" };
  }

  const allowed =
    conversation.sessionId === sessionId ||
    (clerkUserId && conversation.clerkUserId === clerkUserId);

  if (!allowed) {
    return { success: false, message: "غير مصرح بالوصول لهذه المحادثة" };
  }

  return {
    success: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      loanState: conversation.loanState || emptyLoanState(),
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map(mapMessage),
    },
  };
}

export async function appendChatMessages(conversationId, messages) {
  if (!conversationId || !messages?.length) return;

  await db.$transaction(
    messages.map((msg) =>
      db.chatMessage.create({
        data: {
          conversationId,
          role: msg.role,
          content: msg.content,
          payload: msg.payload ?? undefined,
        },
      })
    )
  );

  const firstUser = messages.find((m) => m.role === "user");
  const data = { updatedAt: new Date() };
  if (firstUser?.content) {
    const existing = await db.chatConversation.findUnique({
      where: { id: conversationId },
      select: { title: true, _count: { select: { messages: true } } },
    });
    if (existing && (!existing.title || existing.title === "محادثة جديدة") && existing._count.messages <= messages.length) {
      data.title = conversationTitleFromMessage(firstUser.content);
    }
  }

  await db.chatConversation.update({
    where: { id: conversationId },
    data,
  });
}

export async function updateChatConversationState(
  conversationId,
  { mode, loanState, title }
) {
  const data = {};
  if (mode != null) data.mode = mode;
  if (loanState != null) data.loanState = loanState;
  if (title != null) data.title = title;
  data.updatedAt = new Date();
  return db.chatConversation.update({
    where: { id: conversationId },
    data,
  });
}

export async function getConversationById(conversationId) {
  return db.chatConversation.findUnique({ where: { id: conversationId } });
}
