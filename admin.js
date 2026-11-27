import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://ifbhikajorxrslvnxmjx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GZuBTRceNBx0sYIb4M4FOQ_ksWzxrq7";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });

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
  visitors: { title:"Visitors", table:"analytics_events", columns:["session_id","country","city","device_type","browser","created_at"], labels:["Session","Country","City","Device","Browser","Last seen"] },
  activity: { title:"Activity Log", table:"activity_logs", columns:["action","entity","actor_id","created_at"], labels:["Action","Section","Admin","Date"] },
  users: { title:"User Management", table:"admin_users", columns:["user_id","role","is_active"], labels:["User UUID","Role","Active"] },
  support: { title:"Support Inbox", table:"support_messages", columns:["name","email","subject","message","status","created_at"], labels:["Name","Email","Subject","Message","Status","Received"] }
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
// Reliable sidebar navigation: switch the content view without leaving the admin console.
document.querySelectorAll("#sideNav [data-view]").forEach((button) => {
  button.type = "button";
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    const view = button.dataset.view;
    $("#sidebar").classList.remove("open");
    await selectView(view);
    history.replaceState(null, "", "#" + view);
  });
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
  const orderColumn=(view==="settings"?"setting_key":(["analytics","activity","users","support"].includes(view)?"created_at":"updated_at"));\n  const {data,error}=await supabase.from(c.table).select("*").order(orderColumn,{ascending:false}).limit(200);
  if(error) throw error;
  const rows=data||[], readOnly=view==="analytics"||view==="activity"||view==="users"||view==="support";
  const head=c.labels.map(x=>'<th>'+esc(x)+'</th>').join("");
  const body=rows.map(row=>{
    const key=row.id??row.setting_key;
    const actions=view==="support"?'<td><button class="small-btn" data-support-status="'+esc(key)+'" data-status="'+esc(row.status)+'">'+(row.status==="new"?"Mark read":row.status==="read"?"Close":"Reopen")+'</button></td>':(readOnly?'':'<td><div class="row-actions"><button data-edit="'+esc(key)+'">Edit</button><button class="danger" data-delete="'+esc(key)+'">Delete</button></div></td>');
    return '<tr>'+c.columns.map(col=>'<td>'+pretty(row[col])+'</td>').join("")+actions+'</tr>';
  }).join("");
  viewRoot.innerHTML='<div class="table-panel"><div class="table-head"><div><h2>'+esc(c.title)+'</h2><p>'+ (readOnly?'System-generated records. These entries are read-only.':'Create, edit and manage records stored in your PDFS database.')+'</p></div><div class="table-actions"><input id="tableSearch" class="table-search" type="search" placeholder="Search records…"><button class="small-btn" id="refreshRows">Refresh</button>'+(readOnly?'':'<button class="small-btn primary" id="addRow">+ Add new</button>')+'</div></div><div class="data-wrap"><table><thead><tr>'+head+(readOnly&&view!=="support"?'':'<th>Actions</th>')+'</tr></thead><tbody id="tableBody">'+body+'</tbody></table>'+(rows.length?'':'<div class="empty-state">No records yet. Add your first item to get started.</div>')+'</div></div><div id="recordEditor" class="editor-backdrop" hidden><div class="editor-card"><div class="editor-heading"><div><span class="eyebrow">PDFS CONTENT MANAGER</span><h2 id="editorTitle">Add record</h2><p>Changes are saved securely to your database.</p></div><button type="button" class="editor-close" id="closeEditor" aria-label="Close">×</button></div><form id="recordForm"><div class="form-grid" id="recordFields"></div><div class="form-actions"><button type="button" class="small-btn" id="cancelEditor">Cancel</button><button type="submit" class="small-btn primary" id="saveRecord">Save changes</button></div></form></div></div>';
  $("#refreshRows").addEventListener("click",()=>renderView(view));
  const search=$("#tableSearch");
  search.addEventListener("input",()=>{const q=search.value.toLowerCase();viewRoot.querySelectorAll("#tableBody tr").forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});
  if(!readOnly) $("#addRow").addEventListener("click",()=>openEditor(view,null,rows));
  viewRoot.querySelectorAll("[data-support-status]").forEach(b=>b.addEventListener("click",async()=>{
    const next=b.dataset.status==="new"?"read":b.dataset.status==="read"?"closed":"new";
    const {error}=await supabase.from("support_messages").update({status:next}).eq("id",b.dataset.supportStatus);
    if(error){showNotice(error.message,"error");return;}
    showNotice("Support message updated.");await renderView("support");
  }));
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
async function selectView(view){
  if(view!=="overview" && !config[view] && !["security","appearance","backup","visitors"].includes(view)) return;
  document.querySelectorAll(".nav-item").forEach(x=>{
    const active=x.dataset.view===view;
    x.classList.toggle("active",active);
    if(active) x.setAttribute("aria-current","page"); else x.removeAttribute("aria-current");
  });
  await renderView(view);
}
async function renderVisitors(){
  const {data,error}=await supabase.from("analytics_events").select("session_id,event_type,page_path,tool_slug,created_at,country,country_code,region,city,timezone,browser,device_type,referrer").order("created_at",{ascending:false}).limit(10000);
  if(error)throw error;
  const events=data||[], sessions=new Map();
  for(const event of events){
    if(!event.session_id)continue;
    let s=sessions.get(event.session_id);
    if(!s){s={id:event.session_id,first:event.created_at,last:event.created_at,events:0,pages:new Set(),tools:new Set(),country:event.country,code:event.country_code,region:event.region,city:event.city,timezone:event.timezone,browser:event.browser,device:event.device_type,landing:"—",referrer:"—"};sessions.set(event.session_id,s);}
    s.events++;
    if(new Date(event.created_at)<new Date(s.first))s.first=event.created_at;
    if(new Date(event.created_at)>new Date(s.last))s.last=event.created_at;
    if(event.page_path){s.pages.add(event.page_path);if(event.event_type==="page_view"){s.landing=event.page_path;s.referrer=event.referrer||s.referrer;}}
    if(event.tool_slug)s.tools.add(event.tool_slug);
    if(!s.country&&event.country){s.country=event.country;s.code=event.country_code;s.region=event.region;s.city=event.city;s.timezone=event.timezone;}
    if(!s.browser&&event.browser)s.browser=event.browser;
    if(!s.device&&event.device_type)s.device=event.device_type;
  }
  const visitors=Array.from(sessions.values()).sort((a,b)=>new Date(b.last)-new Date(a.last));
  const countries={};visitors.forEach(v=>{const k=v.country||"Unknown";countries[k]=(countries[k]||0)+1;});
  const top=Object.entries(countries).sort((a,b)=>b[1]-a[1]).slice(0,12);
  const cityCount=new Set(visitors.map(v=>v.city).filter(Boolean)).size;
  const recent=visitors.slice(0,100),fmt=x=>x?new Date(x).toLocaleString():"—";
  viewRoot.innerHTML=`<div class="stats-grid">
    <div class="stat-card"><div class="stat-top">Visitor sessions</div><div class="stat-number">${visitors.length.toLocaleString()}</div><div class="stat-note">Browser sessions found in the latest 10,000 events</div></div>
    <div class="stat-card"><div class="stat-top">Countries</div><div class="stat-number">${Object.keys(countries).filter(x=>x!=="Unknown").length}</div><div class="stat-note">Countries detected by approximate IP lookup</div></div>
    <div class="stat-card"><div class="stat-top">Cities</div><div class="stat-number">${cityCount}</div><div class="stat-note">Cities with available location data</div></div>
    <div class="stat-card"><div class="stat-top">Tracked events</div><div class="stat-number">${events.length.toLocaleString()}</div><div class="stat-note">Page views and tool interactions</div></div>
  </div>
  <div class="dashboard-grid">
    <section class="panel"><h3>Visitors by country</h3><p class="panel-sub">Approximate country counts by browser session.</p><div class="data-wrap"><table><thead><tr><th>Country</th><th>Sessions</th></tr></thead><tbody>${top.map(([country,count])=>`<tr><td>${esc(country)}</td><td>${count}</td></tr>`).join("")||'<tr><td colspan="2">No location data yet.</td></tr>'}</tbody></table></div></section>
    <section class="panel"><h3>Location data notes</h3><p class="panel-sub">What these visitor records represent.</p><div class="status-row"><span>Location method</span><b>IP-based estimate</b></div><div class="status-row"><span>Raw visitor IP stored</span><b class="status-ok">No</b></div><div class="status-row"><span>City accuracy</span><b>Approximate</b></div><div class="status-row"><span>Missing / VPN locations</span><b>May show Unknown</b></div></section>
  </div>
  <section class="panel" style="margin-top:16px"><h3>Recent visitor sessions</h3><p class="panel-sub">Up to 100 recent sessions. A session is a browser visit, not a verified real-world identity.</p><div class="data-wrap"><table><thead><tr><th>Country</th><th>City / Region</th><th>Time zone</th><th>Device</th><th>Browser</th><th>Landing page</th><th>Pages</th><th>Tools used</th><th>Referrer</th><th>Events</th><th>First seen</th><th>Last seen</th></tr></thead><tbody>${recent.map(v=>`<tr><td>${esc(v.country||"Unknown")}${v.code?" ("+esc(v.code)+")":""}</td><td>${esc([v.city,v.region].filter(Boolean).join(", ")||"—")}</td><td>${esc(v.timezone||"—")}</td><td>${esc(v.device||"Unknown")}</td><td>${esc(v.browser||"Unknown")}</td><td>${esc(v.landing)}</td><td>${v.pages.size}</td><td>${esc(Array.from(v.tools).join(", ")||"—")}</td><td>${esc(v.referrer)}</td><td>${v.events}</td><td>${esc(fmt(v.first))}</td><td>${esc(fmt(v.last))}</td></tr>`).join("")||'<tr><td colspan="12">No visitor sessions recorded yet. Visit the public website to create a test record.</td></tr>'}</tbody></table></div></section>
  <p class="hint" style="margin-top:12px">Location is estimated from the visitor’s public IP by a third-party lookup service. VPNs, mobile networks and privacy tools can make city results inaccurate or unavailable. Raw IP addresses are not saved in PDFS analytics. This is session-level analytics, not a real-world identity tracker.</p>`;
}
async function renderView(view){
  currentView=view; const title=view==="overview"?"Overview":config[view]?.title||"Overview";
  $("#pageTitle").textContent=title;$("#pageCrumb").textContent=title;
  viewRoot.innerHTML='<div class="panel">Loading your workspace…</div>';
  try{if(view==="overview")await renderOverview();else if(view==="security")await renderSecurity();else if(view==="appearance")await renderAppearance();else if(view==="backup")await renderBackup();else if(view==="analytics")await renderAnalytics();else if(view==="visitors")await renderVisitors();else await renderTable(view)}
  catch(error){viewRoot.innerHTML='<div class="panel"><h3>Unable to load this section</h3><p class="panel-sub">'+esc(error.message)+'</p></div>'}
}
// Do not restore saved sessions: every fresh page load must require an email and password.


