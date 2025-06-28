# Teknoloji

- Node.js
- Express.js
- Docker
- AWS
- PostgreSQL, TypeORM
- MongoDB, mongoose
- SOLID
- Github Actions

# AWS Bileşenleri

## SQS
- AWS tarafından fully managed & auto-scaled yapıdadır. Anlık olarak binlerce mesajı kuyruğa yazabilir.
- Fifo kullanılmadı çünkü event'lar zamandan bağımsızdır. Mesajların öncelik sırası yok.
- Şu anda şifreleme default olarak in-transit yani TLS ile yapılmaktadır. Ancak gerçek projede mesaj saklanırken at-rest ile şifrelenmesi seçilebilir, ek maliyet getirir.
- DLQ kullanılmadı ancak mesaj consume edilirken bir hata oluşursa, hatalı mesajların aktarılması için gerçek dünyada kullanılabilir.

# Mikroservisler

## 1. Collector Api

- Bu servisin tek görevi, HTTP POST ile gelen işlenmemiş (raw) data'yı alarak AWS SQS kuyruğuna push etmektir. Herhangi bir ek işlem yapmaz. Bu sayede gelen verilerin yüksek performansla sisteme alınması, durability ve buffering sorunlarının yaşanmaması ve %99 uptime oranının yakalanması hedeflenmiştir.
- Servis, AWS EC2 üzerinde koşmaktadır ve otomatik ölçeklenebilir (auto-scale) yapıdadır. Şu anda 1 CPU ve 4 GB RAM kaynaklarına sahiptir.
- Apache JMeter ile yapılan yük testlerinde anlık 10.000 istek (request) başarıyla işlenmiştir. %80 CPU kullanım oranı sınır olarak belirlenmiştir. Bu sınır aşıldığında servis, load balancer aracılığıyla otomatik olarak ölçeklenir ve yeni istekleri karşılamaya devam eder. Yük normale döndüğünde ise tek servis olarak çalışmaya devam eder (gerçek dünyada birden çok replika koşabilir).

Özetle iş akışı:

- POST /events endpoint’inden JSON payload alır.
- Payload’ı doğrular.
- Bu veriyi SQS queue’ya atar.
- 200 OK döner.

## 2. Normalizer Api

- Bu servisin temel görevi, SQS kuyruğundan gelen raw (ham) verileri işleyip normalize etmek ve normalize edilmiş verileri kalıcı olarak kaydetmektir. Böylece farklı kaynaklardan gelen veriler sistemde standart bir yapıya dönüştürülerek sonraki analiz aşamaları için hazır hale getirilmiş olur.

- Uygulama TypeScript, TypeORM ve Mongoose kullanılarak geliştirilmiştir. PostgreSQL üzerinde normalize edilmiş veriler saklanırken, MongoDB’de orijinal (ham) veriler arşivlenir.

- Servis %99.9 uptime hedefiyle çalışmakta olup, arka planda kesintisiz olarak kuyruktaki mesajları dinler ve işler.

Özetle iş akışı:

- AWS SQS kuyruğunu sürekli olarak dinler.

- Kuyruktan bir raw event mesajı çeker.

- Mesajı kaynağına (örneğin Meta veya Google) göre normalize eder.

- Ham veriyi MongoDB’ye, normalize veriyi PostgreSQL’e kaydeder.

Normalizer API, yüksek trafik altında dahi güvenilir, kararlı ve ölçeklenebilir çalışacak şekilde optimize edilmiştir. Sistemin hedefi, günlük 100 milyon eventi sorunsuz bir şekilde işleyebilmek, veri tutarlılığını korumak ve SQS kuyruğundaki yükü hızlıca boşaltarak sistemin darboğaza girmesini önlemektir.

### SQS Performans Optimizasyonu

**Concurrent Processing Architecture (Eşzamanlı İşleme Mimarisi)**

3 adet paralel consumer loop ile eşzamanlı işleme yapılıyor.

```ts
Apply
const consumerPromises = Array.from({ length: 3 }, (_, i) =>
this.consumerLoop(`Consumer-${i + 1}`)
);
await Promise.all(consumerPromises);
```

