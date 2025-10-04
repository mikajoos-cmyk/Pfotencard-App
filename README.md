# PfotenCard - Hundeschule Verwaltungssystem

Eine vollständige Web-Anwendung für die Verwaltung einer Hundeschule mit Wertkartensystem, Level-Progression und Transaktionsverwaltung.

## 🚀 Features

### Authentifizierung & Rollen
- **Sichere Anmeldung/Registrierung** 
- **Rollenbasierte Zugriffskontrolle** (Admin, Mitarbeiter, Kunde)
- **Automatische Weiterleitung** basierend auf Benutzerrolle

### Kundenverwaltung
- **Vollständige Kundenprofile** mit Hunde-Informationen
- **Alphabet-Filter und Suchfunktion** für schnelle Navigation
- **Level-System** mit 5 Stufen plus Experten-Status
- **VIP-Status** 
- **QR-Code Generation** für jeden Kunden

### Transaktionssystem
- **Flexible Transaktionsbuchung** für verschiedene Services
- **Automatische Guthaben-Verwaltung** mit Bonus-System
- **Auflade-Boni** gestaffelt nach Betrag
- **Vollständige Transaktionshistorie**

### Level-System & Fortschritt
- **5 Trainings-Level** von Welpen bis Hundeführerschein
- **Anforderungs-Tracking** mit Gate-Logik
- **Automatische Fortschrittsberechnung**
- **Prüfungsstunden-Zählung** erst nach Erfüllung aller anderen Anforderungen
- **Experten-Beförderung** für Level 5+ Absolventen

### Reporting & Analytics
- **Umsatz-Berichte** (monatlich, jährlich, gesamt)
- **Kunden-Statistiken** und Aktivitäts-Tracking

### Sicherheit
- **Row Level Security (RLS)** auf Datenbankebene
- **Rollenbasierte Datentrennung**

## 🛠 Tech Stack
?????


## 📋 Voraussetzungen (Nur Browser-Accounts)

- **GitHub Account** (kostenlos auf github.com)
- **Supabase Account** (kostenlos auf supabase.com)
- **Vercel Account** (kostenlos auf vercel.com)
- **Moderner Webbrowser** (Chrome, Firefox, Safari, Edge)
- **Keine lokale Software** oder CLI-Tools erforderlich!

## 🚀 Setup-Anleitung (Nur Browser - Kein lokaler PC erforderlich!)



## 🌐 Updates und Wartung (Nur Browser)


## 📱 Benutzerrollen

### Admin
- **Vollzugriff** auf alle Funktionen
- **Benutzerverwaltung** (Mitarbeiter/Admin erstellen)
- **VIP-Status** verwalten
- **Level freischalten** und Experten-Beförderung
- **Alle Berichte** und Statistiken

### Mitarbeiter  
- **Kundenverwaltung** (eigene Datensätze anzeigen, bearbeiten)
- **Transaktionen buchen** und verwalten
- **Level freischalten** (wenn Anforderungen erfüllt)
- **Berichte** anzeigen (eigene Datensätze)
- **Keine Benutzerverwaltung**

### Kunde
- **Eigenes Profil** (eigene Datensätze anzeigen und bearbeiten)
- **Eigene Transaktionen** einsehen
- **Level-Fortschritt** verfolgen
- **QR-Code** für schnellen Zugriff
- **Kein Zugriff** auf andere Kunden oder Verwaltung

## 🔒 Sicherheitsfeatures

### Row Level Security (RLS)
- Kunden sehen nur ihre eigenen Daten
- Mitarbeiter/Admin haben Zugriff auf eigene Datensätze, Kundendaten
- Transaktionen können nur von Staff gebucht werden
- Admin-Funktionen sind geschützt

### Datenschutz


## 📊 Datenmodell

### Haupttabellen
- `profiles` - Benutzerprofile mit Rollen
- `customers` - Kundendaten mit Level und VIP-Status
- `transactions` - Alle Transaktionen mit Metadaten
- `requirements` - Anforderungen für Level-Progression
- `documents` - Kundendokumente (optional)

### Views
- `customer_balances` - Aktuelle Guthaben-Übersicht
- `customer_progress` - Level-Fortschritt pro Kunde
- `active_customers` - Aktive Kunden mit Statistiken
- `monthly_stats` - Monatliche Geschäftsstatistiken



## 🎯 Level-System

### Level 1 - Welpen
- Keine Voraussetzungen
- Einstiegslevel für neue Kunden

### Level 2 - Grundlagen  
- 6x Gruppenstunde  
- erst wenn 6x Gruppenstunde erfüllt sind, dann 1x Prüfung
- Level freischalten** (wenn alle Anforderungen erfüllt sind)


### Level 3 - Fortgeschrittene
- 6x Gruppenstunde  
- erst wenn 6x Gruppenstunde erfüllt sind, dann 1x Prüfung
- Level freischalten** (wenn alle Anforderungen erfüllt sind)


### Level 4 - Masterclass
- 6x Social Walk
- 2x Wirtshaustraining
- erst wenn 6x Social Walk + 2x Wirtshaustraining erfüllt sind, dann 1x Prüfung
- 1x Prüfung
- Level freischalten** (wenn alle Anforderungen erfüllt sind


### Level 5 - Hundeführerschein

- erst wenn 

  **Plus Hundeführerschein-Anforderungen (diese Veranstaltungen können zu jedem Zeitpunkt, in jedem Status gebucht werden) :**
  - Vortrag Bindung & Beziehung
  - Vortrag Jagdverhalten
  - WS Kommunikation & Körpersprache                                 
  - WS Stress & Impulskontrolle
  - Theorieabend Hundeführerschein
  - Erste-Hilfe-Kurs
erfüllt sind
- 1x Prüfung

  - zum Experten ernennen** (wenn alle Anforderungen erfüllt sind)


### Experte (Level 6)
- Sonderstatus für Level 5 Absolventen
- Nur durch Staff freischaltbar




## 💰 Preisstruktur

### Services
- Gruppenstunde: 12€
- Trail: 18€
- Prüfungsstunde: 12€
- Social Walk: 12€
- Wirtshaustraining: 12€
- Erste Hilfe Kurs: 50€
- Vorträge: 12€
- Workshops: 12€
- Theorieabend: 25€

### Auflade-Boni
- 50€ → +5€ Bonus
- 100€ → +20€ Bonus  
- 150€ → +35€ Bonus
- 300€ → +75€ Bonus
- 500€ → +150€ Bonus

### VIP-Vorteile
- kostenlose Teilnahme an allen Veranstaltungen

## 📄 Lizenz

Dieses Projekt ist für den internen Gebrauch der Hundeschule bestimmt.
