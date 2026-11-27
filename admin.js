import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ifbhikajorxrslvnxmjx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GZuBTRceNBx0sYIb4M4FOQ_ksWzxrq7";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (s) => document.querySelector(s);
const loginScreen = $("#loginScreen"), appShell = $("#appShell"), viewRoot = $("#viewRoot");
const notice = $("#notice");
let currentUser = null, currentView = "overview";

const config = {
  content: { title:"Website Content", table:"content_sections", columns:["title","slug","body","is_published"], labels:["Title","Slug","Body","Published"] },
  tools: { title:"PDF Tools", table:"tools", columns:["name","slug","description","category","is_enabled"], labels:["Tool","Slug","Description","Category","Enabled"] },
  faqs: { title:"FAQs", table:"faqs", columns:["question","answer","is_published"], labels:["Question","Answer","Published"] },
  banners: { title:"Banners", table:"banners", columns:["title","message","cta_label","cta_url","image_url","is_enabled"], labels:["Title","Message","Button label","Button URL","Image URL","Enabled"] },
  settings: { title:"Site Settings", table:"site_settings", columns:["setting_key","setting_value","is_public"], labels:["Setting","Value","Public"] },
  ads: { title:"Ad Management", table:"ad_slots", columns:["placement","ad_code","is_enabled"], labels:["Placement","Ad code","Enabled"] },
  analytics: { title:"Analytics", table:"analytics_events", columns:["event_type","page_path","tool_slug","created_at"], labels:["Event","Page","Tool","Date"] },
  activity: { title:"Activity Log", table:"activity_logs", columns:["action","entity","actor_id","created_at"], labels:["Action","Section","Admin","Date"] }
};

function showNotice(message, type="success") {
  notice.textContent = message; notice.className = "notice show " + type;
  window.setTimeout(() => notice.className = "notice", 4500);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function pretty(value) {
  if (typeof value === "boolean") return value ? '<span class="tag">Enabled</span>' : '<span class="tag off">Disabled</span>';
  if (value && typeof value === "object") return esc(JSON.stringify(value));
  return esc(value);
}
async function verifyAdmin(user) {
  const { data, error } = await supabase.from("admin_users").select("role,is_active").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) throw new Error("This account is not authorised as a PDFS administrator.");
  return data;
}
async function enterApp(user, role) {
  currentUser = user;
  $("#adminEmail").textContent = user.email || "Admin";
  loginScreen.hidden = true; appShell.hidden = false;
  $("#loginMessage").textContent = "";
  $("#pageTitle").textContent = "Overview";
  await renderView("overview");
  showNotice("Signed in securely · " + role, "success");
}
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#loginButton"), msg = $("#loginMessage");
  btn.disabled = true; btn.textContent = "Signing in…"; msg.textContent = "";
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    if (error) throw error;
    const role = await verifyAdmin(data.user);
    await enterApp(data.user, role.role);
  } catch (error) {
    msg.textContent = error.message || "Unable to sign in.";
    await supabase.auth.signOut();
  } finally { btn.disabled = false; btn.innerHTML = 'Sign in <span>→</span>'; }
});
$("#logoutButton").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
$("#sideNav").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-view]"); if (!button) return;
  document.querySelectorAll(".nav-item").forEach(x => x.classList.toggle("active", x === button));
  $("#sidebar").classList.remove("open");
  await renderView(button.dataset.view);
});
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

