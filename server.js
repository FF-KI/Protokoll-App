// ═══════════════════════════════════════════════════════════
//  Bau-Protokoll Manager – Backend
//  Node.js + Express + SQLite + Claude API
// ═══════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Claude-Client (optional – KI-Funktionen deaktiviert ohne Key)
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── DATENBANK ────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'protokoll.db'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS protocols (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titel         TEXT NOT NULL,
    bauherr       TEXT DEFAULT '',
    bauvorhaben   TEXT DEFAULT '',
    datum         TEXT DEFAULT '',
    ort           TEXT DEFAULT '',
    zeit          TEXT DEFAULT '',
    verfasser     TEXT DEFAULT '',
    kontakt       TEXT DEFAULT '',
    protokoll_nr  TEXT DEFAULT '',
    protokoll_typ TEXT DEFAULT 'Projekt-Jour-Fixe',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS participants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER NOT NULL,
    name        TEXT NOT NULL,
    kuerzel     TEXT DEFAULT '',
    typ         TEXT DEFAULT 'teilnehmer',
    FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS anlagen (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER NOT NULL,
    titel       TEXT NOT NULL,
    FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol_id INTEGER NOT NULL,
    num         TEXT NOT NULL,
    title       TEXT NOT NULL,
    sort_order  INTEGER DEFAULT 0,
    FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtopics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id   INTEGER NOT NULL,
    num        TEXT NOT NULL,
    title      TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subtopic_id INTEGER NOT NULL,
    datum       TEXT NOT NULL,
    beschreibung TEXT NOT NULL,
    typ         TEXT DEFAULT 'Aufgabe',
    zustaendig  TEXT DEFAULT '',
    status      TEXT DEFAULT 'Offen',
    faellig     TEXT DEFAULT '',
    is_new      INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
  );
`);

// ── BEISPIELDATEN ────────────────────────────────────────────
function seedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM protocols').get();
  if (count.c > 0) return;

  const p = db.prepare(`
    INSERT INTO protocols (titel, bauherr, bauvorhaben, datum, ort, zeit, verfasser, kontakt, protokoll_nr, protokoll_typ)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run('BH-JF 05','Müller & Partner GmbH','Neubau Bürogebäude Süd',
         '05.05.2025','TEAMS / Frankfurt','13:30 – 15:30 Uhr',
         'Hr. Schneider','s@buero.de','BH-JF 05','Projekt-Jour-Fixe');
  const pid = p.lastInsertRowid;

  const aP = db.prepare('INSERT INTO participants (protocol_id,name,kuerzel,typ) VALUES (?,?,?,?)');
  [['Hr. Hans','UT','teilnehmer'],['Hr. Meier','ZU','teilnehmer'],['Fr. Klein','AG','teilnehmer'],
   ['Hr. Sunne','AT','verteiler'],['Hr. Mogli','ZU','verteiler']].forEach(r => aP.run(pid,...r));

  const aA = db.prepare('INSERT INTO anlagen (protocol_id,titel) VALUES (?,?)');
  ['Anl01_','Anl02_'].forEach(a => aA.run(pid,a));

  const aT = db.prepare('INSERT INTO topics (protocol_id,num,title,sort_order) VALUES (?,?,?,?)');
  const aS = db.prepare('INSERT INTO subtopics (topic_id,num,title,sort_order) VALUES (?,?,?,?)');
  const aE = db.prepare('INSERT INTO entries (subtopic_id,datum,beschreibung,typ,zustaendig,status,faellig,is_new) VALUES (?,?,?,?,?,?,?,?)');

  const t1 = aT.run(pid,'1','Organisation, Allgemeines',1).lastInsertRowid;
  const s11 = aS.run(t1,'1.1','Besprechungstermine',1).lastInsertRowid;
  aE.run(s11,'13.04.25','Protokoll Nr. 03 wurde verteilt und freigegeben.','Info','Hr. Hans','Erledigt','',0);
  aE.run(s11,'28.04.25','Nächster Termin ist noch nicht bestätigt.','Aufgabe','Hr. Meier','Offen','2025-05-10',0);
  aE.run(s11,'05.05.25','Jour Fixe findet ab sofort alle 14 Tage statt.','Entscheidung','','Offen','',1);

  const s12 = aS.run(t1,'1.2','Projektbeteiligte',2).lastInsertRowid;
  aE.run(s12,'28.04.25','Projektbeteiligtenliste wurde noch nicht aktualisiert.','Aufgabe','Hr. Meier','Offen','2025-05-10',0);
  aE.run(s12,'05.05.25','Neuer TGA-Planer wurde bestimmt. Liste wird bis nächste Woche aktualisiert.','Aufgabe','Hr. Meier','Offen','2025-05-12',1);

  const s13 = aS.run(t1,'1.3','Datenraum',3).lastInsertRowid;
  aE.run(s13,'28.04.25','Zugriffsrechte für externe Planer sind noch ausstehend.','Aufgabe','Hr. Hans','Offen','2025-05-10',0);
  aE.run(s13,'05.05.25','Datenraum-Struktur wurde neu definiert und bis Ende der Woche umgesetzt.','Aufgabe','Fr. Klein','Offen','2025-05-09',1);

  const t2 = aT.run(pid,'2','Behörden, Ämter / Versorger',2).lastInsertRowid;
  const s21 = aS.run(t2,'2.1','Bauaufsicht (BAF)',1).lastInsertRowid;
  aE.run(s21,'13.04.25','Baugenehmigung ist noch nicht erteilt. Rückfragen ausstehend.','Aufgabe','Hr. Sunne','Offen','2025-05-15',0);
  aS.run(t2,'2.2','Stadtplanungsamt (SPA)',2);
  const s23 = aS.run(t2,'2.3','Nachbarn',3).lastInsertRowid;
  aE.run(s23,'05.05.25','Nachbarbeirat wurde informiert. Einspruchsfrist läuft bis 20.05.25.','Info','','Offen','',1);

  const t3 = aT.run(pid,'3','Architektur',3).lastInsertRowid;
  const s31 = aS.run(t3,'3.1','Fassade',1).lastInsertRowid;
  aE.run(s31,'28.04.25','Fassadenmuster wurden zur Freigabe vorgelegt.','Aufgabe','Hr. Mogli','Offen','2025-05-20',0);
  const s32 = aS.run(t3,'3.2','Innenausbau',2).lastInsertRowid;
  aE.run(s32,'28.04.25','Grundrisse EG und OG1 sind freigegeben.','Info','','Erledigt','',0);
  aE.run(s32,'05.05.25','Raumaufteilung OG2 muss überarbeitet werden – Abstimmung mit Nutzer erforderlich.','Aufgabe','Fr. Klein','Offen','2025-05-28',1);

  const t4 = aT.run(pid,'4','TGA',4).lastInsertRowid;
  const s41 = aS.run(t4,'4.1','Heizung / Lüftung',1).lastInsertRowid;
  aE.run(s41,'13.04.25','Lüftungskonzept wurde übergeben und ist in Prüfung.','Info','Hr. Hans','Offen','',0);
  aS.run(t4,'4.2','Elektro',2);

  console.log('  ✅ Beispieldaten angelegt');
}

