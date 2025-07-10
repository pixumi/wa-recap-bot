// =================================================================
// =========== 🇮🇩 KONFIGURASI BOT - DATA STATIS 🇮🇩 ============
// =================================================================
// Deskripsi: File ini berisi semua data konfigurasi statis
// agar mudah diubah tanpa menyentuh logika utama di index.js
// =================================================================

// === 👤 OVERRIDE NAMA PENGIRIM ===
// Gunakan map ini untuk memberikan nama custom ke nomor tertentu.
const senderOverrides = {
    '6285212540122@c.us': 'DHARMA',
    '6282353086174@c.us': 'DOMAS',
    '6287839258122@c.us': 'ARIF IRVANSYAH',
    '6281288079200@c.us': 'HERMAWAN',
    '6282298361954@c.us': 'DEDI HANDOYO',
    '6285348761223@c.us': 'DZUAL',
    '6282255025432@c.us': 'ECHO NUGRAHA',
    '6281278861552@c.us': 'ERNA WATI',
    '6282195204255@c.us': 'ABDUL RAHIM',
    '6282285487744@c.us': 'JUHANDA',
    '6282218595016@c.us': 'OCHA ALIENA',
    '6282259255551@c.us': 'MAMAN',
    '6285752196213@c.us': 'MEY',
    '628115525414@c.us': 'YAYAN',
    '6285155222109@c.us': 'AFRIDA',
    '6285727812635@c.us': 'ATHA',
    '628974441966@c.us': 'ANCA',
    '6285228782260@c.us': 'RANNI',
    '6281273878321@c.us': 'MEIDIAN',
    '6281257160490@c.us': 'DASANA',
    '6282260234011@c.us': 'RIDWAN',
    '6281254005440@c.us': 'RONY',
    '6281375281051@c.us': 'RAY',
    '6281354839288@c.us': 'DEWI',
    '6285893084048@c.us': 'RIYADI',
    '6285751867540@c.us': 'SUTRISNO',
    '6281345390650@c.us': 'ASMAN',
    '6287819624638@c.us': 'ABU NIZAM',
    '6282176086738@c.us': 'REZA WARDANA',
    '6281266423834@c.us': 'HERU KURNIAWAN',
    '6281345567102@c.us': 'DEWI',
    '6281258756870@c.us': 'LATIF',
    '6281214370316@c.us': 'MEYKI SANDRA',
    '6281278659650@c.us': 'YADI',
    '6285267667919@c.us': 'RENDI PUTRA',
    '6281348498598@c.us': 'ICA',
    '6281260070007@c.us': 'HAGA BANGUN',
    '6281248305432@c.us': 'ROY TONA',
    '6285277909966@c.us': 'RADA ALBARRA',
    '628115576914@c.us': 'ANDHIKA',
    '6281339779828@c.us': 'DIMAS DWI',
    '6282157264121@c.us': 'BUDI PRASETYO',
    '6283800792218@c.us': 'WILDAN FIRDAUS',
    '6282152443014@c.us': 'ABDUL AZIS',
    '62895702569361@c.us': 'REZA FAIZADIN',
    '628115522724@c.us': 'ROBERT YOSUA SARAGIH',
    '6282138094042@c.us': 'RIZALDI',
    '6281299061460@c.us': 'MIRZA',
    '6281346813157@c.us': 'MUHAMMAD EKO',
    '6281939614245@c.us': 'JIMMY',
    '6281549387469@c.us': 'JEPRI JULIANSYAH',
    '6287814722805@c.us': 'RUSYDI',
    '6282259578239@c.us': 'PERNANDA',
    '6282131982720@c.us': 'RIYAN',
    '6281321200906@c.us': 'FADLURRAHMAN',
    '6283178537395@c.us': 'VIONA AGUSTIN',
    '6282334623744@c.us': 'ADI KRIS',
    '6282298392742@c.us': 'BARRON',
    '6285755074240@c.us': 'DONI',
    '6281346290596@c.us': 'AMRIL',
    '6285249564964@c.us': 'BUDI',
    '6282250265734@c.us': 'FLORENSIUS SUBANDI',
    '6281340459271@c.us': 'ANTY',
    '6282251503210@c.us': 'BIBIT SATRIONO',
    '6282254168885@c.us': 'HENDRA',
    '6288268345410@c.us': 'TITO',
    '6285247113641@c.us': 'MOKO',
    '6281267133663@c.us': 'AHMAD AZIS',
    '6285822030750@c.us': 'SINANTO',
    '6285346179404@c.us': 'DEBYANTORO',
    '6281223121550@c.us': 'DINA',
    '6285246669961@c.us': 'ARI FAUNDA',
    '6285345612333@c.us': 'FAHMI',
    '6285397065282@c.us': 'RENTHA PALAMPA',
    '628115530970@c.us': 'DIMAS',
    '628115576915@c.us': 'ANTON SARDONO',
    '6285754006319@c.us': 'BENY ATTA',
    '6282293075684@c.us': 'FARIKH',
    '6282371476064@c.us': 'FAISAL',
    '6285267153227@c.us': 'FANHAR',
    '6285849174071@c.us': 'HARIADI',
    '6282164883434@c.us': 'GUIL TARIGAN',
    '6285159814122@c.us': 'YOGA PUTRA',
    '6282159280132@c.us': 'AULIA',
    '6282184307675@c.us': 'YUNUS',
    '6285602363506@c.us': 'HUSNI',
    '6281333929644@c.us': 'TARBONI',
    '6285348476393@c.us': 'OBERT',
    '6281354832816@c.us': 'ANDI YUSUF',
    '6289632360098@c.us': 'RAFI SYAEFULLOH',
    '6281346671832@c.us': 'NOOR',
    '6281225398493@c.us': 'EZZY STEVEN',
    '6281345413151@c.us': 'SANDRIAGA',
    '6282190022932@c.us': 'NINO',
    '6285798995869@c.us': 'YEDIDA EMETETHA',
    '6287831690837@c.us': 'CAHYO',
    '6282162311411@c.us': 'YUGUS',
    '6285200014446@c.us': 'ACING',
    '6282148133381@c.us': 'JUAN',
    '6282311931963@c.us': 'NIZAR ULUL AZMI',
    '6285162723561@c.us': 'AGUS',
    '6281280258203@c.us': 'SAID ABDULLAH'
};