// PDFS ADMIN EXTENSIONS
async function renderSecurity(){
  const [{data:admins,error:aErr},{data:logs,error:lErr}] = await Promise.all([
    supabase.from("admin_users").select("user_id,role,is_active,created_at").order("created_at",{ascending:true}),
    supabase.from("activity_logs").select("action,entity,created_at,actor_id").order("created_at",{ascending:false}).limit(12)
  ]);
  if(aErr) throw aErr; if(lErr) throw lErr;
  const owner=admins.find(x=>x.user_id===currentUser.id && x.role==="owner" && x.is_active);
  viewRoot.innerHTML=`<div class="extension-grid">
    <section class="panel"><div class="eyebrow">ACCESS PROTECTION</div><h2>Security overview</h2><p class="panel-sub">Admin sign-in is protected by Supabase Auth and active administrator roles.</p>
      <div class="status-row"><span>Signed-in account</span><b class="status-ok">Verified</b></div>
      <div class="status-row"><span>Fresh login on page load</span><b class="status-ok">Enabled</b></div>
      <div class="status-row"><span>Database row security</span><b class="status-ok">Enabled</b></div>
      <div class="status-row"><span>Owner-only access controls</span><b class="status-ok">Protected</b></div>
      <p class="panel-sub">Passwords and secret API keys are never stored in this browser panel. Add or change account passwords in Supabase Authentication. Never place a service-role or secret key in website files.</p>
    </section>
    <section class="panel"><div class="eyebrow">CURRENT SESSION</div><h2>Account details</h2><p>${esc(currentUser.email||"Admin account")}</p><p class="panel-sub">User ID: ${esc(currentUser.id)}</p><button class="small-btn" id="securityLogout">Sign out now</button></section>
    <section class="panel full-panel"><h3>Recent admin activity</h3><div class="data-wrap"><table><thead><tr><th>Action</th><th>Area</th><th>Date</th></tr></thead><tbody>${logs.map(x=>`<tr><td>${esc(x.action)}</td><td>${esc(x.entity||"—")}</td><td>${esc(new Date(x.created_at).toLocaleString())}</td></tr>`).join("")||'<tr><td colspan="3">No activity recorded yet.</td></tr>'}</tbody></table></div></section>
    <section class="panel full-panel"><h3>Administrator access</h3><p class="panel-sub">Only the owner can activate, deactivate or change the role of another admin. Auth user creation/password changes remain in Supabase.</p><div class="data-wrap"><table><thead><tr><th>Account ID</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>${admins.map(x=>`<tr><td>${esc(x.user_id.slice(0,8))}…</td><td>${esc(x.role)}</td><td>${x.is_active?'Active':'Inactive'}</td><td>${owner && x.user_id!==currentUser.id?`<button class="small-btn" data-admin-toggle="${esc(x.user_id)}" data-active="${x.is_active}">${x.is_active?'Deactivate':'Activate'}</button>`:'—'}</td></tr>`).join("")}</tbody></table></div></section>
  </div>`;
  $("#securityLogout").onclick=()=>$("#logoutButton").click();
  viewRoot.querySelectorAll("[data-admin-toggle]").forEach(btn=>btn.addEventListener("click",async()=>{
    const next=btn.dataset.active!=="true";
    if(!confirm((next?"Activate":"Deactivate")+" this admin account?"))return;
    const {error}=await supabase.from("admin_users").update({is_active:next}).eq("user_id",btn.dataset.adminToggle);
    if(error){showNotice(error.message,"error");return;}
    await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:next?"admin_activate":"admin_deactivate",entity:"admin_users",entity_id:btn.dataset.adminToggle,details:{}});
    showNotice("Admin access updated.");await renderSecurity();
  }));
}
async function renderAppearance(){
  const {data,error}=await supabase.from("site_settings").select("setting_key,setting_value,is_public").order("setting_key");
  if(error)throw error;
  viewRoot.innerHTML=`<div class="panel"><div class="eyebrow">BRAND & EXPERIENCE</div><h2>Website appearance and details</h2><p class="panel-sub">Use Site Settings below to manage the website's public contact details, headings, theme values and announcement content. Only publish values intended for visitors.</p><div class="stats-grid"><div class="stat-card"><b>Brand colors</b><p class="panel-sub">Store your preferred theme values in settings.</p></div><div class="stat-card"><b>Contact details</b><p class="panel-sub">Add your official email and phone yourself.</p></div><div class="stat-card"><b>Homepage text</b><p class="panel-sub">Manage section content in Website Content.</p></div><div class="stat-card"><b>Announcement</b><p class="panel-sub">Create a banner in Banners.</p></div></div><div class="table-actions extension-actions"><button class="small-btn primary" id="goSiteSettings">Open Site Settings</button><button class="small-btn" id="goContent">Open Website Content</button><button class="small-btn" id="goBanners">Open Banners</button></div></div><div class="panel"><h3>Saved settings</h3><div class="data-wrap"><table><thead><tr><th>Setting key</th><th>Public</th><th>Value</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(x.setting_key)}</td><td>${x.is_public?'Yes':'No'}</td><td>${esc(JSON.stringify(x.setting_value))}</td></tr>`).join("")||'<tr><td colspan="3">No settings added yet.</td></tr>'}</tbody></table></div></div>`;
  $("#goSiteSettings").onclick=()=>selectView("settings");$("#goContent").onclick=()=>selectView("content");$("#goBanners").onclick=()=>selectView("banners");
}
async function renderBackup(){
  viewRoot.innerHTML=`<div class="panel"><div class="eyebrow">DATA PORTABILITY</div><h2>Backup & Export</h2><p class="panel-sub">Download a JSON backup of the PDFS admin content and settings. Passwords, Auth secrets and private keys are deliberately excluded.</p><div class="status-row"><span>Included</span><b>Tools, FAQs, banners, settings, content, ad slots</b></div><div class="status-row"><span>Excluded</span><b>Passwords, secret keys, Auth credentials</b></div><button class="small-btn primary" id="downloadBackup">Download JSON backup</button><p class="panel-sub" id="backupStatus"></p></div>`;
  $("#downloadBackup").onclick=async()=>{
    const btn=$("#downloadBackup"),status=$("#backupStatus");btn.disabled=true;btn.textContent="Preparing backup…";
    try{
      const tables=["tools","faqs","banners","site_settings","content_sections","ad_slots"];
      const backup={product:"PDFS",format_version:1,created_at:new Date().toISOString(),tables:{}};
      for(const table of tables){const {data,error}=await supabase.from(table).select("*");if(error)throw error;backup.tables[table]=data||[];}
      const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="pdfs-backup-"+new Date().toISOString().slice(0,10)+".json";link.click();URL.revokeObjectURL(url);
      status.textContent="Backup downloaded successfully.";
      await supabase.from("activity_logs").insert({actor_id:currentUser.id,action:"backup_export",entity:"backup",details:{tables}});
    }catch(error){status.textContent="Backup failed: "+error.message;}
    finally{btn.disabled=false;btn.textContent="Download JSON backup";}
  };
}

async function renderAnalytics(){
  const {data,error}=await supabase.from("analytics_events").select("event_type,page_path,tool_slug,created_at").order("created_at",{ascending:false}).limit(5000);
  if(error)throw error;
  const rows=data||[], now=Date.now(), day=86400000;
  const recent=rows.filter(x=>now-new Date(x.created_at).getTime()<7*day);
  const byDay=Array.from({length:7},(_,i)=>{const d=new Date(now-(6-i)*day);const key=d.toLocaleDateString();return {label:d.toLocaleDateString(undefined,{weekday:"short"}),count:recent.filter(x=>new Date(x.created_at).toLocaleDateString()===key).length};});
  const toolCounts={};rows.forEach(x=>{if(x.tool_slug)toolCounts[x.tool_slug]=(toolCounts[x.tool_slug]||0)+1;});
  const top=Object.entries(toolCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
  viewRoot.innerHTML=`<div class="stats-grid"><div class="stat-card"><div class="stat-top">Total tracked events</div><div class="stat-number">${rows.length.toLocaleString()}</div><div class="stat-note">Stored analytics events (not unique visitors)</div></div><div class="stat-card"><div class="stat-top">Last 7 days</div><div class="stat-number">${recent.length.toLocaleString()}</div><div class="stat-note">Events recorded in the last seven days</div></div><div class="stat-card"><div class="stat-top">Tool events</div><div class="stat-number">${Object.values(toolCounts).reduce((a,b)=>a+b,0).toLocaleString()}</div><div class="stat-note">Events associated with a tool slug</div></div><div class="stat-card"><div class="stat-top">Tracked pages</div><div class="stat-number">${new Set(rows.map(x=>x.page_path).filter(Boolean)).size}</div><div class="stat-note">Distinct page paths recorded</div></div></div>
  <div class="dashboard-grid"><section class="panel"><h3>Daily events · last 7 days</h3><div class="data-wrap"><table><thead><tr><th>Day</th><th>Events</th></tr></thead><tbody>${byDay.map(x=>`<tr><td>${esc(x.label)}</td><td>${x.count}</td></tr>`).join("")}</tbody></table></div></section><section class="panel"><h3>Most-used tools</h3><div class="data-wrap"><table><thead><tr><th>Tool slug</th><th>Events</th></tr></thead><tbody>${top.map(x=>`<tr><td>${esc(x[0])}</td><td>${x[1]}</td></tr>`).join("")||'<tr><td colspan="2">No tool events recorded yet.</td></tr>'}</tbody></table></div></section></div>
  <section class="panel" style="margin-top:16px"><h3>Recent analytics events</h3><div class="data-wrap"><table><thead><tr><th>Event</th><th>Page</th><th>Tool</th><th>Date</th></tr></thead><tbody>${rows.slice(0,50).map(x=>`<tr><td>${esc(x.event_type)}</td><td>${esc(x.page_path||"—")}</td><td>${esc(x.tool_slug||"—")}</td><td>${esc(new Date(x.created_at).toLocaleString())}</td></tr>`).join("")||'<tr><td colspan="4">No events recorded yet.</td></tr>'}</tbody></table></div></section>`;
}
