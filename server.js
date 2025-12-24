const http = require('http');
const { Server } = require('socket.io');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

// 서버 포트 설정
// const HTTP_PORT = 3000;
const HTTP_PORT = 1601;
const TCP_PORT = 1600;

// 전역 변수 초기화
let freerunning = 0;
const tcpClients = new Map(); // TCP 클라이언트 관리

// 로그인 설정 (실제 환경에서는 환경변수나 설정 파일에서 관리)
const LOGIN_CONFIG = {
  username: 'jpos',
  password: 'jpos1004' // 실제 사용 시 강력한 비밀번호로 변경
};

// 세션 관리
const sessions = new Map(); // sessionId -> { username, expires }

// 쿠키 파싱 함수
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  return cookies;
}

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

// URL 파싱 헬퍼
function parseUrl(req) {
  return url.parse(req.url, true);
}

// 시간 포맷팅 함수
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hour}:${minute}:${second}`;
}

// HTTP 서버 생성
const server = http.createServer((req, res) => {
  const parsedUrl = parseUrl(req);
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sessionId;
  const isAuthenticated = validateSession(sessionId);
  
  // 로그인 API
  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const credentials = JSON.parse(body);
        if (credentials.username === LOGIN_CONFIG.username && 
            credentials.password === LOGIN_CONFIG.password) {
          const newSessionId = createSession(credentials.username);
          res.setHeader('Set-Cookie', `sessionId=${newSessionId}; HttpOnly; Path=/; Max-Age=86400`);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: '로그인 성공' }));
          console.log(`[${getTimestamp()}] 로그인 성공: ${credentials.username}`);
        } else {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, message: '아이디 또는 비밀번호가 잘못되었습니다.' }));
        }
      } catch (error) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: '잘못된 요청입니다.' }));
      }
    });
    return;
  }
  
  // 로그아웃 API
  if (parsedUrl.pathname === '/api/logout' && req.method === 'POST') {
    if (sessionId) {
      deleteSession(sessionId);
    }
    res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: '로그아웃 성공' }));
    console.log(`[${getTimestamp()}] 로그아웃`);
    return;
  }
  
  // 인증 확인 API
  if (parsedUrl.pathname === '/api/check-auth' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({ authenticated: isAuthenticated }));
    return;
  }
  
  // 로그인 페이지
  if (parsedUrl.pathname === '/login' || parsedUrl.pathname === '/login.html') {
    if (isAuthenticated) {
      res.writeHead(302, { 'Location': '/' });
      res.end();
      return;
    }
    const filePath = path.join(__dirname, 'public', 'login.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(data);
    });
    return;
  }
  
  // 보호된 페이지 (대시보드)
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
    if (!isAuthenticated) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }
    const filePath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
        console.error(`[${getTimestamp()}] 파일 읽기 오류:`, err);
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(data);
    });
    return;
  }
  
  // 정적 파일 (JS 등)
  if (parsedUrl.pathname.startsWith('/js/')) {
    const filePath = path.join(__dirname, 'public', parsedUrl.pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(data);
    });
    return;
  }
  
  // 404
  res.statusCode = 404;
  res.end('Not Found');
});

// Socket.IO 서버 생성
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO 연결 처리
io.on('connection', (socket) => {
  console.log(`[${getTimestamp()}] Socket.IO 클라이언트 연결: ${socket.id}`);
  
  // 현재 TCP 클라이언트 연결 수 전송
  socket.emit('tcp-client-count', {
    count: freerunning
  });
  
  // 현재 연결된 TCP 클라이언트 목록 전송
  const clientList = Array.from(tcpClients.entries()).map(([clientId, clientInfo]) => {
    const ipAddr = clientInfo.socket.remoteAddress ? clientInfo.socket.remoteAddress.replace(/^.*:/, '') : 'Unknown';
    return {
      clientId: clientId,
      ip: ipAddr,
      stationId: clientInfo.stationId || null,
      pumpId: clientInfo.pumpId || null,
      connectedAt: clientInfo.connectedAt
    };
  });
  socket.emit('tcp-client-list', {
    clients: clientList
  });
  
  // TCP 메시지 전송 요청 처리
  socket.on('send-tcp-message', (data) => {
    const message = data.message || 'BB:4321:1200:0';
    const targetStationId = data.stationId || null;
    const targetPumpId = data.pumpId || null;
    let sentCount = 0;
    
    if (targetStationId && targetPumpId) {
      console.log(`[${getTimestamp()}] 브라우저에서 TCP 메시지 전송 요청: ${message} (충전소: ${targetStationId}, 펌프: ${targetPumpId})`);
    } else {
      console.log(`[${getTimestamp()}] 브라우저에서 TCP 메시지 전송 요청: ${message}`);
    }
    
    // 연결된 TCP 클라이언트에 메시지 전송
    tcpClients.forEach((clientInfo, clientId) => {
      try {
        // stationId와 pumpId가 지정된 경우 필터링
        if (targetStationId && targetPumpId) {
          if (clientInfo.stationId !== targetStationId || clientInfo.pumpId !== targetPumpId) {
            return; // 조건에 맞지 않으면 스킵
          }
        }
        
        if (clientInfo.socket && !clientInfo.socket.destroyed) {
          clientInfo.socket.write(message);
          sentCount++;
          if (targetStationId && targetPumpId) {
            console.log(`[${getTimestamp()}] --> TCP 메시지 전송: ${message} to ${clientId} (충전소: ${clientInfo.stationId}, 펌프: ${clientInfo.pumpId})`);
          } else {
            console.log(`[${getTimestamp()}] --> TCP 메시지 전송: ${message} to ${clientId}`);
          }
        }
      } catch (error) {
        console.error(`[${getTimestamp()}] TCP 메시지 전송 실패 (${clientId}):`, error.message);
      }
    });
    
    // 전송 결과를 브라우저에 알림
    socket.emit('tcp-send-result', {
      success: sentCount > 0,
      message: message,
      sentCount: sentCount,
      error: sentCount === 0 ? (targetStationId && targetPumpId ? 
        `충전소 ${targetStationId}, 펌프 ${targetPumpId}에 해당하는 연결된 클라이언트가 없습니다.` : 
        '연결된 TCP 클라이언트가 없습니다.') : null
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`[${getTimestamp()}] Socket.IO 클라이언트 해제: ${socket.id}`);
  });
});

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

// TCP 서버 시작
tcpServer.listen(TCP_PORT, () => {
  console.log(`[${getTimestamp()}] 🔌 TCP 서버가 포트 ${TCP_PORT}에서 실행 중입니다.`);
});

// 만료된 세션 정리 (1시간마다)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  sessions.forEach((session, sessionId) => {
    if (now > session.expires) {
      sessions.delete(sessionId);
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[${getTimestamp()}] 만료된 세션 ${cleaned}개 정리 완료`);
  }
}, 60 * 60 * 1000); // 1시간

