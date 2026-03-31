const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// GET /api/coordinates/sets - Список доступных наборов
router.get('/sets', (req, res) => {
  const sets = [
    { id: 'world', name: 'Весь мир', description: 'Случайные места по всему миру', count: 100 },
    { id: 'europe', name: 'Европа', description: 'Европейские города и места', count: 50 },
    { id: 'capitals', name: 'Столицы мира', description: 'Столицы государств', count: 50 },
    { id: 'stadiums', name: 'Стадионы', description: 'Известные стадионы мира', count: 30 },
    { id: 'universities', name: 'Университеты', description: 'Известные университеты', count: 30 },
    { id: 'landmarks', name: 'Достопримечательности', description: 'Знаменитые места', count: 40 },
    { id: 'russia', name: 'Россия', description: 'Города и места России', count: 50 },
  ];

  res.json({ success: true, data: sets });
});

// GET /api/coordinates/:setId - Получить координаты набора
router.get('/:setId', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', `coordinates_${req.params.setId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Набор координат не найден' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
