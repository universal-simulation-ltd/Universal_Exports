import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-an-export-agreement',
    title: "İhracat sözleşmesi nedir?",
    summary: "Farklı ülkelerdeki bir satıcı ile alıcı arasındaki yazılı anlaşma.",
    group: "Temel bilgiler",
    body: `İhracat sözleşmesi, sınır ötesine geçen bir satışın yazılı kaydıdır. Kimin sattığını, kimin satın aldığını, neyin satıldığını, bunun ne kadar tuttuğunu, malların nasıl ve ne zaman sevk edileceğini ve alıcının nasıl ödeme yapacağını belirler.

Günlük satışlar nadiren bu kadar resmi bir şeye ihtiyaç duyar. Uluslararası satışlar ise genellikle duyar, çünkü ters gidebilecek daha çok şey vardır: mallar uzun bir yol kat eder, gümrükten geçer, birkaç kez el değiştirebilir ve çoğu zaman alıcı onları görmeden bedeli ödenir. Açık bir sözleşme, her iki tarafın ve anlaşmayı daha sonra kontrol etmesi gereken herkesin tam olarak neyin taahhüt edildiğini görebilmesi anlamına gelir.

## İyi bir sözleşme neleri kapsar

- **Taraflar** — satıcının ve alıcının tescilli unvanları, adresleri ve şirket numarası, KDV numarası veya EORI numarası gibi kimlik numaraları.
- **Mallar** — ne oldukları, miktarı, birim fiyatı ve toplam tutar.
- **Teslimat** — malların nereden çıktığı, nereye gittiği ve hangi Incoterms kuralının geçerli olduğu; böylece herkes yolculuğun her aşamasının masrafını kimin ödeyeceğini ve sorumluluğunun kimde olduğunu bilir.
- **Ödeme** — para birimi, tutar, vade tarihi ve ödemenin nasıl yapılacağı; örneğin banka havalesi veya akreditif ile.
- **İmzalar** — her iki tarafın, koşulları kabul ettiklerini göstermek için imzalaması.

## Diğer belgelerin yeri

Sözleşme, bir belge setinin merkezidir. Teklifler ve satın alma siparişleri sözleşmeye giden yolu hazırlar; faturalar, çeki listeleri, menşe şahadetnameleri ve konşimentolar ise onu uygulamaya koyar. Universal Exports bunların hepsini tek bir projede tutar; böylece aynı bilgiler yeniden yazılmak yerine bir belgeden diğerine aktarılır.

## Bir uyarı

Universal Exports, açık ve tutarlı evraklar hazırlamanıza yardımcı olur. Hukuki danışmanlık değildir. Yüksek değerli anlaşmalar, alışılmadık mallar veya tanımadığınız pazarlar için koşulları yetkin birine kontrol ettirmeniz yerinde olur.`,
  },
  {
    id: 'export-documents-explained',
    title: "İhracat belgeleri, açıklamalı",
    summary: "Bir projedeki her belgenin ne işe yaradığı, sade bir dille.",
    group: "Temel bilgiler",
    body: `Bir ihracat genellikle küçük bir evrak yığını ortaya çıkarır. Her belge farklı bir kişi için farklı bir soruyu yanıtlar: alıcı, banka, taşıyıcı veya gümrük. Universal Exports'taki her belgenin ne işe yaradığı aşağıdadır.

## Satıştan önce

- **Tahmini fiyat veya teklif** — satıcının neyi hangi fiyata tedarik etmeyi önerdiği. Henüz bir taahhüt değildir.
- **Satın alma siparişi** — alıcının resmi satın alma talebi; genellikle teklife atıfta bulunur.

## Satış ve ödeme

- **Fatura** — satıcının ödeme talebi. İhracatta ayrıca gümrüğe malların ne olduğunu ve değerini bildirir; bu nedenle tanımların ve değerlerin doğru olması gerekir.
- **Banka bilgileri** — ödemenin nereye yapılacağı.
- **Akreditif** — alıcının bankasının, doğru belgeler ibraz edildiğinde satıcıya ödeme yapacağına dair verdiği taahhüt. Her iki tarafı da korur: satıcı ödemenin arkasında bir banka olduğunu bilir, alıcı ise paranın yalnızca sevkiyat kanıtı karşılığında serbest bırakılacağını bilir.
- **Makbuz** — ödemenin alındığını teyit eder.
- **Alacak dekontu** — önceden faturalandırılmış bir tutarı azaltır veya iptal eder; örneğin bir iade veya fiyat hatasından sonra.

## Malları yerine ulaştırmak

- **Sevkiyat bilgileri** — limanlar, gemi, tarihler ve yolculuk için geçerli Incoterms kuralı.
- **Toplama listesi** — depoya sipariş için neyin toplanacağını söyler.
- **İrsaliye** — alıcının her şeyin ulaştığını kontrol edebilmesi için mallarla birlikte gider.
- **Menşe şahadetnamesi** — malların üretildiği ülkeyi belirtir. Gümrük, hangi vergi oranlarının ve ticaret anlaşmalarının uygulanacağına karar vermek için bunu kullanır.
- **Konşimento** — deniz taşımacılığında taşıyıcı tarafından düzenlenir. Mallar için bir makbuz, taşıma sözleşmesinin kanıtı ve birçok durumda bir mülkiyet belgesi işlevi görür: aslını elinde bulunduran kişi yükü talep edebilir.

## Ürünler ve gümrük

- **Ürünler** — malların kendisi; GTİP kodları, fiyatları ve KDV'leriyle birlikte.
- **Tarifeler ve gümrük** — her ürüne uygulanan vergiler ve diğer önlemler.

Bir projedeki her belge aynı bilgilerden yararlandığı için bir yerde yapılan düzeltme diğerlerine de yansır; bu da sevkiyatları sıklıkla geciktiren uyuşmazlıkları azaltır.`,
  },
  {
    id: 'commodity-codes-and-tariffs',
    title: "GTİP kodları, tarifeler ve Incoterms",
    summary: "Gümrüğün ve taşıyıcıların kullandığı kodlar ve kurallar ile uygulamanın bunları nasıl sorguladığı.",
    group: "Temel bilgiler",
    body: `## GTİP kodları

Uluslararası alanda ticareti yapılan hemen her şey, Dünya Gümrük Örgütü tarafından yönetilen ve dünyanın dört bir yanındaki gümrük idarelerince kullanılan bir numaralandırma sistemi olan Armonize Sistem'e göre sınıflandırılır. İlk altı hane uluslararası olarak ortaktır. Her ülke daha fazla ayrıntı için ek haneler ekler; Birleşik Krallık aynı ilk altı hane üzerine kurulu daha uzun kodlar kullanır.

Kod önemlidir, çünkü hangi vergilerin, harçların, lisansların ve kısıtlamaların uygulanacağını belirler. Birbirine benzeyen iki ürün farklı kodlar altında yer alabilir ve sınırda çok farklı muamele görebilir; bu nedenle doğru belirlemeye değer.

## Tarifeler

Gümrük tarifesi, mallar ithal edilirken alınan bir vergidir. Oran; GTİP koduna, malların nereden geldiğine ve iki ülke arasında daha düşük bir oran sağlayan bir ticaret anlaşması olup olmadığına bağlıdır. İthalat KDV'si ve diğer önlemler de uygulanabilir.

## Uygulama bunları nasıl sorgular

Bir ürün için GTİP kodu girdiğinizde tarife denetleyicisi, Birleşik Krallık hükümetinin kamuya açık tarife veritabanı olan UK Trade Tariff Service'ten o kodun vergi oranlarını, KDV'sini ve diğer önlemlerini ister. Tarayıcınız hizmete doğrudan bağlanır ve projenizin geri kalanını değil, yalnızca kodu gönderir. Veriler Birleşik Krallık'ın tarifesi olduğundan denetleyici yalnızca ticaret taraflarından biri Birleşik Krallık'ta olduğunda anlamlıdır.

Sonucu bağlayıcı bir karar olarak değil, yararlı bir başlangıç noktası olarak görün. Bir sınıflandırmadan emin değilseniz sevkiyattan önce resmi hizmetten veya bir gümrük danışmanından kontrol edin.

## Incoterms

Incoterms, Milletlerarası Ticaret Odası tarafından yayımlanan standart ticaret kurallarından oluşan bir settir. Her kural, EXW, FOB, CIF veya DDP gibi kısa bir koddur ve taşıma, sigorta ve gümrük işlemlerini kimin ayarlayıp ödeyeceğini ve riskin satıcıdan alıcıya hangi noktada geçeceğini belirtir. Sevkiyat bilgilerinde kuralı ve geçerli olduğu yeri belirtmek, neyin masrafını kimin ödemesi gerektiği konusunda sonradan çıkabilecek uzun tartışmaları önler.`,
  },
  {
    id: 'how-universal-exports-works',
    title: "Universal Exports nasıl çalışır",
    summary: "Belgelerinizin nerede oluşturulduğu, projelerin nerede saklandığı ve yanınızda götürebileceğiniz dosyalar.",
    group: "Nasıl çalışır",
    body: `Universal Exports, tek bir projeden eksiksiz bir ihracat belgeleri seti oluşturan bir web uygulamasıdır. Bilgileri bir kez girersiniz ve her belge bunları yeniden kullanır.

## Projeler

Bir proje, bir anlaşmayla ilgili her şeyi içerir: sizin bilgileriniz, karşı taraf, ürünler, sevkiyat, ödeme ve her belge bölümü. Projeler üzerinde çalışmak için bir Universal ID'ye ihtiyacınız vardır ve projeler, başka bir bilgisayarda kaldığınız yerden devam edebilmeniz için hesabınıza kaydedilir. Burada bir Universal ID oluşturduğunuzda sizden Birleşik Krallık Companies House numarası istenir; uygulama, şirketin size ait olduğunu teyit edebilmeniz için bu numarayı sorgular.

Bir bölümü bitirdiğinizde onu kilitleyebilirsiniz. Kilitli bir bölüm tamamlanmış bir belge olarak gösterilir ve kenar çubuğu hangi bölümlerde hâlâ zorunlu bilgilerin eksik olduğunu gösterir.

## Belgeler nerede oluşturulur

İhracat sözleşmesi ve her bir belge dahil PDF'ler, tarayıcınız tarafından kendi bilgisayarınızda oluşturulur. Başka bir yerde oluşturulmak üzere gönderilmezler.

## Yanınızda götürebileceğiniz dosyalar

- **PDF'ler** — ihracat sözleşmesinin ve her belgenin imzadan önceki ve sonraki hâlleri.
- **Anlaşma XML'i** — sözleşme bilgilerinin, diğer ticaret veya gümrük yazılımlarının okuyabileceği yapılandırılmış bir dosya hâli.
- **Masaüstüne kaydet** — düzenlenebilir projenin tamamı, bir yedek dosyası olarak. Daha sonra düzenlemeye devam etmek ve belgeleri yeniden oluşturmak için tekrar açabilirsiniz. İmzanızı içermez; imzanız yalnızca imzalı PDF'te bulunur.
- **Koli etiketleri** — her koliye yapıştırmak için yazdırılabilir bir QR etiket sayfası. Bu kodların neyi açtığını öğrenmek için gizlilik makalesine bakın.

## Hosted by UNI·SIM

Tamamlanmış sözleşmenin bir kopyasını çevrimiçi tutmayı tercih ederseniz PDF'i Universal ID'nize bağlı olarak UNI·SIM'de saklayabilirsiniz. Saklanan her sözleşme bir jeton kullanır ve sözleşmeyi silerseniz jetonu geri alırsınız.

## Demo proje

Örnek proje, eksiksiz doldurulmuş bir belge setini gösterir. Yalnızca uygulamada bulunur ve hiçbir zaman bir hesaba kaydedilmez; bu nedenle onu dilediğiniz gibi inceleyebilirsiniz.`,
  },
  {
    id: 'signing-and-counter-signing',
    title: "İmzalama ve karşı imza",
    summary: "Sizin nasıl imzaladığınız, karşı tarafın nasıl imzaladığı ve telefona aktarımın nasıl gizli kaldığı.",
    group: "Nasıl çalışır",
    body: `Bir ihracat sözleşmesi iki kez imzalanır: bir kez sizin tarafınızdan, bir kez de karşı tarafça. Universal Exports her ikisini de yönetir.

## Sizin imzanız

İmzanızı fareyle veya parmağınızla çizebilir, bir görüntüsünü yükleyebilir ya da imzalamayı telefonunuza devredebilirsiniz. Ayrıca Direktör gibi unvanınızı ve isteğe bağlı bir şirket kaşesi de ekleyebilirsiniz. Onayladığınızda uygulama, imza bloğunda adınız, unvanınız, kaşeniz ve imzanızla birlikte sözleşmenin imzalı bir kopyasını oluşturur.

## Telefonunuzda imzalama

Fareyle çizmek zahmetli olduğundan uygulama, bilgisayarda bunun yerine bir QR kod gösterebilir.

1. Kodu telefonunuzla tarayın. Bilgisayar, telefonun bağlandığını gösterir.
2. Bilgisayar ekranında gösterilen altı haneli PIN'i telefonunuza girin.
3. İmzanızı telefonda çizin ve gönderin.
4. Bilgisayar PIN'i kontrol eder ve yalnızca eşleşirse imzayı sözleşmeye yerleştirir.

İmza, iki cihaz arasında tek seferlik canlı bir mesaj olarak iletilir. Bu süreçte hiçbir veritabanına kaydedilmez. PIN sayesinde yalnızca QR kodu görmüş biri, sözleşmenize kendi imzasını sızdıramaz.

## Karşı tarafın imzası

Karşı imza panelinden proje için bir imza bağlantısı oluşturursunuz. Bu bağlantıyı QR kod olarak gösterebilir, kopyalayabilir veya e-postayla gönderebilirsiniz. E-posta adresiniz doğrulanmışsa uygulama, yanıt adresi olarak sizin adresiniz ayarlanmış şekilde talebi sizin yerinize gönderebilir; aksi takdirde kendi e-posta programınızda bir taslak açar.

Karşı taraf bağlantıyı açar, imza alanının kilidi açılmadan önce belgeyi açmak zorundadır, ardından adını yazar ve imzalar. Tarih otomatik olarak doldurulur. Her bağlantı yalnızca bir kez imzalamak için kullanılabilir. Paneliniz birkaç saniyede bir imzayı kontrol eder ve imza gelir gelmez imzalayanın adını ve imzaladığı saati gösterir.

## Elektronik imza nedir, ne değildir

Bu şekilde alınan çizilmiş bir imza, adı belirli bir kişinin belirli bir zamanda imzaladığını kaydeder. Sertifika tabanlı bir dijital imza değildir. Ticari evrakların çoğu için bu yeterlidir, ancak bazı bankaların, makamların veya sözleşmelerin kendi kuralları vardır; bu nedenle emin değilseniz kontrol edin.`,
  },
  {
    id: 'your-data-and-privacy',
    title: "Neler saklanır ve kimler görebilir",
    summary: "Hesabınıza nelerin kaydedildiği, nelerin tarayıcınızda kaldığı ve bir bağlantının veya QR kodun neyi açtığı.",
    group: "Gizlilik ve güvenlik",
    body: `Universal Exports yalnızca cihazda çalışan bir uygulama değildir. Ticari evrakların anlaşmanın karşı tarafına ulaşması gerekir; bu nedenle bir kısmı çevrimiçi saklanır. Tam olarak nelerin saklandığı ve bunlara kimlerin erişebildiği aşağıdadır.

## Hesabınıza kaydedilenler

- Her belgenin bilgileri dahil projeleriniz.
- Kendi şirket bilgileriniz, kayıtlı kişileriniz, banka bilgileriniz ve ürün kataloğunuz.

Bunlar, UNI·SIM'in veritabanında Universal ID'nize bağlı olarak saklanır. Veritabanı, bunları yalnızca oturum açmış hesabınızın okumasına veya değiştirmesine izin verir. Her şey şifreli bağlantılar üzerinden iletilir, ancak uçtan uca şifreleme yoktur: veriler, yalnızca sizde bulunan bir anahtarla kilitlenmek için değil, hizmetin onları size geri verebilmesi için tutulur.

## Yalnızca tarayıcınızda tutulanlar

Logonuz, dil tercihiniz ve en son seçtiğiniz kişi, bu bilgisayardaki bu tarayıcı tarafından hatırlanır. Hesabınıza kaydedilmezler.

## Bağlantılar ve QR kodlar

- **Oluşturulan bir sözleşmedeki ve koli etiketlerindeki QR kod,** PDF dahil olmak üzere o sözleşmenin salt okunur çevrimiçi bir kopyasını açar. Bağlantıya sahip olan veya kodu tarayabilen herkes bunu görüntüleyebilir; oturum açmak gerekmez. Amaç budur, böylece bir alıcı veya gümrük memuru evrakları kontrol edebilir; ancak bu, söz konusu kodları yalnızca anlaşmayı görmesi gereken kişilerle paylaşmanız gerektiği anlamına da gelir. Bağlantı, tahmin edilemeyen uzun ve rastgele bir koddur. Çevrimiçi kopya yalnızca oturum açmışken oluşturulur; o olmadan sözleşme QR kod olmadan hazırlanır ve koli etiketleri önizleme olarak işaretlenir.
- **Karşı imza bağlantısı**, elinde bulunduran kişinin talebi açmasına ve bir kez imzalamasına, ardından kimin imzaladığını sorgulamasına olanak tanır. Bağlantıyı yalnızca imzalaması gereken kişiye gönderin.
- **İmzanın telefona aktarımı** hiçbir şekilde saklanmaz; imzalama makalesine bakın.

## Uygulamanın iletişim kurduğu hizmetler

- **UK Trade Tariff Service** — bir GTİP kodu sorguladığınızda kod oraya gönderilir.
- **Companies House sorgusu** — bir Universal ID oluşturduğunuzda girdiğiniz şirket numarası UNI·SIM'in sunucusu üzerinden kontrol edilir.
- **E-posta** — uygulamadan bir imza talebi göndermesini isterseniz alıcının adresi, adı ve imza bağlantısı, teslim edilmesi için UNI·SIM'in e-posta sağlayıcısına iletilir.

## Barındırılan yedekler

Bir sözleşmeyi Hosted by UNI·SIM ile saklarsanız PDF, Universal ID'nize bağlı özel bir depolama alanında tutulur. Silmek dosyayı kaldırır ve jetonu iade eder.`,
  },
]

export default articles
