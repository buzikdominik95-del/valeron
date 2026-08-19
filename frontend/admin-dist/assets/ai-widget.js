/* Velora Admin AI panel v5 clean */
(function () {
  var API = '/api/admin/ai-manager';
  var chatId = 0;
  var contour = 'it-velora';
  var minimized = false;

  function tok(){ return localStorage.getItem('token'); }
  function H(){ return {'Authorization':'Bearer '+tok(),'Content-Type':'application/json','Accept':'application/json'}; }
  function get(path){ return fetch(API+path,{headers:H()}).then(function(r){ if(!r.ok){return null;} return r.json(); }).catch(function(){ return null; }); }
  function post(path,body){ return fetch(API+path,{method:'POST',headers:H(),body:JSON.stringify(body)}).then(function(r){ return r.json(); }).catch(function(){ return null; }); }

  function sniff(url){
    if(typeof url !== 'string'){ return; }
    var m = url.match(/admin\/chats\/(\d+)/);
    if(!m){ return; }
    chatId = parseInt(m[1],10);
  }

  var of = window.fetch;
  window.fetch = function(u){
    try {
      if(typeof u === 'string'){ sniff(u); }
      else {
        if(u){
          if(u.url){ sniff(u.url); }
        }
      }
    } catch(e){}
    return of.apply(this, arguments);
  };

  var ox = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m,u){
    try { sniff(u); } catch(e){}
    return ox.apply(this, arguments);
  };

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function num(v){ var n=Number(v); if(isNaN(n)){ return 0; } return n; }

  function ensureUi(){
    if(!document.getElementById('vlr-ai-style')){
      var st=document.createElement('style');
      st.id='vlr-ai-style';
      st.textContent='#vlr-ai-panel{position:fixed;left:16px;bottom:16px;width:460px;max-width:calc(100vw - 24px);max-height:80vh;overflow-y:auto;overflow-x:hidden;background:linear-gradient(170deg,#14182b,#1c2238);color:#dfe4f5;border:1px solid #3f4a76;border-radius:14px;z-index:2147483000;box-shadow:0 10px 34px rgba(0,0,0,.55);font:12px/1.5 Inter,system-ui}#vlr-ai-panel h4{margin:0;padding:11px 14px;background:rgba(130,92,255,.15);border-bottom:1px solid #3f4a76;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#bfaeff}#vlr-ai-body{padding:12px 14px 14px}.vlr-row{display:flex;gap:8px;align-items:center;margin:6px 0;min-width:0}.vlr-k{width:120px;flex:none;color:#8e98bc}.vlr-v{flex:1;min-width:0;word-break:break-word}#vlr-ai-panel select{width:100%;background:#242b48;color:#e7ebff;border:1px solid #4f5b8e;border-radius:8px;padding:7px 9px;font-size:12px}#vlr-ai-panel button{background:#7c5cff;color:#fff;border:0;border-radius:8px;padding:7px 12px;font-size:12px;cursor:pointer;white-space:nowrap}#vlr-ai-panel button:hover{background:#9174ff}#vlr-ai-panel hr{border:0;border-top:1px solid #33406a;margin:8px 0}.vlr-ok{color:#6ee6a2;font-weight:600}.vlr-warn{color:#ffbf4d}.vlr-miss{color:#ff8888}#vlr-min{cursor:pointer;color:#9ba6cf;font-size:16px}#vlr-status{font-size:11px;color:#95a0c8;margin-top:6px;min-height:14px}#vlr-ai-fab{position:fixed;left:16px;bottom:16px;width:44px;height:44px;border-radius:50%;display:none;align-items:center;justify-content:center;background:#7c5cff;color:#fff;font-size:20px;cursor:pointer;z-index:2147483001;box-shadow:0 8px 22px rgba(0,0,0,.55)}';
      document.head.appendChild(st);
    }
    if(!document.getElementById('vlr-ai-panel')){
      var p=document.createElement('div'); p.id='vlr-ai-panel';
      p.innerHTML='<h4><span>🤖 ИИ панель</span><span id="vlr-min">—</span></h4><div id="vlr-ai-body">Откройте чат…</div>';
      document.body.appendChild(p);
      p.querySelector('#vlr-min').onclick=function(){ minimized=true; p.style.display='none'; var fab=document.getElementById('vlr-ai-fab'); if(fab){ fab.style.display='flex'; } };
    }
    if(!document.getElementById('vlr-ai-fab')){
      var fab=document.createElement('div'); fab.id='vlr-ai-fab'; fab.textContent='🤖'; fab.title='Открыть ИИ панель';
      fab.onclick=function(){ minimized=false; var p=document.getElementById('vlr-ai-panel'); if(p){ p.style.display=''; } fab.style.display='none'; };
      document.body.appendChild(fab);
    }
  }

  function derivePaid(stageOrder){
    var s=num(stageOrder), map={1:37,2:136,3:109,4:280,5:520}, sum=0, i=1;
    while(i<s){ if(map[i]){ sum += map[i]; } i += 1; }
    return sum;
  }

  async function tick(){
    if(!tok()){ return; }
    ensureUi();
    var panel=document.getElementById('vlr-ai-panel');
    var fab=document.getElementById('vlr-ai-fab');
    if(!panel){ return; }
    if(!fab){ return; }

    if(minimized){ panel.style.display='none'; fab.style.display='flex'; return; }
    panel.style.display=''; fab.style.display='none';

    if(!chatId){ panel.querySelector('#vlr-ai-body').innerHTML='<div style="color:#95a0c8">Откройте чат…</div>'; return; }

    var state=await get('/chat/'+chatId+'/state');
    if(!state){ return; }
    if(!state.data){ return; }
    var uid=num(state.data.user_id);
    if(uid<=0){ return; }

    var personasResp=await get('/personas?contour='+encodeURIComponent(contour));
    var cpResp=await get('/chat/'+chatId+'/persona?contour='+encodeURIComponent(contour));
    var cardResp=await get('/client-card/'+uid);

    var card={}, c={}, pay={}, docs=[];
    if(cardResp){ if(cardResp.data){ card=cardResp.data; } }
    if(card.client){ c=card.client; }
    if(card.payments){ pay=card.payments; }
    if(Array.isArray(card.documents)){ docs=card.documents; }

    var made=[]; if(Array.isArray(pay.made)){ made=pay.made; }
    var paid=0;
    if(made.length>0){ var i=0; while(i<made.length){ paid += num(made[i].amount); i += 1; } }
    else { paid = derivePaid(c.stage_order); }

    var docsUploaded=false;
    if(docs.length>0){ docsUploaded=true; }
    if(!docsUploaded){
      var dt=String(c.document_type==null?'':c.document_type).trim();
      var dn=String(c.document_number==null?'':c.document_number).trim();
      if(dt!==''){ if(dn!==''){ docsUploaded=true; } }
    }
    var docsCount=docs.length; if(docsCount<=0){ if(docsUploaded){ docsCount=1; } }
    var docsText = docsUploaded ? '<span class="vlr-ok">да ('+docsCount+')</span>' : '<span class="vlr-miss">нет</span>';

    var personas=[];
    if(personasResp){
      if(personasResp.data){
        if(Array.isArray(personasResp.data.personas)){ personas=personasResp.data.personas; }
        else { if(Array.isArray(personasResp.data)){ personas=personasResp.data; } }
      }
    }

    var cur=null;
    if(cpResp){ if(cpResp.data){ if(cpResp.data.persona){ cur=cpResp.data.persona; } } }

    var opts='', p=0;
    while(p<personas.length){
      var it=personas[p];
      var name = it.name ? it.name : 'Persona';
      var role = it.role ? it.role : '';
      var label = name + ' — ' + role;
      var sel='';
      if(cur){ if(Number(cur.id)===Number(it.id)){ sel=' selected'; } }
      opts += '<option value="'+it.id+'"'+sel+'>'+esc(label)+'</option>';
      p += 1;
    }

    var mode='human';
    if(state.data.ai_mode){ mode=String(state.data.ai_mode); }
    else { if(state.data.mode){ mode=String(state.data.mode); } }

    var cname = c.name ? c.name : '-';
    var cstage = c.stage ? c.stage : '?';
    var sorder = c.stage_order ? c.stage_order : '?';

    var html='';
    html += '<div class="vlr-row"><div class="vlr-k">Чат</div><div class="vlr-v">#'+chatId+'</div></div>';
    html += '<div class="vlr-row"><div class="vlr-k">Режим</div><div class="vlr-v">'+esc(mode)+'</div></div>';
    html += '<div class="vlr-row"><div class="vlr-k">Персона ИИ</div><div class="vlr-v"><select id="vlr-persona">'+opts+'</select></div><button id="vlr-save">Сохранить</button></div>';
    html += '<hr>';
    html += '<div class="vlr-row"><div class="vlr-k">Клиент</div><div class="vlr-v">'+esc(cname)+'</div></div>';
    html += '<div class="vlr-row"><div class="vlr-k">Этап</div><div class="vlr-v">'+esc(cstage)+' <span class="vlr-warn">(ур. '+esc(sorder)+')</span></div></div>';
    html += '<div class="vlr-row"><div class="vlr-k">Оплачено</div><div class="vlr-v"><span class="vlr-ok">€'+paid+'</span></div></div>';
    if(pay.next_stage){
      var nname = pay.next_stage.name ? pay.next_stage.name : '';
      var namount = pay.next_stage.amount ? pay.next_stage.amount : 0;
      html += '<div class="vlr-row"><div class="vlr-k">След. этап</div><div class="vlr-v">'+esc(nname)+' — €'+esc(namount)+'</div></div>';
    }
    html += '<div class="vlr-row"><div class="vlr-k">Документы</div><div class="vlr-v">'+docsText+'</div></div>';
    html += '<div id="vlr-status"></div>';

    panel.querySelector('#vlr-ai-body').innerHTML=html;
    var st=panel.querySelector('#vlr-status');
    var sel=panel.querySelector('#vlr-persona');
    var save=panel.querySelector('#vlr-save');

    save.onclick=async function(){
      var pid=num(sel.value);
      if(pid<=0){ st.textContent='Выберите персону'; st.className='vlr-miss'; return; }
      var r=await post('/chat/'+chatId+'/persona',{contour:contour,persona_id:pid});
      var ok=false;
      if(r){
        if(r.success===true){ ok=true; }
        else {
          if(r.data){ if(r.data.status==='ok'){ ok=true; } }
          else { if(r.status==='ok'){ ok=true; } }
        }
      }
      if(ok){
        st.textContent='Сохранено: персона #'+pid;
        st.className='vlr-ok';
        var cp2=await get('/chat/'+chatId+'/persona?contour='+encodeURIComponent(contour));
        if(cp2){ if(cp2.data){ if(cp2.data.persona){ st.textContent='Активна: '+(cp2.data.persona.name?cp2.data.persona.name:('#'+cp2.data.persona.id)); } } }
      } else {
        st.textContent='Ошибка сохранения';
        st.className='vlr-miss';
      }
    };
  }

  setInterval(function(){ tick().catch(function(){}); },1200);
})();
