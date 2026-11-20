const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "elearningportal-data.json");

const subjectCourses = [
  {id:1,title:"Hindi",category:"Hindi",level:"Classes 1–12",duration:"Chapter-wise lessons",lessons:12,description:"Hindi reading, writing, grammar, comprehension and literature lessons for school students.",video:"",instructor:"Hindi Department",created_by:null},
  {id:2,title:"English",category:"English",level:"Classes 1–12",duration:"Chapter-wise lessons",lessons:12,description:"English grammar, vocabulary, reading comprehension, writing skills and literature for all school classes.",video:"",instructor:"English Department",created_by:null},
  {id:3,title:"Mathematics",category:"Mathematics",level:"Classes 1–12",duration:"Chapter-wise lessons",lessons:15,description:"Mathematics lessons covering arithmetic, algebra, geometry, mensuration, statistics and more by class level.",video:"",instructor:"Mathematics Department",created_by:null},
  {id:4,title:"Science",category:"Science",level:"Classes 1–12",duration:"Chapter-wise lessons",lessons:15,description:"School science lessons covering physics, chemistry and biology topics, with activities and practice questions.",video:"",instructor:"Science Department",created_by:null},
  {id:5,title:"Social Studies (SST)",category:"Social Studies",level:"Classes 1–12",duration:"Chapter-wise lessons",lessons:15,description:"History, geography, civics and social science lessons for school students, organised by class and chapter.",video:"",instructor:"Social Studies Department",created_by:null}
];
const initialData = { users: [], enrollments: [], quizAttempts: [], courses: subjectCourses };
function loadDB(){
  try {
    if(fs.existsSync(DB_FILE)) {
      const saved=JSON.parse(fs.readFileSync(DB_FILE,"utf8"));
      // Upgrade earlier EduLearn demo data to the school-subject catalogue.
      const oldDemoTitles=["Python Programming Fundamentals","Web Design & Development","Data Science Essentials","Mathematics for Computing","Introduction to Artificial Intelligence","Cloud Computing Basics"];
      const hasOldDemo=(saved.courses||[]).some(c=>oldDemoTitles.includes(c.title));
      if(hasOldDemo){
        const custom=(saved.courses||[]).filter(c=>!oldDemoTitles.includes(c.title));
        const maxId=custom.reduce((m,c)=>Math.max(m,c.id||0),0);
        saved.courses=[...subjectCourses.map((c,i)=>({...c,id:maxId+i+1})),...custom];
        const validIds=new Set(saved.courses.map(c=>c.id));
        saved.enrollments=(saved.enrollments||[]).filter(e=>validIds.has(e.course_id));
        fs.writeFileSync(DB_FILE,JSON.stringify(saved,null,2));
      }
      return saved;
    }
  } catch(e){ console.error("Could not read data file; starting fresh.",e.message); }
  fs.writeFileSync(DB_FILE,JSON.stringify(initialData,null,2));
  return JSON.parse(JSON.stringify(initialData));
}
let db=loadDB();
function saveDB(){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}
function nextId(rows){return rows.reduce((m,x)=>Math.max(m,x.id||0),0)+1;}
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});

app.use(express.json({limit:"1mb"}));
app.use(session({
  secret:process.env.SESSION_SECRET||"edulearn-local-demo-secret-change-before-deploy",
  resave:false,saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:7*24*60*60*1000}
}));
app.use(express.static(path.join(__dirname,"public")));
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:"Please log in first."});next();}
function teacher(req,res,next){if(req.session.user.role!=="teacher")return res.status(403).json({error:"Teacher access required."});next();}

app.post("/api/auth/register",(req,res)=>{
 const {name,email,password,role="student"}=req.body||{};
 if(!name||!email||!password)return res.status(400).json({error:"Name, email and password are required."});
 if(String(password).length<8)return res.status(400).json({error:"Password must be at least 8 characters."});
 if(!["student","teacher"].includes(role))return res.status(400).json({error:"Invalid role."});
 const normalized=String(email).trim().toLowerCase();
 if(db.users.some(u=>u.email===normalized))return res.status(409).json({error:"An account with this email already exists."});
 const u={id:nextId(db.users),name:String(name).trim(),email:normalized,password_hash:bcrypt.hashSync(password,10),role};
 db.users.push(u);saveDB();req.session.user=publicUser(u);res.status(201).json({user:publicUser(u)});
});
app.post("/api/auth/login",(req,res)=>{
 const email=String(req.body?.email||"").trim().toLowerCase(),password=req.body?.password||"";
 const u=db.users.find(x=>x.email===email);
 if(!u||!bcrypt.compareSync(password,u.password_hash))return res.status(401).json({error:"Incorrect email or password."});
 req.session.user=publicUser(u);res.json({user:publicUser(u)});
});
app.post("/api/auth/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/auth/me",(req,res)=>res.json({user:req.session.user||null}));

