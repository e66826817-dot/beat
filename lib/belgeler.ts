export const BELGE_SURUMU = "2026-10-2";
export const GUNCELLEME = "19 Ekim 2026";

export const ISLETME = {
  ad: "[Altay Derbeder / altayderbeder]",
  eposta: "[beatapptr@gmail.com]",
  adres: "[İstanbul/Ümraniye/Altınşehir Mahallesi]",
  site: "[https://beat-chi.vercel.app/]",
  sehir: "[İstanbul]",
};

export type Belge = {
  id: string;
  baslik: string;
  ozet: string;
  bolumler: { baslik: string; paragraflar: string[] }[];
};

const I = ISLETME;

export const BELGELER: Belge[] = [
  {
    id: "sartlar",
    baslik: "Kullanım Şartları",
    ozet: "Siteyi kullanırken uyman gereken kurallar ve tarafların hakları.",
    bolumler: [
      {
        baslik: "Taraflar ve kapsam",
        paragraflar: [
          `Bu Kullanım Şartları, ${I.site} adresinde ve bağlı uygulamalarda sunulan "Beat" hizmetini ("Hizmet") işleten ${I.ad} ("Beat") ile Hizmet'e üye olan veya Hizmet'i ziyaret eden kişi ("Kullanıcı") arasındaki ilişkiyi düzenler.`,
          "Hesap oluşturarak veya Hizmet'i kullanarak bu şartları, Topluluk Kuralları'nı, Gizlilik Politikası'nı ve KVKK Aydınlatma Metni'ni okuduğunu ve kabul ettiğini beyan edersin.",
        ],
      },
      {
        baslik: "Üyelik, yaş sınırı ve hesap güvenliği",
        paragraflar: [
          "Hizmet'e üye olmak için en az 13 yaşında olman gerekir. 18 yaşından küçükysen hesabını velinin ya da yasal temsilcinin bilgisi ve onayıyla açtığını kabul edersin.",
          "Kayıt sırasında verdiğin bilgilerin doğru olması gerekir. Bir kişi birden fazla hesapla görev, oy, liderlik veya davet sistemlerini manipüle edemez.",
          "Hesabının ve şifrenin güvenliğinden sen sorumlusun. Hesabında izinsiz bir hareket fark edersen bize gecikmeden bildir.",
        ],
      },
      {
        baslik: "Hizmetin niteliği ve üçüncü kişilerle ilişki",
        paragraflar: [
          "Beat, hayranların bir araya geldiği bağımsız bir topluluk platformudur. Platformda adı geçen sanatçı, grup, menajerlik ve plak şirketleriyle resmi bir bağlantısı, ortaklığı veya onayı yoktur. Bu isimler, logolar ve markalar sahiplerine aittir.",
          "Platformda yer alan grup ve üye bilgileri topluluk tarafından derlenmiştir ve hatalı olabilir. Düzeltme talebini bize iletebilirsin.",
        ],
      },
      {
        baslik: "Kullanıcı içerikleri ve lisans",
        paragraflar: [
          "Paylaştığın gönderi, yorum, fotoğraf, video, not, anket, etkinlik ve diğer içeriklerden (“İçerik”) sen sorumlusun. İçeriğin üzerindeki haklar sende kalır.",
          "İçeriği paylaşarak Beat'e, Hizmet'i işletmek, barındırmak, göstermek ve diğer kullanıcılara sunmak amacıyla sınırlı, devredilemez, münhasır olmayan ve ücretsiz bir kullanım lisansı verirsin. Bu lisans, içeriği sildiğinde veya hesabını kapattığında, yasal saklama yükümlülükleri ve makul yedekleme süreleri saklı kalmak üzere sona erer.",
          "Yalnızca paylaşma hakkına sahip olduğun içerikleri paylaşabilirsin. Başkasına ait fotoğraf, video, müzik veya metni izinsiz yüklemek yasaktır.",
        ],
      },
      {
        baslik: "Yasaklı davranışlar",
        paragraflar: [
          "Topluluk Kuralları'nı ihlal etmek, spam ve otomatik hesap kullanımı, sahte hesap açmak, görev, oy, liderlik ve davet sistemlerini manipüle etmek, Hizmet'in güvenliğini veya işleyişini bozmaya çalışmak, başkalarının hesabına izinsiz erişmeye çalışmak yasaktır.",
        ],
      },
      {
        baslik: "Telif hakları ve içerik bildirimi",
        paragraflar: [
          `Hakkının ihlal edildiğini düşünüyorsan ${I.eposta} adresine; hakkın sahibi olduğunu gösteren bilgi, ihlal edildiğini düşündüğün içeriğin bağlantısı ve iletişim bilgilerinle birlikte bildirimde bulunabilirsin.`,
          "Beat, 5651 sayılı Kanun ve ilgili mevzuat çerçevesinde bildirimleri makul sürede inceler; hukuka aykırı bulduğu içeriği kaldırabilir. Hak ihlalini tekrarlayan kullanıcıların hesapları kapatılabilir.",
        ],
      },
      {
        baslik: "Yaptırımlar",
        paragraflar: [
          "Bu şartların veya Topluluk Kuralları'nın ihlali hâlinde Beat; uyarabilir, içeriği kaldırabilir, hesabı süreli veya süresiz susturabilir (okuyabilir ama yazamazsın) ya da yasaklayabilir (hesaba giriş engellenir). Ağır ihlallerde yetkili makamlara bildirim yapılabilir.",
          `Bir yaptırıma itirazın varsa ${I.eposta} adresine yazabilirsin.`,
        ],
      },
      {
        baslik: "Görevler, puanlar, ünvanlar, çerçeveler ve oyunlar",
        paragraflar: [
          "Platformdaki görev ödülleri, puanlar, ünvanlar, çerçeveler, temalar ve liderlik sıralaması tamamen sanal ve eğlence amaçlıdır. Parasal bir değeri yoktur, para veya başka bir değerle değiştirilemez, devredilemez.",
          "Beat; görevleri, ödülleri ve oyun kurallarını değiştirebilir, sıfırlayabilir veya kaldırabilir. Hile, manipülasyon veya hata sonucu kazanılan ödüller geri alınabilir.",
        ],
      },
      {
        baslik: "Hizmetin sunumu ve sorumluluk sınırı",
        paragraflar: [
          'Hizmet "olduğu gibi" sunulur. Kesintisiz veya hatasız çalışacağı garanti edilmez; bakım, teknik arıza veya üçüncü taraf altyapı sorunları nedeniyle kesintiler yaşanabilir.',
          "Kullanıcılar arasındaki uyuşmazlıklardan ve kullanıcıların paylaştığı içeriklerden, Beat'in kanunen sorumlu olduğu hâller dışında, Beat sorumlu tutulamaz. Üçüncü taraf bağlantılar ve gömülü içerikler (örneğin YouTube) kendi şartlarına tabidir.",
          "Bu bölüm, tüketici mevzuatından doğan ve sözleşmeyle sınırlandırılamayacak haklarını etkilemez.",
        ],
      },
      {
        baslik: "Değişiklikler",
        paragraflar: [
          "Beat bu şartları güncelleyebilir. Önemli değişikliklerde sana yeniden onay ekranı gösterilir; onay vermezsen hesabınla içerik üretemezsin. Güncel metin her zaman bu sayfada yayınlanır.",
        ],
      },
      {
        baslik: "Uygulanacak hukuk ve yetki",
        paragraflar: [
          `Bu şartlara Türk hukuku uygulanır. Uyuşmazlıklarda ${I.sehir} mahkemeleri ve icra daireleri yetkilidir. Tüketici mevzuatından doğan başvuru hakların saklıdır.`,
        ],
      },
      {
        baslik: "İletişim",
        paragraflar: [`${I.ad} · ${I.adres} · ${I.eposta}`],
      },
    ],
  },
  {
    id: "kurallar",
    baslik: "Topluluk Kuralları",
    ozet: "Herkesin rahat edebilmesi için uyulması gereken davranış kuralları.",
    bolumler: [
      {
        baslik: "Saygılı ol",
        paragraflar: [
          "Farklı sanatçıları, grupları ve fandomları seven insanlar burada bir arada. Eleştiri serbest, hakaret, aşağılama, taciz ve zorbalık yasak. Fandomlar arası rekabeti kişisel saldırıya dönüştürme.",
          "Irk, etnik köken, din, cinsiyet, cinsel yönelim, engellilik, yaş veya görünüş temelli nefret söylemi ve ayrımcılık yasaktır.",
        ],
      },
      {
        baslik: "Sanatçılar ve özel hayat",
        paragraflar: [
          "Sanatçıların ve herhangi bir kişinin özel hayatını ihlal eden içerikler (adres, telefon, kimlik, özel fotoğraf, takip ve izleme paylaşımları), yakınlarının hedef alınması ve izinsiz kişisel veri paylaşımı yasaktır.",
          "Başkasının kişisel bilgisini ya da özel yazışmasını izni olmadan paylaşma.",
        ],
      },
      {
        baslik: "Çocukların güvenliği",
        paragraflar: [
          "Reşit olmayan kişileri cinselleştiren, onlara uygunsuz mesajlar gönderen veya onlarla özel iletişim kurmaya çalışan her davranış yasaktır ve yetkili makamlara bildirilir.",
          "18 yaşından küçük bir kullanıcıdan kişisel bilgi (adres, okul, telefon) isteme.",
        ],
      },
      {
        baslik: "Zararlı ve yasa dışı içerik",
        paragraflar: [
          "Şiddeti, terörü, kendine zarar vermeyi veya yasa dışı faaliyetleri öven ya da teşvik eden içerikler, cinsel içerikli materyal, yasa dışı ürün ve hizmet reklamı yasaktır.",
          "Kendini kötü hissediyorsan ya da bir arkadaşın için endişeleniyorsan Türkiye'de 112 Acil Çağrı Merkezi'ne ulaşabilirsin.",
        ],
      },
      {
        baslik: "Spam, reklam ve manipülasyon",
        paragraflar: [
          "Tekrarlayan gönderiler, istenmeyen reklam ve bağlantılar, sahte hesap, otomatik araçlar, oy, görev ve davet sistemlerini kandırma girişimleri yasaktır.",
        ],
      },
      {
        baslik: "Telifli içerik",
        paragraflar: [
          "Yalnızca kendi çektiğin ya da paylaşma hakkın olan fotoğraf ve videoları yükle. Korsan yayın, izinsiz kayıt ve başkasının eserini kendi eserin gibi paylaşmak yasaktır. Profil ve notlardaki şarkı bağlantıları yalnızca resmi/izinli kaynaklardan olmalıdır.",
        ],
      },
      {
        baslik: "Şikayet ve engelleme",
        paragraflar: [
          "Kurallara aykırı bir içerik görürsen ⚑ düğmesiyle şikayet edebilirsin. Rahatsız olduğun kişileri engelleyebilir veya sessize alabilirsin. Moderatörler şikayetleri inceler; ihlallerde içerik kaldırılır, hesap susturulur veya yasaklanır.",
        ],
      },
    ],
  },
  {
    id: "gizlilik",
    baslik: "Gizlilik Politikası",
    ozet: "Hangi verileri neden topladığımızı ve nasıl koruduğumuzu anlatır.",
    bolumler: [
      {
        baslik: "Kapsam",
        paragraflar: [
          `Bu politika, ${I.ad} tarafından işletilen Beat'te kişisel verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar. Ayrıntılı yasal bilgilendirme için KVKK Aydınlatma Metni'ne de bak.`,
        ],
      },
      {
        baslik: "Topladığımız veriler",
        paragraflar: [
          "Hesap verileri: e-posta adresi, kullanıcı adı, şifre (şifreli/özetlenmiş olarak saklanır).",
          "Profil verileri: görünen ad, biyografi, profil ve kapak fotoğrafı, bias, favori grup ve şarkı, ünvan ve çerçeve tercihleri.",
          "İçerik verileri: gönderiler, yorumlar, fotoğraflar, videolar, notlar, anketler, etkinlikler, oyun içi mesajlar ve hamleler.",
          "Etkileşim verileri: tepkiler, takipler, kaydedilenler, engel ve sessize alma tercihleri, görev ilerlemesi, puanlar, davet ilişkileri, bildirimler, şikayetler.",
          "Teknik veriler: oturum bilgisi, tarayıcı ve cihaz bilgisi ve güvenlik amaçlı işlem kayıtları.",
        ],
      },
      {
        baslik: "Verileri neden kullanıyoruz",
        paragraflar: [
          "Hesabını oluşturmak ve Hizmet'i sunmak, içerikleri diğer kullanıcılara göstermek, bildirim göndermek, güvenliği sağlamak, spam ve kötüye kullanımı önlemek, şikayetleri incelemek, yasal yükümlülükleri yerine getirmek ve Hizmet'i geliştirmek için.",
          "Verilerini reklam amacıyla üçüncü kişilere satmıyoruz.",
        ],
      },
      {
        baslik: "Kimlerle paylaşıyoruz",
        paragraflar: [
          "Hizmet; veritabanı, kimlik doğrulama ve dosya depolama için Supabase, barındırma için Vercel gibi altyapı sağlayıcıları kullanır. Bu sağlayıcılar verileri bizim adımıza işler ve sunucuları yurt dışında olabilir.",
          "Profilindeki veya notundaki şarkı oynatıcısı YouTube'un gömülü oynatıcısını kullanır. Oynatıcıyı başlattığında YouTube/Google kendi politikasına göre veri işleyebilir.",
          "Yetkili kamu kurumlarının yasal talepleri hâlinde ilgili veriler mevzuata uygun olarak paylaşılabilir.",
        ],
      },
      {
        baslik: "Herkese açık veriler",
        paragraflar: [
          "Kullanıcı adın, profilin, gönderilerin, yorumların, tepkilerin, takip ettiğin kişi ve grup sayıları, ünvanın, çerçeven, liderlik puanın ve paylaştığın videolar diğer kullanıcılar tarafından görülebilir. Paylaşmak istemediğin bilgiyi paylaşma. E-posta adresin herkese açık değildir.",
        ],
      },
      {
        baslik: "Saklama süresi",
        paragraflar: [
          "Verilerin, hesabın açık olduğu sürece ve yasal yükümlülüklerin gerektirdiği süre boyunca saklanır. Bir içeriği sildiğinde Hizmet'ten kaldırılır; yedeklerde makul bir süre kalabilir.",
        ],
      },
      {
        baslik: "Çerezler ve yerel depolama",
        paragraflar: [
          "Oturumunu açık tutmak ve tema ile sezon tercihlerini hatırlamak için tarayıcının yerel depolamasını ve gerekli çerezleri kullanırız. Reklam veya izleme amaçlı çerez kullanmıyoruz.",
        ],
      },
      {
        baslik: "Çocuklar",
        paragraflar: [
          "Hizmet 13 yaşından küçükler için tasarlanmamıştır. 13 yaşın altında olduğunu fark ettiğimiz hesapları kapatırız. 18 yaşından küçük kullanıcıların velisinin bilgisi ve onayı olması beklenir.",
        ],
      },
      {
        baslik: "Güvenlik",
        paragraflar: [
          "Verilerini korumak için makul teknik ve idari önlemler alırız (erişim kuralları, şifreli bağlantı, yetki denetimleri). Hiçbir sistem tamamen risksizdir; güvenlik ihlali hâlinde mevzuata uygun şekilde hareket ederiz.",
        ],
      },
      {
        baslik: "Haklarını nasıl kullanırsın",
        paragraflar: [
          `Verilerine erişme, düzeltme, silme ve itiraz hakların için ${I.eposta} adresine yazabilirsin. Haklarının ayrıntısı KVKK Aydınlatma Metni'nde yer alır.`,
        ],
      },
    ],
  },
  {
    id: "kvkk",
    baslik: "KVKK Aydınlatma Metni",
    ozet: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme.",
    bolumler: [
      {
        baslik: "Veri sorumlusu",
        paragraflar: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu ${I.ad}'dır. Adres: ${I.adres}. İletişim: ${I.eposta}.`,
        ],
      },
      {
        baslik: "İşlenen kişisel veriler",
        paragraflar: [
          "Kimlik/iletişim: kullanıcı adı, görünen ad, e-posta adresi.",
          "Görsel ve işitsel kayıtlar: kullanıcının yüklediği profil fotoğrafı, gönderi fotoğrafları ve videolar.",
          "Müşteri işlemi ve kullanım: gönderiler, yorumlar, tepkiler, takipler, oyun hareketleri, görev ve puan kayıtları, bildirimler, şikayetler ve yaptırım kayıtları.",
          "İşlem güvenliği: oturum, cihaz ve tarayıcı bilgisi, işlem kayıtları.",
          "Kullanıcının kendi isteğiyle paylaştığı diğer bilgiler (biyografi, bias, favori şarkı vb.). Özel nitelikli kişisel veri paylaşmaman önerilir.",
        ],
      },
      {
        baslik: "İşleme amaçları",
        paragraflar: [
          "Üyelik ve hesap yönetimi, Hizmet'in sunulması, içeriklerin yayınlanması ve diğer kullanıcılara gösterilmesi, bildirim ve iletişim, topluluk güvenliği ve moderasyon, spam ve kötüye kullanımın önlenmesi, yasal yükümlülüklerin yerine getirilmesi, uyuşmazlıkların çözümü ve Hizmet'in geliştirilmesi.",
        ],
      },
      {
        baslik: "Hukuki sebepler",
        paragraflar: [
          "KVKK m.5/2 uyarınca; kanunlarda açıkça öngörülmesi, bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması, hukuki yükümlülüğün yerine getirilmesi, bir hakkın tesisi, kullanılması veya korunması ve ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla veri sorumlusunun meşru menfaati hukuki sebeplerine dayanılarak işlenir.",
        ],
      },
      {
        baslik: "Verilerin aktarılması",
        paragraflar: [
          "Verilerin; altyapı ve barındırma hizmeti aldığımız hizmet sağlayıcılara (Supabase, Vercel) ve gömülü içerik sağlayıcılarına, yasal talep hâlinde yetkili kamu kurum ve kuruluşlarına aktarılabilir.",
          "Hizmet sağlayıcıların sunucuları yurt dışında bulunabilir. Yurt dışına aktarım KVKK m.9 ve ilgili Kurul düzenlemelerine uygun şekilde yapılır.",
        ],
      },
      {
        baslik: "Toplama yöntemi",
        paragraflar: [
          "Verilerin; kayıt formu, profil ve içerik paylaşımı, Hizmet'in kullanımı sırasındaki etkileşimler ve otomatik teknik kayıtlar yoluyla, elektronik ortamda toplanır.",
        ],
      },
      {
        baslik: "KVKK m.11 kapsamındaki hakların",
        paragraflar: [
          "Kişisel verilerinin işlenip işlenmediğini öğrenme; işlenmişse bilgi talep etme; işleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme; yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme; eksik veya yanlış işlenmişse düzeltilmesini isteme; KVKK m.7 çerçevesinde silinmesini veya yok edilmesini isteme; bu işlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme; işlenen verilerin otomatik sistemlerle analiz edilmesi suretiyle aleyhine bir sonuç çıkmasına itiraz etme; kanuna aykırı işleme nedeniyle zarara uğraman hâlinde zararın giderilmesini talep etme haklarına sahipsin.",
        ],
      },
      {
        baslik: "Başvuru yöntemi",
        paragraflar: [
          `Taleplerini ${I.eposta} adresine e-posta ile ya da ${I.adres} adresine yazılı olarak iletebilirsin. Başvurun, niteliğine göre en geç otuz gün içinde sonuçlandırılır. Cevabından memnun kalmazsan Kişisel Verileri Koruma Kurulu'na şikayet hakkın saklıdır.`,
        ],
      },
    ],
  },
];

export function belgeBul(id: string) {
  return BELGELER.find((b) => b.id === id);
}

export function taslakMi() {
  return Object.values(ISLETME).some((v) => v.includes("["));
}