async function count(table) {
  const { count, error } = await supabase.from(table).select("*", {count:"exact",head:true});
  if (error) throw error; return count || 0;
}
async function renderOverview() {
  const [events, tools, faqs, admins] = await Promise.all([count("analytics_events"),count("tools"),count("faqs"),count("admin_users")]);
  viewRoot.innerHTML = `
    <div class="welcome-row"><div><div class="eyebrow">YOUR WORKSPACE AT A GLANCE</div><h2>Good to see you, Admin.</h2><p>Here’s what’s happening across your PDFS website.</p></div></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-top">Tracked events <span class="stat-icon">⌁</span></div><div class="stat-number">${events.toLocaleString()}</div><div class="stat-note">Events recorded so far</div></div>
      <div class="stat-card"><div class="stat-top">PDF tools <span class="stat-icon">⌘</span></div><div class="stat-number">${tools}</div><div class="stat-note">Tools listed in your database</div></div>
      <div class="stat-card"><div class="stat-top">FAQs <span class="stat-icon">?</span></div><div class="stat-number">${faqs}</div><div class="stat-note">Questions in your content library</div></div>
      <div class="stat-card"><div class="stat-top">Admin accounts <span class="stat-icon">♙</span></div><div class="stat-number">${admins}</div><div class="stat-note">Authorised administrators</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="panel"><h3>Quick management</h3><p class="panel-sub">Jump straight into the areas you want to update.</p><div class="quick-links">
        <button class="quick-link" data-jump="content"><b>Website content</b><small>Headings, text and sections</small></button>
        <button class="quick-link" data-jump="tools"><b>PDF tools</b><small>Descriptions and availability</small></button>
        <button class="quick-link" data-jump="faqs"><b>Frequently asked questions</b><small>Manage help content</small></button>
        <button class="quick-link" data-jump="settings"><b>Site settings</b><small>Contact and website details</small></button>
      </div></div>
      <div class="panel"><h3>System status</h3><p class="panel-sub">Connection and security overview.</p>
        <div class="status-row"><span>Supabase connection</span><b class="status-ok">Connected</b></div>
        <div class="status-row"><span>Administrator access</span><b class="status-ok">Verified</b></div>
        <div class="status-row"><span>Database security</span><b class="status-ok">RLS enabled</b></div>
        <div class="status-row"><span>Analytics tracking</span><b>Awaiting website integration</b></div>
      </div>
    </div>`;
  viewRoot.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>selectView(b.dataset.jump)));
}
async function renderTable(view) {
  const c=config[view];
  const {data,error}=await supabase.from(c.table).select("*").limit(100);
  if(error) throw error;
  const rows=data||[];
  const head=c.labels.map(x=>'<th>'+esc(x)+'</th>').join("");
  const body=rows.map(row=>'<tr>'+c.columns.map(col=>'<td>'+pretty(row[col])+'</td>').join("")+'<td><div class="row-actions"><button data-edit="'+esc(row.id||row.setting_key)+'">Edit</button><button class="danger" data-delete="'+esc(row.id||row.setting_key)+'">Delete</button></div></td></tr>').join("");
  viewRoot.innerHTML=`<div class="table-panel"><div class="table-head"><div><h2>${esc(c.title)}</h2><p>Manage ${esc(c.title.toLowerCase())} stored in your PDFS database.</p></div><div class="table-actions"><button class="small-btn" id="refreshRows">Refresh</button><button class="small-btn primary" id="addRow">+ Add new</button></div></div><div class="data-wrap"><table><thead><tr>${head}<th>Actions</th></tr></thead><tbody>${body}</tbody></table>${rows.length?'':'<div class="empty-state">No records yet. Add your first item to get started.</div>'}</div></div>`;
  $("#refreshRows").addEventListener("click",()=>renderView(view));
  $("#addRow").addEventListener("click",()=>addRecord(view));
  viewRoot.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editRecord(view,b.dataset.edit,rows)));
  viewRoot.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteRecord(view,b.dataset.delete)));
}
async function addRecord(view) {
  const c=config[view]; let record={};
  for(let i=0;i<c.columns.length;i++){
    const col=c.columns[i]; if(["created_at","updated_at","actor_id"].includes(col)) continue;
    let val=window.prompt("Enter "+c.labels[i]+":"); if(val===null)return;
    if(["is_enabled","is_published","is_public"].includes(col)) val=/^(true|yes|1|on)$/i.test(val);
    if(col==="setting_value"||col==="config"){try{val=JSON.parse(val||"{}")}catch{showNotice("Enter valid JSON for "+col,"error");return}}
    record[col]=val;
  }
  if(view==="activity"||view==="analytics"){showNotice("This section is generated by system events; records cannot be added manually.","error");return}
  if(view==="ads") record.ad_code="";
  if(view==="settings") record.updated_by=currentUser.id;
  if(view==="content"||view==="faqs"||view==="tools"||view==="banners"||view==="ads") record.updated_by=currentUser.id;
  const {error}=await supabase.from(c.table).insert(record);
  if(error){showNotice(error.message,"error");return}
  await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:"create",entity:c.table,details:record});
  showNotice("New record added."); await renderView(view);
}
async function editRecord(view,key,rows){
  const c=config[view], row=rows.find(x=>String(x.id||x.setting_key)===String(key)); if(!row)return;
  const changes={};
  for(let i=0;i<c.columns.length;i++){
    const col=c.columns[i]; if(["created_at","updated_at","actor_id"].includes(col))continue;
    const old=row[col]; const val=window.prompt("Update "+c.labels[i]+":",typeof old==="object"?JSON.stringify(old):String(old??""));
    if(val===null)return;
    if(["is_enabled","is_published","is_public"].includes(col)) changes[col]=/^(true|yes|1|on)$/i.test(val);
    else if(col==="setting_value"||col==="config"){try{changes[col]=JSON.parse(val||"{}")}catch{showNotice("Enter valid JSON.","error");return}}
    else changes[col]=val;
  }
  changes.updated_at=new Date().toISOString(); changes.updated_by=currentUser.id;
  const idCol=view==="settings"?"setting_key":"id";
  const {error}=await supabase.from(c.table).update(changes).eq(idCol,key);
  if(error){showNotice(error.message,"error");return}
  await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:"update",entity:c.table,entity_id:String(key)});
  showNotice("Changes saved."); await renderView(view);
}
async function deleteRecord(view,key){
  if(!confirm("Delete this record? This cannot be undone."))return;
  const c=config[view], idCol=view==="settings"?"setting_key":"id";
  const {error}=await supabase.from(c.table).delete().eq(idCol,key);
  if(error){showNotice(error.message,"error");return}
  await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:"delete",entity:c.table,entity_id:String(key)});
  showNotice("Record deleted."); await renderView(view);
}
async function selectView(view){document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));await renderView(view)}
async function renderView(view){
  currentView=view; const title=view==="overview"?"Overview":config[view]?.title||"Overview";
  $("#pageTitle").textContent=title;$("#pageCrumb").textContent=title;
  viewRoot.innerHTML='<div class="panel">Loading your workspace…</div>';
  try{if(view==="overview")await renderOverview();else await renderTable(view)}
  catch(error){viewRoot.innerHTML='<div class="panel"><h3>Unable to load this section</h3><p class="panel-sub">'+esc(error.message)+'</p></div>'}
}
supabase.auth.getSession().then(async ({data})=>{
  if(data.session){try{const role=await verifyAdmin(data.session.user);await enterApp(data.session.user,role.role)}catch{await supabase.auth.signOut()}}
});
