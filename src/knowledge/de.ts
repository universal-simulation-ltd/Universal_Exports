import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "Was ist eine Exportvereinbarung?",
    summary: "Die schriftliche Vereinbarung zwischen einem Verkäufer und einem Käufer in verschiedenen Ländern.",
    group: "Grundlagen",
    body: `Eine Exportvereinbarung ist die schriftliche Aufzeichnung eines Verkaufs über eine Grenze hinweg. Sie legt fest, wer verkauft, wer kauft, was verkauft wird, was es kostet, wie und wann es versandt wird und wie der Käufer bezahlt.

Alltägliche Verkäufe brauchen selten etwas so Förmliches. Internationale in der Regel schon, denn es kann mehr schiefgehen: Die Ware legt einen weiten Weg zurück, durchläuft den Zoll, kann mehrmals den Besitzer wechseln und wird oft bezahlt, bevor der Käufer sie gesehen hat. Eine klare Vereinbarung bedeutet, dass beide Seiten und jeder, der das Geschäft später prüfen muss, genau sehen können, was zugesagt wurde.

## Was eine gute Vereinbarung abdeckt

- **Die Parteien** — die eingetragenen Namen, Anschriften und Kennnummern von Verkäufer und Käufer, etwa eine Handelsregisternummer, eine Umsatzsteuer-Identifikationsnummer oder eine EORI-Nummer.
- **Die Ware** — was sie ist, wie viel, der Stückpreis und der Gesamtbetrag.
- **Die Lieferung** — wo die Ware abgeht, wohin sie geht und welche Incoterms-Regel gilt, damit alle wissen, wer jede Etappe der Reise bezahlt und dafür verantwortlich ist.
- **Die Zahlung** — die Währung, der Betrag, die Fälligkeit und die Zahlungsweise, zum Beispiel per Banküberweisung oder Akkreditiv.
- **Die Unterschriften** — beide Parteien unterschreiben, um zu zeigen, dass sie die Bedingungen annehmen.

## Wo die anderen Dokumente hingehören

Die Vereinbarung ist das Zentrum einer Reihe von Dokumenten. Angebote und Bestellungen führen zu ihr hin; Rechnungen, Packlisten, Ursprungszeugnisse und Konnossemente setzen sie um. Universal Exports hält sie alle in einem Projekt zusammen, sodass dieselben Angaben von einem Dokument ins nächste übernommen werden, statt erneut eingetippt zu werden.

## Ein Hinweis zur Vorsicht

Universal Exports hilft Ihnen, klare und einheitliche Unterlagen zu erstellen. Es handelt sich nicht um Rechtsberatung. Bei Geschäften mit hohem Wert, ungewöhnlichen Waren oder unbekannten Märkten lohnt es sich, die Bedingungen von einer qualifizierten Person prüfen zu lassen.`,
  },
  {
    id: 'export-documents-explained',
    title: "Die Exportdokumente erklärt",
    summary: "Wofür jedes Dokument in einem Projekt da ist, verständlich erklärt.",
    group: "Grundlagen",
    body: `Ein Export bringt in der Regel einen kleinen Stapel Papierkram mit sich. Jedes Dokument beantwortet eine andere Frage für eine andere Stelle: den Käufer, die Bank, den Frachtführer oder den Zoll. Hier sehen Sie, wofür jedes Dokument in Universal Exports da ist.

## Vor dem Verkauf

- **Kostenvoranschlag oder Angebot** — was der Verkäufer zu liefern anbietet und zu welchem Preis. Es ist noch keine Verpflichtung.
- **Bestellung** — die förmliche Kaufanfrage des Käufers, die sich meist auf das Angebot bezieht.

## Verkauf und Zahlung

- **Rechnung** — die Zahlungsaufforderung des Verkäufers. Bei Exporten teilt sie dem Zoll außerdem mit, um welche Ware es sich handelt und welchen Wert sie hat, daher müssen Beschreibungen und Werte genau sein.
- **Bankverbindung** — wohin die Zahlung gehen soll.
- **Akkreditiv** — die Zusage der Bank des Käufers, den Verkäufer zu bezahlen, sobald die richtigen Dokumente vorgelegt werden. Es schützt beide Seiten: Der Verkäufer weiß, dass eine Bank hinter der Zahlung steht, und der Käufer weiß, dass das Geld nur gegen Nachweis des Versands freigegeben wird.
- **Quittung** — bestätigt, dass die Zahlung eingegangen ist.
- **Gutschrift** — verringert oder storniert einen bereits in Rechnung gestellten Betrag, zum Beispiel nach einer Rücksendung oder einem Preisfehler.

## Die Ware ans Ziel bringen

- **Versanddetails** — Häfen, Schiff, Termine und die Incoterms-Regel für die Reise.
- **Kommissionierliste** — sagt dem Lager, was für die Bestellung zusammengestellt werden muss.
- **Lieferschein** — reist mit der Ware, damit der Empfänger prüfen kann, ob alles angekommen ist.
- **Ursprungszeugnis** — gibt an, in welchem Land die Ware hergestellt wurde. Der Zoll entscheidet damit, welche Zollsätze und Handelsabkommen gelten.
- **Konnossement** — wird vom Frachtführer für Seefracht ausgestellt. Es dient als Empfangsbestätigung für die Ware, als Nachweis des Frachtvertrags und in vielen Fällen als Traditionspapier: Wer das Original besitzt, kann die Ladung beanspruchen.

## Produkte und Zoll

- **Produkte** — die Ware selbst, mit ihren Warennummern, Preisen und Umsatzsteuer.
- **Zolltarife und Zoll** — die Zölle und sonstigen Maßnahmen, die für jedes Produkt gelten.

Da alle Dokumente eines Projekts auf denselben Angaben beruhen, wird eine Korrektur an einer Stelle von den anderen übernommen. Das verringert die Unstimmigkeiten, die Sendungen häufig aufhalten.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Warennummern, Zolltarife und Incoterms",
    summary: "Die Codes und Regeln, die Zoll und Frachtführer verwenden, und wie die App sie nachschlägt.",
    group: "Grundlagen",
    body: `## Warennummern

Fast alles, was international gehandelt wird, ist nach dem Harmonisierten System eingereiht, einem Nummerierungssystem, das von der Weltzollorganisation gepflegt und von Zollbehörden weltweit verwendet wird. Die ersten sechs Stellen sind international einheitlich. Einzelne Länder fügen weitere Stellen für mehr Detail hinzu; das Vereinigte Königreich verwendet längere Codes, die auf denselben ersten sechs Stellen aufbauen.

Die Nummer ist wichtig, weil sie bestimmt, welche Zölle, Steuern, Lizenzen und Beschränkungen gelten. Zwei ähnlich aussehende Produkte können unter verschiedene Nummern fallen und an der Grenze sehr unterschiedlich behandelt werden, daher lohnt es sich, sie richtig zu wählen.

## Zolltarife

Ein Zoll ist eine Abgabe, die bei der Einfuhr von Waren erhoben wird. Der Satz hängt von der Warennummer ab, von der Herkunft der Ware und davon, ob ein Handelsabkommen zwischen den beiden Ländern einen niedrigeren Satz vorsieht. Zusätzlich können Einfuhrumsatzsteuer und weitere Maßnahmen anfallen.

## Wie die App sie nachschlägt

Wenn Sie für ein Produkt eine Warennummer eingeben, fragt die Zolltarifprüfung beim UK Trade Tariff Service, der öffentlichen Zolltarifdatenbank der britischen Regierung, die Zollsätze, die Umsatzsteuer und weitere Maßnahmen für diese Nummer ab. Ihr Browser kontaktiert den Dienst direkt und sendet nur die Nummer, nicht den Rest Ihres Projekts. Da es sich um den britischen Zolltarif handelt, ist die Prüfung nur aussagekräftig, wenn eine der Handelsparteien im Vereinigten Königreich ansässig ist.

Betrachten Sie das Ergebnis als hilfreichen Ausgangspunkt, nicht als verbindliche Entscheidung. Wenn Sie sich bei einer Einreihung unsicher sind, prüfen Sie sie vor dem Versand beim offiziellen Dienst oder mit einer Zollberatung.

## Incoterms

Incoterms sind eine Reihe standardisierter Handelsregeln, die von der Internationalen Handelskammer herausgegeben werden. Jede Regel ist ein kurzer Code wie EXW, FOB, CIF oder DDP, der festlegt, wer Transport, Versicherung und Zollabfertigung organisiert und bezahlt und an welchem Punkt das Risiko vom Verkäufer auf den Käufer übergeht. Wenn Sie die Regel und den Ort, auf den sie sich bezieht, in den Versanddetails angeben, vermeiden Sie später lange Diskussionen darüber, wer was hätte bezahlen sollen.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "So funktioniert Universal Exports",
    summary: "Wo Ihre Dokumente erstellt werden, wo Projekte gespeichert sind und welche Dateien Sie mitnehmen können.",
    group: "So funktioniert es",
    body: `Universal Exports ist eine Web-App, die aus einem einzigen Projekt einen vollständigen Satz Exportdokumente erstellt. Sie geben die Angaben einmal ein, und jedes Dokument verwendet sie wieder.

## Projekte

Ein Projekt enthält alles zu einem Geschäft: Ihre Angaben, die andere Partei, Produkte, Versand, Zahlung und jeden Dokumentabschnitt. Sie brauchen eine Universal ID, um an Projekten zu arbeiten, und diese werden in Ihrem Konto gespeichert, sodass Sie sie auf einem anderen Computer wieder aufnehmen können. Wenn Sie hier eine Universal ID erstellen, werden Sie nach einer britischen Companies-House-Nummer gefragt; die App schlägt sie nach, damit Sie bestätigen können, dass das Unternehmen Ihres ist.

Wenn Sie einen Abschnitt fertiggestellt haben, können Sie ihn sperren. Ein gesperrter Abschnitt wird als fertiges Dokument angezeigt, und die Seitenleiste zeigt, in welchen Abschnitten noch Pflichtangaben fehlen.

## Wo die Dokumente erstellt werden

Die PDFs, einschließlich der Exportvereinbarung und jedes einzelnen Dokuments, werden von Ihrem Browser auf Ihrem eigenen Computer erzeugt. Sie werden nicht zur Erstellung an einen anderen Ort gesendet.

## Dateien, die Sie mitnehmen können

- **PDFs** der Exportvereinbarung und jedes Dokuments, vor und nach der Unterzeichnung.
- **Deal XML** — die Angaben der Vereinbarung als strukturierte Datei, die andere Handels- oder Zollsoftware lesen kann.
- **Auf dem Computer speichern** — das gesamte bearbeitbare Projekt als Sicherungsdatei. Sie können sie später wieder öffnen, um weiterzuarbeiten und die Dokumente neu zu erstellen. Ihre Unterschrift ist darin nicht enthalten; sie befindet sich nur im unterschriebenen PDF.
- **Kartonetiketten** — ein druckbarer Bogen mit QR-Etiketten zum Aufkleben auf jeden Karton. Was diese Codes öffnen, erfahren Sie im Artikel zum Datenschutz.

## Hosted by UNI·SIM

Wenn Sie lieber eine Kopie der fertigen Vereinbarung online aufbewahren möchten, können Sie das PDF bei UNI·SIM unter Ihrer Universal ID speichern. Vereinbarungen online zu speichern ist mit einer Universal ID kostenlos. Kostenlose Konten haben ein großzügiges Limit; sollten Sie es einmal erreichen, löschen Sie eine Vereinbarung, die Sie nicht mehr brauchen, oder holen Sie sich mehr.

## Demoprojekt

Das Beispielprojekt zeigt einen vollständig ausgearbeiteten Satz Dokumente. Es existiert nur in der App und wird nie in einem Konto gespeichert, sodass Sie es frei erkunden können.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Unterschreiben und Gegenzeichnen",
    summary: "Wie Sie unterschreiben, wie die andere Partei unterschreibt und wie die Übergabe ans Telefon vertraulich bleibt.",
    group: "So funktioniert es",
    body: `Eine Exportvereinbarung wird zweimal unterschrieben: einmal von Ihnen und einmal von der anderen Partei. Universal Exports übernimmt beides.

## Ihre Unterschrift

Sie können Ihre Unterschrift mit der Maus oder dem Finger zeichnen, ein Bild davon hochladen oder das Unterschreiben an Ihr Telefon übergeben. Sie können außerdem Ihre Funktion, etwa Geschäftsführer, und optional einen Firmenstempel hinzufügen. Sobald Sie bestätigen, erstellt die App eine unterschriebene Kopie der Vereinbarung mit Ihrem Namen, Ihrer Funktion, Ihrem Stempel und Ihrer Unterschrift im Unterschriftenblock.

## Auf dem Telefon unterschreiben

Mit der Maus zu zeichnen ist umständlich, daher kann die App auf einem Computer stattdessen einen QR-Code anzeigen.

1. Scannen Sie den Code mit Ihrem Telefon. Der Computer zeigt an, dass das Telefon verbunden ist.
2. Geben Sie auf dem Telefon die sechsstellige PIN ein, die auf dem Computerbildschirm angezeigt wird.
3. Zeichnen Sie Ihre Unterschrift auf dem Telefon und senden Sie sie ab.
4. Der Computer prüft die PIN und fügt die Unterschrift nur dann in die Vereinbarung ein, wenn sie übereinstimmt.

Die Unterschrift gelangt als einmalige Live-Nachricht von einem Gerät zum anderen. Sie wird unterwegs nicht in einer Datenbank gespeichert. Die PIN sorgt dafür, dass jemand, der nur den QR-Code gesehen hat, nicht seine eigene Unterschrift in Ihre Vereinbarung einschleusen kann.

## Die Unterschrift der anderen Partei

Im Bereich für die Gegenzeichnung erstellen Sie einen Unterschriftslink für das Projekt. Sie können ihn als QR-Code anzeigen, kopieren oder per E-Mail senden. Wenn Ihre E-Mail-Adresse bestätigt ist, kann die App die Anfrage für Sie senden, mit Ihrer Adresse als Antwortadresse; andernfalls öffnet sie einen Entwurf in Ihrem eigenen E-Mail-Programm.

Die andere Partei öffnet den Link, muss das Dokument öffnen, bevor das Unterschriftenfeld freigeschaltet wird, und gibt dann ihren Namen ein und unterschreibt. Das Datum wird automatisch eingetragen. Jeder Link kann nur einmal zum Unterschreiben verwendet werden. Ihr Bereich prüft alle paar Sekunden, ob die Unterschrift vorliegt, und zeigt den Namen der unterzeichnenden Person und den Zeitpunkt der Unterschrift an, sobald sie eingeht. Das Dokument, das sie öffnet, ist das neueste Vereinbarungs-PDF, das Sie für das Projekt erstellt oder unterschrieben haben; solange Sie keines erstellt haben, bleibt das Unterschriftenfeld gesperrt.

## Was eine elektronische Unterschrift ist und was nicht

Eine auf diese Weise erfasste gezeichnete Unterschrift belegt, dass eine namentlich genannte Person zu einem bestimmten Zeitpunkt unterschrieben hat. Sie ist keine zertifikatsbasierte digitale Signatur. Für die meisten kaufmännischen Unterlagen genügt das, aber manche Banken, Behörden oder Verträge haben eigene Regeln; prüfen Sie das daher, wenn Sie unsicher sind.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "Was gespeichert wird und wer es sehen kann",
    summary: "Was in Ihrem Konto gespeichert wird, was in Ihrem Browser bleibt und was ein Link oder QR-Code öffnet.",
    group: "Datenschutz und Sicherheit",
    body: `Universal Exports ist keine App, die nur auf dem Gerät arbeitet. Handelsunterlagen müssen die andere Seite des Geschäfts erreichen, daher wird ein Teil davon online gespeichert. Hier steht genau, was, und wer darauf zugreifen kann.

## In Ihrem Konto gespeichert

- Ihre Projekte, einschließlich der Angaben jedes Dokuments.
- Ihre eigenen Unternehmensangaben, Ihre gespeicherten Kontakte, Ihre Bankverbindung und Ihr Produktkatalog.

Diese Daten werden in der Datenbank von UNI·SIM unter Ihrer Universal ID gespeichert. Die Datenbank erlaubt nur Ihrem angemeldeten Konto, sie zu lesen oder zu ändern. Alles wird über verschlüsselte Verbindungen übertragen, aber nicht Ende-zu-Ende-verschlüsselt: Die Daten werden aufbewahrt, damit der Dienst sie Ihnen zurückgeben kann, und nicht mit einem Schlüssel verschlossen, den nur Sie besitzen.

## Nur in Ihrem Browser gespeichert

Ihr Logo, Ihre Sprachwahl und der zuletzt ausgewählte Kontakt werden von diesem Browser auf diesem Computer gespeichert. Sie werden nicht in Ihrem Konto gespeichert.

## Links und QR-Codes

- **Der QR-Code auf einer erstellten Vereinbarung und auf den Kartonetiketten** öffnet eine schreibgeschützte Online-Kopie dieser Vereinbarung, einschließlich des PDFs. Jeder, der den Link hat oder den Code scannen kann, kann sie ansehen; eine Anmeldung ist nicht nötig. Das ist beabsichtigt, damit ein Käufer oder ein Zollbeamter die Unterlagen prüfen kann, bedeutet aber auch, dass Sie diese Codes nur mit Personen teilen sollten, die das Geschäft sehen sollen. Der Link ist ein langer Zufallscode, der nicht erraten werden kann. Die Online-Kopie wird nur erstellt, wenn Sie angemeldet sind; ohne sie wird die Vereinbarung ohne QR-Code erstellt und die Kartonetiketten werden als Vorschau gekennzeichnet.
- **Ein Link zur Gegenzeichnung** erlaubt jedem, der ihn besitzt, die Anfrage zu öffnen und einmal zu unterschreiben und danach nachzusehen, wer unterschrieben hat. Senden Sie ihn nur an die Person, die unterschreiben soll. Er öffnet außerdem das neueste Vereinbarungs-PDF des Projekts. Wenn Sie ein Projekt löschen, werden seine Online-Kopien und Links zur Gegenzeichnung mitgelöscht, sodass seine QR-Codes und Unterschriftslinks nicht mehr funktionieren.
- **Die Übergabe der Unterschrift ans Telefon** wird überhaupt nicht gespeichert; siehe den Artikel zum Unterschreiben.

## Dienste, mit denen die App kommuniziert

- **UK Trade Tariff Service** — wenn Sie eine Warennummer nachschlagen, wird die Nummer dorthin gesendet.
- **Companies-House-Abfrage** — wenn Sie eine Universal ID erstellen, wird die eingegebene Unternehmensnummer über den Server von UNI·SIM geprüft.
- **E-Mail** — wenn Sie die App eine Unterschriftsanfrage senden lassen, werden die Adresse des Empfängers, sein Name und der Unterschriftslink an den E-Mail-Anbieter von UNI·SIM übermittelt, um sie zuzustellen.

## Gehostete Sicherungen

Wenn Sie eine Vereinbarung mit Hosted by UNI·SIM speichern, wird das PDF in einem privaten Speicher aufbewahrt, der mit Ihrer Universal ID verknüpft ist. Durch das Löschen wird die Datei entfernt.`,
  },
]

export default articles
