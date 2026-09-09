import { prisma } from "../db";
import { NotFoundError, ForbiddenError, InvalidFileError } from "../errors";
import { saveImageFile } from "../upload";
import { publishMessage, publishTyping, publishRead } from "../messageEvents";

const MESSAGE_PAGE_SIZE = 30;

// userId < otherUserId 순서로 항상 정렬해서 저장 — 두 사람 사이 대화가 여러 개 안 생기게(@@unique).
function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) {
    throw new ForbiddenError("자기 자신에게는 메시지를 보낼 수 없습니다.");
  }

  const other = await prisma.user.findUnique({ where: { id: otherUserId }, select: { id: true } });
  if (!other) throw new NotFoundError("회원을 찾을 수 없습니다.");

  const [userAId, userBId] = sortPair(userId, otherUserId);

  const existing = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existing) return existing;

  return prisma.conversation.create({ data: { userAId, userBId } });
}

async function getConversationForUser(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
  });
  if (!conversation) throw new NotFoundError("대화를 찾을 수 없습니다.");
  return conversation;
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, nickname: true, avatarUrl: true } },
      userB: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });

  return conversations.map((c) => {
    const isUserA = c.userAId === userId;
    const other = isUserA ? c.userB : c.userA;
    const myLastReadAt = isUserA ? c.userALastReadAt : c.userBLastReadAt;
    const unread =
      c.lastMessageSenderId !== null &&
      c.lastMessageSenderId !== userId &&
      (myLastReadAt === null || myLastReadAt < c.lastMessageAt);

    return {
      id: c.id,
      other,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      unread,
    };
  });
}

// getTrip()처럼 페이지에서 notFound() 처리할 수 있도록 throw 대신 null을 반환한다
// (API 라우트에서 쓰는 다른 함수들은 handleRouteError가 처리하도록 NotFoundError를 throw함).
export async function getConversationSummary(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: { id: true, nickname: true, avatarUrl: true } },
      userB: { select: { id: true, nickname: true, avatarUrl: true } },
    },
  });
  if (!conversation) return null;

  const isUserA = conversation.userAId === userId;
  const other = isUserA ? conversation.userB : conversation.userA;
  const otherLastReadAt = isUserA ? conversation.userBLastReadAt : conversation.userALastReadAt;
  return { id: conversation.id, other, otherLastReadAt };
}

export async function listMessages(userId: string, conversationId: string, before?: Date) {
  await getConversationForUser(userId, conversationId);

  // 이 앱의 다른 목록은 전부 숫자 오프셋 커서를 쓰지만, 채팅은 새 메시지가 계속 맨 위(최신)에
  // 쌓이면서 과거로 스크롤하는 구조라 오프셋이 밀린다 — 그래서 createdAt 기준 커서를 쓴다.
  const messages = await prisma.message.findMany({
    where: { conversationId, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" },
    take: MESSAGE_PAGE_SIZE,
  });

  return messages.reverse();
}

export async function markRead(userId: string, conversationId: string) {
  const conversation = await getConversationForUser(userId, conversationId);
  const isUserA = conversation.userAId === userId;
  const otherUserId = isUserA ? conversation.userBId : conversation.userAId;
  const readAt = new Date();

  await prisma.conversation.update({
    where: { id: conversationId },
    data: isUserA ? { userALastReadAt: readAt } : { userBLastReadAt: readAt },
  });

  // 상대(내가 방금 읽은 메시지들을 보낸 사람)에게 실시간으로 "읽음" 알려줌
  publishRead([otherUserId], { type: "read", conversationId, userId, readAt: readAt.toISOString() });
}

// DB에 남기지 않는 순간적인 신호라 소유권 확인 후 상대에게만 그대로 전달한다.
export async function notifyTyping(userId: string, conversationId: string) {
  const conversation = await getConversationForUser(userId, conversationId);
  const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
  publishTyping([otherUserId], { type: "typing", conversationId, userId });
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  { content, imageFile }: { content?: string; imageFile?: File }
) {
  if (!content && !imageFile) {
    throw new InvalidFileError("메시지 내용이나 사진 중 하나는 있어야 합니다.");
  }

  const conversation = await getConversationForUser(userId, conversationId);
  const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

  const imageKey = imageFile ? await saveImageFile(imageFile, ["messages", conversationId]) : null;

  const message = await prisma.message.create({
    data: { conversationId, senderId: userId, content: content ?? null, imageKey },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: content ?? "사진",
      lastMessageSenderId: userId,
    },
  });

  publishMessage([userId, otherUserId], {
    type: "message",
    conversationId,
    message: {
      id: message.id,
      conversationId,
      senderId: message.senderId,
      content: message.content,
      imageKey: message.imageKey,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return message;
}