**Message Processing Pipeline (Mesaj İşleme Pipeline'ı)**

Concurrent Message Processing:
  - Promise.allSettled() kullanarak mesajlar paralel işleniyor
  - Bir mesajın başarısızlığı diğerlerini etkilemiyor
  - Her mesaj için ayrı promise oluşturuluyor

Timeout Protection:
  - Her mesaj için 25 saniye timeout süresi
  - Hanging process'leri önliyor
  - Sistem kaynaklarının bloke olmasını engelliyor

  Batch Processing:
  - SQS limiti olan 10 mesaj per batch
  - Network overhead'i azaltıyor
  - AWS API çağrı sayısını optimize ediyor

**Performans Optimizasyonu**
```
private pollingInterval = 1000;        // 1 saniye polling aralığı
private maxConcurrentMessages = 50;    // Maksimum eşzamanlı mesaj sayısı
private processingTimeout = 25000;     // 25 saniye işleme timeout'u
private maxMessagesPerBatch = 10;  
```

**Retry Mekanizması**
```ts
this.sqsClient = new SQSClient({
  region: this.config.awsRegion,
  maxAttempts: 3,  // Başarısız istekler için otomatik retry
});
```

**Error İzolasyon**
```ts
const results = await Promise.allSettled(
    messages.map(message => this.processMessageWithTimeout(message))
);

// Her mesaj için ayrı hata yönetimi
results.forEach((result, index) => {
    if (result.status === 'rejected') {
        // Hata loglanıyor ama diğer mesajlar etkilenmiyor
    }
});
```

### PostgreSQL Performans Optimizasyonu

- Daha uzun idle ve query timeout için Connection pool ayarları artırıldı (max: 50, min: 10)
- Batch insert (toplu kayıt) desteği: 1000'lik chunk'lar halinde toplu kayıt yapılabiliyor.
- Gerekirse ultra-hızlı bulk insert için raw SQL ile toplu ekleme fonksiyonu.
- Logging ve gereksiz TypeORM özellikleri (migrations, subscribers) devre dışı bırakıldı.
- Singleton pattern ile bağlantı tekrar kullanılacak şekilde ayarlandı.

### MongoDB Performans Optimizasyonu

- Connection pool ayarları artırıldı (maxPoolSize: 100, minPoolSize: 20).
- insertMany ile batch kayıt desteği eklendi (5000'lik batch'ler).
- Mongoose schema'da otomatik index ve validation kapatıldı, writeConcern optimize edildi.
- Gerekirse native MongoDB bulkWrite ile ultra-hızlı toplu ekleme fonksiyonu.
- Singleton pattern ile bağlantı tekrar kullanılacak şekilde ayarlandı.

### EventProcessor Optimizasyonu

- Batch size sayısı 1000. Aynı anda 5 batch paralel işlenebiliyor.
- Her batch işlenmesi asenkron ve in-memory queue ile yönetiliyor (gerçek dünyada redis kullanılmalıdır).
- Her batch'te MongoDB'ye toplu yazma, ardından normalize edip PostgreSQL'e toplu yazma yapılıyor.
- Performans metrikleri ve connection pool durumu loglanıyor.

# Veritabanı Mimarisi

Bu projede kullanılan PostgreSQL ve MongoDB servisleri, geliştirme ortamı için Docker üzerinde lokal olarak koşmaktadır. Bu tercih, hem geliştirme sürecinde esneklik sağlamakta hem de maliyet yaratmamaktadır.
Gerçek dünyada ise, bu veritabanları aşağıdaki AWS servislerinde koşması gerekmektedir:

- Amazon RDS (PostgreSQL): Normalize edilmiş metrik verilerinin saklanması.

- Amazon DocumentDB (MongoDB): Farklı kaynaklardan gelen ham verilerin (raw payload) saklanması.

Bu yapı sayesinde, hem esnek veri modelleme hem de güçlü sorgu yetenekleri elde edilir. Geliştirme ortamında Docker ile çalışmak, mimariyi test etmek ve CI/CD süreçlerini otomatize etmek için yeterlidir.

