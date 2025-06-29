const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const STUDENTS_DIR = path.join(__dirname, 'students');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to generate unique ID: 1 alphabet + 5 digits
function generateStudentId() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
    const digits = Math.floor(10000 + Math.random() * 90000); // 5 digits
    return `${letter}${digits}`;
}

// Save student data
app.post('/api/register', (req, res) => {
    const studentData = req.body;
    const studentId = generateStudentId();
    studentData.id = studentId;
    const filePath = path.join(STUDENTS_DIR, `${studentId}.json`);
    fs.writeFile(filePath, JSON.stringify(studentData, null, 2), err => {
        if (err) return res.status(500).json({ error: 'Failed to save student data.' });
        res.json({ success: true, id: studentId });
    });
});

// Get all students (for admin)
app.get('/api/students', (req, res) => {
    fs.readdir(STUDENTS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read students directory.' });
        const students = [];
        let count = files.length;
        if (count === 0) return res.json([]);
        files.forEach(file => {
            fs.readFile(path.join(STUDENTS_DIR, file), 'utf8', (err, data) => {
                if (!err) students.push(JSON.parse(data));
                if (--count === 0) res.json(students);
            });
        });
    });
});

// Update student data (edit, approve, decline, graduate, etc.)
app.put('/api/students/:id', (req, res) => {
    const studentId = req.params.id;
    const filePath = path.join(STUDENTS_DIR, `${studentId}.json`);
    console.log(`PUT /api/students/${studentId} - Saving:`, req.body.status, 'to', filePath); // Debug log
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), err => {
        if (err) {
            console.error('Failed to update student:', err);
            return res.status(500).json({ error: 'Failed to update student data.' });
        }
        res.json({ success: true });
    });
});

// Delete student data
app.delete('/api/students/:id', (req, res) => {
    const studentId = req.params.id;
    const filePath = path.join(STUDENTS_DIR, `${studentId}.json`);
    fs.unlink(filePath, err => {
        if (err) return res.status(500).json({ error: 'Failed to delete student.' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
