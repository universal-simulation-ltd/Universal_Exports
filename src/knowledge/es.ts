import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "¿Qué es un acuerdo de exportación?",
    summary: "El acuerdo por escrito entre un vendedor y un comprador de países distintos.",
    group: "Lo básico",
    body: `Un acuerdo de exportación es el registro por escrito de una venta que cruza una frontera. Establece quién vende, quién compra, qué se vende, cuánto cuesta, cómo y cuándo se enviará, y cómo pagará el comprador.

Las ventas cotidianas rara vez necesitan algo tan formal. Las internacionales, por lo general, sí, porque pueden fallar más cosas: la mercancía recorre una larga distancia, pasa por la aduana, puede cambiar de manos varias veces y a menudo se paga antes de que el comprador la haya visto. Un acuerdo claro permite que ambas partes, y cualquiera que más adelante tenga que comprobar la operación, vean exactamente lo que se prometió.

## Qué cubre un buen acuerdo

- **Las partes** — los nombres registrados, las direcciones y los números identificativos del vendedor y del comprador, como un número de empresa, un número de IVA o un número EORI.
- **La mercancía** — qué es, cuántas unidades, el precio unitario y el total.
- **La entrega** — desde dónde sale la mercancía, adónde va y qué regla Incoterms se aplica, para que todos sepan quién paga cada etapa del trayecto y quién es responsable de ella.
- **El pago** — la moneda, el importe, cuándo vence y cómo se pagará, por ejemplo por transferencia bancaria o mediante una carta de crédito.
- **Las firmas** — la firma de ambas partes para mostrar que aceptan las condiciones.

## Dónde encajan los demás documentos

El acuerdo es el centro de un conjunto de documentos. Los presupuestos y las órdenes de compra conducen a él; las facturas, las listas de empaque, los certificados de origen y los conocimientos de embarque lo ejecutan. Universal Exports los guarda todos en un mismo proyecto, de modo que los mismos datos pasan de un documento al siguiente en lugar de volver a escribirse.

## Una advertencia

Universal Exports le ayuda a elaborar documentación clara y coherente. No constituye asesoramiento jurídico. En operaciones de alto valor, mercancías poco habituales o mercados que no conoce bien, conviene que una persona cualificada revise las condiciones.`,
  },
  {
    id: 'export-documents-explained',
    title: "Los documentos de exportación, explicados",
    summary: "Para qué sirve cada documento de un proyecto, en lenguaje sencillo.",
    group: "Lo básico",
    body: `Una exportación suele generar un pequeño montón de papeles. Cada documento responde a una pregunta distinta para una persona distinta: el comprador, el banco, el transportista o la aduana. Esto es para lo que sirve cada uno en Universal Exports.

## Antes de la venta

- **Estimación o presupuesto** — lo que el vendedor ofrece suministrar y a qué precio. Todavía no es un compromiso.
- **Orden de compra** — la solicitud formal de compra del comprador, que normalmente hace referencia al presupuesto.

## La venta y el pago

- **Factura** — la solicitud de pago del vendedor. En las exportaciones, también indica a la aduana qué es la mercancía y cuánto vale, por lo que las descripciones y los valores deben ser exactos.
- **Datos bancarios** — adónde debe ir el pago.
- **Carta de crédito** — el compromiso del banco del comprador de pagar al vendedor una vez presentados los documentos correctos. Protege a ambas partes: el vendedor sabe que un banco respalda el pago y el comprador sabe que el dinero solo se libera contra prueba del envío.
- **Recibo** — confirma que se ha recibido el pago.
- **Nota de crédito** — reduce o anula un importe ya facturado, por ejemplo tras una devolución o un error de precio.

## Cómo llega la mercancía

- **Datos del envío** — puertos, buque, fechas y la regla Incoterms del trayecto.
- **Lista de preparación** — indica al almacén qué debe reunir para el pedido.
- **Albarán de entrega** — viaja con la mercancía para que el destinatario pueda comprobar que ha llegado todo.
- **Certificado de origen** — indica el país donde se fabricó la mercancía. La aduana lo utiliza para decidir qué tipos arancelarios y acuerdos comerciales se aplican.
- **Conocimiento de embarque** — lo emite el transportista para el transporte marítimo. Sirve como recibo de la mercancía, como prueba del contrato de transporte y, en muchos casos, como título de propiedad: quien tenga el original puede reclamar la carga.

## Productos y aduanas

- **Productos** — la propia mercancía, con sus códigos de mercancía, precios e IVA.
- **Aranceles y aduanas** — los derechos y otras medidas que se aplican a cada producto.

Como todos los documentos de un proyecto se basan en los mismos datos, una corrección hecha en un sitio se refleja en los demás, lo que reduce las discrepancias que suelen retrasar los envíos.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "Códigos de mercancía, aranceles e Incoterms",
    summary: "Los códigos y las reglas que utilizan las aduanas y los transportistas, y cómo los consulta la aplicación.",
    group: "Lo básico",
    body: `## Códigos de mercancía

Casi todo lo que se comercia internacionalmente se clasifica según el Sistema Armonizado, un sistema de numeración que mantiene la Organización Mundial de Aduanas y que utilizan las autoridades aduaneras de todo el mundo. Los seis primeros dígitos son comunes a nivel internacional. Cada país añade más dígitos para mayor detalle; el Reino Unido utiliza códigos más largos basados en esos mismos seis primeros.

El código importa porque determina qué derechos, impuestos, licencias y restricciones se aplican. Dos productos de aspecto similar pueden corresponder a códigos distintos y recibir un trato muy diferente en la frontera, así que merece la pena acertar.

## Aranceles

Un arancel es un impuesto que grava la mercancía cuando se importa. El tipo depende del código de mercancía, del origen de la mercancía y de si un acuerdo comercial entre los dos países ofrece un tipo más bajo. También pueden aplicarse el IVA de importación y otras medidas.

## Cómo los consulta la aplicación

Cuando introduce un código de mercancía para un producto, el comprobador de aranceles consulta al UK Trade Tariff Service, la base de datos arancelaria pública del Gobierno del Reino Unido, los tipos de derechos, el IVA y otras medidas de ese código. Su navegador se comunica directamente con el servicio y envía solo el código, no el resto de su proyecto. Como los datos corresponden al arancel del Reino Unido, el comprobador solo tiene sentido cuando una de las partes comerciales está en el Reino Unido.

Tome el resultado como un punto de partida útil, no como una resolución. Si no está seguro de una clasificación, compruébela con el servicio oficial o con un asesor aduanero antes de enviar.

## Incoterms

Los Incoterms son un conjunto de reglas comerciales estándar publicadas por la Cámara de Comercio Internacional. Cada regla es un código corto, como EXW, FOB, CIF o DDP, que indica quién organiza y paga el transporte, el seguro y el despacho de aduanas, y en qué momento el riesgo pasa del vendedor al comprador. Indicar la regla, y el lugar al que se aplica, en los datos del envío evita largas discusiones posteriores sobre quién debería haber pagado qué.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Cómo funciona Universal Exports",
    summary: "Dónde se crean sus documentos, dónde se guardan los proyectos y qué archivos puede llevarse.",
    group: "Cómo funciona",
    body: `Universal Exports es una aplicación web que genera un conjunto completo de documentos de exportación a partir de un solo proyecto. Usted introduce los datos una vez y cada documento los reutiliza.

## Proyectos

Un proyecto reúne todo lo relativo a una operación: sus datos, la otra parte, los productos, el envío, el pago y cada sección de los documentos. Necesita un Universal ID para trabajar en proyectos, que se guardan en su cuenta para que pueda retomarlos en otro ordenador. Cuando crea un Universal ID aquí, se le pide un número de Companies House del Reino Unido; la aplicación lo busca para que pueda confirmar que la empresa es suya.

Al terminar una sección, puede bloquearla. Una sección bloqueada se muestra como un documento terminado, y la barra lateral indica qué secciones aún necesitan datos obligatorios.

## Dónde se crean los documentos

Los PDF, incluidos el acuerdo de exportación y cada documento individual, los genera su navegador en su propio ordenador. No se envían a ningún otro sitio para generarlos.

## Archivos que puede llevarse

- **PDF** del acuerdo de exportación y de cada documento, antes y después de la firma.
- **Deal XML** — los datos del acuerdo como archivo estructurado que otros programas comerciales o aduaneros pueden leer.
- **Guardar en el escritorio** — todo el proyecto editable como archivo de copia de seguridad. Puede volver a abrirlo más adelante para seguir editándolo y regenerar los documentos. No incluye su firma, que solo figura en el PDF firmado.
- **Etiquetas para cajas** — una hoja imprimible de etiquetas QR para pegar en cada caja. Consulte el artículo sobre privacidad para saber qué abren esos códigos.

## Hosted by UNI·SIM

Si prefiere conservar una copia del acuerdo terminado en línea, puede almacenar el PDF en UNI·SIM vinculado a su Universal ID. Cada acuerdo almacenado utiliza un token, y el token se le devuelve si lo elimina.

## Proyecto de demostración

El proyecto de ejemplo muestra un conjunto de documentos totalmente completado. Solo existe en la aplicación y nunca se guarda en una cuenta, así que puede explorarlo libremente.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "Firma y contrafirma",
    summary: "Cómo firma usted, cómo firma la otra parte y cómo el paso por el teléfono se mantiene privado.",
    group: "Cómo funciona",
    body: `Un acuerdo de exportación se firma dos veces: una por usted y otra por la otra parte. Universal Exports gestiona ambas.

## Su firma

Puede dibujar su firma con el ratón o con el dedo, subir una imagen de ella o pasar la firma a su teléfono. También puede añadir su cargo, como Director, y un sello de empresa opcional. Una vez que confirma, la aplicación crea una copia firmada del acuerdo con su nombre, cargo, sello y firma en el bloque de firma.

## Firmar en el teléfono

Dibujar con el ratón resulta incómodo, así que en un ordenador la aplicación puede mostrar en su lugar un código QR.

1. Escanee el código con su teléfono. El ordenador indica que el teléfono se ha conectado.
2. Escriba en su teléfono el PIN de seis dígitos que aparece en la pantalla del ordenador.
3. Dibuje su firma en el teléfono y envíela.
4. El ordenador comprueba el PIN y, solo si coincide, coloca la firma en el acuerdo.

La firma viaja entre los dos dispositivos como un mensaje en directo de un solo uso. No se guarda en ninguna base de datos por el camino. El PIN impide que alguien que solo haya visto el código QR introduzca su propia firma en su acuerdo.

## La firma de la otra parte

Desde el panel de contrafirma se crea un enlace de firma para el proyecto. Puede mostrarlo como código QR, copiarlo o enviarlo por correo electrónico. Si su dirección de correo está verificada, la aplicación puede enviar la solicitud por usted, con su dirección como dirección de respuesta; de lo contrario, abre un borrador en su propio programa de correo.

La otra parte abre el enlace, debe abrir el documento antes de que se desbloquee el panel de firma y, a continuación, escribe su nombre y firma. La fecha se rellena automáticamente. Cada enlace solo puede usarse para firmar una vez. Su panel comprueba cada pocos segundos si hay firma y muestra el nombre del firmante y la hora de la firma en cuanto llega.

## Qué es una firma electrónica y qué no es

Una firma dibujada y recogida de este modo deja constancia de que una persona identificada firmó en un momento concreto. No es una firma digital basada en certificado. Para la mayoría de la documentación comercial es suficiente, pero algunos bancos, autoridades o contratos tienen sus propias normas, así que compruébelo si tiene dudas.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "Qué se almacena y quién puede verlo",
    summary: "Qué se guarda en su cuenta, qué se queda en su navegador y qué abre un enlace o un código QR.",
    group: "Privacidad y seguridad",
    body: `Universal Exports no es una aplicación que funcione solo en el dispositivo. La documentación comercial tiene que llegar a la otra parte de la operación, por lo que una parte se almacena en línea. Esto es exactamente lo que se almacena y quién puede acceder a ello.

## Guardado en su cuenta

- Sus proyectos, incluidos los datos de cada documento.
- Los datos de su propia empresa, sus contactos guardados, sus datos bancarios y su catálogo de productos.

Se almacenan en la base de datos de UNI·SIM vinculados a su Universal ID. La base de datos solo permite que su cuenta con sesión iniciada los lea o modifique. Todo viaja por conexiones cifradas, pero no con cifrado de extremo a extremo: los datos se conservan para que el servicio pueda devolvérselos, no bloqueados con una clave que solo usted posea.

## Guardado solo en su navegador

Su logotipo, el idioma elegido y el último contacto que seleccionó los recuerda este navegador en este ordenador. No se guardan en su cuenta.

## Enlaces y códigos QR

- **El código QR de un acuerdo generado, y el de las etiquetas para cajas,** abre una copia en línea de solo lectura de ese acuerdo, incluido el PDF. Cualquiera que tenga el enlace o pueda escanear el código puede verla; no hace falta iniciar sesión. Esa es la idea, para que un comprador o un funcionario de aduanas pueda comprobar la documentación, pero también significa que solo debe compartir esos códigos con personas que deban ver la operación. El enlace es un código aleatorio largo que no se puede adivinar. La copia en línea solo se crea cuando ha iniciado sesión; sin ella, el acuerdo se genera sin código QR y las etiquetas para cajas se marcan como vista previa.
- **Un enlace de contrafirma** permite a quien lo tenga abrir la solicitud y firmarla una vez, y después consultar quién la firmó. Envíelo solo a la persona que deba firmar.
- **El paso de la firma por el teléfono** no se almacena en absoluto; consulte el artículo sobre la firma.

## Servicios con los que se comunica la aplicación

- **UK Trade Tariff Service** — cuando consulta un código de mercancía, el código se envía allí.
- **Consulta en Companies House** — cuando crea un Universal ID, el número de empresa que introduce se comprueba a través del servidor de UNI·SIM.
- **Correo electrónico** — si pide a la aplicación que envíe una solicitud de firma, la dirección del destinatario, su nombre y el enlace de firma se transmiten al proveedor de correo de UNI·SIM para entregarla.

## Copias alojadas

Si almacena un acuerdo con Hosted by UNI·SIM, el PDF se conserva en un almacenamiento privado vinculado a su Universal ID. Al eliminarlo se borra el archivo y se le devuelve el token.`,
  },
]

export default articles
