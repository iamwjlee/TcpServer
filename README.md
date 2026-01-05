# TCP 서버 모니터링 시스템 (JPOS Link)

Node.js 기반의 TCP 서버와 실시간 웹 모니터링 대시보드를 제공하는 시스템입니다. TCP 클라이언트와의 양방향 통신을 지원하며, 웹 인터페이스를 통해 실시간으로 모니터링 및 제어가 가능합니다.

## 📋 목차

- [주요 기능](#-주요-기능)
- [기술 스택](#️-기술-스택)
- [설치 및 실행](#-설치-및-실행)
- [시스템 구조](#-시스템-구조)
- [프로토콜 및 데이터 형식](#-프로토콜-및-데이터-형식)
- [API 문서](#-api-문서)
- [보안](#-보안)
- [코드 리뷰](#-코드-리뷰)

## ✨ 주요 기능

### TCP 서버 기능
- **TCP 클라이언트 연결 관리**: 포트 1600에서 TCP 클라이언트 연결 수신
- **실시간 데이터 수신**: TCP 클라이언트로부터 데이터를 실시간으로 수신 및 처리
- **자동 응답**: 데이터 수신 시 자동으로 응답 메시지 전송 (`OK:0` 또는 `AA:0`)
- **클라이언트 정보 관리**: 연결된 각 클라이언트의 IP, 충전소 ID, 펌프 ID 등 정보 추적
- **연결 상태 모니터링**: 연결/해제 이벤트 실시간 추적

### 웹 대시보드 기능
- **실시간 모니터링**: Socket.IO를 통한 실시간 데이터 업데이트
- **인증 시스템**: 세션 기반 로그인/로그아웃 기능
- **TCP 클라이언트 목록**: 현재 연결된 모든 TCP 클라이언트 정보 표시
- **메시지 전송**: 웹 인터페이스에서 특정 TCP 클라이언트로 메시지 전송
- **충전소/펌프 상태 관리**: 충전소별, 펌프별 상태 모니터링
- **이벤트 로그**: 모든 주요 이벤트의 실시간 로그 표시

## 🛠️ 기술 스택

- **Backend**
  - Node.js (기본 HTTP 서버)
  - Socket.IO 4.7.5 (실시간 통신)
  - net 모듈 (TCP 서버)
  - crypto 모듈 (세션 관리)

- **Frontend**
  - HTML5, CSS3, JavaScript (Vanilla)
  - Socket.IO Client (실시간 통신)

## 🚀 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 서버 실행

```bash
npm start
# 또는
node server.js
```

### 3. 서버 접속

- **웹 대시보드**: http://localhost:1601
- **TCP 서버 포트**: 1600
- **기본 로그인 정보**:
  - 아이디: `jpos`
  - 비밀번호: `jpos1004`

## 📐 시스템 구조

```
┌─────────────────┐
│  TCP 클라이언트 │
│   (포트 1600)   │
└────────┬────────┘
         │ TCP 통신
         ▼
┌─────────────────────────┐
│      Node.js 서버       │
│  ┌───────────────────┐  │
│  │   TCP Server      │  │
│  │   (포트 1600)     │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │   HTTP Server     │  │
│  │   (포트 1601)     │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │  Socket.IO Server │  │
│  └─────────┬─────────┘  │
└────────────┼────────────┘
             │ WebSocket
             ▼
    ┌─────────────────┐
    │  웹 브라우저    │
    │  (대시보드)     │
    └─────────────────┘
```

## 📡 프로토콜 및 데이터 형식

### TCP 데이터 수신 형식

TCP 클라이언트로부터 수신하는 데이터는 콜론(`:`)으로 구분된 형식입니다:

```
형식:충전소ID:펌프ID:상태
```

**예시:**
```
AA:4321:1200:0
BB:4321:1201:1
```

- **형식**: 메시지 타입 (AA, BB 등)
- **충전소ID**: 충전소 식별자
- **펌프ID**: 펌프 번호
- **상태**: 펌프 상태 정보

### TCP 응답 메시지

서버는 데이터를 수신할 때마다 자동으로 응답을 전송합니다:

- **일반 응답**: `OK:0` (데이터를 10번 수신할 때마다 1번 제외)
- **특별 응답**: `AA:0` (데이터를 10번 수신할 때마다 1번)

### TCP 메시지 전송 형식

웹 대시보드에서 TCP 클라이언트로 메시지를 전송할 수 있습니다:

**기본 형식:**
```
BB:충전소ID:펌프ID:값
```

**예시:**
```
BB:4321:1200:0
```

## 🔌 API 문서

### HTTP API

#### POST `/api/login`
로그인 요청

**Request Body:**
```json
{
  "username": "jpos",
  "password": "jpos1004"
}
```

**Response:**
```json
{
  "success": true,
  "message": "로그인 성공"
}
```

#### POST `/api/logout`
로그아웃 요청

**Response:**
```json
{
  "success": true,
  "message": "로그아웃 성공"
}
```

#### GET `/api/check-auth`
인증 상태 확인

**Response:**
```json
{
  "authenticated": true
}
```

### Socket.IO 이벤트

#### 클라이언트 → 서버

##### `send-tcp-message`
TCP 클라이언트로 메시지 전송 요청

**Payload:**
```javascript
{
  message: "BB:4321:1200:0",  // 전송할 메시지
  stationId: "4321",          // 대상 충전소 ID (선택)
  pumpId: "1200"              // 대상 펌프 ID (선택)
}
```

#### 서버 → 클라이언트

##### `tcp-client-count`
TCP 클라이언트 연결 수 업데이트

**Payload:**
```javascript
{
  count: 5  // 현재 연결된 TCP 클라이언트 수
}
```

##### `tcp-client-list`
연결된 TCP 클라이언트 목록

**Payload:**
```javascript
{
  clients: [
    {
      clientId: "192.168.1.100:52341",
      ip: "192.168.1.100",
      stationId: "4321",
      pumpId: "1200",
      connectedAt: "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

##### `tcp-client-connected`
새로운 TCP 클라이언트 연결 알림

**Payload:**
```javascript
{
  clientId: "192.168.1.100:52341",
  ip: "192.168.1.100",
  count: 5
}
```

##### `tcp-client-disconnected`
TCP 클라이언트 연결 해제 알림

**Payload:**
```javascript
{
  clientId: "192.168.1.100:52341",
  ip: "192.168.1.100",
  count: 4
}
```

##### `tcp-res`
TCP 클라이언트로부터 데이터 수신 알림

**Payload:**
```javascript
{
  clientId: "192.168.1.100:52341",
  ip: "192.168.1.100",
  id: "4321",           // 충전소 ID
  pump: "1200",         // 펌프 ID
  status: "0",          // 상태
  cnt: 5,               // 현재 연결 수
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

##### `tcp-send-result`
TCP 메시지 전송 결과

**Payload:**
```javascript
{
  success: true,
  message: "BB:4321:1200:0",
  sentCount: 1,
  error: null
}
```

## 🔒 보안

### 현재 구현된 보안 기능

1. **세션 기반 인증**: HttpOnly 쿠키를 사용한 세션 관리
2. **세션 만료**: 24시간 후 자동 만료
3. **자동 세션 정리**: 1시간마다 만료된 세션 자동 삭제

### 보안 개선 권장사항

⚠️ **프로덕션 환경 배포 시 다음 사항을 반드시 적용해야 합니다:**

1. **비밀번호 해싱**: 평문 비밀번호 대신 bcrypt 등을 사용한 해싱
2. **환경 변수**: 로그인 정보를 환경 변수나 설정 파일로 분리
3. **HTTPS**: SSL/TLS 인증서 적용
4. **Rate Limiting**: 로그인 시도 횟수 제한
5. **CORS 설정**: Socket.IO CORS 설정을 특정 도메인으로 제한
6. **입력 검증**: TCP 데이터 및 웹 입력에 대한 검증 강화
7. **로깅**: 보안 이벤트에 대한 상세 로깅

## 📝 코드 리뷰

### 코드 구조 및 아키텍처

#### 장점

1. **명확한 모듈 구조**: 단일 파일이지만 기능별로 명확하게 구분됨
2. **에러 처리**: TCP 클라이언트 및 HTTP 요청에 대한 에러 처리 구현
3. **타임스탬프**: 모든 로그에 타임스탬프 포함으로 디버깅 용이
4. **실시간 통신**: Socket.IO를 활용한 효율적인 실시간 업데이트
5. **클라이언트 관리**: Map 자료구조를 사용한 효율적인 클라이언트 관리

#### 개선 권장사항

1. **코드 모듈화**
   ```javascript
   // 현재: 모든 코드가 server.js에 집중
   // 권장: 기능별로 모듈 분리
   // - tcp-server.js
   // - http-server.js
   // - auth.js
   // - session-manager.js
   ```

2. **설정 파일 분리**
   ```javascript
   // 현재: 하드코딩된 설정값
   const HTTP_PORT = 1601;
   const TCP_PORT = 1600;
   const LOGIN_CONFIG = { ... };
   
   // 권장: config.js 또는 환경 변수 사용
   ```

3. **데이터 검증 강화**
   ```javascript
   // 현재: 기본적인 데이터 파싱만 수행
   // 권장: 데이터 형식 검증 및 유효성 검사 추가
   ```

4. **로깅 시스템**
   ```javascript
   // 현재: console.log 사용
   // 권장: winston, bunyan 등의 로깅 라이브러리 도입
   ```

5. **테스트 코드**
   - 단위 테스트 및 통합 테스트 추가 권장
   - TCP 클라이언트 시뮬레이션 테스트

6. **타입 안정성**
   - TypeScript 도입 검토
   - 또는 JSDoc을 활용한 타입 문서화

### 주요 기능 분석

#### TCP 서버 구현

```288:405:server.js
// TCP 서버 생성
const tcpServer = net.createServer((client) => {
  freerunning++;
  const clientId = client.remoteAddress + ':' + client.remotePort;
  
  // 클라이언트 정보 저장
  tcpClients.set(clientId, {
    socket: client,
    connectedAt: new Date(),
    dataCount: 0,
    stationId: null,
    pumpId: null
  });

  console.log(`[${getTimestamp()}] TCP 클라이언트 연결: ${clientId} [총 연결: ${freerunning}]`);
  
  // Socket.IO로 연결 알림
  const ipAddr = client.remoteAddress ? client.remoteAddress.replace(/^.*:/, '') : 'Unknown';
  io.emit('tcp-client-connected', {
    clientId: clientId,
    ip: ipAddr,
    count: freerunning
  });

  // 데이터 수신 처리
  client.on('data', (data) => {
    try {
      const ipAddr = client.remoteAddress.replace(/^.*:/, '');
      console.log(`[${getTimestamp()}] <<-- 데이터 수신: ${data} from ${ipAddr}`);
      
      // 클라이언트 데이터 카운트 증가
      const clientInfo = tcpClients.get(clientId);
      if (clientInfo) {
         clientInfo.dataCount++;
      }

      // 응답 메시지 전송
      if(clientInfo.dataCount % 10 == 0) {
        const responseMsg = 'AA:0';
        client.write(responseMsg);

      }
      else {
        const responseMsg = 'OK:0';
        client.write(responseMsg);
      }
      
      // 데이터 파싱 (안전하게)
      const dataStr = data.toString().trim();
      const parts = dataStr.split(':');
      
      if (parts.length >= 2) {
        const stationId = parts[1];
        const pumpId = parts[2];
        const status = parts[3];
        
        // 클라이언트 정보에 stationId와 pumpId 저장
        const clientInfo = tcpClients.get(clientId);
        if (clientInfo) {
          clientInfo.stationId = stationId;
          clientInfo.pumpId = pumpId;
        }
        
        // Socket.IO로 데이터 전송
        io.emit('tcp-res', {
          clientId: clientId,
          ip: ipAddr,
          id: stationId,
          cnt: freerunning,
          pump: pumpId,
          status: status,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[${getTimestamp()}] 데이터 처리 완료 - 충전소: ${stationId}, 펌프: ${pumpId}, 상태: ${status} ${clientInfo.dataCount} `);
      } else {
        console.warn(`[${getTimestamp()}] 잘못된 데이터 형식: ${dataStr} ${parts.length}`);
      }
    } catch (error) {
      console.error(`[${getTimestamp()}] 데이터 처리 중 오류:`, error);
    }
  });

  // 클라이언트 연결 종료 처리
  client.on('end', () => {
    console.log(`[${getTimestamp()}] TCP 클라이언트 연결 종료: ${clientId}`);
  });

  client.on('close', () => {
    const clientInfo = tcpClients.get(clientId);
    freerunning--;
    tcpClients.delete(clientId);
    console.log(`[${getTimestamp()}] TCP 클라이언트 해제: ${clientId} [남은 연결: ${freerunning}]`);
    
    // Socket.IO로 해제 알림
    const ipAddr = client.remoteAddress ? client.remoteAddress.replace(/^.*:/, '') : 'Unknown';
    io.emit('tcp-client-disconnected', {
      clientId: clientId,
      ip: ipAddr,
      count: freerunning
    });
  });

  // 에러 처리
  client.on('error', (err) => {
    console.error(`[${getTimestamp()}] TCP 클라이언트 에러 (${clientId}):`, err.message);
    freerunning--;
    tcpClients.delete(clientId);
    
    // Socket.IO로 해제 알림
    const ipAddr = client.remoteAddress ? client.remoteAddress.replace(/^.*:/, '') : 'Unknown';
    io.emit('tcp-client-disconnected', {
      clientId: clientId,
      ip: ipAddr,
      count: freerunning
    });
  });
});
```

**리뷰 포인트:**
- ✅ 클라이언트 연결 상태 관리가 잘 구현됨
- ✅ 에러 처리 및 연결 종료 처리가 적절함
- ⚠️ `parts.length >= 2` 조건이 느슨함 (최소 4개 필요)
- ⚠️ `clientInfo.dataCount % 10 == 0` 비교에서 `clientInfo`가 null일 수 있음

#### 인증 시스템

```42:64:server.js
// 세션 생성
function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24시간
  sessions.set(sessionId, { username, expires });
  return sessionId;
}

// 세션 검증
function validateSession(sessionId) {
  if (!sessionId) return false;
  const session = sessions.get(sessionId);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessions.delete(sessionId);
    return false;
  }
  return true;
}

