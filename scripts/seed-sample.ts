/**
 * Seed the FDPIC database with sample decisions and guidelines for testing.
 *
 * Includes real FDPIC decisions (Google Street View, Helsana, Moneyhouse)
 * and representative guidance documents so MCP tools can be tested without
 * running a full data ingestion pipeline.
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force   # drop and recreate
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["FDPIC_DB_PATH"] ?? "data/fdpic.db";
const force = process.argv.includes("--force");

// --- Bootstrap database ------------------------------------------------------

const dir = dirname(DB_PATH);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted existing database at ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);

console.log(`Database initialised at ${DB_PATH}`);

// --- Topics ------------------------------------------------------------------

interface TopicRow {
  id: string;
  name_de: string;
  name_en: string;
  description: string;
}

const topics: TopicRow[] = [
  {
    id: "cloud_computing",
    name_de: "Cloud Computing",
    name_en: "Cloud computing",
    description: "Auslagerung von Datenverarbeitung an Cloud-Anbieter; Anforderungen an Auftragsbearbeitung und Datensicherheit.",
  },
  {
    id: "videoüberwachung",
    name_de: "Videoüberwachung",
    name_en: "Video surveillance",
    description: "Kameraüberwachung durch Private und Behörden; Verhältnismäßigkeit und Informationspflichten.",
  },
  {
    id: "gesundheitsdaten",
    name_de: "Gesundheitsdaten",
    name_en: "Health data",
    description: "Verarbeitung besonders schützenswerter Personendaten im Gesundheitsbereich (Art. 5 DSG).",
  },
  {
    id: "grenzüberschreitende_datenbekanntgabe",
    name_de: "Grenzüberschreitende Datenbekanntgabe",
    name_en: "Cross-border data transfers",
    description: "Bekanntgabe von Personendaten ins Ausland; Anforderungen des DSG an Empfängerländer und Schutzklauseln.",
  },
  {
    id: "einwilligung",
    name_de: "Einwilligung",
    name_en: "Consent",
    description: "Freiwillige, informierte und ausdrückliche Einwilligung als Rechtfertigungsgrund.",
  },
  {
    id: "auskunftsrecht",
    name_de: "Auskunftsrecht",
    name_en: "Right of access",
    description: "Recht auf Auskunft über verarbeitete Personendaten (Art. 25 nDSG).",
  },
  {
    id: "datenschutz_folgenabschaetzung",
    name_de: "Datenschutz-Folgenabschätzung",
    name_en: "Data Protection Impact Assessment",
    description: "Pflicht zur Datenschutz-Folgenabschätzung bei voraussichtlich hohem Risiko (Art. 22 nDSG).",
  },
  {
    id: "neues_dsg",
    name_de: "Neues Datenschutzgesetz (nDSG)",
    name_en: "New Swiss Data Protection Act",
    description: "Totalrevision des Datenschutzgesetzes, in Kraft seit 1. September 2023.",
  },
  {
    id: "auftragsbearbeitung",
    name_de: "Auftragsbearbeitung",
    name_en: "Data processing on behalf",
    description: "Beauftragung von Dritten mit der Verarbeitung von Personendaten (Art. 9 nDSG).",
  },
];

const insertTopic = db.prepare(
  "INSERT OR IGNORE INTO topics (id, name_de, name_en, description) VALUES (?, ?, ?, ?)",
);

for (const t of topics) {
  insertTopic.run(t.id, t.name_de, t.name_en, t.description);
}

console.log(`Inserted ${topics.length} topics`);

// --- Decisions ---------------------------------------------------------------

interface DecisionRow {
  reference: string;
  title: string;
  date: string;
  type: string;
  entity_name: string;
  fine_amount: number | null;
  summary: string;
  full_text: string;
  topics: string;
  dsg_articles: string;
  status: string;
}

const decisions: DecisionRow[] = [
  // Google Street View — landmark FDPIC case
  {
    reference: "EDÖB-2009-GSV-001",
    title: "Sachverhaltsdarstellung — Google LLC (Street View)",
    date: "2009-09-08",
    type: "sachverhaltsdarstellung",
    entity_name: "Google LLC",
    fine_amount: null,
    summary:
      "Der EDÖB (heute FDPIC) leitete ein Sachverhaltsdarstellungsverfahren gegen Google wegen des Street View-Dienstes ein. Kritisiert wurden die unzureichende Anonymisierung von Gesichtern und Fahrzeugkennzeichen sowie das Erfassen von WLAN-Daten. Das Bundesverwaltungsgericht bestätigte mehrere Empfehlungen des EDÖB.",
    full_text:
      "Der Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte (EDÖB) hat im Jahr 2009 ein Verfahren zur Sachverhaltsdarstellung gegen Google Switzerland GmbH eingeleitet, das den Street View-Dienst von Google betraf. Im Rahmen seiner Inspektionen in der Schweiz erfasst Google Straßenpanoramen mittels speziell ausgerüsteter Fahrzeuge. Dabei werden Personenbilder und Fahrzeugkennzeichen aufgezeichnet. Der EDÖB stellte folgende Probleme fest: (1) Unzureichende Anonymisierung — die Gesichter von Personen und die Fahrzeugkennzeichen wurden nicht zuverlässig genug unkenntlich gemacht; erkennbare Personen konnten mit bestimmten Orten (Arbeitgeber, Arztpraxen, Nachtclubs) in Verbindung gebracht werden; (2) Erfassung von WLAN-Daten — die Street View-Fahrzeuge erfassten zusätzlich WLAN-Netzwerkdaten (SSIDs, MAC-Adressen und Nutzdaten), was das EDÖB als datenschutzrechtlich problematisch einstufte; (3) Fehlende Informationspflicht — Google hatte die betroffenen Personen nicht ausreichend über die Datenerhebung informiert. Das Bundesverwaltungsgericht hiess die Beschwerde des EDÖB teilweise gut und bestätigte, dass Google verpflichtet ist, vor Begehungsfahrten die Routen zu veröffentlichen und die Speicherdauer von Rohdaten zu begrenzen.",
    topics: JSON.stringify(["videoüberwachung", "grenzüberschreitende_datenbekanntgabe"]),
    dsg_articles: JSON.stringify(["4", "7", "12"]),
    status: "final",
  },
  // Helsana health data
  {
    reference: "EDÖB-2014-HELS-001",
    title: "Sachverhaltsdarstellung — Helsana Versicherungen AG (Gesundheitsdaten)",
    date: "2014-05-20",
    type: "sachverhaltsdarstellung",
    entity_name: "Helsana Versicherungen AG",
    fine_amount: null,
    summary:
      "Der EDÖB untersuchte die Weitergabe von Gesundheitsdaten durch Helsana an verbundene Gesellschaften und an Rückversicherer. Der EDÖB stellte fest, dass die Weitergabe besonders schützenswerter Personendaten (Gesundheitsdaten) an verbundene Gesellschaften ohne ausreichende Rechtsgrundlage und ohne ausdrückliche Einwilligung der Versicherten erfolgte.",
    full_text:
      "Der Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte hat ein Verfahren gegen Helsana Versicherungen AG eingeleitet, nachdem Hinweise auf eine datenschutzwidrige Weitergabe von Versichertendaten eingegangen waren. Helsana gibt Gesundheitsdaten von Versicherten an verbundene Gesellschaften (Helsana-Gruppe) und an Rückversicherer weiter. Der EDÖB untersuchte insbesondere: (1) Weitergabe an verbundene Gesellschaften — Helsana gibt Daten über Versicherungsleistungen und Gesundheitszustand an andere Gesellschaften der Helsana-Gruppe weiter, die nicht alle einer gesetzlichen Datenweitergabepflicht unterliegen; ohne ausdrückliche Einwilligung der Versicherten ist dies bei besonders schützenswerten Daten (Gesundheitsdaten) grundsätzlich unzulässig; (2) Weitergabe an Rückversicherer — die Weitergabe von Einzeldaten an Rückversicherer ist nur in dem Umfang zulässig, wie dies für die Rückversicherung tatsächlich erforderlich ist; aggregierte, nicht personenbezogene Daten sollten vorgezogen werden; (3) Informationspflicht — Versicherte müssen klar und verständlich über die Empfänger ihrer Daten informiert werden. Der EDÖB empfahl Helsana, die Datenweitergabe auf das Notwendige zu beschränken und eine ausdrückliche Einwilligung für die Weitergabe besonders schützenswerter Daten einzuholen.",
    topics: JSON.stringify(["gesundheitsdaten", "einwilligung"]),
    dsg_articles: JSON.stringify(["3", "7", "12"]),
    status: "final",
  },
  // Moneyhouse — public personal data
  {
    reference: "EDÖB-2016-MH-001",
    title: "Sachverhaltsdarstellung — Moneyhouse AG (Profilbildung aus öffentlichen Quellen)",
    date: "2016-08-29",
    type: "sachverhaltsdarstellung",
    entity_name: "Moneyhouse AG",
    fine_amount: null,
    summary:
      "Der EDÖB untersuchte Moneyhouse, ein Onlineverzeichnis, das Personendaten aus öffentlich zugänglichen Quellen (Handelsregister, Betreibungsregister, Telefonverzeichnisse) aggregiert und als detaillierte Personenprofile anbietet. Der EDÖB empfahl Moneyhouse, Betreibungsdaten nicht ohne Einwilligung der betroffenen Personen zu veröffentlichen.",
    full_text:
      "Der Eidgenössische Datenschutz- und Öffentlichkeitsbeauftragte hat ein Verfahren gegen Moneyhouse AG eingeleitet. Moneyhouse betreibt ein Onlineverzeichnis, das Personendaten aus verschiedenen öffentlich zugänglichen Quellen zusammenführt und als Personenprofile aufbereitet anbietet. Die Daten stammen aus dem Handelsregister, dem Amtsblatt, Telefonverzeichnissen und weiteren öffentlichen Quellen. Besonders problematisch war die Veröffentlichung von Betreibungsdaten: Das Betreibungsregister ist grundsätzlich öffentlich zugänglich, jedoch nur für Personen mit einem schutzwürdigen Interesse. Durch die Integration von Betreibungsdaten in öffentlich zugängliche Personenprofile wurde diese Beschränkung faktisch umgangen. Der EDÖB stellte fest: (1) Die Aggregation von Daten aus verschiedenen Quellen zu umfassenden Personenprofilen geht über den ursprünglichen Zweck der einzelnen Datenerhebungen hinaus und erfordert eine eigenständige Rechtfertigung; (2) Die Veröffentlichung von Betreibungsdaten ohne Einwilligung der betroffenen Personen verletzt das Datenschutzgesetz, da Betreibungsdaten besonders sensibel sind und die wirtschaftliche Existenz einer Person beeinflussen können; (3) Das Recht auf Löschung muss wirksam und ohne unverhältnismäßige Hindernisse ausgeübt werden können.",
    topics: JSON.stringify(["auskunftsrecht", "einwilligung"]),
    dsg_articles: JSON.stringify(["3", "4", "5", "12"]),
    status: "final",
  },
];

const insertDecision = db.prepare(`
  INSERT OR IGNORE INTO decisions
    (reference, title, date, type, entity_name, fine_amount, summary, full_text, topics, dsg_articles, status)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertDecisionsAll = db.transaction(() => {
  for (const d of decisions) {
    insertDecision.run(
      d.reference,
      d.title,
      d.date,
      d.type,
      d.entity_name,
      d.fine_amount,
      d.summary,
      d.full_text,
      d.topics,
      d.dsg_articles,
      d.status,
    );
  }
});

insertDecisionsAll();
console.log(`Inserted ${decisions.length} decisions`);

// --- Guidelines --------------------------------------------------------------

interface GuidelineRow {
  reference: string | null;
  title: string;
  date: string;
  type: string;
  summary: string;
  full_text: string;
  topics: string;
  language: string;
}

const guidelines: GuidelineRow[] = [
  {
    reference: "FDPIC-LEITFADEN-CLOUD-2021",
    title: "Leitfaden Cloud Computing",
    date: "2021-01-01",
    type: "leitfaden",
    summary:
      "Leitfaden des FDPIC zu den datenschutzrechtlichen Anforderungen bei der Nutzung von Cloud-Diensten. Behandelt die Klassifizierung von Cloud-Diensten, Anforderungen an Auftragsbearbeiterverträge, Risikoanalyse und grenzüberschreitende Datenbekanntgabe an Cloud-Anbieter außerhalb der Schweiz.",
    full_text:
      "Dieser Leitfaden des Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten erläutert die datenschutzrechtlichen Anforderungen bei der Nutzung von Cloud Computing-Diensten. Cloud-Dienste werden nach Servicemodell (IaaS, PaaS, SaaS) und Bereitstellungsmodell (Public, Private, Community, Hybrid Cloud) klassifiziert; das Datenschutzrecht gilt unabhängig von der gewählten Kombination. Auftragsbearbeitung: Wenn ein Cloud-Anbieter Personendaten im Auftrag des Verantwortlichen verarbeitet, muss ein schriftlicher Auftragsbearbeitervertrag abgeschlossen werden. Dieser muss insbesondere enthalten: Zweck und Dauer der Verarbeitung, Art der verarbeiteten Daten, Sicherheitsmaßnahmen und Unterbeauftragungsregelungen. Grenzüberschreitende Datenbekanntgabe: Bei Cloud-Anbietern mit Servern außerhalb der Schweiz ist zu prüfen, ob das Empfängerland ein angemessenes Datenschutzniveau bietet. Der Bundesrat führt eine Liste der Länder, die als angemessen eingestuft werden. Für andere Länder sind geeignete Garantien erforderlich (Standardvertragsklauseln, verbindliche Unternehmensregeln). US-Cloud-Anbieter: Beim Einsatz von US-Cloud-Anbietern besteht das Risiko eines Zugriffs durch US-Behörden (FISA 702, Cloud Act). Dieses Risiko muss im Rahmen der Risikoanalyse berücksichtigt und gegebenenfalls durch Verschlüsselung oder andere Maßnahmen minimiert werden.",
    topics: JSON.stringify(["cloud_computing", "grenzüberschreitende_datenbekanntgabe", "auftragsbearbeitung"]),
    language: "de",
  },
  {
    reference: "FDPIC-ERLÄUTERUNG-NDSG-2023",
    title: "Erläuterungen zum neuen Datenschutzgesetz (nDSG)",
    date: "2023-08-01",
    type: "erläuterung",
    summary:
      "Umfassende Erläuterungen des FDPIC zum revidierten Schweizer Datenschutzgesetz (nDSG), das am 1. September 2023 in Kraft getreten ist. Behandelt die wichtigsten Neuerungen gegenüber dem alten DSG, insbesondere Datenschutz-Folgenabschätzungen, Privacy by Design, Meldepflichten bei Datenschutzverletzungen und neue Informationspflichten.",
    full_text:
      "Das totalrevidierte Datenschutzgesetz (nDSG) ist am 1. September 2023 in Kraft getreten und löst das Datenschutzgesetz von 1992 ab. Diese Erläuterungen des FDPIC fassen die wichtigsten Neuerungen zusammen. Wichtigste Neuerungen: (1) Datenschutz-Folgenabschätzung (Art. 22 nDSG) — Neu eingeführte Pflicht für Verantwortliche, wenn eine geplante Bearbeitung voraussichtlich ein hohes Risiko für die Persönlichkeit oder Grundrechte der betroffenen Person mit sich bringt; der FDPIC hat eine Liste von Bearbeitungen veröffentlicht, bei denen eine DSFA zwingend ist; (2) Privacy by Design und Privacy by Default (Art. 7 nDSG) — Technische und organisatorische Maßnahmen müssen bereits bei der Konzeption der Bearbeitung getroffen werden; standardmäßig dürfen nur diejenigen Personendaten bearbeitet werden, die für den jeweiligen Verwendungszweck notwendig sind; (3) Meldepflicht bei Datenschutzverletzungen (Art. 24 nDSG) — Bei Verletzungen der Datensicherheit, die voraussichtlich zu einem hohen Risiko für die Betroffenen führen, muss der FDPIC so rasch wie möglich informiert werden; (4) Informationspflichten (Art. 19 nDSG) — Ausgeweitete Informationspflichten bei der Beschaffung von Personendaten, insbesondere die Pflicht, über die Bearbeitung zu automatisierten Einzelentscheidungen zu informieren; (5) Ausweitung auf juristische Personen — Das nDSG schützt nun auch juristische Personen (soweit sie Personendaten betreffen).",
    topics: JSON.stringify(["neues_dsg", "datenschutz_folgenabschaetzung", "einwilligung"]),
    language: "de",
  },
  {
    reference: "FDPIC-LEITFADEN-VIDEO-2015",
    title: "Videoüberwachung durch Private — Leitfaden des FDPIC",
    date: "2015-06-01",
    type: "leitfaden",
    summary:
      "Leitfaden des FDPIC zur Videoüberwachung durch Private. Behandelt zulässige Zwecke, Verhältnismäßigkeit, Informationspflichten, Bearbeitungsreglement und besondere Anforderungen bei Aufzeichnungen.",
    full_text:
      "Dieser Leitfaden des Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten richtet sich an Private (natürliche Personen, Unternehmen, Vereine), die Videoüberwachungsanlagen betreiben oder deren Einsatz planen. Zulässige Zwecke und Verhältnismäßigkeit: Eine Videoüberwachung ist nur zulässig, wenn sie einem legitimen Zweck dient (Sicherheit, Vermögensschutz, Beweissicherung) und verhältnismäßig ist. Die Verhältnismäßigkeit erfordert eine Prüfung, ob mildere Mittel denselben Zweck erfüllen könnten. Informationspflicht: Personen, die in einem videoüberwachten Bereich sind, müssen darüber informiert werden. Dies erfolgt durch sichtbar angebrachte Hinweisschilder, die den Betreiber der Anlage nennen. Bearbeitungsreglement: Bei umfangreichen Videoüberwachungsanlagen ist ein Bearbeitungsreglement zu erstellen, das Zweck, Standorte, Berechtigungen, Speicherdauer und Verfahren bei Datenpannen regelt. Speicherdauer: Aufzeichnungen sollten grundsätzlich nicht länger als 72 Stunden aufbewahrt werden, sofern kein konkreter Anlassfall eine längere Aufbewahrung erfordert. Arbeitnehmerüberwachung: Die Videoüberwachung am Arbeitsplatz ist besonders restriktiv: Sie darf nicht primär der Leistungs- und Verhaltenskontrolle dienen.",
    topics: JSON.stringify(["videoüberwachung"]),
    language: "de",
  },
];

const insertGuideline = db.prepare(`
  INSERT INTO guidelines (reference, title, date, type, summary, full_text, topics, language)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertGuidelinesAll = db.transaction(() => {
  for (const g of guidelines) {
    insertGuideline.run(
      g.reference,
      g.title,
      g.date,
      g.type,
      g.summary,
      g.full_text,
      g.topics,
      g.language,
    );
  }
});

insertGuidelinesAll();
console.log(`Inserted ${guidelines.length} guidelines`);

// --- Summary -----------------------------------------------------------------

const decisionCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions").get() as { cnt: number }
).cnt;
const guidelineCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines").get() as { cnt: number }
).cnt;
const topicCount = (
  db.prepare("SELECT count(*) as cnt FROM topics").get() as { cnt: number }
).cnt;
const decisionFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM decisions_fts").get() as { cnt: number }
).cnt;
const guidelineFtsCount = (
  db.prepare("SELECT count(*) as cnt FROM guidelines_fts").get() as { cnt: number }
).cnt;

console.log(`\nDatabase summary:`);
console.log(`  Topics:         ${topicCount}`);
console.log(`  Decisions:      ${decisionCount} (FTS entries: ${decisionFtsCount})`);
console.log(`  Guidelines:     ${guidelineCount} (FTS entries: ${guidelineFtsCount})`);
console.log(`\nDone. Database ready at ${DB_PATH}`);

db.close();
