import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "Che cos'è un accordo di esportazione?",
    summary: "L'accordo scritto tra un venditore e un acquirente di paesi diversi.",
    group: "Le basi",
    body: `Un accordo di esportazione è la documentazione scritta di una vendita che attraversa un confine. Stabilisce chi vende, chi compra, che cosa viene venduto, quanto costa, come e quando verrà spedito e come pagherà l'acquirente.

Le vendite di tutti i giorni raramente richiedono qualcosa di così formale. Quelle internazionali di solito sì, perché possono andare storte più cose: la merce percorre lunghe distanze, passa la dogana, può cambiare mano più volte e spesso viene pagata prima che l'acquirente l'abbia vista. Un accordo chiaro permette a entrambe le parti, e a chiunque debba verificare l'operazione in seguito, di vedere esattamente che cosa è stato promesso.

## Che cosa copre un buon accordo

- **Le parti** — le denominazioni registrate, gli indirizzi e i numeri identificativi del venditore e dell'acquirente, come un numero di impresa, una partita IVA o un numero EORI.
- **La merce** — che cos'è, in che quantità, il prezzo unitario e il totale.
- **La consegna** — da dove parte la merce, dove è diretta e quale regola Incoterms si applica, così tutti sanno chi paga ciascuna fase del viaggio e chi ne è responsabile.
- **Il pagamento** — la valuta, l'importo, la scadenza e la modalità di pagamento, per esempio bonifico bancario o lettera di credito.
- **Le firme** — la firma di entrambe le parti, a dimostrazione che accettano le condizioni.

## Dove si collocano gli altri documenti

L'accordo è il centro di un insieme di documenti. Preventivi e ordini di acquisto conducono all'accordo; fatture, packing list, certificati di origine e polizze di carico lo mettono in pratica. Universal Exports li tiene tutti in un unico progetto, così gli stessi dati passano da un documento all'altro invece di essere digitati di nuovo.

## Una nota di cautela

Universal Exports ti aiuta a produrre documenti chiari e coerenti. Non costituisce consulenza legale. Per operazioni di valore elevato, merci insolite o mercati che non conosci, conviene far controllare le condizioni da una persona qualificata.`,
  },
  {
    id: 'export-documents-explained',
    title: "I documenti di esportazione, spiegati",
    summary: "A che cosa serve ciascun documento di un progetto, in parole semplici.",
    group: "Le basi",
    body: `Un'esportazione produce di solito una piccola pila di documenti. Ognuno risponde a una domanda diversa per una persona diversa: l'acquirente, la banca, il vettore o la dogana. Ecco a che cosa serve ciascuno in Universal Exports.

## Prima della vendita

- **Stima o preventivo** — ciò che il venditore offre di fornire e a quale prezzo. Non è ancora un impegno.
- **Ordine di acquisto** — la richiesta formale di acquisto dell'acquirente, di solito con riferimento al preventivo.

## La vendita e il pagamento

- **Fattura** — la richiesta di pagamento del venditore. Per le esportazioni, indica anche alla dogana che cosa è la merce e quanto vale, quindi descrizioni e valori devono essere accurati.
- **Coordinate bancarie** — dove deve essere effettuato il pagamento.
- **Lettera di credito** — l'impegno della banca dell'acquirente a pagare il venditore una volta presentati i documenti corretti. Tutela entrambe le parti: il venditore sa che una banca garantisce il pagamento e l'acquirente sa che il denaro viene rilasciato solo a fronte della prova di spedizione.
- **Ricevuta** — conferma che il pagamento è stato ricevuto.
- **Nota di credito** — riduce o annulla un importo già fatturato, per esempio dopo un reso o un errore di prezzo.

## Far arrivare la merce

- **Dettagli della spedizione** — porti, nave, date e regola Incoterms del viaggio.
- **Lista di prelievo** — indica al magazzino che cosa raccogliere per l'ordine.
- **Documento di consegna** — viaggia con la merce, così il destinatario può verificare che sia arrivato tutto.
- **Certificato di origine** — indica il paese in cui la merce è stata prodotta. La dogana lo usa per stabilire quali aliquote di dazio e accordi commerciali si applicano.
- **Polizza di carico** — emessa dal vettore per il trasporto marittimo. Funge da ricevuta della merce, da prova del contratto di trasporto e, in molti casi, da titolo rappresentativo: chi detiene l'originale può reclamare il carico.

## Prodotti e dogana

- **Prodotti** — la merce stessa, con i relativi codici doganali, prezzi e IVA.
- **Tariffe e dogana** — i dazi e le altre misure che si applicano a ciascun prodotto.

Poiché ogni documento di un progetto attinge agli stessi dati, una correzione fatta in un punto viene recepita dagli altri, riducendo le incongruenze che tendono a bloccare le spedizioni.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Codici doganali, tariffe e Incoterms",
    summary: "I codici e le regole usati da dogane e vettori, e come l'app li consulta.",
    group: "Le basi",
    body: `## Codici doganali

Quasi tutto ciò che viene scambiato a livello internazionale è classificato secondo il Sistema armonizzato, uno schema di numerazione gestito dall'Organizzazione mondiale delle dogane e usato dalle autorità doganali di tutto il mondo. Le prime sei cifre sono comuni a livello internazionale. I singoli paesi aggiungono altre cifre per un maggiore dettaglio; il Regno Unito usa codici più lunghi costruiti sulle stesse prime sei.

Il codice è importante perché determina quali dazi, imposte, licenze e restrizioni si applicano. Due prodotti dall'aspetto simile possono rientrare in codici diversi ed essere trattati in modo molto diverso alla frontiera, quindi vale la pena non sbagliare.

## Tariffe

Una tariffa è un'imposta applicata alla merce al momento dell'importazione. L'aliquota dipende dal codice doganale, dalla provenienza della merce e dall'eventuale esistenza di un accordo commerciale tra i due paesi che preveda un'aliquota più bassa. Possono applicarsi anche l'IVA all'importazione e altre misure.

## Come l'app li consulta

Quando inserisci il codice doganale di un prodotto, il verificatore di tariffe interroga lo UK Trade Tariff Service, la banca dati tariffaria pubblica del governo britannico, per ottenere le aliquote di dazio, l'IVA e le altre misure di quel codice. Il tuo browser contatta direttamente il servizio e invia solo il codice, non il resto del progetto. Poiché i dati sono quelli della tariffa del Regno Unito, il verificatore ha senso solo quando una delle parti commerciali si trova nel Regno Unito.

Considera il risultato un utile punto di partenza, non una decisione ufficiale. Se hai dubbi su una classificazione, verificala con il servizio ufficiale o con un consulente doganale prima di spedire.

## Incoterms

Gli Incoterms sono un insieme di regole commerciali standard pubblicate dalla Camera di commercio internazionale. Ogni regola è un codice breve, come EXW, FOB, CIF o DDP, che indica chi organizza e paga il trasporto, l'assicurazione e lo sdoganamento, e in quale momento il rischio passa dal venditore all'acquirente. Indicare la regola, e il luogo a cui si applica, nei dettagli della spedizione evita lunghe discussioni successive su chi avrebbe dovuto pagare che cosa.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Come funziona Universal Exports",
    summary: "Dove vengono creati i tuoi documenti, dove sono conservati i progetti e quali file puoi portare con te.",
    group: "Come funziona",
    body: `Universal Exports è un'app web che crea un insieme completo di documenti di esportazione a partire da un unico progetto. Inserisci i dati una volta e ogni documento li riutilizza.

## Progetti

Un progetto contiene tutto ciò che riguarda un'operazione: i tuoi dati, l'altra parte, i prodotti, la spedizione, il pagamento e ogni sezione dei documenti. Ti serve un Universal ID per lavorare ai progetti, che vengono salvati nel tuo account così puoi riprenderli su un altro computer. Quando crei qui un Universal ID, ti viene chiesto un numero di Companies House del Regno Unito; l'app lo cerca così puoi confermare che l'azienda è tua.

Quando finisci una sezione puoi bloccarla. Una sezione bloccata viene mostrata come documento finito e la barra laterale indica quali sezioni richiedono ancora dati obbligatori.

## Dove vengono creati i documenti

I PDF, compresi l'accordo di esportazione e ogni singolo documento, vengono prodotti dal tuo browser sul tuo computer. Non vengono inviati altrove per essere generati.

## File che puoi portare con te

- **PDF** dell'accordo di esportazione e di ciascun documento, prima e dopo la firma.
- **Deal XML** — i dati dell'accordo in un file strutturato leggibile da altri software commerciali o doganali.
- **Salva sul computer** — l'intero progetto modificabile come file di backup. Puoi riaprirlo in seguito per continuare a modificarlo e rigenerare i documenti. Non include la tua firma, che si trova solo nel PDF firmato.
- **Etichette per i colli** — un foglio stampabile di etichette QR da applicare su ogni cartone. Consulta l'articolo sulla privacy per sapere che cosa aprono quei codici.

## Hosted by UNI·SIM

Se preferisci conservare online una copia dell'accordo finito, puoi archiviare il PDF presso UNI·SIM, associato al tuo Universal ID. Archiviare accordi online è gratuito con un Universal ID. Gli account gratuiti hanno un limite generoso; se mai lo raggiungi, elimina un accordo che non ti serve più. Se ti serve di più, faccelo sapere su unisim.co.uk/support.

## Progetto dimostrativo

Il progetto di esempio mostra un insieme di documenti completamente compilato. Esiste solo nell'app e non viene mai salvato in un account, quindi puoi esplorarlo liberamente.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Firma e controfirma",
    summary: "Come firmi tu, come firma l'altra parte e come il passaggio tramite telefono resta privato.",
    group: "Come funziona",
    body: `Un accordo di esportazione viene firmato due volte: una da te e una dall'altra parte. Universal Exports gestisce entrambe.

## La tua firma

Puoi disegnare la firma con il mouse o con il dito, caricarne un'immagine oppure passare la firma al telefono. Puoi anche aggiungere il tuo ruolo, per esempio Direttore, e un timbro aziendale facoltativo. Una volta confermato, l'app crea una copia firmata dell'accordo con nome, ruolo, timbro e firma nel riquadro della firma.

## Firmare sul telefono

Disegnare con il mouse è scomodo, quindi su un computer l'app può mostrare invece un codice QR.

1. Scansiona il codice con il telefono. Il computer mostra che il telefono si è collegato.
2. Digita sul telefono il PIN di sei cifre mostrato sullo schermo del computer.
3. Disegna la firma sul telefono e inviala.
4. Il computer verifica il PIN e, solo se corrisponde, inserisce la firma nell'accordo.

La firma viaggia tra i due dispositivi come messaggio in tempo reale monouso. Lungo il percorso non viene salvata in alcun database. Il PIN fa sì che chi ha visto soltanto il codice QR non possa inserire la propria firma nel tuo accordo.

## La firma dell'altra parte

Dal pannello di controfirma crei un link di firma per il progetto. Puoi mostrarlo come codice QR, copiarlo o inviarlo via email. Se il tuo indirizzo email è verificato, l'app può inviare la richiesta al posto tuo, con il tuo indirizzo impostato come indirizzo di risposta; altrimenti apre una bozza nel tuo programma di posta.

L'altra parte apre il link, deve aprire il documento prima che il riquadro di firma si sblocchi, poi digita il proprio nome e firma. La data viene inserita automaticamente. Ogni link può essere usato per firmare una sola volta. Il tuo pannello controlla la presenza della firma ogni pochi secondi e mostra il nome del firmatario e l'ora della firma non appena arriva. Il documento che apre è il PDF dell'accordo più recente che hai generato o firmato per il progetto; finché non ne generi uno, il riquadro di firma resta bloccato.

## Che cos'è una firma elettronica, e che cosa non è

Una firma disegnata raccolta in questo modo attesta che una persona identificata ha firmato in un determinato momento. Non è una firma digitale basata su certificato. Per la maggior parte dei documenti commerciali è sufficiente, ma alcune banche, autorità o contratti hanno regole proprie, quindi verifica se hai dubbi.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "Che cosa viene archiviato e chi può vederlo",
    summary: "Che cosa viene salvato nel tuo account, che cosa resta nel browser e che cosa apre un link o un codice QR.",
    group: "Privacy e sicurezza",
    body: `Universal Exports non è un'app che funziona solo sul dispositivo. I documenti commerciali devono raggiungere l'altra parte dell'operazione, quindi alcuni vengono archiviati online. Ecco esattamente che cosa, e chi può accedervi.

## Salvato nel tuo account

- I tuoi progetti, compresi i dati di ogni documento.
- I dati della tua azienda, i contatti salvati, le coordinate bancarie e il catalogo prodotti.

Questi dati sono archiviati nel database di UNI·SIM, associati al tuo Universal ID. Il database consente solo al tuo account con accesso effettuato di leggerli o modificarli. Tutto viaggia su connessioni cifrate, ma non con crittografia end-to-end: i dati sono conservati perché il servizio possa restituirteli, non bloccati con una chiave che possiedi solo tu.

## Conservato solo nel browser

Il tuo logo, la lingua scelta e l'ultimo contatto selezionato vengono ricordati da questo browser su questo computer. Non vengono salvati nel tuo account.

## Link e codici QR

- **Il codice QR su un accordo generato, e quello sulle etichette per i colli,** apre una copia online in sola lettura di quell'accordo, PDF compreso. Chiunque abbia il link o possa scansionare il codice può vederla; non serve accedere. È proprio lo scopo, così un acquirente o un funzionario doganale può controllare i documenti, ma significa anche che dovresti condividere quei codici solo con chi deve vedere l'operazione. Il link è un lungo codice casuale che non può essere indovinato. La copia online viene creata solo quando hai effettuato l'accesso; senza di essa, l'accordo viene prodotto senza codice QR e le etichette per i colli sono contrassegnate come anteprima.
- **Un link di controfirma** permette a chiunque lo possieda di aprire la richiesta e firmarla una volta, e in seguito di vedere chi l'ha firmata. Invialo solo alla persona che deve firmare. Apre anche il PDF dell'accordo più recente del progetto. Eliminando un progetto si eliminano anche le sue copie online e i link di controfirma, quindi i suoi codici QR e i link di firma smettono di funzionare.
- **Il passaggio della firma tramite telefono** non viene archiviato affatto; consulta l'articolo sulla firma.

## Servizi con cui l'app comunica

- **UK Trade Tariff Service** — quando cerchi un codice doganale, il codice viene inviato lì.
- **Ricerca su Companies House** — quando crei un Universal ID, il numero di impresa che inserisci viene verificato tramite il server di UNI·SIM.
- **Email** — se chiedi all'app di inviare una richiesta di firma, l'indirizzo del destinatario, il suo nome e il link di firma vengono trasmessi al fornitore email di UNI·SIM per recapitarla.

## Backup ospitati

Se archivi un accordo con Hosted by UNI·SIM, il PDF viene conservato in uno spazio di archiviazione privato associato al tuo Universal ID. Eliminarlo rimuove il file.`,
  },
]

export default articles
