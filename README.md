# Lehrgeld

Abrechnungs-App für freiberufliche Sprachlehrer:innen: Unterrichtsstunden und
Auslagen je Kunde erfassen und daraus monatliche Rechnungen als PDF erzeugen.

> **In English:** Lehrgeld is a local, single-user billing app for freelance
> language teachers. Track teaching hours and expenses per customer and generate
> monthly German-language invoices as PDFs. Rates are snapshotted at booking
> time, so changing a rate never alters existing bookings or invoices. Built
> with Next.js, SQLite (Drizzle ORM), and @react-pdf/renderer; runs entirely on
> your machine with no server or account required. The interface and invoices
> are in German. Setup instructions below are also in German.

## Funktionen

- **Einstellungen** — Name, Firmenname, Anschrift, E-Mail, Telefon, IBAN,
  Währung und Umsatzsteuer-Hinweis (z. B. § 19 UStG) der/des Freiberuflers
- **Kunden** — Name, Adressat, Anschrift, E-Mail
- **Einheiten** — Abrechnungseinheiten (Stunde, 45-Min-Einheit, km, …)
- **Leistungen** — Kurse und Auslagen je Kunde mit Satz pro Einheit
- **Buchungen** — Datum, Kunde, Leistung, Anzahl; Betrag wird automatisch
  berechnet. Abgerechnete Buchungen verweisen auf ihre Rechnung und sind
  schreibgeschützt
- **Rechnungen** — Monatsrechnung je Kunde aus den offenen Buchungen, mit
  fortlaufender Nummer pro Jahr (`2026-001`) und PDF-Download. Löschen einer
  Rechnung gibt die Buchungen wieder frei. Wer mitten im Jahr einsteigt, legt
  in den Einstellungen die **erste Rechnungsnummer** fest (z. B. `2026-015`);
  die Zählung setzt dort fort, andere Jahre beginnen weiter bei -001

**Satzänderungen** wirken nur auf künftige Buchungen: Jede Buchung speichert
den Satz zum Zeitpunkt der Erfassung, bestehende Buchungen und Rechnungen
bleiben unverändert.

## Technik

Next.js (App Router, TypeScript), SQLite (better-sqlite3) mit Drizzle ORM,
Tailwind CSS + shadcn/ui, PDF-Erzeugung mit @react-pdf/renderer.

## Voraussetzungen

### Betriebssystem

macOS, Linux und Windows werden unterstützt — der gesamte Software-Stack ist
plattformübergreifend.

