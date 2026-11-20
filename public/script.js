const schoolSubjects = ["Hindi","English","Mathematics","Science","Social Studies (SST)"];
const seniorSubjects = ["Hindi","English","Mathematics","Physics","Chemistry","Biology","Accountancy","Economics","Business Studies"];
const coverStyles = ["cover-blue","cover-purple","cover-green","cover-orange","cover-pink","cover-cyan"];
const symbols = ["अ","A","∑","⚗","🌍","📘"];

const defaultCourses = [
  ...Array.from({length:10},(_,i)=>schoolSubjects.map((subject,j)=>({
    id:i*5+j+1,
    title:`${subject} - Class ${i+1}`,
    category:subject,
    level:`Class ${i+1}`,
    lessons:10,
    duration:"2h 30m",
    description:`Class ${i+1} ${subject} lessons, revision notes and learning materials.`,
    symbol:symbols[j],
    cover:coverStyles[j%coverStyles.length],
    instructor:"School Faculty",
    video:"",
    progress:0
  }))).flat(),

  ...Array.from({length:2},(_,i)=>seniorSubjects.map((subject,j)=>({
    id:51+i*9+j,
    title:`${subject} - Class ${i+11}`,
    category:subject,
    level:`Class ${i+11}`,
    lessons:12,
    duration:"3h 00m",
    description:`Class ${i+11} ${subject} lessons, revision notes and learning materials.`,
    symbol:symbols[j%symbols.length],
    cover:coverStyles[j%coverStyles.length],
    instructor:"School Faculty",
    video:"",
    progress:0
  }))).flat()
];

const quizQuestions=[
  {q:"Which part of a plant absorbs water from the soil?",opts:["Leaf","Root","Flower","Stem"],a:1,why:"Roots absorb water and minerals from the soil."},
  {q:"What is 12 × 8?",opts:["86","92","96","108"],a:2,why:"12 multiplied by 8 equals 96."},
  {q:"Which word is a noun?",opts:["Quickly","Beautiful","School","Run"],a:2,why:"School is a naming word, so it is a noun."},
  {q:"Which is the national animal of India?",opts:["Lion","Tiger","Elephant","Peacock"],a:1,why:"The Bengal tiger is India's national animal."},
  {q:"Which gas do humans need for breathing?",opts:["Carbon dioxide","Nitrogen","Oxygen","Hydrogen"],a:2,why:"Humans need oxygen for respiration."}
];

const $=s=>document.querySelector(s);

const get=(k,d)=>{
  try{return JSON.parse(localStorage.getItem("elearningportal_"+k))??d}
  catch{return d}
};

const set=(k,v)=>localStorage.setItem("elearningportal_"+k,JSON.stringify(v));

let courses=defaultCourses.map(c=>({...c,progress:0}));
let user=get("user",{name:"Student",role:"Student"});
let page="home";
let filter="All";
let classFilter="All";
let quizIndex=0;
let quizAnswers=[];
let quizDone=false;
let progress={};
let activities=get("activities",[]);

const API="/api";

async function apiRequest(path,options={}){
  const r=await fetch(API+path,{
    credentials:"same-origin",
    headers:{"Content-Type":"application/json",...(options.headers||{})},
    ...options
  });
  let d={};
  try{d=await r.json()}catch{}
  if(!r.ok)throw new Error(d.error||"Server request failed");
  return d;
}

let backendOnline=false;

async function checkBackend(){
  try{
    const [me,cs]=await Promise.all([
      apiRequest("/auth/me"),
      apiRequest("/courses")
    ]);
    backendOnline=true;
    if(me.user){
      user={
        name:me.user.name,
        role:me.user.role==="teacher"?"Teacher":"Student",
        email:me.user.email
      };
      set("user",user);
      updateUser();
    }
    courses=defaultCourses.map(c=>({...c,progress:progress[c.id]||0}));
    render();
  }catch(e){
    backendOnline=false;
  }
}

function authModal(){
  showModal(`
    <div class="eyebrow">EDULEARN ACCOUNT</div>
    <h2 id="modalTitle">Welcome to E-Learning Portal</h2>
    <p>Create an account or sign in to save learning progress.</p>
    ${user.email?`<div class="notice">Signed in as ${escapeHtml(user.email)} · ${escapeHtml(user.role)}</div>
    <div class="modal-actions"><button class="ghost-btn" onclick="logoutAccount()">Log out</button></div>`:""}
    <div class="filter-row">
      <button class="filter-chip active" id="authLoginTab" onclick="renderAuthForm('login')">Log in</button>
      <button class="filter-chip" id="authRegisterTab" onclick="renderAuthForm('register')">Create account</button>
    </div>
    <div id="authFormSlot"></div>
  `);
  renderAuthForm("login");
}

async function logoutAccount(){
  try{
    if(backendOnline)await apiRequest("/auth/logout",{method:"POST"});
    user={name:"Student",role:"Student"};
    set("user",user);
    updateUser();
    closeModal();
    toast("You have logged out.");
    render();
  }catch(e){
    toast(e.message);
  }
}
