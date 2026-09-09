# 메시지(1:1 DM)

**상태:** 인스타그램 DM처럼 회원 간 1:1로 텍스트+사진을 주고받는 기능(2026-09-09 추가). 그룹채팅은 지원하지 않는다(사용자 확정).

## 개요

1. **회원 간 대화 시작**: 프로필 화면([UserProfileModal.tsx](../apps/web/src/components/UserProfileModal.tsx), [/users/[nickname]](../apps/web/src/app/users/[nickname]/page.tsx))의 "메시지 보내기" 버튼(공용 [SendMessageButton.tsx](../apps/web/src/components/SendMessageButton.tsx))이 `POST /api/conversations`로 대화를 생성/조회하고 `/messages/[conversationId]`로 이동한다.
2. **받은편지함**: `app/messages/layout.tsx`가 좌측 대화 목록([ConversationListPane.tsx](../apps/web/src/app/messages/ConversationListPane.tsx)) + 우측 대화창(`{children}`)을 감싼다. 대화가 선택 안 됐으면 `app/messages/page.tsx`가 안내 문구만 보여준다.
3. **실시간 갱신(SSE)**: `GET /api/messages/stream`이 로그인한 사용자당 하나의 Server-Sent Events 연결을 연다. 새 메시지/타이핑 중/읽음 신호가 오면 대화창은 즉시 반영, 목록은 정렬/미리보기/안읽음 배지를 갱신한다 — 클라이언트 쪽은 [useMessageStream.ts](../apps/web/src/hooks/useMessageStream.ts) 훅 하나로 세 종류 이벤트(`message`/`typing`/`read`)를 전부 받는다.
4. **사진 첨부**: 텍스트+사진을 한 번에 받는 멀티파트 `POST`로 전송(업로드를 따로 분리하지 않음 — 채팅은 "지금 바로 전송"이 자연스러워서). 검증/저장 로직은 [lib/upload.ts](../apps/web/src/lib/upload.ts)를 사진첩 기능과 공유한다.
5. **타이핑 중 표시**: 입력창에서 2초에 한 번 `POST /api/conversations/[id]/typing`으로 신호를 보내고, 받는 쪽은 4초간 신호가 없으면 자동으로 지운다(별도 "그만 입력함" 신호 없이 타임아웃으로만 처리 — DB에 저장 안 하는 순간적인 상태라 이걸로 충분).
6. **읽음 표시**: `Conversation.userALastReadAt`/`userBLastReadAt`를 이용해 내가 보낸 메시지 중 **가장 최근 것에만** "읽음"을 표시한다(카카오톡처럼 — 그 이전 것들은 당연히 다 읽었을 테니 전부 표시하면 지저분함). 상대가 읽음 처리할 때마다 `read` SSE 이벤트로 실시간 반영.
7. **브라우저 앱 아이콘 배지**: [AppBadgeSync.tsx](../apps/web/src/components/AppBadgeSync.tsx)가 루트 레이아웃에 항상 떠서 Web Badging API(`navigator.setAppBadge`)로 카카오톡 아이콘처럼 안읽은 대화 수를 표시한다. PWA로 설치 안 해도 지원 브라우저(Chromium 계열)에서는 동작, 미지원 브라우저(Firefox/Safari)에서는 조용히 무시됨.

## 데이터 모델

`Conversation`(1:1이라 참여자 조인 테이블 없이 `userAId`/`userBId` 두 컬럼 직접 보유, 항상 정렬 저장) + `Message`. 스키마 원본은 `apps/web/prisma/schema.prisma`, 전체 컬럼은 [DATABASE.md](./DATABASE.md) 참고. 안읽음 판정은 `Conversation.userALastReadAt`/`userBLastReadAt`와 `lastMessageSenderId`를 비교해서 계산(참여자별 테이블 없이).

## 실시간 갱신(SSE) 설계

- `lib/messageEvents.ts`: 프로세스 메모리 안의 `Map<userId, Set<ReadableStreamDefaultController>>` pub/sub. 메시지가 생성되면 대화 상대 두 명(발신자 포함 — 다른 탭/기기 동기화) 각각에게 이벤트를 밀어넣는다.
- **이 방식은 이 앱이 단일 Next.js 프로세스로 떠 있는 동안만 유효하다.** 여러 인스턴스로 수평 확장하면 인스턴스 A에 연결된 사용자가 인스턴스 B에서 발생한 메시지를 못 받는다 — 그때는 Redis Pub/Sub 등 외부 브로커로 바꿔야 한다. 지금은 [docs/ARCHITECTURE.md](./ARCHITECTURE.md)의 "워커/큐 없음, 단일 프로세스" 결정과 일치해서 문제 없음.
- 연결이 오래 열려 있어야 해서 25초마다 하트비트 주석(`: ping`)을 보내 중간 프록시가 유휴 연결로 보고 끊지 않게 한다. `request.signal`의 abort 이벤트로 구독 해제.

## 메시지 페이지네이션이 다른 목록과 다른 이유

이 앱의 다른 목록(공유 여행, 회원검색 등)은 전부 숫자 오프셋 커서(`cursor: number`, `skip`)를 쓰지만, 채팅은 최신 메시지가 계속 맨 위(최신 끝)에 쌓이면서 과거로 스크롤하는 구조라 오프셋이 밀린다(새 메시지가 도착하면 이미 로드한 오프셋 위치가 어긋남). 그래서 `listMessages()`만 `createdAt` 기준 커서(`before=<ISO>`)를 쓴다 — `lib/services/conversations.ts` 주석 참고.

## 진입점

- 프로필 팝업/페이지, 회원검색 결과 카드([UserSearchBrowser.tsx](../apps/web/src/app/trips/UserSearchBrowser.tsx))의 "메시지 보내기" 버튼 — 전부 공용 [SendMessageButton.tsx](../apps/web/src/components/SendMessageButton.tsx)
- `/trips` 탭 줄의 "메시지" 탭(내 여행계획/다른 사람 여행계획 옆, [TripsTabs.tsx](../apps/web/src/app/trips/TripsTabs.tsx)) — 안읽음 개수 배지([MessageNavLink.tsx](../apps/web/src/components/MessageNavLink.tsx), `className`을 받아 헤더/탭 양쪽 스타일 재사용). 서버가 내려준 초기 카운트에 실시간 이벤트만큼 더하는 정도로 단순하게 구현(정확한 재계산은 `/messages` 진입 시)
- 브라우저 앱 아이콘 배지(위 7번 항목)

## 인메모리 pub/sub 확장(타이핑/읽음)

`lib/messageEvents.ts`의 구독자 맵은 메시지 하나만이 아니라 SSE 이벤트 이름(`event: message`/`event: typing`/`event: read`)으로 구분되는 세 종류를 전부 처리한다 — `broadcast(userIds, eventName, data)` 공용 함수 위에 `publishMessage`/`publishTyping`/`publishRead`가 얇게 얹혀있다. 타이핑/읽음은 메시지와 달리 **상대에게만** 보낸다(발신자 자신은 알 필요 없음 — 메시지는 다른 탭/기기 동기화 때문에 자신에게도 보냄).

## 미구현/보류

- 그룹채팅 없음(사용자 확정)

## 관련 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API.md](./API.md)