// === 🔑 PENGIRIM YANG DIIZINKAN MENGIRIM "DONE" ===
// Gunakan Set untuk pencarian yang lebih cepat.
const allowedDoneSenders = new Set([
    '6285212540122@c.us', // DHARMA
    '6282353086174@c.us'  // DOMAS
]);

// === 🗺️ PEMETAAN KEYWORD KE KATEGORI AKTIVITAS ===
const activityKeywords = [
  { 
    category: 'MAINTAIN', 
    keywords: ['pl04','found','sloc','maintananc3','maintenace','storage location','mainte','maintaince','maibnten','mantain','mentenance','maintenenkn','mentenace','maintennace','maintaine','maintained','maintece','mainten','menten','maintian','maintain','maintanance','maintannace','maintenance','maiantan','maintan','maintence','maintance','maintened','maintanace','maitnenacne','maintenacne','bin','update','maintenkan','meinten','maintand','maintanannce','maintenancekan']
  },
  { 
    category: 'BLOK/OPEN BLOCK', 
    keywords: ['open','block','blok','unblock'] 
  },
  { 
    category: 'RELEASE/UNRELEASE PO', 
    keywords: ['realis','rilis','release','sto','riliskn','riliskan']
  },
  { 
    category: 'SETTING INTRANSIT PO', 
    keywords: ['setting','intransit','transit','po','intransil'] 
  },
  { 
    category: 'TRANSAKSI MIGO (GI,GR,TP & CANCELATION)', 
    keywords: ['mutasi','mutasikan','tf','transfer','mutasinya','tfkan','transferkan'] 
  }
];

// === 🚀 PEMBUATAN REGEX OTOMATIS (UNTUK EFISIENSI) ===
// Kode di bawah ini secara otomatis mengubah daftar keyword di atas
// menjadi pola Regex yang sangat efisien untuk pencocokan.
// Tidak perlu diubah.
const activityRegexMap = new Map();
activityKeywords.forEach(({ category, keywords }) => {
    // Membuat satu pola regex besar, contoh: /\b(open|block|blok)\b/i
    // \b -> word boundary, memastikan kata yang cocok utuh (misal: "open" tidak cocok dengan "opening")
    // i -> case-insensitive, tidak peduli huruf besar/kecil
    const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
    activityRegexMap.set(category, pattern);
});

// === 📦 EXPORT SEMUA KONFIGURASI ===
// Agar bisa dibaca oleh index.js
module.exports = {
    senderOverrides,
    allowedDoneSenders,
    activityRegexMap
};