seedData();

// ── HILFSFUNKTIONEN ──────────────────────────────────────────
function getFullProtocol(id) {
  const p = db.prepare('SELECT * FROM protocols WHERE id = ?').get(id);
  if (!p) return null;
  p.participants = db.prepare("SELECT * FROM participants WHERE protocol_id=? AND typ='teilnehmer'").all(id);
  p.verteiler    = db.prepare("SELECT * FROM participants WHERE protocol_id=? AND typ='verteiler'").all(id);
  p.anlagen      = db.prepare('SELECT * FROM anlagen WHERE protocol_id=?').all(id);
  p.topics = db.prepare('SELECT * FROM topics WHERE protocol_id=? ORDER BY sort_order,id').all(id).map(t => {
    t.subtopics = db.prepare('SELECT * FROM subtopics WHERE topic_id=? ORDER BY sort_order,id').all(t.id).map(s => {
      s.entries = db.prepare('SELECT * FROM entries WHERE subtopic_id=? ORDER BY created_at,id').all(s.id);
      return s;
    });
    return t;
  });
  return p;
}

function todayDE() {
  return new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
}

// ── PROTOKOLL-ROUTEN ─────────────────────────────────────────

app.get('/api/protocols', (_req, res) => {
  res.json(db.prepare('SELECT * FROM protocols ORDER BY created_at DESC').all());
});

