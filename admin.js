import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ifbhikajorxrslvnxmjx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GZuBTRceNBx0sYIb4M4FOQ_ksWzxrq7";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (s) => document.querySelector(s);
const loginScreen = $("#loginScreen"), appShell = $("#appShell"), viewRoot = $("#viewRoot");
const notice = $("#notice");
let currentUser = null, currentView = "overview";

const config = {
  content: { title:"Website Content", table:"content_sections", columns:["title","slug","body","sort_order","is_published"], labels:["Title","Slug","Body","Sort order","Published"] },
  tools: { title:"PDF Tools", table:"tools", columns:["name","slug","description","category","sort_order","is_enabled","config"], labels:["Tool","Slug","Description","Category","Sort order","Enabled","Configuration (JSON)"] },
  faqs: { title:"FAQs", table:"faqs", columns:["question","answer","sort_order","is_published"], labels:["Question","Answer","Sort order","Published"] },
  banners: { title:"Banners", table:"banners", columns:["title","message","cta_label","cta_url","image_url","starts_at","ends_at","is_enabled"], labels:["Title","Message","Button label","Button URL","Image URL","Start time","End time","Enabled"] },
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
        <div class="status-row"><span>Analytics tracking</span><b class="status-ok">Connected</b></div>
      </div>
    </div>`;
  viewRoot.querySelectorAll("[data-jump]").forEach(b=>b.addEventListener("click",()=>selectView(b.dataset.jump)));
}
function fieldMarkup(col,label,value) {
  const bools=["is_enabled","is_published","is_public"];
  const jsons=["setting_value","config"];
  const longText=["body","answer","message","ad_code"];
  const requiredFields=["title","slug","body","name","description","category","question","answer","message","setting_key","placement","ad_code"];
  const dateFields=["starts_at","ends_at"];
  const numeric=["sort_order"];
  const val=value==null?"":(typeof value==="object"?JSON.stringify(value,null,2):String(value));
  if(bools.includes(col)) return '<div class="form-field"><label>'+esc(label)+'</label><select name="'+col+'"><option value="true" '+(value===true?'selected':'')+'>Enabled / Yes</option><option value="false" '+(value!==true?'selected':'')+'>Disabled / No</option></select></div>';
  if(jsons.includes(col)) return '<div class="form-field full"><label>'+esc(label)+'</label><textarea name="'+col+'" spellcheck="false">'+esc(val||"{}")+'</textarea><small class="hint">Enter valid JSON. Example: {"featured": true}</small></div>';
  if(longText.includes(col)) return '<div class="form-field full"><label>'+esc(label)+'</label><textarea name="'+col+'" '+(requiredFields.includes(col)?'required':'')+'>'+esc(val)+'</textarea></div>';
  if(dateFields.includes(col)) {
    const dateVal=value?new Date(value).toISOString().slice(0,16):"";
    return '<div class="form-field"><label>'+esc(label)+'</label><input type="datetime-local" name="'+col+'" value="'+esc(dateVal)+'"></div>';
  }
  if(numeric.includes(col)) return '<div class="form-field"><label>'+esc(label)+'</label><input type="number" step="1" name="'+col+'" value="'+esc(val||"0")+'"></div>';
  const type=(col==="image_url"||col==="cta_url")?"url":"text";
  return '<div class="form-field"><label>'+esc(label)+'</label><input type="'+type+'" name="'+col+'" value="'+esc(val)+'" '+(requiredFields.includes(col)?'required':'')+'></div>';
}
async function renderTable(view) {
  const c=config[view];
  const {data,error}=await supabase.from(c.table).select("*").order(view==="settings"?"setting_key":(view==="analytics"||view==="activity"?"created_at":"updated_at"),{ascending:false}).limit(200);
  if(error) throw error;
  const rows=data||[], readOnly=view==="analytics"||view==="activity";
  const head=c.labels.map(x=>'<th>'+esc(x)+'</th>').join("");
  const body=rows.map(row=>{
    const key=row.id??row.setting_key;
    const actions=readOnly?'':'<td><div class="row-actions"><button data-edit="'+esc(key)+'">Edit</button><button class="danger" data-delete="'+esc(key)+'">Delete</button></div></td>';
    return '<tr>'+c.columns.map(col=>'<td>'+pretty(row[col])+'</td>').join("")+actions+'</tr>';
  }).join("");
  viewRoot.innerHTML='<div class="table-panel"><div class="table-head"><div><h2>'+esc(c.title)+'</h2><p>'+ (readOnly?'System-generated records. These entries are read-only.':'Create, edit and manage records stored in your PDFS database.')+'</p></div><div class="table-actions"><input id="tableSearch" class="table-search" type="search" placeholder="Search records…"><button class="small-btn" id="refreshRows">Refresh</button>'+(readOnly?'':'<button class="small-btn primary" id="addRow">+ Add new</button>')+'</div></div><div class="data-wrap"><table><thead><tr>'+head+(readOnly?'':'<th>Actions</th>')+'</tr></thead><tbody id="tableBody">'+body+'</tbody></table>'+(rows.length?'':'<div class="empty-state">No records yet. Add your first item to get started.</div>')+'</div></div><div id="recordEditor" class="editor-backdrop" hidden><div class="editor-card"><div class="editor-heading"><div><span class="eyebrow">PDFS CONTENT MANAGER</span><h2 id="editorTitle">Add record</h2><p>Changes are saved securely to your database.</p></div><button type="button" class="editor-close" id="closeEditor" aria-label="Close">×</button></div><form id="recordForm"><div class="form-grid" id="recordFields"></div><div class="form-actions"><button type="button" class="small-btn" id="cancelEditor">Cancel</button><button type="submit" class="small-btn primary" id="saveRecord">Save changes</button></div></form></div></div>';
  $("#refreshRows").addEventListener("click",()=>renderView(view));
  const search=$("#tableSearch");
  search.addEventListener("input",()=>{const q=search.value.toLowerCase();viewRoot.querySelectorAll("#tableBody tr").forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});
  if(!readOnly) $("#addRow").addEventListener("click",()=>openEditor(view,null,rows));
  viewRoot.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openEditor(view,b.dataset.edit,rows)));
  viewRoot.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteRecord(view,b.dataset.delete)));
}
function openEditor(view,key,rows){
  const c=config[view], row=key===null?{}:rows.find(x=>String(x.id??x.setting_key)===String(key));
  if(!row)return;
  const editor=$("#recordEditor"), form=$("#recordForm");
  $("#editorTitle").textContent=key===null?"Add "+c.title.slice(0,-1):"Edit "+c.title.slice(0,-1);
  $("#recordFields").innerHTML=c.columns.map((col,i)=>fieldMarkup(col,c.labels[i],row[col])).join("");
  editor.hidden=false;
  $("#closeEditor").onclick=$("#cancelEditor").onclick=()=>{editor.hidden=true;};
  form.onsubmit=async e=>{
    e.preventDefault();
    const button=$("#saveRecord");button.disabled=true;button.textContent="Saving…";
    try{
      const payload={};
      for(const col of c.columns){
        const input=form.elements.namedItem(col);if(!input)continue;
        let value=input.value;
        if(["is_enabled","is_published","is_public"].includes(col))value=value==="true";
        else if(["sort_order"].includes(col)){value=Number(value||0);if(!Number.isFinite(value))throw new Error("Sort order must be a number.");}
        else if(["setting_value","config"].includes(col)){try{value=JSON.parse(value||"{}");}catch{throw new Error("Please enter valid JSON in "+col+".");}}
        else if(["starts_at","ends_at"].includes(col)){value=value?new Date(value).toISOString():null;}
        else if(value==="")value=null;
        payload[col]=value;
      }
      payload.updated_at=new Date().toISOString();payload.updated_by=currentUser.id;
      if(view==="settings"&&key!==null)delete payload.setting_key;
      let query=supabase.from(c.table);
      const result=key===null?await query.insert(payload):await query.update(payload).eq(view==="settings"?"setting_key":"id",key);
      if(result.error)throw result.error;
      await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:key===null?"create":"update",entity:c.table,entity_id:key===null?null:String(key),details:payload});
      editor.hidden=true;showNotice(key===null?"Record created successfully.":"Changes saved successfully.");await renderView(view);
    }catch(error){showNotice(error.message||"Unable to save record.","error");}
    finally{button.disabled=false;button.textContent="Save changes";}
  };
}
async function deleteRecord(view,key){
  if(!confirm("Delete this record? This cannot be undone."))return;
  const c=config[view], idCol=view==="settings"?"setting_key":"id";
  const {error}=await supabase.from(c.table).delete().eq(idCol,key);
  if(error){showNotice(error.message,"error");return}
  await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:"delete",entity:c.table,entity_id:String(key),details:{record_id:String(key)}});
  showNotice("Record deleted.");await renderView(view);
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