// 세션 삭제
function deleteSession(sessionId) {
  sessions.delete(sessionId);
}
```

**리뷰 포인트:**
- ✅ 세션 만료 시간 관리가 적절함
- ✅ 안전한 랜덤 세션 ID 생성
- ⚠️ 메모리 기반 세션 저장소 (서버 재시작 시 손실, 확장성 제한)

### 성능 고려사항

1. **메모리 관리**: 대량의 TCP 클라이언트 연결 시 메모리 사용량 모니터링 필요
2. **Socket.IO 브로드캐스트**: 모든 클라이언트에게 이벤트를 보낼 때 성능 고려
3. **데이터 파싱**: 효율적인 데이터 파싱 및 검증 로직 필요

## 🐛 알려진 이슈

1. 서버 재시작 시 세션 정보 손실 (메모리 기반 저장)
2. TCP 클라이언트 연결 수가 많아질 때 성능 최적화 필요
3. 데이터 형식 검증이 기본적인 수준임

## 📚 참고 자료

- [Node.js net 모듈 문서](https://nodejs.org/api/net.html)
- [Socket.IO 공식 문서](https://socket.io/docs/v4/)
- [Node.js HTTP 모듈 문서](https://nodejs.org/api/http.html)

## 📄 라이선스

ISC

---

**작성일**: 2024년  
**버전**: 1.0.0
