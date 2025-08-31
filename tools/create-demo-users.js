/**
 * tools/create-demo-users.js
 * Create demo users via Admin SDK. Requires serviceAccount.json in this folder.
 * Usage: npm i firebase-admin && node create-demo-users.js
 */
import fs from "node:fs"; import admin from "firebase-admin";
const svc = JSON.parse(fs.readFileSync(new URL("./serviceAccount.json", import.meta.url)));
admin.initializeApp({ credential: admin.credential.cert(svc) });
const auth = admin.auth();
const USERS=[ {email:"teacher@example.com",password:"Password123!",displayName:"Demo Teacher"}, {email:"student@example.com",password:"Password123!",displayName:"Demo Student"} ];
for (const u of USERS){ try{ const x=await auth.createUser(u); console.log("Created:",x.uid,u.email); } catch(e){ console.log("Skip:",u.email,e.message); } }