// HTTP 서버 시작
server.listen(HTTP_PORT, () => {
  console.log(`[${getTimestamp()}] 🚀 HTTP 서버가 http://localhost:${HTTP_PORT} 에서 실행 중입니다.`);
  console.log(`[${getTimestamp()}] 📱 브라우저에서 http://localhost:${HTTP_PORT} 를 열어 모니터링을 시작하세요!`);
  console.log(`[${getTimestamp()}] 🔐 로그인 정보 - 아이디: ${LOGIN_CONFIG.username}, 비밀번호: ${LOGIN_CONFIG.password}`);
});

// 서버 종료 시 정리 작업
process.on('SIGTERM', () => {
  console.log(`[${getTimestamp()}] SIGTERM 신호를 받았습니다. 서버를 종료합니다...`);
  tcpServer.close(() => {
    server.close(() => {
      console.log(`[${getTimestamp()}] 서버가 정상적으로 종료되었습니다.`);
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log(`[${getTimestamp()}] \\nSIGINT 신호를 받았습니다. 서버를 종료합니다...`);
  tcpServer.close(() => {
    server.close(() => {
      console.log(`[${getTimestamp()}] 서버가 정상적으로 종료되었습니다.`);
      process.exit(0);
    });
  });
});

// 에러 처리
tcpServer.on('error', (err) => {
  console.error(`[${getTimestamp()}] TCP 서버 에러:`, err);
});

server.on('error', (err) => {
  console.error(`[${getTimestamp()}] HTTP 서버 에러:`, err);
});