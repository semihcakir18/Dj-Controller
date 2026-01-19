🎧 Immersive DJ Controller (Web-Based)
1️⃣ Projenin Amacı (Net Tanım)

Bu proje, tarayıcı üzerinden çalışan, 3D ve etkileşimli bir DJ controller deneyimi sunmayı amaçlar.

Kullanıcı:

3D bir DJ controller’ın karşısındadır

Mouse (ve ileride kafa hareketi) ile:

jog wheel (scratch),

knob,

fader
gibi fiziksel DJ kontrolleriyle gerçekçi şekilde etkileşime girer

Arka planda çalan müziği bu kontrollerle yönetir

🎯 Amaç:

“Model güzel olsun” değil,
“gerçek bir alete dokunuyormuş hissi” vermek

2️⃣ Kullanılan Teknolojiler
Core

Vanilla JavaScript

Three.js (3D sahne, mesh’ler, kamera)

Vite (dev server, module bundling)

Interaction

Three.js Raycaster

Mouse events (down / move / up)

Audio (ileride)

Web Audio API

AudioContext

GainNode

BiquadFilter

PlaybackRate (scratch için)

Vision (ileride)

MediaPipe Face Tracking

kafa yönüne göre kamera / parallax

360° sector snap

3️⃣ Mimari Yaklaşım (En Önemli Kısım)
❌ Yapılmayan şeyler

Blender ile detaylı modelleme

Shader yazma

React ile render yönetimi

✅ Yapılan şeyler

Procedural modeling (kodla geometri)

Her fiziksel parça = ayrı mesh

Görsel sadelik, davranış önceliği

Bu proje bir 3D sanat projesi değil,
bir 3D etkileşim sistemi.

4️⃣ Dosya Yapısı (Şu anki yapı)
src/
├─ main.js → input + raycaster + interaction
├─ scene.js → scene, camera, renderer, lights
├─ controller.js → DJ controller geometrisi
└─ style.css

5️⃣ DJ Controller Bileşenleri (Parça Parça)
Fiziksel Bileşenler
Parça Açıklama
Base Ana gövde
Jog Wheel Scratch / seek
Knob Filter, EQ, volume
Fader Channel volume
(İleride) Crossfader Kanal geçişi

Her parça:

Ayrı Mesh

userData.type ile etiketli

interactables[] listesine ekli

6️⃣ Interaction Sistemi (Nasıl Çalışıyor?)

1. Seçim

Mouse position → Raycaster

İlk çarpan obje → activeObject

2. Kontrol

Mouse drag:

jog → rotation.y

knob → rotation.y

fader → position.z (clamp)

3. Kamera Yönetimi

Objeye tıklanınca → OrbitControls.disabled

Mouse bırakınca → OrbitControls.enabled

🎯 Amaç:

Etkileşim sırasında kamera ASLA hareket etmemeli

7️⃣ Görsel Prensipler (Şu an bilinçli olarak eksik)

Şu an:

Materyaller sade

Renkler nötr

Dönüş algısı zayıf

Bu bilinçli bir tercih, çünkü:

Önce davranış

Sonra görsel geri bildirim

8️⃣ AŞAMALAR (Roadmap)
🔹 Aşama 1 – Temel 3D & Interaction ✅ (ŞU AN BURADAYIZ)

Tamamlananlar:

Vite + Three.js setup

DJ controller base

Jog / knob / fader

Raycaster interaction

Kamera kilitleme

Eksikler:

Görsel feedback (dönüş belli değil)

Audio yok

🔹 Aşama 2 – Görsel Geri Bildirim (SIRADAKİ ADIM)

Amaç:

“Ben bunu döndürdüm mü?” sorusu hiç sorulmasın

Yapılacaklar:

Jog üzerinde asimetrik işaret

Hover olunca:

renk değişimi

cursor pointer

Aktifken:

hafif emissive / highlight

Bu aşamada:

Ses HÂLÂ yok

Sadece göz + el koordinasyonu

🔹 Aşama 3 – Audio Entegrasyonu

Amaç:

Görsel hareket = duyulan sonuç

Yapılacaklar:

Tek müzik yükle

Jog → playbackRate (scratch hissi)

Knob → filter / gain

Fader → volume

🔹 Aşama 4 – Immersion (Vizyon Kısmı)

MediaPipe Face Tracking

Kafa hareketi → kamera parallax

360° sector snap (4 yön)

“DJ booth senin etrafında” hissi

9️⃣ Şu An TAM OLARAK Neredeyiz?

📍 Aşama 1’in sonundayız

✔ Model var
✔ Interaction var
✔ Kamera kontrolü doğru
❌ Görsel feedback zayıf
❌ Audio yok

Bu olması gereken yer.
Henüz erken polish’e girilmedi.

🔜 Bir Sonraki Adım (NET TANIM)
Aşama 2 – Görsel Geri Bildirim

Spesifik olarak:

Jog üstüne asimetrik bir işaret

Hover highlight

Active object feedback
