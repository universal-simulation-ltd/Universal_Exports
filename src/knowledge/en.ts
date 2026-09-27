import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: 'What is an export agreement?',
    summary: 'The written deal between a seller and a buyer in different countries.',
    group: 'The basics',
    body: `An export agreement is the written record of a sale that crosses a border. It sets out who is selling, who is buying, what is being sold, how much it costs, how and when it will be shipped, and how the buyer will pay.

Everyday sales rarely need anything this formal. International ones usually do, because more can go wrong: the goods travel a long way, pass through customs, may change hands several times, and are often paid for before the buyer has seen them. A clear agreement means both sides, and anyone who later needs to check the deal, can see exactly what was promised.

## What a good agreement covers

- **The parties** — the registered names, addresses and identifying numbers of the seller and the buyer, such as a company number, VAT number or EORI number.
- **The goods** — what they are, how many, the price per unit and the total.
- **Delivery** — where the goods leave from, where they are going, and which Incoterms rule applies, so everyone knows who pays for and is responsible for each stage of the journey.
- **Payment** — the currency, the amount, when it is due and how it will be paid, for example by bank transfer or a letter of credit.
- **Signatures** — both parties signing to show they accept the terms.

## Where the other documents fit

The agreement is the centre of a set of documents. Quotes and purchase orders lead up to it; invoices, packing lists, certificates of origin and bills of lading carry it out. Universal Exports keeps all of them in one project, so the same details flow from one document to the next instead of being typed out again.

## A note of caution

Universal Exports helps you produce clear, consistent paperwork. It is not legal advice. For high-value deals, unusual goods or unfamiliar markets, it is worth having the terms checked by someone qualified.`,
  },
  {
    id: 'export-documents-explained',
    title: 'The export documents, explained',
    summary: 'What each document in a project is for, in plain English.',
    group: 'The basics',
    body: `An export usually produces a small pile of paperwork. Each document answers a different question for a different person: the buyer, the bank, the carrier or customs. Here is what each one in Universal Exports is for.

## Before the sale

- **Estimate or quote** — what the seller offers to supply and at what price. It is not yet a commitment.
- **Purchase order** — the buyer's formal request to buy, usually referring back to the quote.

## The sale and payment

- **Invoice** — the seller's request for payment. For exports, it also tells customs what the goods are and what they are worth, so the descriptions and values need to be accurate.
- **Bank details** — where payment should go.
- **Letter of credit** — a promise from the buyer's bank to pay the seller once the right documents are presented. It protects both sides: the seller knows a bank stands behind the payment, and the buyer knows the money is only released against proof of shipment.
- **Receipt** — confirms that payment has been received.
- **Credit note** — reduces or cancels an amount already invoiced, for example after a return or a pricing error.

## Getting the goods there

- **Shipment details** — ports, vessel, dates and the Incoterms rule for the journey.
- **Picking list** — tells the warehouse what to collect for the order.
- **Delivery note** — travels with the goods so the receiver can check that everything arrived.
- **Certificate of origin** — states the country where the goods were made. Customs use it to decide which duty rates and trade agreements apply.
- **Bill of lading** — issued by the carrier for sea freight. It acts as a receipt for the goods, evidence of the contract of carriage and, in many cases, a document of title: whoever holds the original can claim the cargo.

## Products and customs

- **Products** — the goods themselves, with their commodity codes, prices and VAT.
- **Tariffs and customs** — the duties and other measures that apply to each product.

Because every document in a project draws on the same details, a correction made in one place is picked up by the others, which cuts down the mismatches that tend to hold shipments up.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: 'Commodity codes, tariffs and Incoterms',
    summary: 'The codes and rules customs and carriers use, and how the app looks them up.',
    group: 'The basics',
    body: `## Commodity codes

Almost everything traded internationally is classified under the Harmonized System, a numbering scheme maintained by the World Customs Organization and used by customs authorities around the world. The first six digits are shared internationally. Individual countries add further digits for more detail; the UK uses longer codes built on the same first six.

The code matters because it decides which duties, taxes, licences and restrictions apply. Two products that look similar can sit under different codes and be treated very differently at the border, so it is worth getting right.

## Tariffs

A tariff is a tax charged on goods as they are imported. The rate depends on the commodity code, where the goods come from and whether a trade agreement between the two countries gives a lower rate. Import VAT and other measures may also apply.

## How the app looks them up

When you enter a commodity code for a product, the tariff checker asks the UK Trade Tariff Service, the UK government's public tariff database, for that code's duty rates, VAT and other measures. Your browser contacts the service directly and sends only the code, not the rest of your project. Because the data is the UK's tariff, the checker is only meaningful when one of the trading parties is in the UK.

Treat the result as a helpful starting point, not a ruling. If you are unsure of a classification, check it with the official service or a customs adviser before you ship.

## Incoterms

Incoterms are a set of standard trade rules published by the International Chamber of Commerce. Each rule is a short code, such as EXW, FOB, CIF or DDP, that says who arranges and pays for transport, insurance and customs clearance, and at what point the risk passes from seller to buyer. Naming the rule, and the place it applies to, in the shipment details avoids long arguments later about who should have paid for what.`,
  },
  {
    id: 'how-universal-exports-works',
    title: 'How Universal Exports works',
    summary: 'Where your documents are made, where projects are kept, and the files you can take away.',
    group: 'How it works',
    body: `Universal Exports is a web app that builds a full set of export documents from one project. You fill in the details once, and each document reuses them.

## Projects

A project holds everything about one deal: your details, the other party, products, shipment, payment and every document section. You need a Universal ID to work on projects, and they are saved to your account so you can pick them up again on another computer. When you create a Universal ID here, you are asked for a UK Companies House number; the app looks it up so you can confirm the company is yours.

As you finish a section you can lock it. A locked section is shown as a finished document, and the sidebar shows which sections still need required details.

## Where the documents are made

The PDFs, including the export agreement and each individual document, are produced by your browser on your own computer. They are not sent off to be rendered elsewhere.

## Files you can take away

- **PDFs** of the export agreement and of each document, before and after signing.
- **Deal XML** — the agreement's details as a structured file that other trade or customs software can read.
- **Save to desktop** — the whole editable project as a backup file. You can open it again later to carry on editing and regenerate the documents. It does not include your signature, which lives only on the signed PDF.
- **Box labels** — a printable sheet of QR labels to stick on each carton. See the privacy article for what those codes open.

## Hosted by UNI·SIM

If you would rather keep a copy of the finished agreement online, you can store the PDF with UNI·SIM against your Universal ID. Each stored agreement uses one token, and you get the token back if you delete it.

## Demo project

The example project shows a fully worked set of documents. It lives only in the app and is never saved to an account, so you can explore it freely.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: 'Signing and counter-signing',
    summary: 'How you sign, how the other party signs, and how the phone hand-off stays private.',
    group: 'How it works',
    body: `An export agreement is signed twice: once by you, and once by the other party. Universal Exports handles both.

## Your signature

You can draw your signature with a mouse or finger, upload an image of it, or hand the signing over to your phone. You can also add your role, such as Director, and an optional company stamp. Once you confirm, the app builds a signed copy of the agreement with your name, role, stamp and signature in the signature block.

## Signing on your phone

Drawing with a mouse is awkward, so on a computer the app can show a QR code instead.

1. Scan the code with your phone. The computer shows that the phone has connected.
2. Type the six-digit PIN shown on the computer screen into your phone.
3. Draw your signature on the phone and send it.
4. The computer checks the PIN and, only if it matches, places the signature in the agreement.

The signature travels between the two devices as a one-off live message. It is not saved to a database along the way. The PIN means someone who only saw the QR code cannot slip their own signature into your agreement.

## The other party's signature

From the counter-sign panel you create a signing link for the project. You can show it as a QR code, copy it, or email it. If your email address is verified, the app can send the request for you, with your address set as the reply-to; otherwise it opens a draft in your own email program.

The other party opens the link, must open the document before the signature pad unlocks, then types their name and signs. The date is filled in automatically. Each link can be used to sign only once. Your panel checks for the signature every few seconds and shows the signer's name and the time they signed as soon as it arrives.

## What an electronic signature is, and is not

A drawn signature captured this way records that a named person signed at a particular time. It is not a certificate-based digital signature. For most commercial paperwork that is enough, but some banks, authorities or contracts have their own rules, so check if you are unsure.`,
  },
  {
    id: 'your-data-and-privacy',
    title: 'What is stored, and who can see it',
    summary: 'What is saved to your account, what stays in your browser, and what a link or QR code opens.',
    group: 'Privacy and security',
    body: `Universal Exports is not a device-only app. Trade paperwork has to reach the other side of the deal, so some of it is stored online. Here is exactly what, and who can reach it.

## Saved to your account

- Your projects, including every document's details.
- Your own company details, your saved contacts, your bank details and your product catalogue.

These are stored in UNI·SIM's database under your Universal ID. The database only lets your signed-in account read or change them. Everything travels over encrypted connections, but it is not end-to-end encrypted: the data is held so the service can give it back to you, not locked with a key only you hold.

## Kept only in your browser

Your logo, your language choice and the last contact you picked are remembered by this browser on this computer. They are not saved to your account.

## Links and QR codes

- **The QR code on a generated agreement, and on the box labels,** opens a read-only online copy of that agreement, including the PDF. Anyone who has the link or can scan the code can view it; no sign-in is needed. That is the point, so a buyer or a customs officer can check the paperwork, but it also means you should share those codes only with people who should see the deal. The link is a long random code that cannot be guessed. The online copy is only created when you are signed in; without it, the agreement is made without a QR code and the box labels are marked as a preview.
- **A counter-sign link** lets whoever holds it open the request and sign it once, and afterwards look up who signed it. Send it only to the person who should sign.
- **The phone signature hand-off** is not stored at all; see the signing article.

## Services the app talks to

- **UK Trade Tariff Service** — when you look up a commodity code, the code is sent there.
- **Companies House lookup** — when you create a Universal ID, the company number you enter is checked through UNI·SIM's server.
- **Email** — if you ask the app to send a signing request, the recipient's address, their name and the signing link are passed to UNI·SIM's email provider to deliver it.

## Hosted backups

If you store an agreement with Hosted by UNI·SIM, the PDF is kept in private storage tied to your Universal ID. Deleting it removes the file and returns the token.`,
  },
]

export default articles
