UniTOgether — prototipo del sito (corso HCI)
=============================================

COME APRIRLO
Decomprimi la cartella e apri index.html con un browser (Chrome, Edge o Firefox; Safari non è stato provato).
Non aprirlo direttamente dentro lo zip: prima estrai tutto.
Non serve internet né un server: font, loghi e dati sono dentro la cartella.
Tutti i file del sito stanno in questa cartella (pagine, css, js, img, fonts): non spostarli.

PER LA VALUTAZIONE
Apri guida.html (link nella barra scura in alto): contiene un percorso di prova per
ogni persona, i dati di prova per il pagamento e dove si trova ogni euristica di Nielsen.

DATI DI PROVA
- Carta che funziona: 4242 4242 4242 4242, scadenza 12/30, codice 123
- Carta rifiutata (per vedere l'errore): 4000 0000 0000 0002
- Accesso: elena.marchetti@unitogether.example (ricercatrice) oppure chiara.rinaldi@unitogether.example
  (personale dell'Ateneo, Ufficio candidature), password Prova2026!   (account inventati, elencati in js/data.js)
- Registrazione: solo come ricercatore o dottorando. L'account resta salvato nel browser (localStorage)
  ma deve essere confermato dall'Ufficio candidature (Area dell'Ufficio, «Richieste di registrazione»)
  prima di poter inviare candidature.
- Le candidature inviate dal sito compaiono nell'Area dell'Ufficio insieme a quelle di esempio, a patto di
  usare lo stesso browser (e non una finestra privata). Per ripartire da zero: svuotare i dati del sito dal browser.

PAGINE
index, progetti, progetto (scheda, si apre con ?id=...), sostieni (3 passi), conferma,
come-funziona, faq, contatti, risultati (risultati e impatto), proponi (con candidatura e stato),
accedi (accesso e registrazione), area-personale (dati, foto, «I miei progetti» o «Candidature da valutare»),
staff (area dell'Ufficio candidature), privacy, guida, 404.

COME MODIFICARE
- Progetti, account e candidature inventati: js/data.js
  (lì c'è anche CONFERMA_REGISTRAZIONI: true/false per attivare o no la conferma delle registrazioni)
- Colori, font, componenti: css/style.css (colori in cima, nelle variabili :root; il tema scuro è nel blocco :root[data-theme=dark])
- Logica (filtri, form, flusso di sostegno, area personale): js/main.js
- Loghi: img/logo-lockup(.svg|-negativo.svg), img/logo-simbolo(.svg|-negativo.svg), img/favicon.svg
  Il testo dei loghi è convertito in tracciati: non dipende da nessun font.

TEMA SCURO E MENU ACCOUNT
- In alto a destra, accanto a «Area personale», c'è l'interruttore «Tema scuro»: la scelta resta salvata.
  La prima volta il sito segue la preferenza del sistema operativo.
- Dopo l'accesso il pulsante diventa «Ciao, Nome» con un menu: «Vai all'area personale» ed «Esci».
- Se in un browser l'accesso non si conserva passando da una pagina all'altra, aprire il sito da un indirizzo
  online o da un piccolo server locale (per esempio: python3 -m http.server dalla cartella principale).
- Contrasti del tema scuro (WCAG): testo normale almeno 6,6:1, titoli 8,7:1, link 6,4:1, pulsante principale 6,0:1.

NOTE
- Tutto è simulato: nessun pagamento, email o account reali. Nomi, importi, date e contatti sono inventati.
- Font: Lexend (titoli, come nel logo) e Atkinson Hyperlegible (testo), entrambi con licenza OFL.
  Atkinson ha lo zero barrato per distinguerlo dalla lettera O (scelta di leggibilità).
