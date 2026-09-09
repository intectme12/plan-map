# 메시지(1:1 DM)

**상태:** 인스타그램 DM처럼 회원 간 1:1로 텍스트+사진을 주고받는 기능(2026-09-09 추가). 그룹채팅은 지원하지 않는다(사용자 확정).

## 개요

1. **회원 간 대화 시작**: 프로필 화면([UserProfileModal.tsx](../apps/web/src/components/UserProfileModal.tsx), [/users/[nickname]](../apps/web/src/app/users/[nickname]/page.tsx))의 "메시지 보내기" 버튼(공용 [SendMessageButton.tsx](../apps/web/src/components/SendMessageButton.tsx))이 `POST /api/conversations`로 대화를 생성/조회하고 `/messages/[conversationId]`로 이동한다.
2. **받은편지함**: `app/messages/layout.tsx`가 좌측 대화 목록([ConversationListPane.tsx](../apps/web/src/app/messages/ConversationListPane.tsx)) + 우측 대화창(`{children}`)을 감싼다. 대화가 선택 안 됐으면 `app/messages/page.tsx`가 안내 문구만 보여준다.
3. **실시간 갱신(SSE)**: `GET /api/messages/stream`이 로그인한 사용자당 하나의 Server-Sent Events 연결을 연다. 새 메시지가 오면 대화창은 즉시 append, 목록은 정렬/미리보기/안읽음 배지를 갱신한다 — 클라이언트 쪽은 [useMessageStream.ts](../apps/web/src/hooks/useMessageStream.ts) 훅 하나로 공용.
4. **사진 첨부**: 텍스트+사진을 한 번에 받는 멀티파트 `POST`로 전송(업로드를 따로 분리하지 않음 — 채팅은 "지금 바로 전송"이 자연스러워서). 검증/저장 로직은 [lib/upload.ts](../apps/web/src/lib/upload.ts)를 사진첩 기능과 공유한다.

## 데이터 모델

`Conversation`(1:1이라 참여자 조인 테이블 없이 `userAId`/`userBId` 두 컬럼 직접 보유, 항상 정렬 저장) + `Message`. 스키마 원본은 `apps/web/prisma/schema.prisma`, 전체 컬럼은 [DATABASE.md](./DATABASE.md) 참고. 안읽음 판정은 `Conversation.userALastReadAt`/`userBLastReadAt`와 `lastMessageSenderId`를 비교해서 계산(참여자별 테이블 없이).

## 실시간 갱신(SSE) 설계

- `lib/messageEvents.ts`: 프로세스 메모리 안의 `Map<userId, Set<ReadableStreamDefaultController>>` pub/sub. 메시지가 생성되면 대화 상대 두 명(발신자 포함 — 다른 탭/기기 동기화) 각각에게 이벤트를 밀어넣는다.
- **이 방식은 이 앱이 단일 Next.js 프로세스로 떠 있는 동안만 유효하다.** 여러 인스턴스로 수평 확장하면 인스턴스 A에 연결된 사용자가 인스턴스 B에서 발생한 메시지를 못 받는다 — 그때는 Redis Pub/Sub 등 외부 브로커로 바꿔야 한다. 지금은 [docs/ARCHITECTURE.md](./ARCHITECTURE.md)의 "워커/큐 없음, 단일 프로세스" 결정과 일치해서 문제 없음.
- 연결이 오래 열려 있어야 해서 25초마다 하트비트 주석(`: ping`)을 보내 중간 프록시가 유휴 연결로 보고 끊지 않게 한다. `request.signal`의 abort 이벤트로 구독 해제.

## 메시지 페이지네이션이 다른 목록과 다른 이유

이 앱의 다른 목록(공유 여행, 회원검색 등)은 전부 숫자 오프셋 커서(`cursor: number`, `skip`)를 쓰지만, 채팅은 최신 메시지가 계속 맨 위(최신 끝)에 쌓이면서 과거로 스크롤하는 구조라 오프셋이 밀린다(새 메시지가 도착하면 이미 로드한 오프셋 위치가 어긋남). 그래서 `listMessages()`만 `createdAt` 기준 커서(`before=<ISO>`)를 쓴다 — `lib/services/conversations.ts` 주석 참고.

## 진입점

- 프로필 팝업/페이지의 "메시지 보내기" 버튼
- `/trips` 헤더의 "메시지" 링크([MessageNavLink.tsx](../apps/web/src/components/MessageNavLink.tsx)) — 안읽음 개수 배지. 서버가 내려준 초기 카운트에 실시간 이벤트만큼 더하는 정도로 단순하게 구현(정확한 재계산은 `/messages` 진입 시).

## 미구현/보류

- 그룹채팅 없음(사용자 확정)
- 읽음/안읽음 배지 이상의 "읽음" 표시(상대가 언제 읽었는지)는 없음
- 타이핑 중 표시 없음
- 회원검색 결과 카드 자체에는 메시지 버튼 없음(프로필 화면까지 들어가야 함) — 필요해지면 [UserSearchBrowser.tsx](../apps/web/src/app/trips/UserSearchBrowser.tsx)에도 `SendMessageButton` 추가 검토

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