Der Standard-Speicherort der Datenbank folgt der macOS-Konvention
(`~/Library/Application Support/Lehrgeld/`). Unter **Linux und Windows** läuft
die App genauso, würde die Datei aber unter einem Ordner `Library/Application
Support` im Home-Verzeichnis anlegen. Dort empfiehlt es sich, mit der
Umgebungsvariable `LEHRGELD_DB_PATH` einen passenden Pfad zu setzen (siehe
„Daten & Updates").

### Software

- **Node.js 20.9 oder neuer** — am besten eine aktuelle LTS-Linie (20.x oder
  22.x). `next` verlangt mindestens 20.9; `better-sqlite3` unterstützt die
  Major-Versionen 20, 22, 23, 24, 25 und 26 (die veraltete 21.x ist
  ausgenommen). Das mitgelieferte npm genügt zur Installation.
- **Ein moderner Webbrowser** (aktuelle Version von Chrome, Edge, Firefox oder
  Safari) zum Bedienen der App.
- **Kein Datenbankserver nötig** — SQLite ist in der Anwendung eingebettet.

### npm-Pakete

Sämtliche Abhängigkeiten sind in `package.json` deklariert und werden mit einem
einzigen `npm install` geholt (u. a. Next.js, React, Drizzle ORM,
better-sqlite3, @react-pdf/renderer, Tailwind CSS). Einzelne Pakete müssen
**nicht** von Hand installiert werden.

### Build-Werkzeuge (nur im Ausnahmefall)

`better-sqlite3` ist ein natives Modul. `npm install` lädt normalerweise ein
vorkompiliertes Binary für macOS (Intel & Apple Silicon), Linux (x64/arm64) und
Windows (x64). Nur wenn für Ihre Plattform-/Node-Kombination **kein** Binary
vorliegt, wird es aus dem Quellcode übersetzt — dann werden zusätzlich benötigt:

- **macOS:** Xcode Command Line Tools — `xcode-select --install`
- **Linux (Debian/Ubuntu):** `sudo apt install build-essential python3`
- **Windows:** „Visual Studio Build Tools" mit C++-Workload sowie Python 3

## Installation (Schritt für Schritt)

Diese Anleitung setzt keine Vorkenntnisse voraus. Sie brauchen dafür nur die
Projektdateien und eine Internetverbindung.

### 1. Node.js installieren

Node.js ist das Programm, mit dem die App läuft. Prüfen Sie zuerst, ob es schon
vorhanden ist: Öffnen Sie ein Terminal (macOS/Linux) bzw. die
Eingabeaufforderung (Windows) und geben Sie ein:

```bash
node --version
```

Erscheint eine Version **20.9 oder höher** (z. B. `v22.11.0`), ist alles bereit.
Andernfalls laden Sie Node.js von <https://nodejs.org> herunter — wählen Sie die
mit **„LTS"** gekennzeichnete Version — und folgen Sie dem
Installationsprogramm. npm wird dabei automatisch mitinstalliert.

### 2. Projektdateien besorgen

Sie benötigen den vollständigen Projektordner `Lehrgeld` — also genau den
Ordner, in dem auch diese `README.md` und die Datei `package.json` liegen.

- **Als ZIP-Archiv erhalten?** Entpacken Sie es an einen Ort Ihrer Wahl,
  z. B. nach `Dokumente/Lehrgeld`.
- **Aus einem Git-Repository?** `git clone <URL>` ausführen und in den neu
  erstellten Ordner wechseln.

Weitere Dateien müssen Sie **nicht** einzeln herunterladen — alles Übrige holt
Schritt 4 automatisch.

### 3. Terminal im Projektordner öffnen

Alle folgenden Befehle laufen **im Projektordner**, also im Ordner mit der
`package.json`. So gelangen Sie dorthin:

- **macOS:** Rechtsklick auf den Ordner `Lehrgeld` im Finder → „Neuer
  Terminal-Tab beim Ordner".
- **Windows:** Im Datei-Explorer in den Ordner `Lehrgeld` wechseln, in die
  Adressleiste `cmd` eingeben und Enter drücken.
- **Überall:** Terminal öffnen und mit `cd` in den Ordner wechseln, z. B.
  `cd "~/Dokumente/Lehrgeld"`.

Zur Kontrolle: `ls` (macOS/Linux) bzw. `dir` (Windows) muss unter anderem
`package.json` anzeigen. Nur dann sind Sie am richtigen Ort.

### 4. Abhängigkeiten installieren (einmalig)

```bash
npm install
```

Das lädt alle benötigten Pakete in den Unterordner `node_modules`. Der Vorgang
kann einige Minuten dauern und benötigt eine Internetverbindung. Er ist nur
beim ersten Mal und nach einem Update nötig.

### 5. App starten

```bash
npm run dev
```

Sobald im Terminal `Local: http://localhost:3000` erscheint, öffnen Sie im
Browser <http://localhost:3000>.

### 6. App beenden

Drücken Sie im Terminal `Strg + C` (macOS: `Ctrl + C`).

## Produktivbetrieb

Statt des Entwicklungsmodus (`npm run dev`) können Sie die App optimiert
ausführen:

```bash
npm run build   # nach jeder Code-Änderung einmalig ausführen
npm start       # startet die App auf http://localhost:3000
```

## Daten & Updates

Alle Daten liegen in einer einzigen SQLite-Datei **außerhalb** des
App-Ordners:

```
~/Library/Application Support/Lehrgeld/lehrgeld.db
```

Der Pfad kann mit der Umgebungsvariable `LEHRGELD_DB_PATH` überschrieben
werden. Backup = Datei kopieren.

**Neue Version einspielen:** App-Code ersetzen → `npm install` → App starten.
Schema-Änderungen liegen als versionierte Migrationen in `drizzle/` und werden
beim Start automatisch angewendet; vorher legt die App eine Sicherungskopie
`lehrgeld.db.backup-<Zeitstempel>` an. Die Daten bleiben dabei erhalten.
