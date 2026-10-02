import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "O que é um contrato de exportação?",
    summary: "O acordo escrito entre um vendedor e um comprador em países diferentes.",
    group: "Noções básicas",
    body: `Um contrato de exportação é o registo escrito de uma venda que atravessa uma fronteira. Define quem vende, quem compra, o que está a ser vendido, quanto custa, como e quando será expedido e como o comprador irá pagar.

As vendas do dia a dia raramente precisam de algo tão formal. As internacionais normalmente precisam, porque há mais coisas que podem correr mal: as mercadorias percorrem grandes distâncias, passam pela alfândega, podem mudar de mãos várias vezes e são muitas vezes pagas antes de o comprador as ver. Um contrato claro significa que ambas as partes, e qualquer pessoa que mais tarde precise de verificar o negócio, podem ver exatamente o que foi prometido.

## O que um bom contrato abrange

- **As partes** — as denominações registadas, as moradas e os números de identificação do vendedor e do comprador, como o número de registo da empresa, o número de IVA ou o número EORI.
- **As mercadorias** — o que são, a quantidade, o preço unitário e o total.
- **A entrega** — de onde partem as mercadorias, para onde vão e que regra Incoterms se aplica, para que todos saibam quem paga e quem é responsável por cada fase do percurso.
- **O pagamento** — a moeda, o montante, a data de vencimento e a forma de pagamento, por exemplo, transferência bancária ou carta de crédito.
- **As assinaturas** — ambas as partes assinam para mostrar que aceitam os termos.

## Onde entram os outros documentos

O contrato é o centro de um conjunto de documentos. Os orçamentos e as notas de encomenda conduzem até ele; as faturas, as listas de embalagem, os certificados de origem e os conhecimentos de embarque põem-no em prática. O Universal Exports mantém todos eles num único projeto, para que os mesmos dados passem de um documento para o seguinte em vez de serem escritos novamente.

## Uma advertência

O Universal Exports ajuda a produzir documentação clara e coerente. Não constitui aconselhamento jurídico. Para negócios de valor elevado, mercadorias pouco comuns ou mercados desconhecidos, vale a pena pedir a alguém qualificado que verifique os termos.`,
  },
  {
    id: 'export-documents-explained',
    title: "Os documentos de exportação, explicados",
    summary: "Para que serve cada documento de um projeto, em linguagem simples.",
    group: "Noções básicas",
    body: `Uma exportação costuma gerar uma pequena pilha de papéis. Cada documento responde a uma pergunta diferente para uma pessoa diferente: o comprador, o banco, a transportadora ou a alfândega. Eis para que serve cada um no Universal Exports.

## Antes da venda

- **Estimativa ou orçamento** — o que o vendedor se propõe fornecer e a que preço. Ainda não é um compromisso.
- **Nota de encomenda** — o pedido formal de compra do comprador, normalmente com referência ao orçamento.

## A venda e o pagamento

- **Fatura** — o pedido de pagamento do vendedor. Nas exportações, indica também à alfândega o que são as mercadorias e quanto valem, pelo que as descrições e os valores têm de ser exatos.
- **Dados bancários** — para onde deve ser feito o pagamento.
- **Carta de crédito** — uma promessa do banco do comprador de pagar ao vendedor assim que forem apresentados os documentos corretos. Protege ambas as partes: o vendedor sabe que há um banco a garantir o pagamento, e o comprador sabe que o dinheiro só é libertado mediante prova de expedição.
- **Recibo** — confirma que o pagamento foi recebido.
- **Nota de crédito** — reduz ou anula um montante já faturado, por exemplo, após uma devolução ou um erro de preço.

## Fazer chegar as mercadorias

- **Dados da expedição** — portos, navio, datas e a regra Incoterms aplicável ao percurso.
- **Lista de recolha** — indica ao armazém o que deve recolher para a encomenda.
- **Guia de remessa** — acompanha as mercadorias para que o destinatário possa verificar se chegou tudo.
- **Certificado de origem** — declara o país onde as mercadorias foram fabricadas. A alfândega utiliza-o para decidir que taxas de direitos e acordos comerciais se aplicam.
- **Conhecimento de embarque** — emitido pela transportadora no transporte marítimo. Funciona como recibo das mercadorias, prova do contrato de transporte e, em muitos casos, título representativo da mercadoria: quem detiver o original pode reclamar a carga.

## Produtos e alfândega

- **Produtos** — as próprias mercadorias, com os respetivos códigos de mercadoria, preços e IVA.
- **Pautas e alfândega** — os direitos e outras medidas que se aplicam a cada produto.

Como todos os documentos de um projeto utilizam os mesmos dados, uma correção feita num sítio é refletida nos restantes, o que reduz as discrepâncias que costumam atrasar as expedições.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Códigos de mercadoria, pautas e Incoterms",
    summary: "Os códigos e as regras que a alfândega e as transportadoras utilizam, e como a aplicação os consulta.",
    group: "Noções básicas",
    body: `## Códigos de mercadoria

Quase tudo o que é comercializado internacionalmente é classificado no Sistema Harmonizado, um sistema de numeração mantido pela Organização Mundial das Alfândegas e utilizado pelas autoridades aduaneiras de todo o mundo. Os primeiros seis dígitos são comuns a nível internacional. Cada país acrescenta mais dígitos para maior detalhe; o Reino Unido utiliza códigos mais longos construídos sobre os mesmos seis primeiros.

O código é importante porque determina que direitos, impostos, licenças e restrições se aplicam. Dois produtos aparentemente semelhantes podem pertencer a códigos diferentes e ter um tratamento muito diferente na fronteira, por isso vale a pena acertar.

## Pautas

Um direito aduaneiro é um imposto cobrado sobre as mercadorias quando são importadas. A taxa depende do código de mercadoria, da origem das mercadorias e de existir ou não um acordo comercial entre os dois países que conceda uma taxa mais baixa. O IVA na importação e outras medidas também se podem aplicar.

## Como a aplicação os consulta

Quando introduz um código de mercadoria para um produto, o verificador de pautas consulta o UK Trade Tariff Service, a base de dados pública de pautas do governo do Reino Unido, para obter as taxas de direitos, o IVA e outras medidas desse código. O seu navegador contacta o serviço diretamente e envia apenas o código, não o resto do projeto. Como os dados correspondem à pauta do Reino Unido, o verificador só faz sentido quando uma das partes do negócio está no Reino Unido.

Considere o resultado um ponto de partida útil, e não uma decisão vinculativa. Se tiver dúvidas sobre uma classificação, confirme-a no serviço oficial ou junto de um consultor aduaneiro antes de expedir.

## Incoterms

Os Incoterms são um conjunto de regras comerciais normalizadas publicadas pela Câmara de Comércio Internacional. Cada regra é um código curto, como EXW, FOB, CIF ou DDP, que indica quem organiza e paga o transporte, o seguro e o desalfandegamento, e em que momento o risco passa do vendedor para o comprador. Indicar a regra, e o local a que se aplica, nos dados da expedição evita longas discussões posteriores sobre quem devia ter pago o quê.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Como funciona o Universal Exports",
    summary: "Onde os documentos são criados, onde os projetos são guardados e os ficheiros que pode levar consigo.",
    group: "Como funciona",
    body: `O Universal Exports é uma aplicação web que cria um conjunto completo de documentos de exportação a partir de um único projeto. Preenche os dados uma vez e cada documento reutiliza-os.

## Projetos

Um projeto reúne tudo sobre um negócio: os seus dados, a outra parte, os produtos, a expedição, o pagamento e cada secção de documento. Precisa de um Universal ID para trabalhar em projetos, e estes são guardados na sua conta para que os possa retomar noutro computador. Ao criar aqui um Universal ID, é-lhe pedido um número da Companies House do Reino Unido; a aplicação consulta-o para que possa confirmar que a empresa é sua.

Quando termina uma secção, pode bloqueá-la. Uma secção bloqueada é apresentada como documento concluído, e a barra lateral mostra que secções ainda precisam de dados obrigatórios.

## Onde os documentos são criados

Os PDF, incluindo o contrato de exportação e cada documento individual, são gerados pelo seu navegador no seu próprio computador. Não são enviados para serem gerados noutro lado.

## Ficheiros que pode levar consigo

- **PDF** do contrato de exportação e de cada documento, antes e depois da assinatura.
- **XML do negócio** — os dados do contrato num ficheiro estruturado que outro software de comércio ou aduaneiro consegue ler.
- **Guardar no computador** — o projeto completo e editável como ficheiro de cópia de segurança. Pode abri-lo mais tarde para continuar a editar e voltar a gerar os documentos. Não inclui a sua assinatura, que existe apenas no PDF assinado.
- **Etiquetas para caixas** — uma folha imprimível de etiquetas com código QR para colar em cada caixa. Consulte o artigo sobre privacidade para saber o que esses códigos abrem.

## Hosted by UNI·SIM

Se preferir manter uma cópia do contrato concluído online, pode armazenar o PDF na UNI·SIM associado ao seu Universal ID. Armazenar contratos online é gratuito com um Universal ID. As contas gratuitas têm um limite generoso; se alguma vez o atingir, elimine um contrato de que já não precise. Se precisar de mais, diga-nos em unisim.co.uk/support.

## Projeto de demonstração

O projeto de exemplo mostra um conjunto completo de documentos preenchidos. Existe apenas na aplicação e nunca é guardado numa conta, pelo que o pode explorar à vontade.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Assinatura e contra-assinatura",
    summary: "Como assina, como a outra parte assina e como a passagem para o telemóvel se mantém privada.",
    group: "Como funciona",
    body: `Um contrato de exportação é assinado duas vezes: uma por si e outra pela outra parte. O Universal Exports trata de ambas.

## A sua assinatura

Pode desenhar a sua assinatura com o rato ou com o dedo, carregar uma imagem da mesma ou passar a assinatura para o seu telemóvel. Pode também acrescentar o seu cargo, como Diretor, e um carimbo da empresa opcional. Depois de confirmar, a aplicação cria uma cópia assinada do contrato com o seu nome, cargo, carimbo e assinatura no bloco de assinatura.

## Assinar no telemóvel

Desenhar com o rato é pouco prático, por isso, num computador, a aplicação pode mostrar um código QR em alternativa.

1. Leia o código com o telemóvel. O computador indica que o telemóvel se ligou.
2. Introduza no telemóvel o PIN de seis dígitos apresentado no ecrã do computador.
3. Desenhe a sua assinatura no telemóvel e envie-a.
4. O computador verifica o PIN e, apenas se corresponder, coloca a assinatura no contrato.

A assinatura viaja entre os dois dispositivos como uma mensagem em direto, única. Não é guardada em nenhuma base de dados pelo caminho. O PIN impede que alguém que apenas viu o código QR consiga introduzir a sua própria assinatura no seu contrato.

## A assinatura da outra parte

No painel de contra-assinatura, cria uma ligação de assinatura para o projeto. Pode apresentá-la como código QR, copiá-la ou enviá-la por e-mail. Se o seu endereço de e-mail estiver verificado, a aplicação pode enviar o pedido por si, com o seu endereço definido como endereço de resposta; caso contrário, abre um rascunho no seu próprio programa de e-mail.

A outra parte abre a ligação, tem de abrir o documento antes de o campo de assinatura ser desbloqueado e, em seguida, escreve o nome e assina. A data é preenchida automaticamente. Cada ligação só pode ser utilizada para assinar uma vez. O seu painel verifica a assinatura a cada poucos segundos e mostra o nome do signatário e a hora a que assinou assim que esta chega. O documento que abre é o PDF do contrato mais recente que gerou ou assinou para o projeto; enquanto não gerar um, o campo de assinatura continua bloqueado.

## O que uma assinatura eletrónica é, e o que não é

Uma assinatura desenhada e captada desta forma regista que uma pessoa identificada assinou num determinado momento. Não é uma assinatura digital baseada em certificado. Para a maior parte da documentação comercial isso é suficiente, mas alguns bancos, autoridades ou contratos têm regras próprias, por isso verifique em caso de dúvida.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "O que é armazenado e quem pode ver",
    summary: "O que é guardado na sua conta, o que fica no seu navegador e o que uma ligação ou código QR abre.",
    group: "Privacidade e segurança",
    body: `O Universal Exports não é uma aplicação que funciona apenas no dispositivo. A documentação comercial tem de chegar à outra parte do negócio, por isso parte dela é armazenada online. Eis exatamente o quê, e quem lhe pode aceder.

## Guardado na sua conta

- Os seus projetos, incluindo os dados de cada documento.
- Os dados da sua própria empresa, os seus contactos guardados, os seus dados bancários e o seu catálogo de produtos.

Estes dados são armazenados na base de dados da UNI·SIM associados ao seu Universal ID. A base de dados só permite que a sua conta com sessão iniciada os leia ou altere. Tudo circula através de ligações encriptadas, mas não há encriptação ponto a ponto: os dados são guardados para que o serviço lhos possa devolver, e não trancados com uma chave que só o utilizador possui.

## Mantido apenas no seu navegador

O seu logótipo, o idioma escolhido e o último contacto selecionado ficam memorizados neste navegador, neste computador. Não são guardados na sua conta.

## Ligações e códigos QR

- **O código QR num contrato gerado, e nas etiquetas para caixas,** abre uma cópia online só de leitura desse contrato, incluindo o PDF. Qualquer pessoa que tenha a ligação ou consiga ler o código pode vê-la; não é necessário iniciar sessão. É esse o objetivo, para que um comprador ou um funcionário aduaneiro possa verificar a documentação, mas também significa que só deve partilhar esses códigos com pessoas que devam ver o negócio. A ligação é um código aleatório longo que não pode ser adivinhado. A cópia online só é criada quando tem sessão iniciada; sem ela, o contrato é gerado sem código QR e as etiquetas para caixas são marcadas como pré-visualização.
- **Uma ligação de contra-assinatura** permite a quem a detiver abrir o pedido e assiná-lo uma vez e, depois, consultar quem o assinou. Envie-a apenas à pessoa que deve assinar. Também abre o PDF do contrato mais recente do projeto. Eliminar um projeto elimina as respetivas cópias online e ligações de contra-assinatura, pelo que os códigos QR e as ligações de assinatura deixam de funcionar.
- **A passagem da assinatura para o telemóvel** não é armazenada de todo; consulte o artigo sobre assinatura.

## Serviços com que a aplicação comunica

- **UK Trade Tariff Service** — quando consulta um código de mercadoria, o código é enviado para esse serviço.
- **Consulta à Companies House** — quando cria um Universal ID, o número da empresa que introduz é verificado através do servidor da UNI·SIM.
- **E-mail** — se pedir à aplicação que envie um pedido de assinatura, o endereço do destinatário, o nome deste e a ligação de assinatura são transmitidos ao fornecedor de e-mail da UNI·SIM para a entrega.

## Cópias de segurança alojadas

Se armazenar um contrato com o Hosted by UNI·SIM, o PDF é mantido num armazenamento privado associado ao seu Universal ID. Eliminá-lo remove o ficheiro.`,
  },
]

export default articles
