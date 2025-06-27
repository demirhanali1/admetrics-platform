# Teknoloji

- Node.js
- Docker
- AWS
- Github Actions
- PostgreSQL
- MongoDB

# AWS Bileşenleri

## SQS
- AWS tarafından fully managed & auto-scaled yapıdadır. Anlık olarak binlerce mesajı kuyruğa yazabilir.
- Fifo kullanılmadı çünkü event'lar zamandan bağımsızdır. Mesajların öncelik sırası yok.
- Şu anda şifreleme default olarak in-transit yani TLS ile yapılmaktadır. Ancak gerçek projede mesaj saklanırken at-rest ile şifrelenmesi seçilebilir, ek maliyet getirir.
- DLQ kullanılmadı ancak mesaj consume edilirken bir hata oluşursa, hatalı mesajların aktarılması için gerçek dünyada kullanılabilir.

# Mikroservisler

## 1. Ingestion Api (Main Servis)

- Bu servisin tek görevi, HTTP POST ile gelen işlenmemiş (raw) data'yı alarak AWS SQS kuyruğuna push etmektir. Herhangi bir ek işlem yapmaz. Bu sayede gelen verilerin yüksek performansla sisteme alınması, durability ve buffering sorunlarının yaşanmaması ve %99 uptime oranının yakalanması hedeflenmiştir.
- Servis, AWS EC2 üzerinde koşmaktadır ve otomatik ölçeklenebilir (auto-scale) yapıdadır. Şu anda 1 CPU ve 4 GB RAM kaynaklarına sahiptir.
- Apache JMeter ile yapılan yük testlerinde anlık 10.000 istek (request) başarıyla işlenmiştir. %80 CPU kullanım oranı sınır olarak belirlenmiştir. Bu sınır aşıldığında servis, load balancer aracılığıyla otomatik olarak ölçeklenir ve yeni istekleri karşılamaya devam eder. Yük normale döndüğünde ise tek servis olarak çalışmaya devam eder (gerçek dünyada birden çok replika koşabilir).

Özetle iş akışı:

- POST /events endpoint’inden JSON payload alır.
- Payload’ı doğrular.
- Bu veriyi SQS queue’ya atar.
- 200 OK döner.

# Veritabanı Mimarisi

Bu projede kullanılan PostgreSQL ve MongoDB servisleri, geliştirme ortamı için Docker üzerinde lokal olarak koşmaktadır. Bu tercih, hem geliştirme sürecinde esneklik sağlamakta hem de maliyet yaratmamaktadır.
Gerçek dünyada ise, bu veritabanları aşağıdaki AWS servislerinde koşması gerekmektedir:

- Amazon RDS (PostgreSQL): Normalize edilmiş metrik verilerinin saklanması.

- Amazon DocumentDB (MongoDB): Farklı kaynaklardan gelen ham verilerin (raw payload) saklanması.

Bu yapı sayesinde, hem esnek veri modelleme hem de güçlü sorgu yetenekleri elde edilir. Geliştirme ortamında Docker ile çalışmak, mimariyi test etmek ve CI/CD süreçlerini otomatize etmek için yeterlidir.

