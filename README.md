<!-- TOC -->
* [Teknoloji](#teknoloji)
* [Kurulum Talimatları](#kurulum-talimatları)
* [SQS](#sqs)
* [Mikroservisler](#mikroservisler)
  * [1. Ingestion Api](#1-ingestion-api)
    * [SQS Performans Optimizasyonu](#sqs-performans-optimizasyonu)
    * [Express.js Optimizasyonu](#expressjs-optimizasyonu)
    * [Node.js Optimizasyonu](#nodejs-optimizasyonu)
  * [2. Normalizer Worker](#2-normalizer-worker)
    * [SQS Performans Optimizasyonu](#sqs-performans-optimizasyonu-1)
    * [PostgreSQL Performans Optimizasyonu](#postgresql-performans-optimizasyonu)
    * [MongoDB Performans Optimizasyonu](#mongodb-performans-optimizasyonu)
    * [EventProcessor Optimizasyonu](#eventprocessor-optimizasyonu)
* [Veritabanı Mimarisi](#veritabanı-mimarisi)
* [Metrik Hesaplama Stratejileri](#metrik-hesaplama-stratejileri)
* [Loglama ve Monitoring Stratejisi](#loglama-ve-monitoring-stratejisi)
  * [Genel Yaklaşım](#genel-yaklaşım)
  * [AWS Loglama Servisleri](#aws-loglama-servisleri)
  * [Log Mimarisi](#log-mimarisi)
<!-- TOC -->

# Teknoloji

- Typescript
- Node.js, Express.js
- Docker
- AWS, SQS
- PostgreSQL, TypeORM
- MongoDB, mongoose
- SOLID Prensipleri

[Sistem Diagramı](./diagram1.png)

# Kurulum Talimatları

Projeyi ayağa kaldırmak için aşağıdaki komutu çalıştırmanız yeterlidir:

```
docker compose up -d --build
```

Terminalde curl ile aşağıdaki örnek request'i gönderebilirsiniz:

```
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "source": "meta",
    "payload": {
      "campaign_id": "meta_12345",
      "campaign_name": "Summer Sale 2024",
      "ad_set_id": "meta_67890",
      "date_start": "2024-05-20",
      "date_stop": "2024-05-20",
      "insights": {
        "impressions": 15000,
        "clicks": 350,
        "spend": 50.75,
        "conversions": 12
      }
    }
  }'
```

# SQS
- AWS tarafından fully managed & auto-scaled yapıdadır. Anlık olarak yüzbinlerce mesajı kuyruğa yazabilir.
- Fifo kullanılmadı çünkü event'lar zamandan bağımsızdır. Mesajların öncelik sırası yok.
- Şu anda şifreleme default olarak in-transit yani TLS ile yapılmaktadır. Ancak gerçek projede mesaj saklanırken at-rest ile şifrelenmesi seçilebilir, ek maliyet getirir.
- DLQ kullanılmadı ancak mesaj consume edilirken bir hata oluşursa, hatalı mesajların aktarılması için gerçek dünyada kullanılabilir.

# Mikroservisler

## 1. Ingestion Api

- Bu servisin tek görevi, HTTP POST ile gelen işlenmemiş (raw) data'yı alarak AWS SQS kuyruğuna push etmektir. Herhangi bir ek işlem yapmaz. Bu sayede gelen verilerin yüksek performansla sisteme alınması, durability ve buffering sorunlarının yaşanmaması ve %99 uptime oranının yakalanması hedeflenmiştir.
- Servis, AWS EC2 üzerinde koşacaktır ve otomatik ölçeklenebilir (auto-scale) yapıda olacaktır. %80 CPU kullanım oranı sınır olarak belirlenebilir. Bu sınır aşıldığında servis, load balancer aracılığıyla otomatik olarak ölçeklenir ve yeni istekleri karşılamaya devam eder. Yük normale döndüğünde ise default servis sayısı olarak yaşamaya devam eder.

Özetle iş akışı:

- POST /events endpoint’inden JSON payload alır.
- Payload’ı doğrular.
- Bu veriyi SQS queue’ya atar.
- 200 OK döner.

### SQS Performans Optimizasyonu

- Mesajları tek tek göndermek yerine batch halinde gönderiyoruz (ram'de saklanıyor)
- SQS limiti olan 10, mesaj per batch kullanıyoruz
- 1 saniye flush interval ile otomatik batch gönderimi yapılıyor
- Network overhead'i %90 azaltıyor

### Express.js Optimizasyonu

- Compression middleware (response boyutunu küçültür)
- Rate limiting (10,000 request/dakika per IP)
- Request timeout 30 saniye
- Gereksiz middleware'ler kapatıldı (x-powered-by, etag)
- JSON parsing limiti 10MB'a çıkarıldı

### Node.js Optimizasyonu

- Thread pool size 64'e çıkarıldı
- Max listeners limiti kaldırıldı
- Memory usage monitoring yapılıyor

## 2. Normalizer Worker

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

3 adet paralel consumer (sistem gücüne göre artırılabilir) loop ile eşzamanlı işleme yapılıyor.

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
  - Hanging process'leri önlüyor
  - Sistem kaynaklarının bloke olmasını engelliyor

  Batch Processing:
  - SQS limiti olan 10 mesaj batch sayımız
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

Bu yapı sayesinde, hem esnek veri modelleme hem de güçlü sorgu yetenekleri elde edilir.

# Metrik Hesaplama Stratejileri

1. Gerçek Zamanlı (Real-time) Hesaplama
   - Kullanım: Anlık dashboard'lar, alarmlar, kritik karar verme
   - Sıklık: Her 5 dakikada bir otomatik + istek üzerine anında
   - Avantajlar: En güncel veri, anlık tepki
   - Dezavantajlar: Yüksek CPU kullanımı
2. Toplu (Batch) Hesaplama
   - Kullanım: Raporlama, analiz, geçmiş veri işleme
   - Sıklık: Her 15 dakikada bir otomatik
   - Avantajlar: Düşük sistem yükü, yüksek verimlilik
   - Dezavantajlar: 15 dakika veri gecikmesi
3. Önbellekli (Cached) Hesaplama
   - Kullanım: Sık erişilen veriler, dashboard'lar
   - Sıklık: 5 dakika TTL ile önbellek
   - Avantajlar: Hızlı yanıt, düşük sistem yükü
4. Tarihsel Yeniden Hesaplama
   - Kullanım: Veri doğruluğu, düzeltmeler
   - Sıklık: Her 2 saatte bir
   - Avantajlar: Veri tutarlılığı, hata düzeltme

Hesaplanması Gereken Metrikler

   Temel Metrikler:

   - CTR: (Clicks / Impressions) * 100
   - CPM: (Spend / Impressions) * 1000
   - CPC: Spend / Clicks
   - CPA: Spend / Conversions
   - ROAS: Revenue / Spend

   Gelişmiş Metrikler:

   Conversion Rate, Revenue Per Click, Revenue Per Impression

# Loglama ve Monitoring Stratejisi

## Genel Yaklaşım

Mikroservis mimarisinde her servis (ingestion-api, normalizer-worker, diğer servisler) ayrı EC2 instance'larında çalışmalıdır. Bu durumda merkezi loglama ve monitoring kritik önemdedir.

## AWS Loglama Servisleri
1. CloudWatch Logs (Ana Loglama Platformu)

   Kullanım: Tüm uygulama loglarının merkezi yerde toplanması

   Avantajlar:
   - Otomatik log gruplandırma
   - Real-time log analizi
   - Log retention policies
   - Metric extraction
   - Maliyet: GB başına ücretlendirme
2. CloudWatch Metrics (Performans Monitoring)

   Kullanım: Custom metrikler, sistem metrikleri

   Avantajlar:
   - Real-time dashboard
   - Alarm kurulumu
   - Auto-scaling triggers
   - Metrikler: CPU, Memory, Network, Custom metrikler

## Log Mimarisi

1. Application Logs (Winston → CloudWatch)
   - Error logs
   - Info logs
   - Debug logs
   - Performance metrics
2. Access Logs (Express → CloudWatch)
   - HTTP request/response
   - API endpoint usage
   - Rate limiting events
3. System Logs (OS → CloudWatch)
   - EC2 system metrics
   - Docker container logs
   - Health check results
4. Business Logs (Custom → CloudWatch)
   - Event processing metrics
   - SQS message handling