app.get("/api/courses",(req,res)=>{
 const courses=db.courses.map(c=>{const e=db.enrollments.find(x=>x.user_id===req.session.user?.id&&x.course_id===c.id);return {...c,progress:e?.progress||0,enrolled:!!e};});
 res.json({courses});
});
app.post("/api/courses",auth,teacher,(req,res)=>{
 const {title,category,level,duration,lessons,description,video=""}=req.body||{};
 if(!title||!category||!duration||!description||!Number.isInteger(Number(lessons))||Number(lessons)<1)return res.status(400).json({error:"Please complete all required course fields."});
 const c={id:nextId(db.courses),title,category,level:level||"Beginner",duration,lessons:Number(lessons),description,video,instructor:req.session.user.name,created_by:req.session.user.id};
 db.courses.push(c);saveDB();res.status(201).json({course:c});
});
app.delete("/api/courses/:id",auth,teacher,(req,res)=>{
 const id=Number(req.params.id),c=db.courses.find(x=>x.id===id);
 if(!c)return res.status(404).json({error:"Course not found."});
 if(c.created_by!==req.session.user.id)return res.status(403).json({error:"You can only remove courses you created."});
 db.courses=db.courses.filter(x=>x.id!==id);db.enrollments=db.enrollments.filter(x=>x.course_id!==id);saveDB();res.json({ok:true});
});
app.post("/api/enrollments/:id",auth,(req,res)=>{
 const id=Number(req.params.id);if(!db.courses.some(c=>c.id===id))return res.status(404).json({error:"Course not found."});
 if(!db.enrollments.some(e=>e.user_id===req.session.user.id&&e.course_id===id))db.enrollments.push({id:nextId(db.enrollments),user_id:req.session.user.id,course_id:id,progress:0,updated_at:new Date().toISOString()});
 saveDB();res.json({ok:true});
});
app.get("/api/my-learning",auth,(req,res)=>{
 const courses=db.enrollments.filter(e=>e.user_id===req.session.user.id).map(e=>({...db.courses.find(c=>c.id===e.course_id),progress:e.progress,updated_at:e.updated_at})).filter(c=>c.id);
 res.json({courses});
});
app.put("/api/progress/:id",auth,(req,res)=>{
 const id=Number(req.params.id),progress=Number(req.body?.progress);
 if(!Number.isInteger(progress)||progress<0||progress>100)return res.status(400).json({error:"Progress must be between 0 and 100."});
 if(!db.courses.some(c=>c.id===id))return res.status(404).json({error:"Course not found."});
 let e=db.enrollments.find(x=>x.user_id===req.session.user.id&&x.course_id===id);
 if(!e){e={id:nextId(db.enrollments),user_id:req.session.user.id,course_id:id,progress:0};db.enrollments.push(e);}
 e.progress=progress;e.updated_at=new Date().toISOString();saveDB();res.json({ok:true,progress});
});
app.post("/api/quiz-attempts",auth,(req,res)=>{
 const score=Number(req.body?.score),total=Number(req.body?.total);
 if(!Number.isInteger(score)||!Number.isInteger(total)||total<1||score<0||score>total)return res.status(400).json({error:"Invalid quiz score."});
 db.quizAttempts.push({id:nextId(db.quizAttempts),user_id:req.session.user.id,score,total,attempted_at:new Date().toISOString()});saveDB();res.status(201).json({ok:true});
});
app.get("/api/dashboard",auth,(req,res)=>{
 const enrolled=db.enrollments.filter(e=>e.user_id===req.session.user.id);
 const attempts=db.quizAttempts.filter(a=>a.user_id===req.session.user.id);
 const avg=attempts.length?attempts.reduce((s,a)=>s+a.score*100/a.total,0)/attempts.length:0;
 res.json({enrolled:enrolled.length,completed:enrolled.filter(e=>e.progress===100).length,quizAttempts:attempts.length,averageQuizScore:Math.round(avg)});
});
app.get("/api/health",(req,res)=>res.json({status:"ok",app:"E-Learning Portal API",storage:"JSON file"}));
app.listen(PORT,()=>console.log(`E-Learning Portal running at http://localhost:${PORT}`));
