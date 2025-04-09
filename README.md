# AI 채팅 애플리케이션

GPT-4와 MongoDB를 활용한 대화형 AI 채팅 애플리케이션입니다.

## 주요 기능

- GPT-4를 활용한 대화형 AI 채팅
- 이미지 분석 및 설명 기능 (GPT-4-Vision)
- 대화 내용 MongoDB 저장 및 불러오기
- 메시지별 별점 평가 기능
- 실시간 이미지 첨부 기능

## 기술 스택

- Frontend: React, Emotion (styled-components)
- Backend: Node.js, Express
- Database: MongoDB
- AI: OpenAI GPT-4, GPT-4-Vision

## 설치 방법

1. 저장소 클론
```bash
git clone [저장소 URL]
cd [프로젝트 폴더]
```

2. 의존성 설치
```bash
# 서버 의존성 설치
cd server
npm install

# 클라이언트 의존성 설치
cd ../client
npm install
```

3. 환경 변수 설정
```bash
# server 폴더에 .env 파일 생성
MONGODB_URL=your_mongodb_url
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

4. 실행
```bash
# 서버 실행 (server 폴더에서)
npm start

# 클라이언트 실행 (client 폴더에서)
npm run dev
```

## 사용 방법

1. 웹 브라우저에서 `http://localhost:5173` 접속
2. 채팅창에 메시지 입력
3. 이미지 첨부가 필요한 경우 '+' 버튼 클릭
4. AI 응답에 대한 평가는 별점으로 가능

## 주의사항

- `.env` 파일의 API 키는 절대 공개하지 마세요
- 이미지 업로드 시 용량 제한에 주의하세요
- MongoDB URL은 보안을 위해 환경변수로 관리하세요 