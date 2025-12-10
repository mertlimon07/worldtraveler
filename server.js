const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

// Resim Yükleme Ayarları
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Dosya Okuma Yardımcısı (Hata önleyici)
const readData = (filename) => {
    try {
        if (!fs.existsSync(filename)) {
            fs.writeFileSync(filename, '[]'); // Dosya yoksa oluştur
            return [];
        }
        const data = fs.readFileSync(filename, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error(`Dosya okuma hatası (${filename}):`, error);
        return [];
    }
};

// --- ROTALAR ---

// 1. Giriş
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let users = readData('users.json');

    const existingUser = users.find(u => u.username === username);

    if (existingUser) {
        if (existingUser.password === password) {
            res.json({ success: true, message: "Giriş başarılı" });
        } else {
            res.json({ success: false, message: "Hatalı şifre!" });
        }
    } else {
        users.push({ username, password });
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
        res.json({ success: true, message: "Yeni kayıt oluşturuldu." });
    }
});

// 2. Anı Kaydet
app.post('/api/memories', upload.single('photo'), (req, res) => {
    const { username, text, lat, lng } = req.body;
    const photoUrl = req.file ? '/uploads/' + req.file.filename : null;

    let memories = readData('memories.json');
    
    // ID'yi kesinlikle sayı (Number) olarak atıyoruz
    const newMemory = {
        id: Date.now(), 
        username,
        text,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        photoUrl
    };

    memories.push(newMemory);
    fs.writeFileSync('memories.json', JSON.stringify(memories, null, 2));

    res.json({ success: true, data: newMemory });
});

// 3. Anıları Getir
app.get('/api/memories/:username', (req, res) => {
    const username = req.params.username;
    let memories = readData('memories.json');
    const userMemories = memories.filter(m => m.username === username);
    res.json(userMemories);
});

// 4. Anı Sil (DÜZELTİLMİŞ KISIM)
app.delete('/api/memories/:id', (req, res) => {
    // Gelen ID string'dir, onu sayıya çeviriyoruz.
    const idToDelete = parseInt(req.params.id); 
    
    console.log("Silme isteği geldi. ID:", idToDelete); // Terminalde bunu görmelisin

    let memories = readData('memories.json');
    
    // Silinmeden önceki sayı
    const initialLength = memories.length;
    
    // ID'si eşleşmeyenleri tut (Yani eşleşeni at)
    const newMemories = memories.filter(m => m.id !== idToDelete);

    if (newMemories.length < initialLength) {
        fs.writeFileSync('memories.json', JSON.stringify(newMemories, null, 2));
        console.log("Başarıyla silindi.");
        res.json({ success: true, message: "Deleted successfully." });
    } else {
        console.log("Bu ID bulunamadı.");
        res.json({ success: false, message: "ID not found." });
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});