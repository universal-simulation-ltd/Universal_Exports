import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "Qu'est-ce qu'un accord d'exportation ?",
    summary: "L'accord écrit entre un vendeur et un acheteur situés dans des pays différents.",
    group: "Les bases",
    body: `Un accord d'exportation est la trace écrite d'une vente qui franchit une frontière. Il indique qui vend, qui achète, ce qui est vendu, à quel prix, comment et quand la marchandise sera expédiée, et comment l'acheteur paiera.

Les ventes courantes exigent rarement un document aussi formel. Les ventes internationales, en général, si, car davantage de choses peuvent mal tourner : la marchandise parcourt une longue distance, passe la douane, peut changer de mains plusieurs fois et est souvent payée avant que l'acheteur ne l'ait vue. Un accord clair permet aux deux parties, ainsi qu'à toute personne qui devra vérifier l'opération plus tard, de savoir exactement ce qui a été promis.

## Ce que couvre un bon accord

- **Les parties** — les dénominations enregistrées, adresses et numéros d'identification du vendeur et de l'acheteur, comme un numéro d'entreprise, un numéro de TVA ou un numéro EORI.
- **La marchandise** — sa nature, la quantité, le prix unitaire et le total.
- **La livraison** — le lieu de départ de la marchandise, sa destination et la règle Incoterms applicable, afin que chacun sache qui paie chaque étape du trajet et qui en est responsable.
- **Le paiement** — la devise, le montant, l'échéance et le mode de paiement, par exemple un virement bancaire ou une lettre de crédit.
- **Les signatures** — la signature des deux parties, qui montre qu'elles acceptent les conditions.

## La place des autres documents

L'accord est au centre d'un ensemble de documents. Les devis et les bons de commande y conduisent ; les factures, listes de colisage, certificats d'origine et connaissements le mettent en œuvre. Universal Exports les regroupe tous dans un même projet, afin que les mêmes informations passent d'un document à l'autre au lieu d'être ressaisies.

## Une mise en garde

Universal Exports vous aide à produire des documents clairs et cohérents. Il ne s'agit pas d'un conseil juridique. Pour les opérations de grande valeur, les marchandises inhabituelles ou les marchés que vous connaissez mal, il est utile de faire vérifier les conditions par une personne qualifiée.`,
  },
  {
    id: 'export-documents-explained',
    title: "Les documents d'exportation expliqués",
    summary: "À quoi sert chaque document d'un projet, en termes simples.",
    group: "Les bases",
    body: `Une exportation produit généralement une petite pile de documents. Chacun répond à une question différente pour une personne différente : l'acheteur, la banque, le transporteur ou la douane. Voici à quoi sert chacun d'eux dans Universal Exports.

## Avant la vente

- **Estimation ou devis** — ce que le vendeur propose de fournir et à quel prix. Ce n'est pas encore un engagement.
- **Bon de commande** — la demande d'achat formelle de l'acheteur, qui fait généralement référence au devis.

## La vente et le paiement

- **Facture** — la demande de paiement du vendeur. À l'exportation, elle indique aussi à la douane la nature et la valeur de la marchandise ; les descriptions et les valeurs doivent donc être exactes.
- **Coordonnées bancaires** — où le paiement doit être versé.
- **Lettre de crédit** — l'engagement de la banque de l'acheteur à payer le vendeur dès que les bons documents sont présentés. Elle protège les deux parties : le vendeur sait qu'une banque garantit le paiement, et l'acheteur sait que l'argent n'est versé que sur preuve de l'expédition.
- **Reçu** — confirme que le paiement a été reçu.
- **Avoir** — réduit ou annule un montant déjà facturé, par exemple après un retour ou une erreur de prix.

## L'acheminement de la marchandise

- **Détails de l'expédition** — ports, navire, dates et règle Incoterms applicable au trajet.
- **Liste de préparation** — indique à l'entrepôt ce qu'il faut rassembler pour la commande.
- **Bon de livraison** — accompagne la marchandise pour que le destinataire puisse vérifier que tout est arrivé.
- **Certificat d'origine** — indique le pays où la marchandise a été fabriquée. La douane s'en sert pour déterminer les taux de droits et les accords commerciaux applicables.
- **Connaissement** — émis par le transporteur pour le fret maritime. Il sert de reçu pour la marchandise, de preuve du contrat de transport et, dans de nombreux cas, de titre de propriété : quiconque détient l'original peut réclamer la cargaison.

## Produits et douane

- **Produits** — la marchandise elle-même, avec ses codes de nomenclature, ses prix et sa TVA.
- **Tarifs et douane** — les droits et autres mesures qui s'appliquent à chaque produit.

Comme tous les documents d'un projet reposent sur les mêmes informations, une correction faite à un endroit est reprise par les autres, ce qui réduit les incohérences qui ont tendance à retarder les expéditions.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Codes de nomenclature, tarifs et Incoterms",
    summary: "Les codes et les règles utilisés par la douane et les transporteurs, et comment l'application les consulte.",
    group: "Les bases",
    body: `## Codes de nomenclature

Presque tout ce qui fait l'objet d'échanges internationaux est classé selon le Système harmonisé, une nomenclature gérée par l'Organisation mondiale des douanes et utilisée par les autorités douanières du monde entier. Les six premiers chiffres sont communs à l'échelle internationale. Chaque pays ajoute des chiffres supplémentaires pour plus de précision ; le Royaume-Uni utilise des codes plus longs construits sur ces mêmes six premiers chiffres.

Le code est important, car il détermine les droits, taxes, licences et restrictions qui s'appliquent. Deux produits d'apparence semblable peuvent relever de codes différents et être traités très différemment à la frontière ; il vaut donc la peine de ne pas se tromper.

## Tarifs

Un tarif est une taxe prélevée sur la marchandise au moment de son importation. Le taux dépend du code de nomenclature, de la provenance de la marchandise et de l'existence éventuelle d'un accord commercial entre les deux pays prévoyant un taux réduit. La TVA à l'importation et d'autres mesures peuvent également s'appliquer.

## Comment l'application les consulte

Lorsque vous saisissez le code de nomenclature d'un produit, le vérificateur de tarifs interroge le UK Trade Tariff Service, la base de données tarifaire publique du gouvernement britannique, pour obtenir les taux de droits, la TVA et les autres mesures liés à ce code. Votre navigateur contacte directement le service et n'envoie que le code, pas le reste de votre projet. Comme il s'agit du tarif du Royaume-Uni, le vérificateur n'a de sens que si l'une des parties à l'échange se trouve au Royaume-Uni.

Considérez le résultat comme un point de départ utile, et non comme une décision officielle. En cas de doute sur un classement, vérifiez-le auprès du service officiel ou d'un conseiller en douane avant d'expédier.

## Incoterms

Les Incoterms sont un ensemble de règles commerciales normalisées publiées par la Chambre de commerce internationale. Chaque règle est un code court, comme EXW, FOB, CIF ou DDP, qui précise qui organise et paie le transport, l'assurance et le dédouanement, et à quel moment le risque passe du vendeur à l'acheteur. Indiquer la règle, ainsi que le lieu auquel elle s'applique, dans les détails de l'expédition évite de longues disputes ultérieures sur qui aurait dû payer quoi.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Comment fonctionne Universal Exports",
    summary: "Où vos documents sont créés, où les projets sont conservés et quels fichiers vous pouvez emporter.",
    group: "Fonctionnement",
    body: `Universal Exports est une application web qui produit un ensemble complet de documents d'exportation à partir d'un seul projet. Vous saisissez les informations une seule fois, et chaque document les réutilise.

## Projets

Un projet regroupe tout ce qui concerne une opération : vos coordonnées, l'autre partie, les produits, l'expédition, le paiement et chaque section de document. Il vous faut un Universal ID pour travailler sur des projets, et ceux-ci sont enregistrés dans votre compte afin que vous puissiez les reprendre sur un autre ordinateur. Lorsque vous créez un Universal ID ici, un numéro de Companies House britannique vous est demandé ; l'application le recherche pour que vous puissiez confirmer que l'entreprise est bien la vôtre.

Une fois une section terminée, vous pouvez la verrouiller. Une section verrouillée s'affiche comme un document finalisé, et la barre latérale indique les sections dans lesquelles il manque encore des informations obligatoires.

## Où les documents sont créés

Les PDF, y compris l'accord d'exportation et chaque document individuel, sont produits par votre navigateur, sur votre propre ordinateur. Ils ne sont pas envoyés ailleurs pour être générés.

## Fichiers que vous pouvez emporter

- **Des PDF** de l'accord d'exportation et de chaque document, avant et après signature.
- **Deal XML** — les informations de l'accord sous forme de fichier structuré lisible par d'autres logiciels commerciaux ou douaniers.
- **Enregistrer sur l'ordinateur** — l'ensemble du projet modifiable sous forme de fichier de sauvegarde. Vous pouvez le rouvrir plus tard pour poursuivre la modification et régénérer les documents. Il n'inclut pas votre signature, qui ne figure que sur le PDF signé.
- **Étiquettes de colis** — une feuille imprimable d'étiquettes QR à coller sur chaque carton. Consultez l'article sur la confidentialité pour savoir ce que ces codes ouvrent.

## Hosted by UNI·SIM

Si vous préférez conserver une copie en ligne de l'accord finalisé, vous pouvez stocker le PDF chez UNI·SIM, rattaché à votre Universal ID. Le stockage d'accords en ligne est gratuit avec un Universal ID. Les comptes gratuits disposent d'une limite généreuse ; si vous l'atteignez un jour, supprimez un accord dont vous n'avez plus besoin ou obtenez-en davantage.

## Projet de démonstration

Le projet d'exemple présente un ensemble complet de documents entièrement remplis. Il n'existe que dans l'application et n'est jamais enregistré dans un compte ; vous pouvez donc l'explorer librement.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Signature et contre-signature",
    summary: "Comment vous signez, comment l'autre partie signe, et comment le passage par le téléphone reste confidentiel.",
    group: "Fonctionnement",
    body: `Un accord d'exportation est signé deux fois : une fois par vous, une fois par l'autre partie. Universal Exports gère les deux.

## Votre signature

Vous pouvez dessiner votre signature à la souris ou au doigt, en importer une image, ou confier la signature à votre téléphone. Vous pouvez aussi ajouter votre fonction, par exemple Directeur, et un cachet d'entreprise facultatif. Une fois que vous confirmez, l'application crée une copie signée de l'accord avec votre nom, votre fonction, votre cachet et votre signature dans le bloc de signature.

## Signer sur votre téléphone

Dessiner avec une souris n'est pas pratique ; sur un ordinateur, l'application peut donc afficher un code QR à la place.

1. Scannez le code avec votre téléphone. L'ordinateur indique que le téléphone s'est connecté.
2. Saisissez sur votre téléphone le code PIN à six chiffres affiché sur l'écran de l'ordinateur.
3. Dessinez votre signature sur le téléphone et envoyez-la.
4. L'ordinateur vérifie le code PIN et, uniquement s'il correspond, place la signature dans l'accord.

La signature circule entre les deux appareils sous la forme d'un message en direct à usage unique. Elle n'est enregistrée dans aucune base de données en chemin. Le code PIN empêche une personne qui n'aurait vu que le code QR de glisser sa propre signature dans votre accord.

## La signature de l'autre partie

Depuis le panneau de contre-signature, vous créez un lien de signature pour le projet. Vous pouvez l'afficher sous forme de code QR, le copier ou l'envoyer par e-mail. Si votre adresse e-mail est vérifiée, l'application peut envoyer la demande pour vous, avec votre adresse comme adresse de réponse ; sinon, elle ouvre un brouillon dans votre propre logiciel de messagerie.

L'autre partie ouvre le lien, doit ouvrir le document avant que le pavé de signature ne se déverrouille, puis saisit son nom et signe. La date est renseignée automatiquement. Chaque lien ne peut servir à signer qu'une seule fois. Votre panneau vérifie la présence de la signature toutes les quelques secondes et affiche le nom du signataire et l'heure de signature dès qu'elle arrive. Le document qu'elle ouvre est le PDF d'accord le plus récent que vous avez généré ou signé pour le projet ; tant que vous n'en avez pas généré, le pavé de signature reste verrouillé.

## Ce qu'est une signature électronique, et ce qu'elle n'est pas

Une signature dessinée recueillie de cette manière atteste qu'une personne nommée a signé à un moment donné. Ce n'est pas une signature numérique fondée sur un certificat. Pour la plupart des documents commerciaux, cela suffit, mais certaines banques, autorités ou certains contrats ont leurs propres règles ; vérifiez en cas de doute.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "Ce qui est stocké, et qui peut le voir",
    summary: "Ce qui est enregistré dans votre compte, ce qui reste dans votre navigateur, et ce qu'ouvre un lien ou un code QR.",
    group: "Confidentialité et sécurité",
    body: `Universal Exports n'est pas une application qui fonctionne uniquement sur l'appareil. Les documents commerciaux doivent parvenir à l'autre partie de l'opération ; une partie d'entre eux est donc stockée en ligne. Voici précisément ce qui l'est, et qui peut y accéder.

## Enregistré dans votre compte

- Vos projets, y compris les informations de chaque document.
- Les coordonnées de votre entreprise, vos contacts enregistrés, vos coordonnées bancaires et votre catalogue de produits.

Ces données sont stockées dans la base de données d'UNI·SIM, rattachées à votre Universal ID. La base de données ne permet qu'à votre compte connecté de les lire ou de les modifier. Tout circule par des connexions chiffrées, mais sans chiffrement de bout en bout : les données sont conservées pour que le service puisse vous les restituer, et ne sont pas verrouillées par une clé que vous seul détiendriez.

## Conservé uniquement dans votre navigateur

Votre logo, votre choix de langue et le dernier contact que vous avez sélectionné sont mémorisés par ce navigateur sur cet ordinateur. Ils ne sont pas enregistrés dans votre compte.

## Liens et codes QR

- **Le code QR figurant sur un accord généré, ainsi que sur les étiquettes de colis,** ouvre une copie en ligne en lecture seule de cet accord, PDF compris. Toute personne qui dispose du lien ou peut scanner le code peut la consulter ; aucune connexion n'est nécessaire. C'est voulu, afin qu'un acheteur ou un agent des douanes puisse vérifier les documents, mais cela signifie aussi que vous ne devez partager ces codes qu'avec les personnes censées voir l'opération. Le lien est un long code aléatoire impossible à deviner. La copie en ligne n'est créée que si vous êtes connecté ; sinon, l'accord est produit sans code QR et les étiquettes de colis sont marquées comme un aperçu.
- **Un lien de contre-signature** permet à quiconque le détient d'ouvrir la demande et de la signer une fois, puis de consulter qui l'a signée. Ne l'envoyez qu'à la personne qui doit signer. Il ouvre aussi le PDF d'accord le plus récent du projet. Supprimer un projet supprime ses copies en ligne et ses liens de contre-signature : ses codes QR et ses liens de signature cessent alors de fonctionner.
- **Le passage de la signature par le téléphone** n'est pas stocké du tout ; consultez l'article sur la signature.

## Services avec lesquels l'application communique

- **UK Trade Tariff Service** — lorsque vous recherchez un code de nomenclature, le code y est envoyé.
- **Recherche Companies House** — lorsque vous créez un Universal ID, le numéro d'entreprise que vous saisissez est vérifié par l'intermédiaire du serveur d'UNI·SIM.
- **E-mail** — si vous demandez à l'application d'envoyer une demande de signature, l'adresse du destinataire, son nom et le lien de signature sont transmis au fournisseur de messagerie d'UNI·SIM pour la distribuer.

## Sauvegardes hébergées

Si vous stockez un accord avec Hosted by UNI·SIM, le PDF est conservé dans un espace de stockage privé rattaché à votre Universal ID. Le supprimer efface le fichier.`,
  },
]

export default articles
