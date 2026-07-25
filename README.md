# Field Engineer Toolkit

[![GitHub Pages Deployment](https://github.com/p1pp89/field-engineer-toolkit/actions/workflows/deploy.yml/badge.svg)](https://github.com/p1pp89/field-engineer-toolkit)
[![Standard: CEI 64-8 / IEC 60364](https://img.shields.io/badge/Normativa-CEI%2064--8-blue.svg)](https://www.ceiway.it)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Field Engineer Toolkit** è una Web Application statica, modulare e orientata alle prestazioni, progettata specificamente per ingegneri e tecnici impiegati in attività di campo, revamping e manutenzione di impianti elettrici in Bassa Tensione (BT). 

L'applicazione gira interamente lato client (Serverless) ed è ottimizzata per l'installazione e la fruizione rapida tramite smartphone, tablet o laptop direttamente da **GitHub Pages**.

---

## 🛠️ Moduli e Funzionalità Principali

1. **Dimensionamento Linee Elettriche (CEI 64-8)**
   * Calcolo della corrente d'impiego ($I_b$) per sistemi trifase (400V) e monofase (230V).
   * Motore tabellare integrato per metodi di posa standard (**B1**, **C**, **E**) e tipologie di cavo (**Cu-EPR**, **Cu-PVC**, **Al-EPR**).
   * Verifica congiunta di portata termica ($I_z \ge I_b$) e vincolo di caduta di tensione ($\Delta U \le 4.0\%$ o personalizzabile).

2. **Verifica Protezioni Magnetotermiche (CEI EN 60898-1 / 60947-2)**
   * Sincronizzazione automatica dei dati di linea ($I_b$, $I_z$).
   * Selezione della taglia nominale commerciale ($I_n$) e della tipologia di dispositivo (**Magnetotermico**, **Mag-Differenziale RCBO**, **Differenziale Puro RCCB**, **Solo Magnetico**).
   * Helper euristico integrato per la stima rapida della corrente di cortocircuito presunta ($I_{kc}$) in base allo scenario d'impianto.
   * Check automatizzato delle regole di coordinamento cavo-interruttore ($I_b \le I_n \le I_z$, $I_2 \le 1.45 I_z$, $I_{cu} \ge I_{kc}$).

3. **Verifica Anello di Guasto ($Zs$) e Contatti Indiretti**
   * Calcolo dell'impedenza dell'anello di guasto ($Zs$) per sistemi BT in base a lunghezza e sezione del conduttore di protezione (PE).
   * Verifica del rispetto dei tempi massimi di interruzione prescritti dalla norma per la protezione dai contatti indiretti ($\le 0.4\text{s}$).

4. **Schema Unifilare Dinamico (Mermaid.js)**
   * Gestione ad albero della gerarchia d'impianto (relazioni Monte / Valle).
   * Renderizzazione vettoriale live in formato SVG dello schema unifilare direttamente nel browser, senza dipendenze esterne di compilazione.

---

## 📂 Architettura del Progetto

La struttura della repository è completamente statica e priva di passaggi di build complessi (Zero-Build):

```text
field-engineer-toolkit/
├── index.html              # Interfaccia SPA principale (Tailwind CSS & Lucide Icons)
├── css/
│   └── styles.css          # Regole di override CSS e color-scheme dark
├── js/
│   └── app.js              # Motori di calcolo, gestione dello stato e render Mermaid
└── README.md
