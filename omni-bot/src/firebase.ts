import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
dotenv.config();

// 주의: Firebase 서비스 계정 비공개 키의 줄바꿈('\n') 이스케이프 문자를 실제 줄바꿈으로 변환합니다.
// .env 내부의 값은 한 줄로 작성되어야 합니다.
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: privateKey!,
};

const app = initializeApp({
  credential: cert(firebaseConfig),
});

export const db = getFirestore(app);
