import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "O que é um contrato de exportação?",
    summary: "O acordo por escrito entre um vendedor e um comprador em países diferentes.",
    group: "O básico",
    body: `Um contrato de exportação é o registro por escrito de uma venda que atravessa uma fronteira. Ele define quem está vendendo, quem está comprando, o que está sendo vendido, quanto custa, como e quando será enviado e como o comprador vai pagar.

Vendas do dia a dia raramente precisam de algo tão formal. As internacionais geralmente precisam, porque mais coisas podem dar errado: as mercadorias percorrem longas distâncias, passam pela alfândega, podem trocar de mãos várias vezes e muitas vezes são pagas antes de o comprador vê-las. Um contrato claro significa que ambas as partes, e qualquer pessoa que precise verificar o negócio mais tarde, podem ver exatamente o que foi prometido.

## O que um bom contrato abrange

- **As partes** — os nomes registrados, os endereços e os números de identificação do vendedor e do comprador, como o número de registro da empresa, o número de IVA ou o número EORI.
- **As mercadorias** — o que são, a quantidade, o preço unitário e o total.
- **A entrega** — de onde as mercadorias saem, para onde vão e qual regra Incoterms se aplica, para que todos saibam quem paga e quem é responsável por cada etapa do trajeto.
- **O pagamento** — a moeda, o valor, o vencimento e a forma de pagamento, por exemplo, transferência bancária ou carta de crédito.
- **As assinaturas** — as duas partes assinam para mostrar que aceitam os termos.

## Onde entram os outros documentos

O contrato é o centro de um conjunto de documentos. Orçamentos e pedidos de compra levam até ele; faturas, romaneios, certificados de origem e conhecimentos de embarque o colocam em prática. O Universal Exports mantém todos eles em um único projeto, para que os mesmos dados passem de um documento para o seguinte em vez de serem digitados novamente.

## Um aviso

O Universal Exports ajuda você a produzir uma documentação clara e consistente. Ele não constitui aconselhamento jurídico. Para negócios de alto valor, mercadorias incomuns ou mercados desconhecidos, vale a pena pedir a alguém qualificado que verifique os termos.`,
  },
  {
    id: 'export-documents-explained',
    title: "Os documentos de exportação, explicados",
    summary: "Para que serve cada documento de um projeto, em linguagem simples.",
    group: "O básico",
    body: `Uma exportação costuma gerar uma pequena pilha de papéis. Cada documento responde a uma pergunta diferente para uma pessoa diferente: o comprador, o banco, a transportadora ou a alfândega. Veja para que serve cada um no Universal Exports.

## Antes da venda

- **Estimativa ou orçamento** — o que o vendedor se oferece a fornecer e a que preço. Ainda não é um compromisso.
- **Pedido de compra** — a solicitação formal de compra do comprador, geralmente fazendo referência ao orçamento.

## A venda e o pagamento

- **Fatura** — a solicitação de pagamento do vendedor. Nas exportações, ela também informa à alfândega o que são as mercadorias e quanto valem, por isso as descrições e os valores precisam ser precisos.
- **Dados bancários** — para onde o pagamento deve ser enviado.
- **Carta de crédito** — uma promessa do banco do comprador de pagar o vendedor assim que os documentos corretos forem apresentados. Ela protege os dois lados: o vendedor sabe que um banco garante o pagamento, e o comprador sabe que o dinheiro só é liberado mediante comprovação do embarque.
- **Recibo** — confirma que o pagamento foi recebido.
- **Nota de crédito** — reduz ou cancela um valor já faturado, por exemplo, após uma devolução ou um erro de preço.

## Levando as mercadorias ao destino

- **Dados do embarque** — portos, navio, datas e a regra Incoterms do trajeto.
- **Lista de separação** — informa ao depósito o que separar para o pedido.
- **Nota de entrega** — acompanha as mercadorias para que o destinatário possa verificar se tudo chegou.
- **Certificado de origem** — declara o país onde as mercadorias foram fabricadas. A alfândega o usa para decidir quais alíquotas e acordos comerciais se aplicam.
- **Conhecimento de embarque** — emitido pela transportadora no frete marítimo. Funciona como recibo das mercadorias, prova do contrato de transporte e, em muitos casos, título de propriedade: quem tiver o original pode reivindicar a carga.

## Produtos e alfândega

- **Produtos** — as próprias mercadorias, com seus códigos de mercadoria, preços e IVA.
- **Tarifas e alfândega** — os impostos e outras medidas que se aplicam a cada produto.

Como todos os documentos de um projeto usam os mesmos dados, uma correção feita em um lugar é aplicada aos outros, o que reduz as divergências que costumam atrasar os embarques.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Códigos de mercadoria, tarifas e Incoterms",
    summary: "Os códigos e as regras que a alfândega e as transportadoras usam, e como o app os consulta.",
    group: "O básico",
    body: `## Códigos de mercadoria

Quase tudo o que é comercializado internacionalmente é classificado no Sistema Harmonizado, um esquema de numeração mantido pela Organização Mundial das Aduanas e usado pelas autoridades aduaneiras do mundo todo. Os seis primeiros dígitos são comuns a todos os países. Cada país acrescenta outros dígitos para dar mais detalhes; o Reino Unido usa códigos mais longos construídos sobre os mesmos seis primeiros.

O código é importante porque determina quais impostos, taxas, licenças e restrições se aplicam. Dois produtos parecidos podem estar em códigos diferentes e receber tratamentos muito diferentes na fronteira, por isso vale a pena acertar.

## Tarifas

Uma tarifa é um imposto cobrado sobre as mercadorias quando são importadas. A alíquota depende do código de mercadoria, da origem das mercadorias e de haver ou não um acordo comercial entre os dois países que conceda uma alíquota menor. O IVA de importação e outras medidas também podem se aplicar.

## Como o app os consulta

Quando você informa um código de mercadoria para um produto, o verificador de tarifas consulta o UK Trade Tariff Service, a base de dados pública de tarifas do governo do Reino Unido, para obter as alíquotas, o IVA e outras medidas desse código. Seu navegador se conecta diretamente ao serviço e envia apenas o código, não o restante do projeto. Como os dados são a tarifa do Reino Unido, o verificador só faz sentido quando uma das partes do negócio está no Reino Unido.

Trate o resultado como um ponto de partida útil, não como uma decisão oficial. Se não tiver certeza de uma classificação, confirme-a no serviço oficial ou com um consultor aduaneiro antes de enviar.

## Incoterms

Os Incoterms são um conjunto de regras comerciais padronizadas publicadas pela Câmara de Comércio Internacional. Cada regra é um código curto, como EXW, FOB, CIF ou DDP, que diz quem organiza e paga o transporte, o seguro e o desembaraço aduaneiro, e em que momento o risco passa do vendedor para o comprador. Indicar a regra, e o local a que ela se aplica, nos dados do embarque evita longas discussões posteriores sobre quem deveria ter pago o quê.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Como o Universal Exports funciona",
    summary: "Onde seus documentos são criados, onde os projetos ficam guardados e os arquivos que você pode levar.",
    group: "Como funciona",
    body: `O Universal Exports é um aplicativo web que cria um conjunto completo de documentos de exportação a partir de um único projeto. Você preenche os dados uma vez, e cada documento os reutiliza.

## Projetos

Um projeto reúne tudo sobre um negócio: seus dados, a outra parte, os produtos, o embarque, o pagamento e cada seção de documento. Você precisa de um Universal ID para trabalhar em projetos, e eles são salvos na sua conta para que você possa retomá-los em outro computador. Ao criar um Universal ID aqui, será solicitado um número da Companies House do Reino Unido; o app o consulta para que você confirme que a empresa é sua.

Ao terminar uma seção, você pode bloqueá-la. Uma seção bloqueada é exibida como documento finalizado, e a barra lateral mostra quais seções ainda precisam de dados obrigatórios.

## Onde os documentos são criados

Os PDFs, incluindo o contrato de exportação e cada documento individual, são gerados pelo seu navegador no seu próprio computador. Eles não são enviados para serem gerados em outro lugar.

## Arquivos que você pode levar

- **PDFs** do contrato de exportação e de cada documento, antes e depois da assinatura.
- **XML do negócio** — os dados do contrato em um arquivo estruturado que outros softwares de comércio ou aduana podem ler.
- **Salvar no computador** — o projeto inteiro e editável como arquivo de backup. Você pode abri-lo depois para continuar editando e gerar os documentos novamente. Ele não inclui sua assinatura, que existe apenas no PDF assinado.
- **Etiquetas para caixas** — uma folha imprimível de etiquetas com QR code para colar em cada caixa. Consulte o artigo sobre privacidade para saber o que esses códigos abrem.

## Hosted by UNI·SIM

Se preferir manter uma cópia do contrato finalizado on-line, você pode armazenar o PDF com a UNI·SIM vinculado ao seu Universal ID. Armazenar contratos on-line é gratuito com um Universal ID. Contas gratuitas têm um limite generoso; se algum dia você chegar a ele, exclua um contrato de que não precisa mais. Se precisar de mais, fale com a gente em unisim.co.uk/support.

## Projeto de demonstração

O projeto de exemplo mostra um conjunto completo de documentos preenchidos. Ele existe apenas no app e nunca é salvo em uma conta, então você pode explorá-lo à vontade.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Assinatura e contra-assinatura",
    summary: "Como você assina, como a outra parte assina e como a transferência pelo celular continua privada.",
    group: "Como funciona",
    body: `Um contrato de exportação é assinado duas vezes: uma por você e outra pela outra parte. O Universal Exports cuida das duas.

## Sua assinatura

Você pode desenhar sua assinatura com o mouse ou com o dedo, enviar uma imagem dela ou passar a assinatura para o seu celular. Também pode adicionar seu cargo, como Diretor, e um carimbo da empresa opcional. Depois que você confirma, o app cria uma cópia assinada do contrato com seu nome, cargo, carimbo e assinatura no bloco de assinatura.

## Assinar pelo celular

Desenhar com o mouse é difícil, então no computador o app pode mostrar um QR code em vez disso.

1. Escaneie o código com o celular. O computador mostra que o celular se conectou.
2. Digite no celular o PIN de seis dígitos exibido na tela do computador.
3. Desenhe sua assinatura no celular e envie.
4. O computador verifica o PIN e, somente se ele corresponder, coloca a assinatura no contrato.

A assinatura viaja entre os dois dispositivos como uma mensagem ao vivo, única. Ela não é salva em nenhum banco de dados no caminho. O PIN garante que alguém que apenas viu o QR code não consiga inserir a própria assinatura no seu contrato.

## A assinatura da outra parte

No painel de contra-assinatura, você cria um link de assinatura para o projeto. Você pode mostrá-lo como QR code, copiá-lo ou enviá-lo por e-mail. Se o seu endereço de e-mail estiver verificado, o app pode enviar a solicitação por você, com o seu endereço como endereço de resposta; caso contrário, ele abre um rascunho no seu próprio programa de e-mail.

A outra parte abre o link, precisa abrir o documento antes que o campo de assinatura seja desbloqueado e, em seguida, digita o nome e assina. A data é preenchida automaticamente. Cada link só pode ser usado para assinar uma vez. Seu painel verifica a assinatura a cada poucos segundos e mostra o nome de quem assinou e o horário da assinatura assim que ela chega. O documento que ela abre é o PDF do contrato mais recente que você gerou ou assinou para o projeto; enquanto você não gerar um, o campo de assinatura continua bloqueado.

## O que uma assinatura eletrônica é, e o que não é

Uma assinatura desenhada e capturada dessa forma registra que uma pessoa identificada assinou em um determinado momento. Ela não é uma assinatura digital baseada em certificado. Para a maior parte da documentação comercial isso basta, mas alguns bancos, autoridades ou contratos têm regras próprias, então verifique se tiver dúvidas.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "O que é armazenado e quem pode ver",
    summary: "O que é salvo na sua conta, o que fica no seu navegador e o que um link ou QR code abre.",
    group: "Privacidade e segurança",
    body: `O Universal Exports não é um app que funciona só no dispositivo. A documentação comercial precisa chegar à outra parte do negócio, então parte dela é armazenada on-line. Veja exatamente o quê, e quem pode acessar.

## Salvo na sua conta

- Seus projetos, incluindo os dados de cada documento.
- Os dados da sua própria empresa, seus contatos salvos, seus dados bancários e seu catálogo de produtos.

Esses dados ficam armazenados no banco de dados da UNI·SIM vinculados ao seu Universal ID. O banco de dados só permite que a sua conta conectada os leia ou altere. Tudo trafega por conexões criptografadas, mas não há criptografia de ponta a ponta: os dados são guardados para que o serviço possa devolvê-los a você, não trancados com uma chave que só você possui.

## Mantido apenas no seu navegador

Seu logotipo, o idioma escolhido e o último contato selecionado ficam guardados neste navegador, neste computador. Eles não são salvos na sua conta.

## Links e QR codes

- **O QR code em um contrato gerado, e nas etiquetas para caixas,** abre uma cópia on-line somente leitura desse contrato, incluindo o PDF. Qualquer pessoa que tenha o link ou consiga escanear o código pode vê-la; não é preciso fazer login. Esse é o objetivo, para que um comprador ou um agente aduaneiro possa conferir a documentação, mas também significa que você deve compartilhar esses códigos apenas com pessoas que devem ver o negócio. O link é um código aleatório longo que não pode ser adivinhado. A cópia on-line só é criada quando você está conectado; sem ela, o contrato é gerado sem QR code e as etiquetas para caixas são marcadas como prévia.
- **Um link de contra-assinatura** permite que quem o tiver abra a solicitação e assine uma vez e, depois, consulte quem assinou. Envie-o apenas para a pessoa que deve assinar. Ele também abre o PDF do contrato mais recente do projeto. Excluir um projeto exclui as cópias on-line e os links de contra-assinatura dele, então os QR codes e os links de assinatura param de funcionar.
- **A transferência da assinatura pelo celular** não é armazenada de forma alguma; consulte o artigo sobre assinatura.

## Serviços com que o app se comunica

- **UK Trade Tariff Service** — quando você consulta um código de mercadoria, o código é enviado para lá.
- **Consulta à Companies House** — quando você cria um Universal ID, o número da empresa que você informa é verificado pelo servidor da UNI·SIM.
- **E-mail** — se você pedir ao app que envie uma solicitação de assinatura, o endereço do destinatário, o nome dele e o link de assinatura são repassados ao provedor de e-mail da UNI·SIM para a entrega.

## Backups hospedados

Se você armazenar um contrato com o Hosted by UNI·SIM, o PDF é mantido em um armazenamento privado vinculado ao seu Universal ID. Excluí-lo remove o arquivo.`,
  },
]

export default articles
