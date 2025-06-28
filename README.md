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

## 1. Ingestion Api

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

# Veritabanı Mimarisi

Bu projede kullanılan PostgreSQL ve MongoDB servisleri, geliştirme ortamı için Docker üzerinde lokal olarak koşmaktadır. Bu tercih, hem geliştirme sürecinde esneklik sağlamakta hem de maliyet yaratmamaktadır.
Gerçek dünyada ise, bu veritabanları aşağıdaki AWS servislerinde koşması gerekmektedir:

- Amazon RDS (PostgreSQL): Normalize edilmiş metrik verilerinin saklanması.

- Amazon DocumentDB (MongoDB): Farklı kaynaklardan gelen ham verilerin (raw payload) saklanması.

Bu yapı sayesinde, hem esnek veri modelleme hem de güçlü sorgu yetenekleri elde edilir. Geliştirme ortamında Docker ile çalışmak, mimariyi test etmek ve CI/CD süreçlerini otomatize etmek için yeterlidir.