app.post('/api/protocols', (req, res) => {
  const { titel, bauherr='', bauvorhaben='', datum='', ort='', zeit='', verfasser='', kontakt='', protokoll_nr='', protokoll_typ='Projekt-Jour-Fixe' } = req.body;
  if (!titel) return res.status(400).json({ error: 'Titel fehlt' });
  const r = db.prepare(`INSERT INTO protocols (titel,bauherr,bauvorhaben,datum,ort,zeit,verfasser,kontakt,protokoll_nr,protokoll_typ) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(titel,bauherr,bauvorhaben,datum,ort,zeit,verfasser,kontakt,protokoll_nr,protokoll_typ);
  res.json(getFullProtocol(r.lastInsertRowid));
});

app.get('/api/protocols/:id', (req, res) => {
  const p = getFullProtocol(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(p);
});

app.put('/api/protocols/:id', (req, res) => {
  const { bauherr,bauvorhaben,datum,ort,zeit,verfasser,kontakt,protokoll_nr,protokoll_typ } = req.body;
  db.prepare(`UPDATE protocols SET bauherr=?,bauvorhaben=?,datum=?,ort=?,zeit=?,verfasser=?,kontakt=?,protokoll_nr=?,protokoll_typ=? WHERE id=?`)
    .run(bauherr,bauvorhaben,datum,ort,zeit,verfasser,kontakt,protokoll_nr,protokoll_typ,req.params.id);
  res.json(getFullProtocol(req.params.id));
});

app.delete('/api/protocols/:id', (req, res) => {
  db.prepare('DELETE FROM protocols WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Teilnehmer + Verteiler (komplett ersetzen)
app.put('/api/protocols/:id/participants', (req, res) => {
  const { participants=[], verteiler=[] } = req.body;
  db.prepare('DELETE FROM participants WHERE protocol_id=?').run(req.params.id);
  const add = db.prepare('INSERT INTO participants (protocol_id,name,kuerzel,typ) VALUES (?,?,?,?)');
  participants.forEach(p => add.run(req.params.id, p.name, p.kuerzel||'', 'teilnehmer'));
  verteiler.forEach(p => add.run(req.params.id, p.name, p.kuerzel||'', 'verteiler'));
  res.json({ ok: true });
});

// Anlagen (komplett ersetzen)
app.put('/api/protocols/:id/anlagen', (req, res) => {
  const { anlagen=[] } = req.body;
  db.prepare('DELETE FROM anlagen WHERE protocol_id=?').run(req.params.id);
  const add = db.prepare('INSERT INTO anlagen (protocol_id,titel) VALUES (?,?)');
  anlagen.forEach(a => add.run(req.params.id, typeof a === 'string' ? a : a.titel));
  res.json({ ok: true });
});

// ── THEMA-ROUTEN ─────────────────────────────────────────────

app.post('/api/protocols/:id/topics', (req, res) => {
  const { title } = req.body;
  const cnt = db.prepare('SELECT COUNT(*) as c FROM topics WHERE protocol_id=?').get(req.params.id);
  const num = String(cnt.c + 1);
  const r = db.prepare('INSERT INTO topics (protocol_id,num,title,sort_order) VALUES (?,?,?,?)')
    .run(req.params.id, num, title, cnt.c + 1);
  const t = db.prepare('SELECT * FROM topics WHERE id=?').get(r.lastInsertRowid);
  t.subtopics = [];
  res.json(t);
});

app.put('/api/topics/:id', (req, res) => {
  const { title } = req.body;
  db.prepare('UPDATE topics SET title=? WHERE id=?').run(title, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/topics/:id', (req, res) => {
  db.prepare('DELETE FROM topics WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── UNTERTHEMA-ROUTEN ────────────────────────────────────────

app.post('/api/topics/:id/subtopics', (req, res) => {
  const { title } = req.body;
  const topic = db.prepare('SELECT * FROM topics WHERE id=?').get(req.params.id);
  const cnt = db.prepare('SELECT COUNT(*) as c FROM subtopics WHERE topic_id=?').get(req.params.id);
  const num = `${topic.num}.${cnt.c + 1}`;
  const r = db.prepare('INSERT INTO subtopics (topic_id,num,title,sort_order) VALUES (?,?,?,?)')
    .run(req.params.id, num, title, cnt.c + 1);
  const s = db.prepare('SELECT * FROM subtopics WHERE id=?').get(r.lastInsertRowid);
  s.entries = [];
  res.json(s);
});

app.delete('/api/subtopics/:id', (req, res) => {
  db.prepare('DELETE FROM subtopics WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── EINTRAGS-ROUTEN ──────────────────────────────────────────

app.post('/api/subtopics/:id/entries', (req, res) => {
  const { beschreibung, typ='Aufgabe', zustaendig='', status='Offen', faellig='', is_new=0 } = req.body;
  const r = db.prepare(`INSERT INTO entries (subtopic_id,datum,beschreibung,typ,zustaendig,status,faellig,is_new) VALUES (?,?,?,?,?,?,?,?)`)
    .run(req.params.id, todayDE(), beschreibung, typ, zustaendig, status, faellig||'', is_new?1:0);
  res.json(db.prepare('SELECT * FROM entries WHERE id=?').get(r.lastInsertRowid));
});

app.put('/api/entries/:id', (req, res) => {
  const { beschreibung, typ, zustaendig, status, faellig, is_new } = req.body;
  db.prepare(`UPDATE entries SET beschreibung=?,typ=?,zustaendig=?,status=?,faellig=?,is_new=? WHERE id=?`)
    .run(beschreibung, typ, zustaendig||'', status, faellig||'', is_new?1:0, req.params.id);
  res.json(db.prepare('SELECT * FROM entries WHERE id=?').get(req.params.id));
});

app.delete('/api/entries/:id', (req, res) => {
  db.prepare('DELETE FROM entries WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── KI-ROUTEN ────────────────────────────────────────────────

// Transkript → Claude → strukturierte Vorschläge
app.post('/api/ki/strukturieren', async (req, res) => {
  if (!anthropic) return res.status(503).json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert. Bitte in .env eintragen.' });

  const { protokoll_id, transkript } = req.body;
  if (!transkript?.trim()) return res.status(400).json({ error: 'Kein Transkript vorhanden' });

  const p = getFullProtocol(protokoll_id);
  if (!p) return res.status(404).json({ error: 'Protokoll nicht gefunden' });

  const struktur = p.topics.map(t => ({
    num: t.num, title: t.title,
    subtopics: t.subtopics.map(s => ({ num: s.num, title: s.title }))
  }));

  const systemPrompt = `Du bist ein erfahrener Bau-Projektleiter und Protokollant in Deutschland.
Du analysierst Transkripte von Baubesprechungen und erstellst präzise, professionelle Protokolleinträge auf Deutsch.
WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Array ohne Markdown-Formatierung.`;

  const userPrompt = `Analysiere das Transkript dieser Baubesprechung und erstelle Protokolleinträge.

BESTEHENDE THEMENSTRUKTUR:
${JSON.stringify(struktur, null, 2)}

TRANSKRIPT:
${transkript}

Erstelle JSON-Array. Format jedes Eintrags:
{
  "thema": "Exakter Titel aus Struktur ODER neuer Titel",
  "thema_num": "Nummer z.B. '1' oder 'NEU'",
  "unterthema": "Unterthema-Titel",
  "unterthema_num": "Nummer z.B. '1.1' oder 'NEU'",
  "beschreibung": "Professionell ausformulierter Protokolltext, vollständig und klar",
  "typ": "Aufgabe|Info|Entscheidung",
  "zustaendig": "Name der Person oder leer",
  "status": "Offen|Erledigt|ASAP",
  "faellig": "YYYY-MM-DD oder leer",
  "ist_neues_thema": false,
  "ist_neues_unterthema": false
}

Regeln:
- Ordne Punkten ZUERST bestehenden Themen zu (exakter Titel-Match priorisieren)
- Typ 'Aufgabe': etwas muss getan werden | 'Info': reine Information | 'Entscheidung': Entscheidung gefallen
- Formuliere jeden Punkt vollständig und eigenständig verständlich
- Erkenne Fälligkeitsdaten und Zuständigkeiten aus dem Kontext`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    let text = response.content[0].text.trim();
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const suggestions = JSON.parse(text);
    res.json({ suggestions, struktur });
  } catch (err) {
    console.error('Claude-Fehler:', err.message);
    res.status(500).json({ error: 'KI-Verarbeitung fehlgeschlagen: ' + err.message });
  }
});

// Akzeptierte Vorschläge in DB speichern
app.post('/api/ki/uebernehmen', (req, res) => {
  const { protokoll_id, accepted } = req.body;
  if (!accepted?.length) return res.json(getFullProtocol(protokoll_id));

  // Frisches Protokoll laden für korrekte Zuordnung
  let p = getFullProtocol(protokoll_id);

  const addTopic = db.prepare('INSERT INTO topics (protocol_id,num,title,sort_order) VALUES (?,?,?,?)');
  const addSub   = db.prepare('INSERT INTO subtopics (topic_id,num,title,sort_order) VALUES (?,?,?,?)');
  const addEntry = db.prepare(`INSERT INTO entries (subtopic_id,datum,beschreibung,typ,zustaendig,status,faellig,is_new) VALUES (?,?,?,?,?,?,?,1)`);

  for (const s of accepted) {
    // Thema suchen oder anlegen
    let topic = p.topics.find(t =>
      t.title.toLowerCase() === s.thema.toLowerCase() ||
      t.num === s.thema_num
    );
    if (!topic) {
      const cnt = db.prepare('SELECT COUNT(*) as c FROM topics WHERE protocol_id=?').get(protokoll_id);
      const num = s.thema_num !== 'NEU' ? s.thema_num : String(cnt.c + 1);
      const tid = addTopic.run(protokoll_id, num, s.thema, cnt.c + 1).lastInsertRowid;
      topic = db.prepare('SELECT * FROM topics WHERE id=?').get(tid);
      topic.subtopics = [];
      p.topics.push(topic);
    }

    // Unterthema suchen oder anlegen
    let sub = topic.subtopics.find(st =>
      st.title.toLowerCase() === s.unterthema.toLowerCase() ||
      st.num === s.unterthema_num
    );
    if (!sub) {
      const cnt = db.prepare('SELECT COUNT(*) as c FROM subtopics WHERE topic_id=?').get(topic.id);
      const num = s.unterthema_num !== 'NEU' ? s.unterthema_num : `${topic.num}.${cnt.c + 1}`;
      const sid = addSub.run(topic.id, num, s.unterthema, cnt.c + 1).lastInsertRowid;
      sub = db.prepare('SELECT * FROM subtopics WHERE id=?').get(sid);
      sub.entries = [];
      topic.subtopics.push(sub);
    }

    addEntry.run(sub.id, todayDE(), s.beschreibung, s.typ||'Aufgabe', s.zustaendig||'', s.status||'Offen', s.faellig||'');
  }

  res.json(getFullProtocol(protokoll_id));
});

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🏗️  Bau-Protokoll Manager');
  console.log('─────────────────────────────────────────');
  console.log(`✅  Server: http://localhost:${PORT}`);
  console.log(`💾  Datenbank: protokoll.db (SQLite)`);
  if (anthropic) {
    console.log(`🤖  Claude: verbunden (claude-sonnet-4-6)`);
  } else {
    console.log(`⚠️   Claude: ANTHROPIC_API_KEY fehlt – KI deaktiviert`);
    console.log(`    → .env Datei anlegen und API-Key eintragen`);
  }
  console.log('─────────────────────────────────────────\n');
});
